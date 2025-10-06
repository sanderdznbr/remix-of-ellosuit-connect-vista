import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TranscriptionMessage {
  text: string;
  is_final: boolean;
  timestamp: string;
  speaker?: string;
}

interface LiveKitAudioCaptureProps {
  isActive: boolean;
  roomName: string;
  onTranscriptionUpdate: (message: TranscriptionMessage) => void;
}

export const LiveKitAudioCapture: React.FC<LiveKitAudioCaptureProps> = ({
  isActive,
  roomName,
  onTranscriptionUpdate
}) => {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<Int16Array>(new Int16Array(0));
  const lastSendTimeRef = useRef<number>(0);
  const lastTranscriptRef = useRef<string>('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    startCapture();

    return () => cleanup();
  }, [isActive, roomName]);

  // Check for similar text (duplicate detection)
  const isSimilarText = (text1: string, text2: string): boolean => {
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    
    if (norm1 === norm2) return true;
    if (norm1.includes(norm2) && norm2.length > 10) return true;
    if (norm2.includes(norm1) && norm1.length > 10) return true;
    
    return false;
  };

  const startCapture = async () => {
    try {
      console.log('🎤 Iniciando captura SEPARADA de áudio para transcrição...');
      console.log('📍 Este canal é INDEPENDENTE do LiveKit');

      // IMPORTANTE: Criar stream INDEPENDENTE apenas para transcrição
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      
      console.log('✅ Canal de transcrição criado:', {
        deviceId: settings.deviceId,
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount
      });

      // Create AudioContext with exact configuration from InPersonMeeting
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      console.log('🎵 AudioContext criado - Sample Rate:', audioContextRef.current.sampleRate);

      // Connect to WebSocket BEFORE processing audio
      await connectWebSocket();

      // Process audio in real-time (exactly like InPersonMeeting)
      processorRef.current.onaudioprocess = (e) => {
        if (!isActive || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 (PCM16)
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Accumulate audio and send when buffer is large enough
        accumulateAndSendAudio(int16Data);
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      console.log('✅ Pipeline de áudio PCM16 conectado');

    } catch (error) {
      console.error('❌ Erro ao iniciar captura:', error);
      toast({
        title: "Erro na Transcrição",
        description: "Não foi possível acessar o microfone para transcrição",
        variant: "destructive"
      });
    }
  };

  // Exactly like InPersonMeeting - accumulate and send intelligently
  const accumulateAndSendAudio = (pcm16Data: Int16Array) => {
    // Accumulate audio in buffer
    const combined = new Int16Array(audioBufferRef.current.length + pcm16Data.length);
    combined.set(audioBufferRef.current);
    combined.set(pcm16Data, audioBufferRef.current.length);
    audioBufferRef.current = combined;

    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    const bufferDurationMs = (audioBufferRef.current.length / 24000) * 1000;

    // Send only if:
    // 1. Buffer has at least 3 seconds of audio
    // 2. At least 2 seconds passed since last send
    if (bufferDurationMs >= 3000 && timeSinceLastSend >= 2000) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log(`🎵 Enviando ${audioBufferRef.current.length} samples (${bufferDurationMs.toFixed(0)}ms)`);
        
        // Convert to Uint8Array for base64 encoding
        const uint8Array = new Uint8Array(audioBufferRef.current.buffer);
        let binary = '';
        const chunkSize = 0x8000;
        
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        const base64Audio = btoa(binary);
        
        wsRef.current.send(JSON.stringify({
          type: 'audio_data',
          audio: base64Audio
        }));

        // Clear buffer and update timestamp
        audioBufferRef.current = new Int16Array(0);
        lastSendTimeRef.current = now;
      }
    }
  };

  const connectWebSocket = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://jwddiyuezqrpuakazvgg.functions.supabase.co/functions/v1/realtime-transcription`;
        console.log('🔌 Conectando WebSocket:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ WebSocket conectado para transcrição');
          setIsConnected(true);
          
          // Reset state for new session
          lastTranscriptRef.current = '';
          audioBufferRef.current = new Int16Array(0);
          lastSendTimeRef.current = Date.now();

          // Start transcription
          ws.send(JSON.stringify({
            type: 'start_transcription',
            roomId: roomName
          }));

          console.log('📡 Transcrição iniciada para sala:', roomName);
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📥 WebSocket:', data.type);

            if (data.type === 'transcript_update') {
              if (data.is_final) {
                // Check for duplicate text
                const isDuplicate = isSimilarText(data.text, lastTranscriptRef.current);
                
                if (!isDuplicate && data.text.trim().length > 0) {
                  lastTranscriptRef.current = data.text;
                  
                  onTranscriptionUpdate({
                    text: data.text,
                    is_final: true,
                    timestamp: data.timestamp || new Date().toISOString(),
                    speaker: data.speaker || 'Participante'
                  });
                } else {
                  console.log('⏭️ Texto duplicado ignorado');
                }
              } else {
                // Partial transcript
                onTranscriptionUpdate({
                  text: data.text,
                  is_final: false,
                  timestamp: data.timestamp || new Date().toISOString(),
                  speaker: data.speaker || 'Participante'
                });
              }
            } else if (data.type === 'error') {
              console.error('❌ Erro do servidor:', data.error);
              toast({
                title: "Erro na Transcrição",
                description: data.error,
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setIsConnected(false);
          toast({
            title: "Erro de Conexão",
            description: "Falha na conexão com serviço de transcrição",
            variant: "destructive"
          });
          reject(error);
        };

        ws.onclose = (event) => {
          console.log('🔌 WebSocket desconectado:', event.code, event.reason);
          setIsConnected(false);
          
          // Try to reconnect if not a normal closure
          if (isActive && event.code !== 1000) {
            console.log('🔄 Tentando reconectar em 3 segundos...');
            setTimeout(() => {
              if (isActive) {
                connectWebSocket();
              }
            }, 3000);
          }
        };

      } catch (error) {
        console.error('❌ Erro ao conectar WebSocket:', error);
        reject(error);
      }
    });
  };

  const cleanup = () => {
    console.log('🧹 Limpando captura de áudio...');

    // Send final audio buffer
    if (audioBufferRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`🎵 Enviando áudio final: ${audioBufferRef.current.length} samples`);
      
      const uint8Array = new Uint8Array(audioBufferRef.current.buffer);
      let binary = '';
      const chunkSize = 0x8000;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binary);
      
      wsRef.current.send(JSON.stringify({
        type: 'audio_data',
        audio: base64Audio
      }));
    }

    // Stop transcription
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_transcription' }));
    }

    // Disconnect audio pipeline
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    audioBufferRef.current = new Int16Array(0);
    lastTranscriptRef.current = '';
    setIsConnected(false);
    
    console.log('✅ Limpeza concluída');
  };

  return null;
};
