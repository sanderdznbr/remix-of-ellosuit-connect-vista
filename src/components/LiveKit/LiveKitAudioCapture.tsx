import { useEffect, useRef, useState, useCallback } from 'react';
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
  const isConnectingRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  const isMobileRef = useRef(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

  // Check for similar text (duplicate detection)
  const isSimilarText = useCallback((text1: string, text2: string): boolean => {
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    
    if (norm1 === norm2) return true;
    if (norm1.includes(norm2) && norm2.length > 10) return true;
    if (norm2.includes(norm1) && norm1.length > 10) return true;
    
    return false;
  }, []);

  const setupLocalAudio = useCallback(async () => {
    if (!audioContextRef.current || !mixerNodeRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      localSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      localSourceRef.current.connect(mixerNodeRef.current);
      
      console.log('✅ Áudio LOCAL conectado ao mixer');
    } catch (error) {
      console.error('❌ Erro ao capturar áudio local:', error);
    }
  }, []);

  const setupRemoteAudio = useCallback(async () => {
    if (!audioContextRef.current || !mixerNodeRef.current || !room) return;

    try {
      const audioTracks = Array.from(room.remoteParticipants.values())
        .flatMap(participant => Array.from(participant.audioTrackPublications.values()))
        .filter(pub => pub.track)
        .map(pub => pub.track!.mediaStreamTrack);

      if (audioTracks.length > 0) {
        const remoteStream = new MediaStream(audioTracks);
        const remoteSource = audioContextRef.current.createMediaStreamSource(remoteStream);
        remoteSource.connect(mixerNodeRef.current);
        console.log(`✅ ${audioTracks.length} áudio(s) REMOTO(s) conectado(s)`);
      }
    } catch (error) {
      console.error('❌ Erro ao capturar áudio remoto:', error);
    }
  }, [room]);

  const accumulateAndSendAudio = useCallback((pcm16Data: Int16Array) => {
    let sum = 0;
    for (let i = 0; i < pcm16Data.length; i++) {
      sum += pcm16Data[i] * pcm16Data[i];
    }
    const rms = Math.sqrt(sum / pcm16Data.length);
    
    const SILENCE_THRESHOLD = 400;
    if (rms < SILENCE_THRESHOLD) return;

    const combined = new Int16Array(audioBufferRef.current.length + pcm16Data.length);
    combined.set(audioBufferRef.current);
    combined.set(pcm16Data, audioBufferRef.current.length);
    audioBufferRef.current = combined;

    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    const bufferDurationMs = (audioBufferRef.current.length / 48000) * 1000;

    if (bufferDurationMs >= 3000 && timeSinceLastSend >= 5000) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log(`🎵 Enviando ${audioBufferRef.current.length} samples (${bufferDurationMs.toFixed(0)}ms)`);
        
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

        audioBufferRef.current = new Int16Array(0);
        lastSendTimeRef.current = now;
      }
    }
  }, []);

  const connectWebSocket = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Prevent concurrent connection attempts
      if (isConnectingRef.current) {
        console.log('⏳ Conexão já em andamento, ignorando');
        resolve();
        return;
      }

      // Close any existing connection first
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null; // Remove handler to prevent reconnect loop
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }

      isConnectingRef.current = true;

      try {
        const wsUrl = `wss://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/realtime-transcription`;
        console.log('🔌 Conectando WebSocket:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.error('❌ Timeout na conexão WebSocket');
            isConnectingRef.current = false;
            ws.onclose = null;
            ws.close();
            reject(new Error('Timeout'));
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          console.log('✅ WebSocket conectado para transcrição');
          setIsConnected(true);
          
          lastTranscriptRef.current = '';
          audioBufferRef.current = new Int16Array(0);
          lastSendTimeRef.current = Date.now();

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

            if (data.type === 'transcript_update') {
              if (data.is_final) {
                const isDuplicate = isSimilarText(data.text, lastTranscriptRef.current);
                
                if (!isDuplicate && data.text.trim().length > 0) {
                  lastTranscriptRef.current = data.text;
                  
                  onTranscriptionUpdate({
                    text: data.text,
                    is_final: true,
                    timestamp: data.timestamp || new Date().toISOString(),
                    speaker: data.speaker || 'Participante'
                  });
                }
              } else {
                onTranscriptionUpdate({
                  text: data.text,
                  is_final: false,
                  timestamp: data.timestamp || new Date().toISOString(),
                  speaker: data.speaker || 'Participante'
                });
              }
            } else if (data.type === 'error') {
              console.error('❌ Erro do servidor:', data.error);
            }
          } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          console.error('❌ WebSocket error:', error);
          setIsConnected(false);
          reject(error);
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          console.log('🔌 WebSocket desconectado:', event.code, event.reason);
          setIsConnected(false);
          
          // Only reconnect if still mounted and active, with exponential backoff
          if (event.code !== 1000 && mountedRef.current && !isCleaningUpRef.current) {
            // Clear any existing reconnect timer
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
            }
            
            console.log('🔄 Tentando reconectar em 10 segundos...');
            reconnectTimerRef.current = setTimeout(() => {
              if (mountedRef.current && !isCleaningUpRef.current) {
                connectWebSocket().catch(err => {
                  console.error('❌ Falha na reconexão:', err);
                });
              }
            }, 10000); // 10s instead of 5s to reduce loop frequency
          }
        };

      } catch (error) {
        isConnectingRef.current = false;
        console.error('❌ Erro ao conectar WebSocket:', error);
        reject(error);
      }
    });
  }, [roomName, isSimilarText, onTranscriptionUpdate]);

  const cleanup = useCallback(() => {
    console.log('🧹 Limpando captura de áudio...');
    isCleaningUpRef.current = true;

    // Clear reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // Send stop
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'stop_transcription' }));
      } catch {}
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
    remoteSourcesRef.current.forEach(source => source.disconnect());
    remoteSourcesRef.current.clear();
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket without triggering reconnect
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    audioBufferRef.current = new Int16Array(0);
    lastTranscriptRef.current = '';
    isConnectingRef.current = false;
    setIsConnected(false);
    isCleaningUpRef.current = false;
    
    console.log('✅ Limpeza concluída');
  }, []);

  const startCapture = useCallback(async () => {
    try {
      console.log('🎤 Iniciando captura para transcrição...');

      if (!room) {
        throw new Error('Room não disponível');
      }

      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      mixerNodeRef.current = audioContextRef.current.createGain();
      mixerNodeRef.current.gain.value = 1.0;
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      mixerNodeRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      await setupLocalAudio();
      await setupRemoteAudio();
      await connectWebSocket();

      processorRef.current.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        accumulateAndSendAudio(int16Data);
      };

      console.log('✅ Pipeline de áudio conectado');

    } catch (error) {
      console.error('❌ Erro ao iniciar captura:', error);
      toast({
        title: "Erro na Transcrição",
        description: "Não foi possível iniciar transcrição",
        variant: "destructive"
      });
    }
  }, [room, setupLocalAudio, setupRemoteAudio, connectWebSocket, accumulateAndSendAudio, toast]);

  // Main effect - only depends on isActive and roomName
  useEffect(() => {
    mountedRef.current = true;
    isCleaningUpRef.current = false;

    if (!isActive || isMobileRef.current) {
      if (isMobileRef.current) {
        console.log('📱 Transcrição desabilitada em dispositivo móvel');
      }
      return;
    }

    startCapture();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, roomName]);

  // Watch for new participants joining and add their audio
  useEffect(() => {
    if (!isActive || !audioContextRef.current || !mixerNodeRef.current || isMobileRef.current) return;
    setupRemoteAudio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteParticipants.length]);

  return null;
};
