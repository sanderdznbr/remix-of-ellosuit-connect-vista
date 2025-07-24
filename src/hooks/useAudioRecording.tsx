
import { useState, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      console.log('🎙️ Iniciando gravação...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        console.log('🎵 Gravação finalizada, blob criado:', blob.size, 'bytes');
      };
      
      mediaRecorder.start(1000); // Captura dados a cada 1 segundo
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer para mostrar tempo de gravação
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "🎙️ Gravação iniciada",
        description: "Fale normalmente, sua voz está sendo gravada"
      });
      
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    console.log('⏹️ Parando gravação...');
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    toast({
      title: "⏹️ Gravação finalizada",
      description: "Processando áudio..."
    });
  }, [isRecording, toast]);

  const saveAndTranscribe = useCallback(async (eventId: string) => {
    if (!audioBlob || !user) {
      console.error('❌ Sem áudio ou usuário para salvar');
      return null;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('💾 Salvando áudio no storage...');
      
      // Gerar nome único para o arquivo
      const fileName = `${user.id}/${eventId}_${Date.now()}.webm`;
      
      // Upload do arquivo para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600'
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      console.log('✅ Áudio salvo:', uploadData.path);
      
      // Obter URL pública do arquivo
      const { data: urlData } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(uploadData.path);
      
      const audioUrl = urlData.publicUrl;
      
      // Chamar edge function para transcrever
      console.log('🔍 Iniciando transcrição...');
      
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions
        .invoke('transcribe-audio', {
          body: { audioUrl, fileName: uploadData.path }
        });
      
      if (transcriptionError) {
        console.error('❌ Erro na transcrição:', transcriptionError);
        throw transcriptionError;
      }
      
      const transcriptionText = transcriptionData?.transcript || '';
      setTranscript(transcriptionText);
      
      console.log('✅ Transcrição concluída:', transcriptionText.substring(0, 100) + '...');
      
      toast({
        title: "✅ Gravação processada",
        description: "Áudio salvo e transcrição concluída"
      });
      
      return {
        audioUrl,
        transcript: transcriptionText
      };
      
    } catch (error: any) {
      console.error('💥 Erro ao processar áudio:', error);
      toast({
        title: "Erro",
        description: `Erro ao processar gravação: ${error.message}`,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [audioBlob, user, toast]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setTranscript('');
    setRecordingTime(0);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    isProcessing,
    recordingTime,
    audioBlob,
    transcript,
    startRecording,
    stopRecording,
    saveAndTranscribe,
    resetRecording
  };
};
