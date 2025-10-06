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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    startCapture();

    return () => cleanup();
  }, [isActive, roomName]);

  const startCapture = async () => {
    try {
      console.log('🎤 Iniciando captura de áudio para transcrição...');

      // Get microphone access
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
      console.log('✅ Microfone acessado');

      // Create AudioContext
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      // Process audio data
      processorRef.current.onaudioprocess = (e) => {
        if (!isActive || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);

        // Convert Float32 to Int16
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Accumulate in buffer
        const newBuffer = new Int16Array(audioBufferRef.current.length + int16Data.length);
        newBuffer.set(audioBufferRef.current);
        newBuffer.set(int16Data, audioBufferRef.current.length);
        audioBufferRef.current = newBuffer;

        // Send every ~1 second (24000 samples at 24kHz)
        if (audioBufferRef.current.length >= 24000) {
          sendAudioToServer(audioBufferRef.current);
          audioBufferRef.current = new Int16Array(0);
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      console.log('✅ AudioContext configurado');

      // Connect WebSocket
      connectWebSocket();

    } catch (error) {
      console.error('❌ Erro ao iniciar captura:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone para transcrição",
        variant: "destructive"
      });
    }
  };

  const connectWebSocket = () => {
    try {
      // Use the full URL to the edge function
      const wsUrl = `wss://wjxyxphbbonraugyzkdv.supabase.co/functions/v1/realtime-transcription`;
      console.log('🔌 Conectando WebSocket:', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket conectado');
        setIsConnected(true);

        // Start transcription
        wsRef.current?.send(JSON.stringify({
          type: 'start_transcription',
          roomId: roomName
        }));

        toast({
          title: "Transcrição Ativa",
          description: "O LiveKit está capturando e transcrevendo o áudio em tempo real",
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Mensagem WebSocket:', data.type);

          if (data.type === 'transcript_update') {
            console.log('📝 Transcrição recebida:', data.text);
            
            onTranscriptionUpdate({
              text: data.text,
              is_final: data.is_final,
              timestamp: data.timestamp,
              speaker: 'Participante'
            });
          } else if (data.type === 'error') {
            console.error('❌ Erro do servidor:', data.error);
          }
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket desconectado');
        setIsConnected(false);
      };

    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket:', error);
    }
  };

  const sendAudioToServer = (audioData: Int16Array) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket não está pronto');
      return;
    }

    try {
      // Convert Int16Array to Uint8Array
      const uint8Array = new Uint8Array(audioData.buffer);
      
      // Convert to base64 in chunks to avoid memory issues
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

      console.log('📤 Áudio enviado:', audioData.length, 'samples');
    } catch (error) {
      console.error('❌ Erro ao enviar áudio:', error);
    }
  };

  const cleanup = () => {
    console.log('🧹 Limpando captura de áudio...');

    // Send final audio buffer
    if (audioBufferRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      sendAudioToServer(audioBufferRef.current);
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
    setIsConnected(false);
  };

  return null;
};
