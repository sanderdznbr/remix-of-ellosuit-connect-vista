import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

// Robust auth for LiveKit Egress: try JWT first, then fall back to key:secret pair
async function egressFetch(url: string, body: any, opts: { apiKey: string; apiSecret: string }) {
  const { apiKey, apiSecret } = opts;

  // Build a minimal JWT compatible with LiveKit REST using HMAC-SHA256
  const token = await buildJwt(apiKey, apiSecret, { video: { roomRecord: true } });

  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.ok) return res;

  // Fallback: Bearer apiKey:apiSecret (supported by Twirp endpoints)
  res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}:${apiSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res;
}

// Small JWT builder (Deno compatible)
async function buildJwt(apiKey: string, apiSecret: string, payloadExt: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
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

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      throw new Error('LiveKit credentials are not configured');
    }

    if (action === 'start') {
      const egressBody = {
        room_name: roomName,
        layout: 'speaker-dark',
        audio_only: false,
        video_only: false,
        custom_base_url: '',
        file: {
          filepath: `recordings/${roomName}-${Date.now()}.mp4`,
          output: 'MP4',
        },
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
        throw new Error(`Failed to start LiveKit recording: ${errorText}`);
      }

      const recordingData = await recordingResponse.json();
      console.log('LiveKit recording started:', recordingData);

      // Create recording record in database
      const { data: recording, error } = await supabase
        .from('meeting_recordings')
        .insert({
          room_id: roomName,
          company_id: companyId,
          created_by: userId,
          title: `Gravação - ${new Date().toLocaleString('pt-BR')}`,
          file_url: '', // Will be updated when recording is processed
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        recording_id: recording.id,
        livekit_recording_id: recordingData.egress_id || recordingData.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'stop') {
      const stopBody = { egress_id: livekitRecordingId };

      // Stop recording via LiveKit API with robust auth
      const stopResponse = await egressFetch(
        `${LIVEKIT_URL}/twirp/livekit.Egress/StopEgress`,
        stopBody,
        { apiKey: LIVEKIT_API_KEY, apiSecret: LIVEKIT_API_SECRET }
      );

      if (!stopResponse.ok) {
        const t = await stopResponse.text();
        console.error('Failed to stop LiveKit recording:', t);
      }

      // Update recording status
      const { error } = await supabase
        .from('meeting_recordings')
        .update({ 
          file_url: `recordings/${roomName || 'room'}-recording.mp4`,
          duration_seconds: 0 // Will be updated by webhook
        })
        .eq('id', recordingId);

      if (error) {
        console.error('Database update error:', error);
      }

      console.log('Recording stopped:', livekitRecordingId);

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