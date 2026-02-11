import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRoomContext, useRemoteParticipants } from '@livekit/components-react';
import { supabase } from '@/integrations/supabase/client';

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mixerNodeRef = useRef<GainNode | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<Int16Array>(new Int16Array(0));
  const lastSendTimeRef = useRef<number>(0);
  const lastTranscriptRef = useRef<string>('');
  const isSendingRef = useRef(false);
  const mountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  const isMobileRef = useRef(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

  const isSimilarText = useCallback((text1: string, text2: string): boolean => {
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    if (norm1 === norm2) return true;
    if (norm1.includes(norm2) && norm2.length > 10) return true;
    if (norm2.includes(norm1) && norm1.length > 10) return true;
    return false;
  }, []);

  // Send audio chunk via HTTP POST
  const sendAudioChunk = useCallback(async (audioData: Int16Array) => {
    if (isSendingRef.current || !mountedRef.current) return;
    isSendingRef.current = true;

    try {
      const uint8Array = new Uint8Array(audioData.buffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Audio = btoa(binary);

      console.log(`🎵 Enviando ${audioData.length} samples via HTTP`);

      const { data, error } = await supabase.functions.invoke('realtime-transcription', {
        body: { audio: base64Audio, roomId: roomName }
      });

      if (error) {
        console.error('❌ Erro na transcrição:', error);
        return;
      }

      if (data?.text && data.text.trim().length > 0) {
        const isDuplicate = isSimilarText(data.text, lastTranscriptRef.current);
        if (!isDuplicate) {
          lastTranscriptRef.current = data.text;
          onTranscriptionUpdate({
            text: data.text,
            is_final: true,
            timestamp: data.timestamp || new Date().toISOString(),
            speaker: 'Participante'
          });
          console.log('✅ Transcrição recebida:', data.text.substring(0, 50));
        }
      }
    } catch (err) {
      console.error('❌ Erro ao enviar áudio:', err);
    } finally {
      isSendingRef.current = false;
    }
  }, [roomName, isSimilarText, onTranscriptionUpdate]);

  const accumulateAndSendAudio = useCallback((pcm16Data: Int16Array) => {
    let sum = 0;
    for (let i = 0; i < pcm16Data.length; i++) {
      sum += pcm16Data[i] * pcm16Data[i];
    }
    const rms = Math.sqrt(sum / pcm16Data.length);
    if (rms < 400) return;

    const combined = new Int16Array(audioBufferRef.current.length + pcm16Data.length);
    combined.set(audioBufferRef.current);
    combined.set(pcm16Data, audioBufferRef.current.length);
    audioBufferRef.current = combined;

    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    const bufferDurationMs = (audioBufferRef.current.length / 48000) * 1000;

    // Send every 7 seconds with at least 4s of audio
    if (bufferDurationMs >= 4000 && timeSinceLastSend >= 7000 && !isSendingRef.current) {
      const dataToSend = audioBufferRef.current;
      audioBufferRef.current = new Int16Array(0);
      lastSendTimeRef.current = now;
      sendAudioChunk(dataToSend);
    }
  }, [sendAudioChunk]);

  const setupLocalAudio = useCallback(async () => {
    if (!audioContextRef.current || !mixerNodeRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 48000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;
      localSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      localSourceRef.current.connect(mixerNodeRef.current);
      console.log('✅ Áudio LOCAL conectado');
    } catch (error) {
      console.error('❌ Erro ao capturar áudio local:', error);
    }
  }, []);

  const setupRemoteAudio = useCallback(async () => {
    if (!audioContextRef.current || !mixerNodeRef.current || !room) return;
    try {
      const audioTracks = Array.from(room.remoteParticipants.values())
        .flatMap(p => Array.from(p.audioTrackPublications.values()))
        .filter(pub => pub.track)
        .map(pub => pub.track!.mediaStreamTrack);

      if (audioTracks.length > 0) {
        const remoteStream = new MediaStream(audioTracks);
        const remoteSource = audioContextRef.current.createMediaStreamSource(remoteStream);
        remoteSource.connect(mixerNodeRef.current);
        console.log(`✅ ${audioTracks.length} áudio(s) remoto(s) conectado(s)`);
      }
    } catch (error) {
      console.error('❌ Erro ao capturar áudio remoto:', error);
    }
  }, [room]);

  const startCapture = useCallback(async () => {
    try {
      console.log('🎤 Iniciando captura para transcrição via HTTP...');
      if (!room) throw new Error('Room não disponível');

      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      mixerNodeRef.current = audioContextRef.current.createGain();
      mixerNodeRef.current.gain.value = 1.0;
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      mixerNodeRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      await setupLocalAudio();
      await setupRemoteAudio();

      lastSendTimeRef.current = Date.now();
      setIsConnected(true);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        accumulateAndSendAudio(int16Data);
      };

      console.log('✅ Pipeline de áudio conectado (HTTP mode)');
      toast({ title: 'Transcrição ativa', description: 'Capturando áudio para transcrição' });

    } catch (error) {
      console.error('❌ Erro ao iniciar captura:', error);
      setIsConnected(false);
      toast({ title: "Erro na Transcrição", description: "Não foi possível iniciar", variant: "destructive" });
    }
  }, [room, setupLocalAudio, setupRemoteAudio, accumulateAndSendAudio, toast]);

  const cleanup = useCallback(() => {
    console.log('🧹 Limpando captura de áudio...');

    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (localSourceRef.current) { localSourceRef.current.disconnect(); localSourceRef.current = null; }
    if (mixerNodeRef.current) { mixerNodeRef.current.disconnect(); mixerNodeRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }

    audioBufferRef.current = new Int16Array(0);
    lastTranscriptRef.current = '';
    isSendingRef.current = false;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!isActive || isMobileRef.current) {
      if (isMobileRef.current) console.log('📱 Transcrição desabilitada em mobile');
      return;
    }

    startCapture();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, roomName]);

  useEffect(() => {
    if (!isActive || !audioContextRef.current || !mixerNodeRef.current || isMobileRef.current) return;
    setupRemoteAudio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteParticipants.length]);

  return null;
};
