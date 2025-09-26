import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, roomName, userId, companyId } = await req.json();
    console.log('Recording action:', { action, roomName, userId, companyId });

    if (action === 'start') {
      // Start recording via LiveKit Recording API
      const recordingResponse = await fetch(`${LIVEKIT_URL}/recording/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LIVEKIT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: roomName,
          output: {
            type: 'file',
            file_outputs: [{
              file_type: 'mp4',
              filepath: `recordings/${roomName}-${Date.now()}.mp4`
            }]
          }
        })
      });

      if (!recordingResponse.ok) {
        throw new Error('Failed to start LiveKit recording');
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
          title: `Recording - ${new Date().toLocaleString()}`,
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
        livekit_recording_id: recordingData.recording_id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'stop') {
      const { recordingId, livekitRecordingId } = await req.json();

      // Stop recording via LiveKit API
      const stopResponse = await fetch(`${LIVEKIT_URL}/recording/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LIVEKIT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recording_id: livekitRecordingId
        })
      });

      if (!stopResponse.ok) {
        console.error('Failed to stop LiveKit recording');
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