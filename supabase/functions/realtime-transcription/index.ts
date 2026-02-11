import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

  // Helper function to convert PCM to WAV format - otimizado para 48kHz
  const pcmToWav = (pcmData: Uint8Array, sampleRate: number = 48000): Uint8Array => {
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    // "RIFF" chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + pcmData.length, true); // file size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"
    
    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // subchunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, 1, true); // number of channels (1 = mono)
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, pcmData.length, true); // data size
    
    // Combine header and PCM data
    const wavFile = new Uint8Array(44 + pcmData.length);
    wavFile.set(new Uint8Array(wavHeader), 0);
    wavFile.set(pcmData, 44);
    
    return wavFile;
  };

  // Helper function to transcribe audio with Whisper
  const transcribeAudioChunk = async (audioData: Uint8Array) => {
    try {
      console.log('Transcribing audio chunk with Whisper, size:', audioData.length);
      
      // Convert PCM to WAV format
      const wavData = pcmToWav(audioData);
      console.log('Converted to WAV, size:', wavData.length);
      
      const formData = new FormData();
      const blob = new Blob([wavData], { type: 'audio/wav' });
      formData.append('file', blob, 'audio.wav');
      formData.append('model', 'whisper-1');
      
      // Otimizações críticas para português brasileiro
      formData.append('language', 'pt'); // Português
      formData.append('response_format', 'verbose_json');
      formData.append('temperature', '0.3'); // Mais flexível para fala natural
      
      // Prompt mais simples e natural
      formData.append('prompt', 'Esta é uma reunião de negócios em português brasileiro. Transcreva exatamente o que foi dito pelos participantes, usando pontuação natural e vocabulário profissional. Ignore ruídos de fundo.');

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
      
      // Validar qualidade da transcrição
      const text = result.text?.trim() || '';
      const noSpeechProb = result.segments?.[0]?.no_speech_prob || 0;
      const avgLogprob = result.segments?.[0]?.avg_logprob || 0;
      
      console.log('📊 Qualidade da transcrição:', {
        text: text.substring(0, 50),
        noSpeechProb,
        avgLogprob,
        length: text.length
      });
      
      // If probability of "no speech" is very high, ignore
      if (noSpeechProb > 0.8) {
        console.log('⚠️ Alta probabilidade de não-fala:', noSpeechProb);
        return '';
      }
      
      // Filter very short transcriptions (less than 5 characters - more permissive)
      if (text.length < 5) {
        console.log('⚠️ Transcrição muito curta, ignorando:', text);
        return '';
      }
      
      // Very low confidence means noise
      if (avgLogprob < -1.5) {
        console.log('⚠️ Confiança muito baixa:', avgLogprob);
        return '';
      }
      
      // Filtrar padrões de ruído comuns - mais focado apenas em ruídos óbvios
      const noisePatterns = [
        /^[,.!?;:\s]+$/,                  // Apenas pontuação
        /^(uh+|um+|ah+|eh+|hm+|mhm+|mmm+|hmm+)$/i, // Sons de preenchimento
        /^(\w)\1{8,}$/,                   // Repetição de caractere único (aaaaaaaa) - mais permissivo
        /^[^a-zA-ZÀ-ÿ]+$/,                // Sem letras reais
        /^(youtube|inscreva-se no canal|like e compartilh)/i, // YouTube jargon específico
        /^\[.*\]$/,                       // Sons entre colchetes [MÚSICA], [RUÍDO]
        /^www\.|http/i,                   // URLs
      ];
      
      for (const pattern of noisePatterns) {
        if (pattern.test(text)) {
          console.log('⚠️ Padrão de ruído detectado, ignorando:', text);
          return '';
        }
      }
      
      // Verificar se tem palavras reais (não apenas repetições) - threshold mais rigoroso
      const words = text.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words);
      
      // Se mais de 60% das palavras são repetições, provavelmente é ruído (mais rigoroso que 70%)
      if (words.length > 3 && uniqueWords.size / words.length < 0.4) {
        console.log('⚠️ Muitas repetições detectadas, ignorando:', text);
        return '';
      }
      
      return text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 Mensagem recebida do cliente - Tipo:', data.type);

      if (data.type === 'start_transcription') {
        roomId = data.roomId;
        isTranscribing = true;
        audioBuffer = [];
        bufferStartTime = Date.now();
        fullTranscript = '';
        
        console.log('✅ Started transcription for room:', roomId);
        
        socket.send(JSON.stringify({ 
          type: 'transcription_started',
          message: 'Transcrição iniciada com sucesso'
        }));

      } else if (data.type === 'audio_data' && isTranscribing) {
        console.log('🎤 Áudio recebido, tamanho base64:', data.audio?.length || 0);
        try {
          // Validar formato de áudio
          if (!data.audio || typeof data.audio !== 'string') {
            console.error('❌ Formato de áudio inválido');
            socket.send(JSON.stringify({
              type: 'error',
              error: 'Formato de áudio inválido'
            }));
            return;
          }

          // Decode base64 audio data
          const binaryString = atob(data.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          console.log('✅ Áudio decodificado:', bytes.length, 'bytes');
          
          // Validar tamanho mínimo
          if (bytes.length < 100) {
            console.warn('⚠️ Chunk de áudio muito pequeno, ignorando');
            return;
          }
          
          audioBuffer.push(bytes);
          
          // Process buffer every 5 seconds or when large enough (melhor qualidade com chunks maiores)
          const bufferSize = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
          const timeSinceStart = Date.now() - bufferStartTime;
          
          console.log(`📊 Buffer status: ${bufferSize} bytes, ${timeSinceStart}ms elapsed`);
          
          // Chunks maiores = melhor contexto e precisão para português
          if (timeSinceStart >= 5000 || bufferSize >= 4 * 1024 * 1024) {
            console.log('🔄 Processing audio buffer NOW - size:', bufferSize, 'time:', timeSinceStart);
            
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
              console.log('🎯 Sending to Whisper API...');
              const transcript = await transcribeAudioChunk(combinedAudio);
              
              // Apenas envia se houver transcrição válida (não vazia após filtragem)
              if (transcript && transcript.trim().length >= 10) {
                console.log('✅ Transcription successful:', transcript);
                fullTranscript += transcript + ' ';
                
                // Send to client
                socket.send(JSON.stringify({
                  type: 'transcript_update',
                  text: transcript,
                  is_final: true,
                  timestamp: new Date().toISOString()
                }));
                console.log('📤 Sent transcript to client');
                
                // Note: We skip incremental DB saves here since room_id != company_id
                // The full transcript will be saved when transcription stops
                console.log('💾 Transcript updated, total length:', fullTranscript.length);
              } else {
                console.log('⚠️ Transcrição vazia ou filtrada, não enviando ao cliente');
              }
            } catch (error) {
              console.error('❌ Transcription error:', error);
              // Não enviar mensagem de erro ao cliente para evitar poluir a UI
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
        
        // Note: Full transcript is sent to the client via WebSocket
        // The client (SimpleLiveKitRoom) handles saving via autoSaveMeeting()
        if (fullTranscript.trim()) {
          console.log('📝 Full transcript ready, length:', fullTranscript.trim().length);
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