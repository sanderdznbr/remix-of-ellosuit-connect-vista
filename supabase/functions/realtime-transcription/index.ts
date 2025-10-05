import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let isTranscribing = false;
  let roomId = '';
  let fullTranscript = '';
  let audioBuffer: Uint8Array[] = [];
  let bufferStartTime = Date.now();

  socket.onopen = () => {
    console.log('WebSocket connection established with client');
  };

  // Helper function to transcribe audio with Whisper
  const transcribeAudioChunk = async (audioData: Uint8Array) => {
    try {
      console.log('Transcribing audio chunk with Whisper, size:', audioData.length);
      
      const formData = new FormData();
      const blob = new Blob([audioData], { type: 'audio/webm' });
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');
      formData.append('response_format', 'json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Whisper API error:', response.status, errorText);
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const result = await response.json();
      return result.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data.type);

      if (data.type === 'start_transcription') {
        roomId = data.roomId;
        isTranscribing = true;
        audioBuffer = [];
        bufferStartTime = Date.now();
        fullTranscript = '';
        
        console.log('Started transcription for room:', roomId);
        
        socket.send(JSON.stringify({ 
          type: 'transcription_started',
          message: 'Transcrição iniciada com sucesso'
        }));

      } else if (data.type === 'audio_data' && isTranscribing) {
        try {
          // Decode base64 audio data
          const binaryString = atob(data.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          audioBuffer.push(bytes);
          
          // Process buffer every 5 seconds or when it reaches a certain size (5MB)
          const bufferSize = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
          const timeSinceStart = Date.now() - bufferStartTime;
          
          if (timeSinceStart >= 5000 || bufferSize >= 5 * 1024 * 1024) {
            console.log('Processing audio buffer, size:', bufferSize, 'time:', timeSinceStart);
            
            // Combine all chunks
            const totalLength = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
            const combinedAudio = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of audioBuffer) {
              combinedAudio.set(chunk, offset);
              offset += chunk.length;
            }
            
            // Transcribe
            try {
              const transcript = await transcribeAudioChunk(combinedAudio);
              
              if (transcript && transcript.trim()) {
                console.log('Transcription result:', transcript);
                fullTranscript += transcript + ' ';
                
                // Send to client
                socket.send(JSON.stringify({
                  type: 'transcript_update',
                  text: transcript,
                  is_final: true,
                  timestamp: new Date().toISOString()
                }));
              }
            } catch (error) {
              console.error('Transcription error:', error);
              socket.send(JSON.stringify({
                type: 'transcript_update',
                text: '[Erro ao transcrever este segmento]',
                is_final: false,
                timestamp: new Date().toISOString()
              }));
            }
            
            // Reset buffer
            audioBuffer = [];
            bufferStartTime = Date.now();
          }
        } catch (error) {
          console.error('Error processing audio data:', error);
        }
        
      } else if (data.type === 'stop_transcription') {
        isTranscribing = false;
        
        // Process any remaining audio in buffer
        if (audioBuffer.length > 0) {
          console.log('Processing final audio buffer');
          const totalLength = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
          const combinedAudio = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioBuffer) {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
          }
          
          try {
            const transcript = await transcribeAudioChunk(combinedAudio);
            if (transcript && transcript.trim()) {
              fullTranscript += transcript + ' ';
              
              socket.send(JSON.stringify({
                type: 'transcript_update',
                text: transcript,
                is_final: true,
                timestamp: new Date().toISOString()
              }));
            }
          } catch (error) {
            console.error('Error transcribing final buffer:', error);
          }
        }
        
        // Save full transcript to meeting recording
        if (fullTranscript.trim()) {
          console.log('Saving full transcript to database for room:', roomId);
          await supabase
            .from('meeting_recordings')
            .update({ transcript: fullTranscript.trim() })
            .eq('room_id', roomId);
        }
        
        socket.send(JSON.stringify({ 
          type: 'transcription_stopped',
          full_transcript: fullTranscript.trim()
        }));
        
        // Reset
        audioBuffer = [];
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
    isTranscribing = false;
    audioBuffer = [];
  };

  return response;
});