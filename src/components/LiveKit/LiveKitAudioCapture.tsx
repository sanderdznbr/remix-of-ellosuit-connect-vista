import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRoomContext, useRemoteParticipants } from '@livekit/components-react';

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
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mixerNodeRef = useRef<GainNode | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<Int16Array>(new Int16Array(0));
  const lastSendTimeRef = useRef<number>(0);
  const lastTranscriptRef = useRef<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    // Silently skip transcription on mobile (component won't render on mobile anyway)
    if (isMobile) {
      console.log('📱 Transcrição desabilitada em dispositivo móvel');
      return;
    }

    startCapture();

    return () => cleanup();
  }, [isActive, roomName, isMobile]);

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
      console.log('🎤 Iniciando captura de TODOS os participantes para transcrição...');
      console.log('📍 Capturando áudio local + remoto via LiveKit');

      if (!room) {
        throw new Error('Room não disponível');
      }

      // Create AudioContext para mixar todos os áudios
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      console.log('🎵 AudioContext criado - Sample Rate:', audioContextRef.current.sampleRate);

      // Criar um mixer node para combinar todos os áudios
      mixerNodeRef.current = audioContextRef.current.createGain();
      mixerNodeRef.current.gain.value = 1.0;

      // Criar o processor para capturar o áudio mixado
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      // Conectar mixer ao processor
      mixerNodeRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Capturar áudio LOCAL (do participante atual)
      await setupLocalAudio();

      // Capturar áudio REMOTO (de todos os outros participantes)
      await setupRemoteAudio();

      // Connect to WebSocket BEFORE processing audio
      await connectWebSocket();

      // Process mixed audio in real-time
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

      console.log('✅ Pipeline de áudio mixado conectado - Capturando TODOS participantes');

    } catch (error) {
      console.error('❌ Erro ao iniciar captura:', error);
      toast({
        title: "Erro na Transcrição",
        description: "Não foi possível iniciar transcrição de todos os participantes",
        variant: "destructive"
      });
    }
  };

  const setupLocalAudio = async () => {
    if (!audioContextRef.current || !mixerNodeRef.current) return;

    try {
      // Obter o microfone local
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
      
      // Criar source do áudio local
      localSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Conectar ao mixer
      localSourceRef.current.connect(mixerNodeRef.current);
      
      console.log('✅ Áudio LOCAL conectado ao mixer');
    } catch (error) {
      console.error('❌ Erro ao capturar áudio local:', error);
    }
  };

  const setupRemoteAudio = async () => {
    if (!audioContextRef.current || !mixerNodeRef.current || !room) return;

    try {
      // Obter todos os tracks de áudio remotos
      const audioTracks = Array.from(room.remoteParticipants.values())
        .flatMap(participant => Array.from(participant.audioTrackPublications.values()))
        .filter(pub => pub.track)
        .map(pub => pub.track!.mediaStreamTrack);

      console.log(`🎧 Encontrados ${audioTracks.length} tracks de áudio remotos`);

      // Criar um MediaStream com todos os tracks remotos
      if (audioTracks.length > 0) {
        const remoteStream = new MediaStream(audioTracks);
        
        // Criar source do áudio remoto
        const remoteSource = audioContextRef.current.createMediaStreamSource(remoteStream);
        
        // Conectar ao mixer
        remoteSource.connect(mixerNodeRef.current);
        
        console.log('✅ Áudio REMOTO conectado ao mixer');
      }
    } catch (error) {
      console.error('❌ Erro ao capturar áudio remoto:', error);
    }
  };

  // Exactly like InPersonMeeting - accumulate and send intelligently
  const accumulateAndSendAudio = (pcm16Data: Int16Array) => {
    // Calculate RMS (Root Mean Square) to detect if there's actual audio content
    let sum = 0;
    for (let i = 0; i < pcm16Data.length; i++) {
      sum += pcm16Data[i] * pcm16Data[i];
    }
    const rms = Math.sqrt(sum / pcm16Data.length);
    
    // Threshold MUITO mais rigoroso para detectar silêncio
    // Aumentado drasticamente para capturar APENAS fala clara
    const SILENCE_THRESHOLD = 1500;
    
    // Log do nível de áudio para debug
    if (rms > SILENCE_THRESHOLD / 2) {
      console.log('🔊 Nível RMS:', rms.toFixed(2));
    }
    
    // Se o RMS está abaixo do threshold, é silêncio - não acumula
    if (rms < SILENCE_THRESHOLD) {
      return;
    }

    // Accumulate audio in buffer
    const combined = new Int16Array(audioBufferRef.current.length + pcm16Data.length);
    combined.set(audioBufferRef.current);
    combined.set(pcm16Data, audioBufferRef.current.length);
    audioBufferRef.current = combined;

    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    const bufferDurationMs = (audioBufferRef.current.length / 24000) * 1000;

    // Send only if:
    // 1. Buffer has at least 8 seconds of audio (aumentado para 8 - mais contexto)
    // 2. At least 6 seconds passed since last send (aumentado para 6)
    if (bufferDurationMs >= 8000 && timeSinceLastSend >= 6000) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log(`🎵 Enviando ${audioBufferRef.current.length} samples (${bufferDurationMs.toFixed(0)}ms, RMS: ${rms.toFixed(2)})`);
        
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

  // Watch for new participants joining and add their audio
  useEffect(() => {
    if (!isActive || !audioContextRef.current || !mixerNodeRef.current) return;

    const updateRemoteAudio = async () => {
      await setupRemoteAudio();
    };

    updateRemoteAudio();
  }, [remoteParticipants, isActive]);

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
    if (localSourceRef.current) {
      localSourceRef.current.disconnect();
      localSourceRef.current = null;
    }
    if (mixerNodeRef.current) {
      mixerNodeRef.current.disconnect();
      mixerNodeRef.current = null;
    }
    // Disconnect all remote sources
    remoteSourcesRef.current.forEach(source => source.disconnect());
    remoteSourcesRef.current.clear();
    
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
