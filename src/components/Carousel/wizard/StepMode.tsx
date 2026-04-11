import React, { useState } from 'react';
import { Zap, SlidersHorizontal, Sparkles, Lock, Twitter, Film, HelpCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

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
    label: 'Rápido',
    steps: '6 etapas · O mais fácil',
    desc: 'Ideal para quem quer resultado rápido sem configurar nada',
    credPerCard: 1,
    requiredPlan: null,
    adminOnly: false,
  },
  {
    key: 'advanced' as const,
    icon: SlidersHorizontal,
    label: 'Personalizado',
    steps: '12 etapas · Você escolhe tudo',
    desc: 'Escolha cores, fontes, roteiro e estilo do jeito que quiser',
    credPerCard: 2,
    requiredPlan: 'Pro',
    adminOnly: false,
  },
  {
    key: 'extreme' as const,
    icon: Sparkles,
    label: 'Extreme',
    steps: 'IA criativa · Design único',
    desc: 'Descreva o que imagina e a IA cria um design exclusivo pra você',
    credPerCard: 2,
    badge: 'NOVO',
    requiredPlan: 'Growth',
    adminOnly: false,
  },
  {
    key: 'animated' as const,
    icon: Film,
    label: 'Animado',
    steps: 'Cada card vira um vídeo animado',
    desc: 'A IA cria animações e você baixa como vídeo',
    credPerCard: 2,
    badge: 'NOVO',
    requiredPlan: 'Growth',
    adminOnly: true,
  },
  {
    key: 'tweet2' as const,
    icon: Twitter,
    label: 'Tweet Post',
    steps: 'Post no formato de tweet',
    desc: 'Crie posts visuais no formato de tweet com foto e engajamento',
    credPerCard: 1,
    badge: 'BETA',
    requiredPlan: null,
    adminOnly: true,
  },
] as const;

const CREDIT_FAQ = [
  { q: 'Como funciona o consumo de créditos?', a: 'Cada card gerado consome créditos. O total depende do modo escolhido e da quantidade de cards.' },
  { q: 'Quanto custa cada modo?', a: 'Simples: 1 créd/card · Avançado: 2 créd/card · Extreme: 2 créd/card · Com rosto (Pro): 4 créd/card.' },
  { q: 'O que é o "+1 pesquisa"?', a: 'Quando a pesquisa na web está ativada, é cobrado 1 crédito extra fixo por geração (independente do nº de cards).' },
  { q: 'Exemplo prático', a: 'Carrossel de 6 cards no modo Simples com pesquisa web: (6 × 1) + 1 = 7 créditos.' },
  { q: 'Os créditos renovam?', a: 'Sim! Créditos do plano renovam todo mês na data da sua assinatura.' },
];

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
  const [showFaq, setShowFaq] = useState(false);

  const isLocked = (key: string) => {
    if (key === 'advanced') return !allowAdvanced;
    if (key === 'extreme') return !allowExtreme;
    if (key === 'animated') return !allowExtreme;
    return false;
  };

  const getRequiredPlan = (key: string) => {
    if (key === 'advanced') return requiredPlanForAdvanced;
    if (key === 'extreme' || key === 'animated') return requiredPlanForExtreme;
    return '';
  };

  const getRgb = (key: string) => {
    if (key === 'extreme') return '249,115,22';
    if (key === 'animated') return '139,92,246';
    if (key === 'advanced') return '220,38,38';
    if (key === 'tweet2') return '14,165,233';
    return '139,92,246';
  };

  return (
    <div className="space-y-4" style={{ minHeight: '200px' }}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Como você quer criar?</h2>
          <p className="text-sm text-white/40">Escolha o nível de controle sobre a geração.</p>
        </div>
        <button
          onClick={() => setShowFaq(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all mt-1 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">Créditos</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {modes.filter(m => !m.adminOnly || isAdminMaster).map((m) => {
          const Icon = m.icon;
          const selected = wizardMode === m.key;
          const locked = isLocked(m.key);
          const rgb = getRgb(m.key);
          return (
            <button
              key={m.key}
              onClick={() => {
                if (locked) { navigate('/precos'); return; }
                setWizardMode(m.key);
              }}
              className={`flex items-center gap-3 p-4 rounded-2xl text-left transition-all border relative ${
                locked
                  ? 'bg-white/[0.01] border-white/[0.04] opacity-60 cursor-pointer'
                  : selected
                  ? ''
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
              }`}
              style={selected && !locked ? { 
                backgroundColor: `rgba(${rgb}, 0.08)`,
                borderColor: `rgba(${rgb}, 0.4)`,
              } : undefined}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: locked ? 'rgba(255,255,255,0.03)' : selected ? `rgba(${rgb}, 0.2)` : 'rgba(255,255,255,0.04)',
                }}
              >
                {locked ? (
                  <Lock className="h-5 w-5 text-white/20" />
                ) : (
                  <Icon className={`h-6 w-6 ${
                    selected
                      ? m.key === 'extreme' ? 'text-orange-400' : m.key === 'animated' ? 'text-violet-400' : m.key === 'advanced' ? 'text-red-400' : m.key === 'tweet2' ? 'text-sky-400' : 'text-purple-400'
                      : 'text-white/30'
                  }`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
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

      {/* Credit FAQ Dialog */}
      <AnimatePresence>
        {showFaq && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowFaq(false)} />
            <motion.div
              className="relative w-full max-w-md rounded-2xl p-6 space-y-4"
              style={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.08)' }}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Como funcionam os créditos?
                </h3>
                <button onClick={() => setShowFaq(false)} className="p-1 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cost table */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <th className="text-left px-3 py-2 text-white/30 font-medium">Modo</th>
                      <th className="text-right px-3 py-2 text-white/30 font-medium">Por card</th>
                      <th className="text-right px-3 py-2 text-white/30 font-medium">6 cards*</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-white/[0.04]">
                      <td className="px-3 py-2 text-white/60">Simples</td>
                      <td className="px-3 py-2 text-right text-white/50">1</td>
                      <td className="px-3 py-2 text-right text-white/50 font-medium">7</td>
                    </tr>
                    <tr className="border-t border-white/[0.04]">
                      <td className="px-3 py-2 text-white/60">Avançado</td>
                      <td className="px-3 py-2 text-right text-white/50">2</td>
                      <td className="px-3 py-2 text-right text-white/50 font-medium">13</td>
                    </tr>
                    <tr className="border-t border-white/[0.04]">
                      <td className="px-3 py-2 text-white/60">Avançado + Rosto</td>
                      <td className="px-3 py-2 text-right text-white/50">4</td>
                      <td className="px-3 py-2 text-right text-white/50 font-medium">25</td>
                    </tr>
                    <tr className="border-t border-white/[0.04]">
                      <td className="px-3 py-2 text-white/60">Extreme</td>
                      <td className="px-3 py-2 text-right text-white/50">2</td>
                      <td className="px-3 py-2 text-right text-white/50 font-medium">13</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-white/15 text-center">* inclui +1 crédito de pesquisa web</p>

              {/* FAQ items */}
              <div className="space-y-2.5">
                {CREDIT_FAQ.map((item, i) => (
                  <div key={i}>
                    <p className="text-[11px] font-semibold text-white/50">{item.q}</p>
                    <p className="text-[11px] text-white/25 mt-0.5">{item.a}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StepMode;
