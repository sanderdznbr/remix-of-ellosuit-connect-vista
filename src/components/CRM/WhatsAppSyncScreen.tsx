import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface WhatsAppSyncScreenProps {
  onComplete: () => void;
  sessionId: string;
}

const syncSteps = [
  { id: 'connect', label: 'Conectando ao WhatsApp...', duration: 5000 },
  { id: 'auth', label: 'Autenticando sessão...', duration: 4000 },
  { id: 'contacts', label: 'Sincronizando contatos...', duration: 25000 },
  { id: 'chats', label: 'Carregando conversas...', duration: 30000 },
  { id: 'groups', label: 'Verificando grupos...', duration: 15000 },
  { id: 'messages', label: 'Baixando mensagens recentes...', duration: 35000 },
  { id: 'media', label: 'Preparando mídia...', duration: 10000 },
  { id: 'finish', label: 'Finalizando configuração...', duration: 6000 },
];

const WhatsAppSyncScreen: React.FC<WhatsAppSyncScreenProps> = ({ onComplete, sessionId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let stepTimeout: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= syncSteps.length) {
        // All steps complete
        setTimeout(() => {
          onComplete();
        }, 1000);
        return;
      }

      const step = syncSteps[stepIndex];
      setCurrentStep(stepIndex);

      // Progress animation for current step
      const startProgress = (stepIndex / syncSteps.length) * 100;
      const endProgress = ((stepIndex + 1) / syncSteps.length) * 100;
      const progressDuration = step.duration;
      const progressStep = (endProgress - startProgress) / (progressDuration / 100);
      
      let currentProgress = startProgress;
      progressInterval = setInterval(() => {
        currentProgress += progressStep;
        if (currentProgress >= endProgress) {
          currentProgress = endProgress;
          clearInterval(progressInterval);
        }
        setProgress(currentProgress);
      }, 100);

      stepTimeout = setTimeout(() => {
        setCompletedSteps(prev => [...prev, step.id]);
        clearInterval(progressInterval);
        runStep(stepIndex + 1);
      }, step.duration);
    };

    runStep(0);

    return () => {
      clearTimeout(stepTimeout);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: '#FF4500' }}>
      <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
        {/* Loader Animation */}
        <div className="relative">
          <span className="whatsapp-sync-loader"></span>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Sincronizando WhatsApp
          </h2>
          <p className="text-white/80 text-sm">
            Aguarde enquanto preparamos tudo para você
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps List */}
        <div className="w-full space-y-3">
          {syncSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = index === currentStep && !isCompleted;
            const isPending = index > currentStep;

            return (
              <div 
                key={step.id}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  isPending ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-white text-[#FF4500]' 
                    : isCurrent 
                      ? 'bg-white/30 border-2 border-white' 
                      : 'bg-white/10 border border-white/30'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  ) : null}
                </div>
                <span className={`text-sm font-medium ${
                  isCompleted || isCurrent ? 'text-white' : 'text-white/50'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <p className="text-white/60 text-xs text-center mt-4">
          Isso pode levar até 3 minutos dependendo da quantidade de dados
        </p>
      </div>

      <style>{`
        .whatsapp-sync-loader {
          position: relative;
          width: 80px;
          height: 80px;
          border: 8px solid #FFF;
          border-radius: 50%;
          box-sizing: border-box;
          animation: eat 1s linear infinite;
        }
        .whatsapp-sync-loader::after,
        .whatsapp-sync-loader::before {
          content: '';
          position: absolute;
          left: 50px;
          top: 50%;
          transform: translateY(-50%);
          background: #fff;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          box-sizing: border-box;
          opacity: 0;
          animation: move 2s linear infinite;
        }
        .whatsapp-sync-loader::before {
          animation-delay: 1s;
        }
        @keyframes eat {
          0%, 49% { border-right-color: #FFF }
          50%, 100% { border-right-color: transparent }
        }
        @keyframes move {
          0% { left: 60px; opacity: 1 }
          50% { left: 0px; opacity: 1 }
          52%, 100% { left: -5px; opacity: 0 }
        }
      `}</style>
    </div>
  );
};

export default WhatsAppSyncScreen;
