import React from 'react';
import { Zap, SlidersHorizontal, Sparkles } from 'lucide-react';

interface Props {
  wizardMode: 'simple' | 'advanced' | 'extreme';
  setWizardMode: (v: 'simple' | 'advanced' | 'extreme') => void;
}

const modes = [
  {
    key: 'simple' as const,
    icon: Zap,
    label: 'Simples',
    steps: '6 etapas · Rápido e direto',
    desc: 'Ideal para quem quer resultados rápidos',
  },
  {
    key: 'advanced' as const,
    icon: SlidersHorizontal,
    label: 'Avançado',
    steps: '12 etapas · Controle total',
    desc: 'Cores, fontes, roteiro, produto e mais',
  },
  {
    key: 'extreme' as const,
    icon: Sparkles,
    label: 'Extreme',
    steps: 'IA guiada · Criação única',
    desc: 'Descreva sua visão e a IA monta tudo para você',
    badge: 'NOVO',
  },
] as const;

const StepMode: React.FC<Props> = ({ wizardMode, setWizardMode }) => {
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
          return (
            <button
              key={m.key}
              onClick={() => setWizardMode(m.key)}
              className={`flex items-center gap-4 p-5 rounded-2xl text-left transition-all border relative ${
                selected
                  ? isExtreme
                    ? 'bg-orange-500/[0.08] border-orange-500/40'
                    : 'bg-purple-500/[0.08] border-purple-500/40'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selected
                  ? isExtreme ? 'bg-orange-500/20' : 'bg-purple-500/20'
                  : 'bg-white/[0.04]'
              }`}>
                <Icon className={`h-6 w-6 ${
                  selected
                    ? isExtreme ? 'text-orange-400' : 'text-purple-400'
                    : 'text-white/30'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white/90">{m.label}</span>
                  {'badge' in m && m.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 tracking-wider">
                      {m.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/40 block mt-0.5">{m.steps}</span>
                <span className="text-[10px] text-white/25 block mt-0.5">{m.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StepMode;
