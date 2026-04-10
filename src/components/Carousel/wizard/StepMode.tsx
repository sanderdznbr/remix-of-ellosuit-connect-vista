import React from 'react'; // animated mode fix
import { Zap, SlidersHorizontal, Sparkles, Lock, Twitter, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  wizardMode: 'simple' | 'advanced' | 'extreme' | 'tweet' | 'tweet2' | 'animated';
  setWizardMode: (v: 'simple' | 'advanced' | 'extreme' | 'tweet' | 'tweet2' | 'animated') => void;
  allowAdvanced?: boolean;
  allowExtreme?: boolean;
  requiredPlanForAdvanced?: string;
  requiredPlanForExtreme?: string;
  isAdminMaster?: boolean;
}

const modes = [
  {
    key: 'simple' as const,
    icon: Zap,
    label: 'Simples',
    steps: '6 etapas · Rápido e direto',
    desc: 'Ideal para quem quer resultados rápidos',
    requiredPlan: null,
    adminOnly: false,
  },
  {
    key: 'advanced' as const,
    icon: SlidersHorizontal,
    label: 'Avançado',
    steps: '12 etapas · Controle total',
    desc: 'Cores, fontes, roteiro, produto e mais',
    requiredPlan: 'Pro',
    adminOnly: false,
  },
  {
    key: 'extreme' as const,
    icon: Sparkles,
    label: 'Extreme',
    steps: 'IA guiada · Criação única',
    desc: 'Descreva sua visão e a IA monta tudo para você',
    badge: 'NOVO',
    requiredPlan: 'Growth',
    adminOnly: false,
  },
  {
    key: 'animated' as const,
    icon: Film,
    label: 'Animado',
    steps: 'HTML/CSS · Cada card vira vídeo',
    desc: 'A IA cria animações em HTML/CSS e você grava como vídeo',
    badge: 'NOVO',
    requiredPlan: 'Growth',
    adminOnly: true,
  },
  {
    key: 'tweet2' as const,
    icon: Twitter,
    label: 'Tweet Post',
    steps: 'Tweet visual · Estático ou carrossel',
    desc: 'Crie posts no formato de tweet com foto e engajamento',
    badge: 'BETA',
    requiredPlan: null,
    adminOnly: true,
  },
] as const;

const StepMode: React.FC<Props> = ({ 
  wizardMode, 
  setWizardMode, 
  allowAdvanced = true, 
  allowExtreme = true,
  requiredPlanForAdvanced = 'Pro',
  requiredPlanForExtreme = 'Growth',
  isAdminMaster = false,
}) => {
  const navigate = useNavigate();

  const isLocked = (key: string) => {
    if (key === 'advanced') return !allowAdvanced;
    if (key === 'extreme') return !allowExtreme;
    if (key === 'animated') return !allowExtreme; // same as extreme
    return false;
  };

  const getRequiredPlan = (key: string) => {
    if (key === 'advanced') return requiredPlanForAdvanced;
    if (key === 'extreme' || key === 'animated') return requiredPlanForExtreme;
    return '';
  };

  return (
    <div className="space-y-4" style={{ minHeight: '200px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Como você quer criar?</h2>
        <p className="text-sm text-white/40">Escolha o nível de controle sobre a geração.</p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {modes.filter(m => !m.adminOnly || isAdminMaster).map((m) => {
          const Icon = m.icon;
          const selected = wizardMode === m.key;
          const isExtreme = m.key === 'extreme';
          const isTweet = m.key === 'tweet2';
          const isAnimated = m.key === 'animated';
          const locked = isLocked(m.key);
          const getColor = () => {
            if (isExtreme) return 'orange';
            if (isAnimated) return 'violet';
            if (m.key === 'advanced') return 'red';
            if (isTweet) return 'sky';
            return 'purple';
          };
          const color = getColor();
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
              className={`flex items-center gap-3 p-4 rounded-2xl text-left transition-all border relative ${
                locked
                  ? 'bg-white/[0.01] border-white/[0.04] opacity-60 cursor-pointer'
                  : selected
                  ? `bg-${color}-500/[0.08] border-${color}-500/40`
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
              }`}
              style={selected && !locked ? { 
                backgroundColor: `rgba(${isExtreme ? '249,115,22' : isAnimated ? '139,92,246' : m.key === 'advanced' ? '220,38,38' : isTweet ? '14,165,233' : '139,92,246'}, 0.08)`,
                borderColor: `rgba(${isExtreme ? '249,115,22' : isAnimated ? '139,92,246' : m.key === 'advanced' ? '220,38,38' : isTweet ? '14,165,233' : '139,92,246'}, 0.4)`,
              } : undefined}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center`}
                style={{
                  backgroundColor: locked ? 'rgba(255,255,255,0.03)' : selected ? `rgba(${isExtreme ? '249,115,22' : isAnimated ? '139,92,246' : m.key === 'advanced' ? '220,38,38' : isTweet ? '14,165,233' : '139,92,246'}, 0.2)` : 'rgba(255,255,255,0.04)',
                }}
              >
                {locked ? (
                  <Lock className="h-5 w-5 text-white/20" />
                ) : (
                  <Icon className={`h-6 w-6 ${
                    selected
                      ? isExtreme ? 'text-orange-400' : isAnimated ? 'text-violet-400' : m.key === 'advanced' ? 'text-red-400' : isTweet ? 'text-sky-400' : 'text-purple-400'
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
                {!locked && (
                  <span className="text-[10px] text-white/15 block mt-1">
                    {m.key === 'simple' ? '~1 crédito/card' : m.key === 'tweet2' ? '~1 crédito/card' : m.key === 'advanced' ? '~2 créditos/card · com rosto ~4' : m.key === 'extreme' ? '~2 créditos/card' : m.key === 'animated' ? '~2 créditos/card' : '~1 crédito/card'}
                    {' + 1 pesquisa'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StepMode;
