import React from 'react';
import { Zap, SlidersHorizontal, Sparkles, Lock, Twitter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  wizardMode: 'simple' | 'advanced' | 'extreme' | 'tweet';
  setWizardMode: (v: 'simple' | 'advanced' | 'extreme' | 'tweet') => void;
  allowAdvanced?: boolean;
  allowExtreme?: boolean;
  requiredPlanForAdvanced?: string;
  requiredPlanForExtreme?: string;
}

const modes = [
  {
    key: 'simple' as const,
    icon: Zap,
    label: 'Simples',
    steps: '6 etapas · Rápido e direto',
    desc: 'Ideal para quem quer resultados rápidos',
    requiredPlan: null,
  },
  {
    key: 'advanced' as const,
    icon: SlidersHorizontal,
    label: 'Avançado',
    steps: '12 etapas · Controle total',
    desc: 'Cores, fontes, roteiro, produto e mais',
    requiredPlan: 'Pro',
  },
  {
    key: 'extreme' as const,
    icon: Sparkles,
    label: 'Extreme',
    steps: 'IA guiada · Criação única',
    desc: 'Descreva sua visão e a IA monta tudo para você',
    badge: 'NOVO',
    requiredPlan: 'Growth',
  },
] as const;

const StepMode: React.FC<Props> = ({ 
  wizardMode, 
  setWizardMode, 
  allowAdvanced = true, 
  allowExtreme = true,
  requiredPlanForAdvanced = 'Pro',
  requiredPlanForExtreme = 'Growth',
}) => {
  const navigate = useNavigate();

  const isLocked = (key: string) => {
    if (key === 'advanced') return !allowAdvanced;
    if (key === 'extreme') return !allowExtreme;
    return false;
  };

  const getRequiredPlan = (key: string) => {
    if (key === 'advanced') return requiredPlanForAdvanced;
    if (key === 'extreme') return requiredPlanForExtreme;
    return '';
  };

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Como você quer criar?</h2>
        <p className="text-sm text-white/40">Escolha o nível de controle sobre a geração.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {modes.map((m) => {
          const Icon = m.icon;
          const selected = wizardMode === m.key;
          const isExtreme = m.key === 'extreme';
          const locked = isLocked(m.key);
          return (
            <button
              key={m.key}
              onClick={() => {
                if (locked) {
                  navigate('/precos');
                  return;
                }
                setWizardMode(m.key);
              }}
              className={`flex items-center gap-4 p-5 rounded-2xl text-left transition-all border relative ${
                locked
                  ? 'bg-white/[0.01] border-white/[0.04] opacity-60 cursor-pointer'
                  : selected
                  ? isExtreme
                    ? 'bg-orange-500/[0.08] border-orange-500/40'
                    : m.key === 'advanced'
                    ? 'bg-red-500/[0.08] border-red-500/40'
                    : 'bg-purple-500/[0.08] border-purple-500/40'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                locked
                  ? 'bg-white/[0.03]'
                  : selected
                  ? isExtreme ? 'bg-orange-500/20' : m.key === 'advanced' ? 'bg-red-500/20' : 'bg-purple-500/20'
                  : 'bg-white/[0.04]'
              }`}>
                {locked ? (
                  <Lock className="h-5 w-5 text-white/20" />
                ) : (
                  <Icon className={`h-6 w-6 ${
                    selected
                      ? isExtreme ? 'text-orange-400' : m.key === 'advanced' ? 'text-red-400' : 'text-purple-400'
                      : 'text-white/30'
                  }`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white/90">{m.label}</span>
                  {'badge' in m && m.badge && !locked && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 tracking-wider">
                      {m.badge}
                    </span>
                  )}
                  {locked && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400 tracking-wider">
                      {getRequiredPlan(m.key)}+
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/40 block mt-0.5">{m.steps}</span>
                <span className="text-[10px] text-white/25 block mt-0.5">
                  {locked ? `Disponível a partir do plano ${getRequiredPlan(m.key)}` : m.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StepMode;
