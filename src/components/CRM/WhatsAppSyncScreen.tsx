import React, { useState, useEffect } from 'react';
import elloLogo from '@/assets/logoellosuit.png';

interface WhatsAppSyncScreenProps {
  onComplete: () => void;
  sessionId: string;
}

// Total de 2 minutos = 120 segundos
const TOTAL_DURATION_MS = 120000;

const syncMessages = [
  'Conectando ao servidor...',
  'Autenticando sessão...',
  'Puxando conversas..',
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
    const intervalMs = 50; // Update every 50ms for smooth animation
    
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
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#FF4500' }}
    >
      {/* Logo Ellosuit com filtro branco */}
      <div className="relative mb-10">
        <img
          src={elloLogo}
          alt="Ellosuit"
          className="h-24 w-auto animate-pulse"
          style={{
            filter: 'brightness(0) invert(1)'
          }}
        />
      </div>

      {/* Barra de progresso - estilo exato do print */}
      <div className="w-80 max-w-[80%] mb-6 relative">
        <div 
          className="h-3 rounded-full overflow-hidden relative"
          style={{ backgroundColor: 'rgba(139, 69, 19, 0.5)' }}
        >
          {/* Pill que desliza */}
          <div 
            className="absolute top-0 left-0 h-full flex items-center"
            style={{ 
              width: `${Math.max(progress, 5)}%`,
              transition: 'width 100ms ease-out'
            }}
          >
            <div 
              className="h-full w-10 rounded-full bg-white shadow-lg"
              style={{
                marginLeft: 'auto',
                minWidth: '2.5rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Texto da mensagem atual - branco e bold */}
      <p className="text-white text-lg font-semibold tracking-wide">
        {syncMessages[messageIndex]}
      </p>
    </div>
  );
};

export default WhatsAppSyncScreen;
