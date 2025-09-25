// Simplify the Edge Function to only handle join-room and basic messaging
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const upgradeHeader = req.headers.get('upgrade') || '';
    if (upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket connection', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      console.log('🔌 WebSocket opened');
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received:', data.type);

        switch (data.type) {
          case 'join-room': {
            const roomCode: string = data.roomCode;
            const displayName: string = data.displayName;
            const userId = data.userId ?? null;

            // Get room
            const { data: room, error: roomError } = await supabase
              .from('meeting_rooms')
              .select('*')
              .eq('room_code', roomCode)
              .eq('is_active', true)
              .single();
            
            if (roomError || !room) {
              socket.send(JSON.stringify({ type: 'error', message: 'Room not found or inactive' }));
              return;
            }

            // Generate peer ID
            const peerId = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            // Add participant
            const { data: participant, error: participantError } = await supabase
              .from('room_participants')
              .insert({
                room_id: room.id,
                user_id: userId,
                display_name: displayName,
                peer_id: peerId,
                is_host: userId ? room.created_by === userId : false,
                connection_status: 'connected',
              })
              .select()
              .single();
            
            if (participantError || !participant) {
              console.error('❌ Error adding participant:', participantError);
              socket.send(JSON.stringify({ type: 'error', message: 'Failed to join room' }));
              return;
            }

            // Get other active participants (exclude this one)
            const { data: others } = await supabase
              .from('room_participants')
              .select('id, peer_id, display_name, is_host')
              .eq('room_id', room.id)
              .is('left_at', null)
              .neq('id', participant.id);

            // Send success response
            socket.send(JSON.stringify({
              type: 'joined-room',
              room,
              participant,
              peerId,
              otherParticipants: others ?? [],
            }));

            console.log(`✅ Participant joined: ${displayName} (${peerId}) in room ${room.id}`);
            break;
          }
          
          case 'ping': {
            socket.send(JSON.stringify({ type: 'pong' }));
            break;
          }
        }
      } catch (e) {
        console.error('❌ onmessage error:', e);
        try { 
          socket.send(JSON.stringify({ type: 'error', message: 'Failed to process message' })); 
        } catch (_) {}
      }
    };

    socket.onclose = () => {
      console.log('🔌 WebSocket closed');
    };

    socket.onerror = (err) => console.error('❌ WebSocket error:', err);

    return response;
  } catch (error) {
    console.error('❌ Server error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
