import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import elloLogo from '@/assets/ellosuit-logo.png';

interface WhatsAppSyncScreenProps {
  onComplete: () => void;
  sessionId: string;
}

const TOTAL_DURATION_MS = 60000;

const syncMessages = [
  'Puxando conversas...',
  'Sincronizando contatos...',
  'Carregando grupos...',
  'Baixando mensagens...',
  'Processando mídias...',
  'Finalizando...',
];

const WhatsAppSyncScreen: React.FC<WhatsAppSyncScreenProps> = ({ onComplete, sessionId }) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const intervalMs = 100;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / TOTAL_DURATION_MS) * 100, 100);

      setProgress(newProgress);

      const msgIndex = Math.min(
        Math.floor((newProgress / 100) * syncMessages.length),
        syncMessages.length - 1
      );
      setMessageIndex(msgIndex);

      if (elapsed >= TOTAL_DURATION_MS) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: '#FF4500' }}>
      {/* Close button */}
      <button
        onClick={onComplete}
        className="absolute top-5 right-5 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Logo */}
      <div className="mb-10">
        <img src={elloLogo} alt="Ellosuit" className="h-16 w-auto object-contain brightness-0 invert" />
      </div>

      {/* Progress bar */}
      <div className="w-72 max-w-[80%] mb-6">
        <div className="h-3 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.85) 100%)',
            }}
          />
        </div>
        <p className="text-center text-sm text-white/80 mt-2 font-medium tabular-nums">
          {Math.round(progress)}%
        </p>
      </div>

      {/* Status message */}
      <p className="text-lg font-semibold text-white">
        {syncMessages[messageIndex]}
      </p>
    </div>
  );
};

export default WhatsAppSyncScreen;
