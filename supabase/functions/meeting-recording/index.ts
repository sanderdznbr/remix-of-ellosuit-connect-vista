import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { RoomCompositeEgressRequest, EgressClient } from 'npm:livekit-server-sdk@2.6.1';

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
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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

    // Initialize LiveKit Egress Client
    const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    if (action === 'start') {
      // Create the recording record FIRST to ensure we have a valid file path
      let recording = null;
      const timestamp = Date.now();
      const fileName = `${roomName}-${timestamp}.mp4`;
      const bucketName = 'meeting-recordings';
      const filePath = `${fileName}`;
      
      if (roomId && companyId && userId) {
        const { data: rec, error } = await supabase
          .from('meeting_recordings')
          .insert({
            room_id: roomId,
            company_id: companyId,
            created_by: userId,
            title: `Gravação - ${new Date().toLocaleString('pt-BR')}`,
            file_url: '', // Será preenchido pelo webhook do LiveKit
            livekit_recording_id: '', // Será atualizado após iniciar egress
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

      try {
        // Configure RoomComposite Egress request with proper output specification
        // LiveKit salvará no próprio storage temporário
        // O webhook irá fazer download e upload para Supabase
        const egressRequest: RoomCompositeEgressRequest = {
          roomName: roomName,
          layout: 'speaker-dark', // Valid layouts: grid, speaker, single-speaker (+ -light/-dark suffix)
          audioOnly: false,
          videoOnly: false,
          // Correct output configuration using file_outputs
          fileOutputs: [
            {
              fileType: 'MP4', // MP4, OGG, or WEBM
              filepath: filePath,
            },
          ],
        };

        console.log('Starting LiveKit Egress with config:', JSON.stringify(egressRequest, null, 2));

        // Start recording via LiveKit SDK
        const egressInfo = await egressClient.startRoomCompositeEgress(roomName, egressRequest);
        
        console.log('LiveKit recording started:', egressInfo);

        // Atualizar registro com LiveKit Recording ID
        if (recording) {
          await supabase
            .from('meeting_recordings')
            .update({ livekit_recording_id: egressInfo.egressId })
            .eq('id', recording.id);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          recording_id: recording?.id || '',
          livekit_recording_id: egressInfo.egressId || ''
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('LiveKit recording error:', error);
        
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
          throw error;
        }
      }

    } else if (action === 'stop') {
      // Stop recording via LiveKit SDK
      if (livekitRecordingId && LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL) {
        try {
          const egressInfo = await egressClient.stopEgress(livekitRecordingId);
          console.log('LiveKit recording stopped successfully:', egressInfo);
        } catch (error) {
          console.error('Failed to stop LiveKit recording:', error);
        }
      }

      // Update recording status only if we have a valid recordingId
      if (recordingId) {
        const { error } = await supabase
          .from('meeting_recordings')
          .update({ 
            // File URL already set during creation
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