import React, { useState, useEffect } from 'react';
import { CheckCircle2, MessageCircle, Users, Clock, Image, Zap } from 'lucide-react';

interface WhatsAppSyncScreenProps {
  onComplete: () => void;
  sessionId: string;
}

const syncSteps = [
  { id: 'connect', label: 'Conectando ao WhatsApp...', duration: 4000, icon: Zap },
  { id: 'auth', label: 'Autenticando sessão...', duration: 3000, icon: Clock },
  { id: 'contacts', label: 'Sincronizando contatos...', duration: 30000, icon: Users },
  { id: 'chats', label: 'Carregando conversas...', duration: 35000, icon: MessageCircle },
  { id: 'messages', label: 'Baixando mensagens (6h)...', duration: 40000, icon: MessageCircle },
  { id: 'media', label: 'Preparando mídia...', duration: 12000, icon: Image },
  { id: 'finish', label: 'Finalizando...', duration: 6000, icon: CheckCircle2 },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#FF4500' }}>
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 animate-float"
            style={{
              width: Math.random() * 40 + 10,
              height: Math.random() * 40 + 10,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-8 p-8 max-w-md w-full">
        {/* Modern Loader Animation */}
        <div className="relative flex items-center justify-center">
          {/* Outer spinning ring */}
          <div className="absolute w-28 h-28 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          
          {/* Middle pulsing ring */}
          <div className="absolute w-24 h-24 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: '2s' }} />
          
          {/* Inner logo area */}
          <div className="relative w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-white animate-pulse" />
          </div>
          
          {/* Orbiting dots */}
          <div className="absolute w-32 h-32 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-lg" />
          </div>
          <div className="absolute w-36 h-36 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/70" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Sincronizando WhatsApp
          </h2>
          <p className="text-white/80 text-sm">
            Preparando suas conversas das últimas 6 horas
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-white/70 mb-2">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,1) 100%)'
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Steps List - Compact */}
        <div className="w-full space-y-2">
          {syncSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = index === currentStep && !isCompleted;
            const isPending = index > currentStep;
            const Icon = step.icon;

            return (
              <div 
                key={step.id}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isPending ? 'opacity-40' : 'opacity-100'
                } ${isCurrent ? 'transform scale-105' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-white text-[#FF4500]' 
                    : isCurrent 
                      ? 'bg-white/30 border-2 border-white' 
                      : 'bg-white/10 border border-white/30'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Icon className="w-4 h-4 text-white animate-pulse" />
                  ) : (
                    <Icon className="w-4 h-4 text-white/50" />
                  )}
                </div>
                <span className={`text-sm font-medium transition-all duration-300 ${
                  isCompleted ? 'text-white' : isCurrent ? 'text-white' : 'text-white/50'
                }`}>
                  {step.label}
                </span>
                {isCurrent && (
                  <div className="ml-auto flex gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="text-center space-y-1">
          <p className="text-white/80 text-sm">
            ⏱️ Isso pode levar até 3 minutos
          </p>
          <p className="text-white/60 text-xs">
            Estamos baixando suas conversas e contatos
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default WhatsAppSyncScreen;
