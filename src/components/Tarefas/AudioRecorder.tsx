
import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import MobileButton from '@/components/ui/mobile-button';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  onClose: () => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioRecorded, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const saveRecording = () => {
    if (audioBlob) {
      onAudioRecorded(audioBlob);
      onClose();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
        Gravação de Áudio
      </h3>
      
      <div className="flex flex-col items-center space-y-6">
        {/* Recording Status */}
        <div className="text-center">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mb-4",
            isRecording ? "bg-red-500 animate-pulse" : "bg-gray-200 dark:bg-gray-800"
          )}>
            <Mic className={cn(
              "w-10 h-10",
              isRecording ? "text-white" : "text-gray-600 dark:text-gray-400"
            )} />
          </div>
          
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            {isRecording ? 'Gravando...' : audioBlob ? 'Gravação concluída' : 'Pronto para gravar'}
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {formatTime(recordingTime)}
          </div>
        </div>
        
        {/* Audio Player */}
        {audioUrl && (
          <div className="w-full max-w-xs">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="w-full"
            />
            
            <div className="flex justify-center space-x-4 mt-4">
              <MobileButton
                variant="ghost"
                size="sm"
                onClick={isPlaying ? pauseAudio : playAudio}
                className="flex items-center space-x-2"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pausar' : 'Reproduzir'}</span>
              </MobileButton>
              
              <MobileButton
                variant="ghost"
                size="sm"
                onClick={deleteRecording}
                className="flex items-center space-x-2 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </MobileButton>
            </div>
          </div>
        )}
        
        {/* Control Buttons */}
        <div className="flex space-x-4 w-full max-w-xs">
          {!isRecording && !audioBlob && (
            <MobileButton
              variant="primary"
              fullWidth
              onClick={startRecording}
              className="flex items-center justify-center space-x-2"
            >
              <Mic className="w-5 h-5" />
              <span>Iniciar Gravação</span>
            </MobileButton>
          )}
          
          {isRecording && (
            <MobileButton
              variant="danger"
              fullWidth
              onClick={stopRecording}
              className="flex items-center justify-center space-x-2"
            >
              <Square className="w-5 h-5" />
              <span>Parar Gravação</span>
            </MobileButton>
          )}
          
          {audioBlob && (
            <>
              <MobileButton
                variant="ghost"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </MobileButton>
              
              <MobileButton
                variant="primary"
                onClick={saveRecording}
                className="flex-1"
              >
                Salvar
              </MobileButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioRecorder;
