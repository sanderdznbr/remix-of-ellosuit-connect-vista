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

const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let assemblySocket: WebSocket | null = null;
  let isTranscribing = false;
  let roomId = '';
  let fullTranscript = '';

  socket.onopen = () => {
    console.log('WebSocket connection established with client');
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data.type);

      if (data.type === 'start_transcription') {
        roomId = data.roomId;
        
        // Initialize AssemblyAI real-time transcription
        assemblySocket = new WebSocket('wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&word_boost=%5B%5D&spelling_correction=false');

        assemblySocket.onopen = () => {
          console.log('Connected to AssemblyAI');
          // Send auth message first
          assemblySocket?.send(JSON.stringify({
            audio_data: ASSEMBLYAI_API_KEY
          }));
          isTranscribing = true;
          socket.send(JSON.stringify({ 
            type: 'transcription_started',
            message: 'Transcrição iniciada com sucesso'
          }));
        };

        assemblySocket.onmessage = async (assemblyEvent) => {
          const transcriptionData = JSON.parse(assemblyEvent.data);
          console.log('AssemblyAI message:', transcriptionData);
          
          if (transcriptionData.message_type === 'FinalTranscript') {
            const transcript = transcriptionData.text;
            fullTranscript += transcript + ' ';
            
            console.log('Final transcript:', transcript);
            
            // Send transcript to client
            socket.send(JSON.stringify({
              type: 'transcript_update',
              text: transcript,
              is_final: true,
              timestamp: new Date().toISOString()
            }));
            
            // Save to database as chat message
            await supabase.from('room_chat_messages').insert({
              room_id: roomId,
              participant_id: null,
              message: transcript,
              message_type: 'transcript'
            });
          }
          
          if (transcriptionData.message_type === 'PartialTranscript') {
            socket.send(JSON.stringify({
              type: 'transcript_update',
              text: transcriptionData.text,
              is_final: false,
              timestamp: new Date().toISOString()
            }));
          }
        };

        assemblySocket.onerror = (error) => {
          console.error('AssemblyAI WebSocket error:', error);
          socket.send(JSON.stringify({ 
            type: 'transcription_error',
            error: 'Erro na conexão com o serviço de transcrição'
          }));
        };

      } else if (data.type === 'audio_data' && assemblySocket && isTranscribing) {
        // Forward audio data to AssemblyAI
        if (assemblySocket.readyState === WebSocket.OPEN) {
          assemblySocket.send(JSON.stringify({
            audio_data: data.audio
          }));
        }
        
      } else if (data.type === 'stop_transcription') {
        isTranscribing = false;
        
        if (assemblySocket) {
          assemblySocket.send(JSON.stringify({ terminate_session: true }));
          assemblySocket.close();
        }
        
        // Save full transcript to meeting recording
        if (fullTranscript.trim()) {
          await supabase
            .from('meeting_recordings')
            .update({ transcript: fullTranscript.trim() })
            .eq('room_id', roomId);
        }
        
        socket.send(JSON.stringify({ 
          type: 'transcription_stopped',
          full_transcript: fullTranscript.trim()
        }));
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      socket.send(JSON.stringify({ 
        type: 'error',
        error: (error as Error).message 
      }));
    }
  };

  socket.onclose = () => {
    console.log('Client disconnected');
    if (assemblySocket) {
      assemblySocket.close();
    }
  };

  return response;
});