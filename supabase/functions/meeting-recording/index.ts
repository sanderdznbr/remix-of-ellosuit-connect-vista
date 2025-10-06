import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

// Helper to call LiveKit Egress with robust auth (JWT first, then fallback)
async function egressFetch(url: string, body: any, opts: { apiKey: string; apiSecret: string }) {
  const { apiKey, apiSecret } = opts;

  // Build a minimal JWT compatible with LiveKit Egress
  const token = await buildJwt(apiKey, apiSecret, { video: { roomRecord: true } });

  // Attempt 1: Bearer JWT
  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.ok) return res;

  const t1 = await res.text();
  console.error('Egress JWT attempt failed:', t1);

  // Attempt 2: Bearer apiKey:apiSecret (some deployments accept this)
  res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}:${apiSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.ok) return res;

  const t2 = await res.text();
  console.error('Egress key:secret attempt failed:', t2);

  // Attempt 3: explicit headers (defensive)
  res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'LiveKit-Api-Key': apiKey,
      'LiveKit-Api-Secret': apiSecret,
    } as any,
    body: JSON.stringify(body),
  });
  return res;
}

// Small JWT builder (Deno compatible)
async function buildJwt(apiKey: string, apiSecret: string, payloadExt: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' } as const;
  const payload = { iss: apiKey, iat: now, exp: now + 60 * 10, ...payloadExt };
  const enc = (obj: any) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');
  const data = `${enc(header)}.${enc(payload)}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');
  return `${data}.${signature}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY') ?? '';
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET') ?? '';
const LIVEKIT_URL = (Deno.env.get('LIVEKIT_URL') ?? '').replace('wss://', 'https://');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, roomName, userId, companyId, recordingId, livekitRecordingId } = await req.json();
    console.log('Recording action:', { action, roomName, userId, companyId, recordingId, livekitRecordingId });

    // Resolve room_id (uuid) from room_code (text) first
    const { data: room, error: roomErr } = await supabase
      .from('meeting_rooms')
      .select('id')
      .eq('room_code', roomName)
      .single();

    if (roomErr || !room) {
      console.error('Room lookup error:', roomErr);
      // If LiveKit fails, still allow fallback recording by returning a success response
      if (action === 'start') {
        return new Response(JSON.stringify({ 
          success: true, 
          fallback: true,
          message: 'Using fallback recording method'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Sala não encontrada');
    }

    const roomId: string = room.id as string;

    // Check LiveKit credentials - if missing, use fallback
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      console.warn('LiveKit credentials not configured, using fallback');
      if (action === 'start') {
        return new Response(JSON.stringify({ 
          success: true, 
          fallback: true,
          message: 'LiveKit not configured, using fallback recording'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'start') {
      // Create the recording record FIRST to ensure we have a valid file path
      let recording = null;
      const timestamp = Date.now();
      const fileName = `${roomName}-${timestamp}.mp4`;
      const filePath = `meeting-recordings/${fileName}`; // Use full path with bucket name
      
      if (roomId && companyId && userId) {
        const { data: rec, error } = await supabase
          .from('meeting_recordings')
          .insert({
            room_id: roomId,
            company_id: companyId,
            created_by: userId,
            title: `Gravação - ${new Date().toLocaleString('pt-BR')}`,
            file_url: filePath, // Set file path immediately
          })
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          throw new Error('Erro ao criar registro de gravação');
        } else {
          recording = rec;
          console.log('Recording record created:', recording.id);
        }
      }

      // Configure LiveKit egress with proper output specification
      const egressBody = {
        room_name: roomName,
        layout: 'speaker-dark',
        audio_only: false,
        video_only: false,
        custom_base_url: '',
        // Fixed: Add proper output configuration
        output: {
          case: 'file',
          file: {
            filepath: filePath,
            output: 'MP4',
          }
        }
      };

      // Start recording via LiveKit Recording API with robust auth
      let recordingResponse = await egressFetch(
        `${LIVEKIT_URL}/twirp/livekit.Egress/StartRoomCompositeEgress`,
        egressBody,
        { apiKey: LIVEKIT_API_KEY, apiSecret: LIVEKIT_API_SECRET }
      );

      if (!recordingResponse.ok) {
        const errorText = await recordingResponse.text();
        console.error('LiveKit recording error:', errorText);
        
        // If LiveKit fails but we created a database record, keep it for manual recording
        if (recording) {
          console.log('Recording started: manual/fallback mode');
          return new Response(JSON.stringify({ 
            success: true, 
            recording_id: recording.id,
            fallback: true,
            message: 'Gravação iniciada em modo manual - certifique-se de gravar localmente'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          throw new Error('Falha ao iniciar gravação');
        }
      }

      const recordingData = await recordingResponse.json();
      console.log('LiveKit recording started:', recordingData);

      return new Response(JSON.stringify({ 
        success: true, 
        recording_id: recording?.id || '',
        livekit_recording_id: recordingData.egress_id || recordingData.id || ''
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'stop') {
      // Only attempt LiveKit stop if we have the required data
      if (livekitRecordingId && LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL) {
        const stopBody = { egress_id: livekitRecordingId };

        const stopResponse = await egressFetch(
          `${LIVEKIT_URL}/twirp/livekit.Egress/StopEgress`,
          stopBody,
          { apiKey: LIVEKIT_API_KEY, apiSecret: LIVEKIT_API_SECRET }
        );

        if (!stopResponse.ok) {
          const t = await stopResponse.text();
          console.error('Failed to stop LiveKit recording:', t);
        } else {
          console.log('LiveKit recording stopped successfully');
        }
      }

      // Update recording status only if we have a valid recordingId
      if (recordingId) {
        const { error } = await supabase
          .from('meeting_recordings')
          .update({ 
            file_url: `meeting-recordings/${roomName || 'room'}-${Date.now()}.mp4`,
            duration_seconds: 0 // Will be updated by webhook when available
          })
          .eq('id', recordingId);

        if (error) {
          console.error('Database update error:', error);
        } else {
          console.log('Recording database record updated');
        }
      }

      console.log('Recording stopped:', livekitRecordingId || 'fallback');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in meeting-recording function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});