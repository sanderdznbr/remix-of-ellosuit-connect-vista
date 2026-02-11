import { useCallback, useEffect, useRef, useState } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
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
  const [isConnected, setIsConnected] = useState(false);
  const hasConnectedRef = useRef(false);
  const isMobileRef = useRef(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      if (data.text && data.text.trim().length > 0) {
        onTranscriptionUpdate({
          text: data.text,
          is_final: false,
          timestamp: new Date().toISOString(),
          speaker: 'Participante'
        });
      }
    },
    onCommittedTranscript: (data) => {
      if (data.text && data.text.trim().length > 3) {
        console.log('✅ ElevenLabs Scribe:', data.text.substring(0, 60));
        onTranscriptionUpdate({
          text: data.text,
          is_final: true,
          timestamp: new Date().toISOString(),
          speaker: 'Participante'
        });
      }
    },
  });

  const startScribe = useCallback(async () => {
    if (hasConnectedRef.current || isMobileRef.current) return;
    hasConnectedRef.current = true;

    try {
      console.log('🎤 Obtendo token ElevenLabs Scribe...');
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');

      if (error || !data?.token) {
        console.error('❌ Erro ao obter token:', error);
        toast({
          title: 'Erro na Transcrição',
          description: 'Não foi possível obter token do ElevenLabs',
          variant: 'destructive'
        });
        hasConnectedRef.current = false;
        return;
      }

      console.log('🔌 Conectando ElevenLabs Scribe...');
      
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setIsConnected(true);
      console.log('✅ ElevenLabs Scribe conectado!');
      toast({ title: 'Transcrição ativa', description: 'ElevenLabs Scribe conectado' });

    } catch (err) {
      console.error('❌ Erro ao conectar Scribe:', err);
      hasConnectedRef.current = false;
      setIsConnected(false);
      toast({
        title: 'Erro na Transcrição',
        description: 'Falha ao conectar com ElevenLabs Scribe',
        variant: 'destructive'
      });
    }
  }, [scribe, toast]);

  useEffect(() => {
    if (!isActive || isMobileRef.current) {
      if (isMobileRef.current) console.log('📱 Transcrição desabilitada em mobile');
      return;
    }

    startScribe();

    return () => {
      if (scribe.isConnected) {
        console.log('🧹 Desconectando ElevenLabs Scribe...');
        scribe.disconnect();
      }
      hasConnectedRef.current = false;
      setIsConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, roomName]);

  return null;
};
