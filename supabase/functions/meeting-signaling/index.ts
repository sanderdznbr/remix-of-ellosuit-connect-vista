import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { headers } = req;
    const upgradeHeader = headers.get("upgrade") || "";

    if (upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket connection", { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    
    let roomId: string | null = null;
    let participantId: string | null = null;
    let peerId: string | null = null;

    socket.onopen = () => {
      console.log("🔌 WebSocket connection opened");
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Received message:", data.type);

        switch (data.type) {
          case 'join-room':
            const { roomCode, displayName, userId } = data;
            
            // Find room by code
            const { data: room, error: roomError } = await supabase
              .from('meeting_rooms')
              .select('*')
              .eq('room_code', roomCode)
              .eq('is_active', true)
              .single();

            if (roomError || !room) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Room not found or inactive'
              }));
              return;
            }

            // Generate unique peer ID
            peerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            roomId = room.id;

            // Add participant to database
            const { data: participant, error: participantError } = await supabase
              .from('room_participants')
              .insert({
                room_id: roomId,
                user_id: userId,
                display_name: displayName,
                peer_id: peerId,
                is_host: room.created_by === userId,
                connection_status: 'connected',
              })
              .select()
              .single();

            if (participantError) {
              console.error("Error adding participant:", participantError);
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Failed to join room'
              }));
              return;
            }

            participantId = participant.id;

            // Send join confirmation
            socket.send(JSON.stringify({
              type: 'joined-room',
              room: room,
              participant: participant,
              peerId: peerId
            }));

            // Notify other participants
            const { data: otherParticipants } = await supabase
              .from('room_participants')
              .select('*')
              .eq('room_id', roomId)
              .neq('id', participantId)
              .is('left_at', null);

            // Broadcast to room channel
            await supabase
              .channel(`room_${roomId}`)
              .send({
                type: 'broadcast',
                event: 'participant-joined',
                payload: {
                  participant: participant,
                  totalParticipants: (otherParticipants?.length || 0) + 1
                }
              });

            break;

          case 'webrtc-offer':
          case 'webrtc-answer':
          case 'webrtc-ice-candidate':
            // Forward WebRTC signaling messages to target peer
            if (roomId && data.targetPeerId) {
              await supabase
                .channel(`room_${roomId}`)
                .send({
                  type: 'broadcast',
                  event: 'webrtc-signal',
                  payload: {
                    type: data.type,
                    data: data,
                    fromPeerId: peerId,
                    targetPeerId: data.targetPeerId
                  }
                });
            }
            break;

          case 'media-state-change':
            // Update participant media state
            if (participantId) {
              await supabase
                .from('room_participants')
                .update({
                  audio_enabled: data.audioEnabled,
                  video_enabled: data.videoEnabled,
                  screen_sharing: data.screenSharing
                })
                .eq('id', participantId);

              // Broadcast state change
              if (roomId) {
                await supabase
                  .channel(`room_${roomId}`)
                  .send({
                    type: 'broadcast',
                    event: 'media-state-changed',
                    payload: {
                      peerId: peerId,
                      audioEnabled: data.audioEnabled,
                      videoEnabled: data.videoEnabled,
                      screenSharing: data.screenSharing
                    }
                  });
              }
            }
            break;

          case 'chat-message':
            // Save chat message to database
            if (participantId && roomId) {
              const { data: message, error: messageError } = await supabase
                .from('room_chat_messages')
                .insert({
                  room_id: roomId,
                  participant_id: participantId,
                  message: data.message,
                  message_type: 'text'
                })
                .select(`
                  *,
                  room_participants (display_name)
                `)
                .single();

              if (!messageError && message) {
                // Broadcast chat message
                await supabase
                  .channel(`room_${roomId}`)
                  .send({
                    type: 'broadcast',
                    event: 'chat-message',
                    payload: {
                      id: message.id,
                      message: message.message,
                      participantName: message.room_participants.display_name,
                      timestamp: message.created_at,
                      fromPeerId: peerId
                    }
                  });
              }
            }
            break;

          case 'reaction':
            // Save reaction to database
            if (participantId && roomId) {
              await supabase
                .from('room_reactions')
                .insert({
                  room_id: roomId,
                  participant_id: participantId,
                  reaction_type: data.reactionType
                });

              // Broadcast reaction
              await supabase
                .channel(`room_${roomId}`)
                .send({
                  type: 'broadcast',
                  event: 'participant-reaction',
                  payload: {
                    peerId: peerId,
                    reactionType: data.reactionType,
                    timestamp: new Date().toISOString()
                  }
                });
            }
            break;
        }
      } catch (error) {
        console.error("Error processing message:", error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    };

    socket.onclose = async () => {
      console.log("🔌 WebSocket connection closed");
      
      // Update participant as disconnected
      if (participantId) {
        await supabase
          .from('room_participants')
          .update({
            left_at: new Date().toISOString(),
            connection_status: 'disconnected'
          })
          .eq('id', participantId);

        // Notify room about participant leaving
        if (roomId) {
          await supabase
            .channel(`room_${roomId}`)
            .send({
              type: 'broadcast',
              event: 'participant-left',
              payload: {
                peerId: peerId,
                participantId: participantId
              }
            });
        }
      }
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    return response;
  } catch (error) {
    console.error("❌ Server error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
});