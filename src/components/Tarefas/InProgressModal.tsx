
import React, { useState } from 'react';
import { Mic, CheckCircle, Play } from 'lucide-react';
import MobileModal from '@/components/ui/mobile-modal';
import MobileButton from '@/components/ui/mobile-button';
import AudioRecorder from './AudioRecorder';

interface InProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarefa: any;
  onComplete: () => void;
  onAudioSaved: (audioBlob: Blob) => void;
}

const InProgressModal: React.FC<InProgressModalProps> = ({
  isOpen,
  onClose,
  tarefa,
  onComplete,
  onAudioSaved
}) => {
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  const handleAudioRecorded = (audioBlob: Blob) => {
    onAudioSaved(audioBlob);
    setShowAudioRecorder(false);
  };

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
    >
      <div className="p-6 bg-white dark:bg-gray-900">
        {showAudioRecorder ? (
          <AudioRecorder
            onAudioRecorded={handleAudioRecorded}
            onClose={() => setShowAudioRecorder(false)}
          />
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Compromisso em Andamento
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                {tarefa?.title}
              </p>
              
              <p className="text-sm text-gray-500 dark:text-gray-500">
                O que você gostaria de fazer?
              </p>
            </div>

            <div className="space-y-3">
              <MobileButton
                variant="primary"
                fullWidth
                onClick={() => setShowAudioRecorder(true)}
                className="flex items-center justify-center space-x-2"
              >
                <Mic className="w-5 h-5" />
                <span>Gravar Áudio da Reunião</span>
              </MobileButton>
              
              <MobileButton
                variant="secondary"
                fullWidth
                onClick={onComplete}
                className="flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Marcar como Concluído</span>
              </MobileButton>
              
              <MobileButton
                variant="ghost"
                fullWidth
                onClick={onClose}
              >
                Voltar
              </MobileButton>
            </div>
          </>
        )}
      </div>
    </MobileModal>
  );
};

export default InProgressModal;
