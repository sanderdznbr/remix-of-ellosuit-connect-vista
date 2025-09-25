import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RoomState = {
  sockets: Set<WebSocket>;
  peers: Map<string, WebSocket>; // peerId -> socket
  participants: Map<WebSocket, { participantId: string | null; peerId: string; userId: string | null }>; // per socket
};

const rooms = new Map<string, RoomState>(); // roomId -> state

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

    let roomId: string | null = null;
    let participantId: string | null = null;
    let peerId: string | null = null;
    let userId: string | null = null;

    socket.onopen = () => {
      console.log('🔌 WebSocket opened');
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'join-room': {
            const roomCode: string = data.roomCode;
            const displayName: string = data.displayName;
            userId = data.userId ?? null;

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

            roomId = room.id;
            peerId = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            const { data: participant, error: participantError } = await supabase
              .from('room_participants')
              .insert({
                room_id: roomId,
                user_id: userId,
                display_name: displayName,
                peer_id: peerId,
                is_host: userId ? room.created_by === userId : false,
                connection_status: 'connected',
              })
              .select()
              .single();
            if (participantError || !participant) {
              console.error('Error adding participant', participantError);
              socket.send(JSON.stringify({ type: 'error', message: 'Failed to join room' }));
              return;
            }
            participantId = participant.id;

            const state: RoomState = rooms.get(roomId!) ?? { sockets: new Set(), peers: new Map(), participants: new Map() };
            rooms.set(roomId!, state);
            state.sockets.add(socket);
            state.peers.set(peerId, socket);
            state.participants.set(socket, { participantId, peerId, userId });

            // other active participants (exclude this one)
            const { data: others } = await supabase
              .from('room_participants')
              .select('id, peer_id, display_name')
              .eq('room_id', roomId)
              .is('left_at', null)
              .neq('id', participantId);

            socket.send(JSON.stringify({
              type: 'joined-room',
              room,
              participant,
              peerId,
              otherParticipants: others ?? [],
            }));

            console.log(`New participant joined: ${displayName} (${peerId}) in room ${roomId}`);
            console.log(`Room now has ${state.sockets.size} sockets and ${state.peers.size} peers`);

            // notify others
            for (const s of state.sockets) {
              if (s !== socket) {
                try {
                  s.send(JSON.stringify({ type: 'participant-joined', participant }));
                  console.log(`Notified existing participant about new join: ${displayName}`);
                } catch (_) {}
              }
            }
            break;
          }

          case 'webrtc-offer':
          case 'webrtc-answer':
          case 'webrtc-ice-candidate': {
            if (!roomId || !peerId) return;
            const targetPeerId: string = data.targetPeerId;
            console.log(`Routing ${data.type} from ${peerId} to ${targetPeerId}`);
            
            const state = rooms.get(roomId);
            const targetSocket = state?.peers.get(targetPeerId);
            if (targetSocket) {
              try {
                targetSocket.send(JSON.stringify({
                  type: data.type,
                  fromPeerId: peerId,
                  data,
                }));
                console.log(`Successfully routed ${data.type} to ${targetPeerId}`);
              } catch (e) {
                console.error(`Failed to route ${data.type} to ${targetPeerId}:`, e);
              }
            } else {
              console.error(`Target peer ${targetPeerId} not found in room ${roomId}`);
            }
            break;
          }

          case 'chat-message': {
            if (!roomId || !participantId) return;
            const { data: message, error } = await supabase
              .from('room_chat_messages')
              .insert({ room_id: roomId, participant_id: participantId, message: data.message, message_type: 'text' })
              .select('id, message, created_at')
              .single();
            if (!error) {
              const state = rooms.get(roomId);
              for (const s of state?.sockets ?? []) {
                try { s.send(JSON.stringify({ type: 'chat-message', message })); } catch (_) {}
              }
            }
            break;
          }
          
          case 'ping': {
            try {
              socket.send(JSON.stringify({ type: 'pong' }));
            } catch (_) {}
            break;
          }
        }
      } catch (e) {
        console.error('onmessage error', e);
        try { socket.send(JSON.stringify({ type: 'error', message: 'Failed to process message' })); } catch (_) {}
      }
    };

    socket.onclose = async () => {
      try {
        if (roomId) {
          const state = rooms.get(roomId);
          const p = state?.participants.get(socket);
          if (state) {
            state.sockets.delete(socket);
            if (p) state.peers.delete(p.peerId);
            state.participants.delete(socket);
          }
          if (participantId) {
            await supabase
              .from('room_participants')
              .update({ left_at: new Date().toISOString(), connection_status: 'disconnected' })
              .eq('id', participantId);
          }
          // notify others
          for (const s of state?.sockets ?? []) {
            try { s.send(JSON.stringify({ type: 'participant-left', participantId })); } catch (_) {}
          }
        }
      } catch (e) {
        console.error('onclose error', e);
      }
    };

    socket.onerror = (err) => console.error('❌ WebSocket error', err);

    return response;
  } catch (error) {
    console.error('❌ Server error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
