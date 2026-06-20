import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Palette, Sparkles, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';

const ONBOARDING_KEY = 'ellocontent_onboarding_done_v1';

interface Step {
  icon: React.ElementType;
  badge: string;
  title: string;
  description: string;
  cta: string;
  action: 'navigate' | 'finish';
  to?: string;
  color: string;
}

const STEPS: Step[] = [
  {
    icon: Upload,
    badge: 'Passo 1 de 3',
    title: 'Adicione sua marca',
    description: 'Envie seu logo, paleta de cores e fotos do seu produto. A IA usa isso pra manter tudo fiel à sua identidade.',
    cta: 'Ir pra Galeria de Marca',
    action: 'navigate',
    to: '/galeria',
    color: '#8B5CF6',
  },
  {
    icon: Palette,
    badge: 'Passo 2 de 3',
    title: 'Escolha um estilo',
    description: 'Explore o marketplace de estilos visuais — do minimalista ao editorial. Você pode trocar quando quiser.',
    cta: 'Ver Estilos',
    action: 'navigate',
    to: '/marketplace',
    color: '#A78BFA',
  },
  {
    icon: Sparkles,
    badge: 'Passo 3 de 3',
    title: 'Crie seu primeiro post',
    description: 'Digite um tema ou escolha um template pronto. Em segundos a IA gera o post pronto pra publicar.',
    cta: 'Começar a criar',
    action: 'finish',
    color: '#C4B5FD',
  },
];

interface Props {
  onClose?: () => void;
}

const OnboardingModal: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    try {
      const done = localStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        // small delay to not steal focus on first paint
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [user]);

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    setOpen(false);
    onClose?.();
  };

  const handleAction = () => {
    const s = STEPS[step];
    if (s.action === 'navigate' && s.to) {
      try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
      setOpen(false);
      navigate(s.to);
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const handleSkip = () => finish();
  const handleNextDot = (i: number) => setStep(i);

  if (!open) return null;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleSkip} />

        <motion.div
          key={step}
          className="relative w-full max-w-md rounded-3xl overflow-hidden"
          style={{ backgroundColor: '#0f0f14', border: '1px solid rgba(255,255,255,0.08)' }}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Glow background */}
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[300px] opacity-25 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at center, ${current.color} 0%, transparent 70%)`, filter: 'blur(60px)' }}
          />

          {/* Close */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors cursor-pointer z-10"
            aria-label="Pular tutorial"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative px-8 pt-12 pb-8 text-center">
            {/* Badge */}
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-6"
              style={{ backgroundColor: `${current.color}1f`, color: current.color }}
            >
              {current.badge}
            </span>

            {/* Icon */}
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${current.color}1a`, border: `1px solid ${current.color}40` }}
            >
              <Icon className="w-9 h-9" style={{ color: current.color }} />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
              {current.title}
            </h2>

            {/* Description */}
            <p className="text-sm text-white/50 mb-8 leading-relaxed max-w-sm mx-auto">
              {current.description}
            </p>

            {/* CTA */}
            <button
              onClick={handleAction}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer hover:opacity-90"
              style={{ backgroundColor: current.color, color: '#0a0a0f' }}
            >
              {current.cta}
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Skip */}
            <button
              onClick={handleSkip}
              className="mt-3 text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              Pular tutorial
            </button>

            {/* Dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleNextDot(i)}
                  className="h-1.5 rounded-full transition-all cursor-pointer"
                  style={{
                    width: i === step ? '20px' : '6px',
                    backgroundColor: i === step ? current.color : 'rgba(255,255,255,0.15)',
                  }}
                  aria-label={`Ir pro passo ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingModal;
