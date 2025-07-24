
import React, { useState } from 'react';
import { Mic, MicOff, Play, Pause, Save, X } from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { cn } from '@/lib/utils';
import { vibrate } from '@/utils/mobile-helpers';
import MobileModal from '@/components/ui/mobile-modal';
import MobileButton from '@/components/ui/mobile-button';

interface MeetingRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  onSave: (audioUrl: string, transcript: string) => Promise<void>;
}

const MeetingRecordingModal: React.FC<MeetingRecordingModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onSave
}) => {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const {
    isRecording,
    isProcessing,
    recordingTime,
    audioBlob,
    transcript,
    startRecording,
    stopRecording,
    saveAndTranscribe,
    resetRecording
  } = useAudioRecording();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    await startRecording();
    vibrate(50);
  };

  const handleStopRecording = () => {
    stopRecording();
    vibrate([50, 100, 50]);
  };

  const handlePlayPreview = () => {
    if (!audioBlob) return;
    
    if (isPreviewPlaying && audioElement) {
      audioElement.pause();
      setIsPreviewPlaying(false);
      return;
    }
    
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    
    audio.onended = () => {
      setIsPreviewPlaying(false);
      URL.revokeObjectURL(url);
    };
    
    audio.play();
    setAudioElement(audio);
    setIsPreviewPlaying(true);
    vibrate(30);
  };

  const handleSaveRecording = async () => {
    const result = await saveAndTranscribe(eventId);
    if (result) {
      await onSave(result.audioUrl, result.transcript);
      handleClose();
    }
  };

  const handleClose = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPreviewPlaying(false);
    }
    resetRecording();
    onClose();
  };

  const handleReset = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPreviewPlaying(false);
    }
    resetRecording();
    vibrate(30);
  };

  return (
    <MobileModal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="lg"
      showCloseButton={false}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <Mic className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gravação de Reunião</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{eventTitle}</p>
          </div>
        </div>
        
        <MobileButton
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="text-gray-600 dark:text-gray-400"
        >
          <X className="h-5 w-5" />
        </MobileButton>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 bg-white dark:bg-gray-900">
        {/* Recording Status */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all duration-300",
              isRecording 
                ? "bg-red-500 animate-pulse" 
                : audioBlob 
                ? "bg-green-500" 
                : "bg-gray-200 dark:bg-gray-700"
            )}>
              {isRecording ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : audioBlob ? (
                <Save className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            
            {isRecording && (
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-red-300 animate-ping mx-auto"></div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(recordingTime)}
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRecording 
                ? "Gravando..." 
                : audioBlob 
                ? "Gravação finalizada" 
                : "Pronto para gravar"
              }
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {!isRecording && !audioBlob && (
            <MobileButton
              variant="primary"
              size="lg"
              onClick={handleStartRecording}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-600"
            >
              <Mic className="w-5 h-5" />
              <span>Iniciar Gravação</span>
            </MobileButton>
          )}
          
          {isRecording && (
            <MobileButton
              variant="secondary"
              size="lg"
              onClick={handleStopRecording}
              className="flex items-center space-x-2"
            >
              <MicOff className="w-5 h-5" />
              <span>Parar Gravação</span>
            </MobileButton>
          )}
          
          {audioBlob && !isRecording && (
            <div className="flex space-x-3">
              <MobileButton
                variant="secondary"
                onClick={handlePlayPreview}
                className="flex items-center space-x-2"
              >
                {isPreviewPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Reproduzir</span>
                  </>
                )}
              </MobileButton>
              
              <MobileButton
                variant="ghost"
                onClick={handleReset}
                className="text-gray-600 dark:text-gray-400"
              >
                <X className="w-4 h-4 mr-1" />
                <span>Refazer</span>
              </MobileButton>
            </div>
          )}
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Processando áudio e gerando transcrição...
            </p>
          </div>
        )}

        {/* Transcript Preview */}
        {transcript && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Transcrição:</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {transcript}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {audioBlob && !isProcessing && (
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <MobileButton
            variant="primary"
            fullWidth
            onClick={handleSaveRecording}
            className="flex items-center justify-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>Salvar Gravação</span>
          </MobileButton>
        </div>
      )}
    </MobileModal>
  );
};

export default MeetingRecordingModal;
