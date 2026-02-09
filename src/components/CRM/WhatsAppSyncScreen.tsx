import React, { useState, useEffect } from 'react';
import elloLogo from '@/assets/ellosuit-logo.png';

interface WhatsAppSyncScreenProps {
  onComplete: () => void;
  sessionId: string;
}

// 1 minuto = 60 segundos
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
    const intervalMs = 50;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / TOTAL_DURATION_MS) * 100, 100);
      
      setProgress(newProgress);
      
      // Update message based on progress
      const msgIndex = Math.min(
        Math.floor((newProgress / 100) * syncMessages.length),
        syncMessages.length - 1
      );
      setMessageIndex(msgIndex);
      
      // Complete when done
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      {/* Logo Ellosuit */}
      <div className="mb-12">
        <img src={elloLogo} alt="Ellosuit" className="h-20 w-auto object-contain" />
      </div>

      {/* Barra de progresso */}
      <div className="w-80 max-w-[80%] mb-8">
        <div className="h-6 rounded-full overflow-hidden bg-gray-100 shadow-inner">
          <div 
            className="h-full rounded-full transition-all duration-200 ease-out"
            style={{ 
              width: `${progress}%`,
              backgroundColor: '#FF4500'
            }}
          />
        </div>
        <p className="text-center text-base text-gray-600 mt-3 font-medium">
          {Math.round(progress)}%
        </p>
      </div>

      {/* Mensagem de status */}
      <p className="text-xl font-semibold" style={{ color: '#FF4500' }}>
        {syncMessages[messageIndex]}
      </p>
    </div>
  );
};

export default WhatsAppSyncScreen;
