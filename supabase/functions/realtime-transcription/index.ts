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

  // Helper function to convert PCM to WAV format
  const pcmToWav = (pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array => {
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
      formData.append('language', 'pt');
      formData.append('response_format', 'verbose_json');
      formData.append('temperature', '0.0'); // Usar temperatura 0 para transcrições mais precisas
      // Prompt MUITO mais específico e rigoroso
      formData.append('prompt', 'Transcrição profissional de reunião corporativa. IMPORTANTE: Transcreva SOMENTE fala humana nítida e clara de participantes da reunião. IGNORE COMPLETAMENTE e NÃO transcreva: música de fundo, sons de vídeos do YouTube, legendas automáticas, notificações, ruídos ambientes, tosse, respiração, sons de digitação, cliques, repetições sem sentido, sons de aplicativos.');

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
      
      // Se a probabilidade de "não fala" é alta, ignorar (mais rigoroso)
      if (noSpeechProb > 0.4) {
        console.log('⚠️ Alta probabilidade de não-fala detectada:', noSpeechProb);
        return '';
      }
      
      // Filtrar transcrições muito curtas (menos de 20 caracteres - mais rigoroso)
      if (text.length < 20) {
        console.log('⚠️ Transcrição muito curta, ignorando:', text);
        return '';
      }
      
      // Filtrar padrões de ruído comuns - versão EXTREMAMENTE rigorosa
      const noisePatterns = [
        /^[eéaáií\s]+$/i,              // "E aí", "é é é"
        /^(e\s*aí\s*){2,}/i,           // "E aí E aí E aí"
        /^(da)+$/i,                    // "DADADADA"
        /^(pa|ra|rá)+$/i,              // "Parará, parará"
        /amara\.?org/i,                // "Amara.org" ou "Amara org"
        /legendas?\s+(pela\s+)?comunidade/i, // "Legendas pela comunidade"
        /^[a-záéíóú]{1,2}(\s[a-záéíóú]{1,2})+$/i, // Repetições de letras curtas
        /^[\.\s]+$/,                   // Apenas pontos e espaços
        /^(tchau[,\s]*){2,}/i,         // "Tchau, tchau!"
        /^(oi[,\s]*){2,}/i,            // "Oi oi oi"
        /^(\w{1,3}\s*){5,}$/i,         // Palavras muito curtas repetidas
        /subtitles?\s+by/i,            // "Subtitles by"
        /^[^\w]*$/,                    // Apenas caracteres não-palavra
        /inscre[vw]/i,                 // "Inscreva-se", "inscreve"
        /canal/i,                      // "canal"
        /v[ií]deo/i,                   // "vídeo"
        /ative?.*(sino|notifica)/i,    // "ative o sino", "ative notificações"
        /compartilh/i,                 // "compartilhe"
        /like/i,                       // "like"
        /^(na|da|de|em|para|pro|pra)\s+$/i, // Preposições isoladas
        /youtube/i,                    // "YouTube"
        /^(um|uma|dois|duas|três)\s+$/i, // Números isolados
      ];
      
      for (const pattern of noisePatterns) {
        if (pattern.test(text)) {
          console.log('⚠️ Padrão de ruído detectado, ignorando:', text);
          return '';
        }
      }
      
      // Verificar se tem palavras reais (não apenas repetições)
      const words = text.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words);
      
      // Se mais de 60% das palavras são repetições, provavelmente é ruído (mais rigoroso)
      if (words.length > 3 && uniqueWords.size / words.length < 0.4) {
        console.log('⚠️ Muitas repetições detectadas, ignorando:', text);
        return '';
      }
      
      // Filtrar frases comuns de YouTube/vídeos
      const youtubeKeywords = ['inscreva', 'se inscreva', 'ative o sino', 'deixe seu like', 'compartilhe', 'canal'];
      const lowerText = text.toLowerCase();
      const hasYouTubeContent = youtubeKeywords.some(keyword => lowerText.includes(keyword));
      
      if (hasYouTubeContent) {
        console.log('⚠️ Conteúdo de vídeo do YouTube detectado, ignorando:', text);
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
          
          // Process buffer every 3-4 seconds (better for real-time quality)
          const bufferSize = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
          const timeSinceStart = Date.now() - bufferStartTime;
          
          console.log(`📊 Buffer status: ${bufferSize} bytes, ${timeSinceStart}ms elapsed`);
          
          if (timeSinceStart >= 3000 || bufferSize >= 3 * 1024 * 1024) {
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
                
                // Save backup incrementally to database
                try {
                  if (roomId && fullTranscript.trim().length > 20) {
                    const { error: upsertError } = await supabase
                      .from('meeting_recordings')
                      .upsert({
                        room_id: roomId,
                        title: `Reunião ${roomId} - ${new Date().toLocaleDateString('pt-BR')}`,
                        transcript: fullTranscript.trim(),
                        file_url: '',
                        company_id: roomId, 
                        created_by: roomId,
                        duration_seconds: Math.floor((Date.now() - bufferStartTime) / 1000)
                      }, {
                        onConflict: 'room_id'
                      });
                    if (upsertError) {
                      console.error('⚠️ Erro ao salvar backup:', upsertError);
                    } else {
                      console.log('💾 Backup salvo no banco');
                    }
                  }
                } catch (dbError) {
                  console.error('⚠️ Erro ao salvar backup:', dbError);
                }
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
        
        // Save full transcript to meeting recording with UPSERT
        if (fullTranscript.trim()) {
          console.log('Saving full transcript to database for room:', roomId);
          const { error: upsertError } = await supabase
            .from('meeting_recordings')
            .upsert({
              room_id: roomId,
              title: `Reunião ${roomId} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
              transcript: fullTranscript.trim(),
              file_url: '',
              company_id: roomId,
              created_by: roomId,
              duration_seconds: Math.floor((Date.now() - bufferStartTime) / 1000)
            }, {
              onConflict: 'room_id'
            });
          
          if (upsertError) {
            console.error('Error saving transcript:', upsertError);
          } else {
            console.log('✅ Full transcript saved successfully');
          }
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