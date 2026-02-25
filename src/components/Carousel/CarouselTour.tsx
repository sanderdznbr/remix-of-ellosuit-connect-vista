import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Palette, Edit3, Download, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const TOUR_STEPS = [
  {
    title: '🎉 Carrossel gerado!',
    description: 'Seu carrossel está pronto. Vamos te mostrar como editar e personalizar cada detalhe.',
    icon: Sparkles,
    targetSelector: null, // centered
  },
  {
    title: '✏️ Editar Cards',
    description: 'Clique no ícone de lápis em qualquer thumbnail para editar textos, imagens e layout do card individualmente.',
    icon: Edit3,
    targetSelector: '[data-tour="card-strip"]',
  },
  {
    title: '🔄 Regenerar',
    description: 'Clique no ícone de regenerar em qualquer thumbnail para gerar novo conteúdo com IA, fazer upload ou buscar imagens.',
    icon: RotateCcw,
    targetSelector: '[data-tour="card-strip"]',
  },
  {
    title: '🎨 Estilo',
    description: 'Use o botão "Estilo" para alterar cores, fontes, logomarca e cabeçalho de todos os cards.',
    icon: Palette,
    targetSelector: '[data-tour="btn-style"]',
  },
  {
    title: '➕ Adicionar Card',
    description: 'Use "Adicionar Card" para inserir novos slides ao carrossel. Você pode ter quantos cards quiser!',
    icon: Plus,
    targetSelector: '[data-tour="btn-add"]',
  },
  {
    title: '📥 Exportar',
    description: 'Quando estiver satisfeito, clique em "Exportar" para baixar todas as imagens em alta qualidade.',
    icon: Download,
    targetSelector: '[data-tour="btn-export"]',
  },
];

interface CarouselTourProps {
  onComplete: () => void;
}

const CarouselTour: React.FC<CarouselTourProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null);
  const { isMobile } = useIsMobile();
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;
  const current = TOUR_STEPS[step];
  const Icon = current.icon;

  // Delay appearance so carousel renders first
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Position tooltip near target element
  useEffect(() => {
    if (!ready) return;
    const selector = current.targetSelector;
    if (!selector) {
      setTooltipPos(null);
      return;
    }
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
      setTooltipPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceAbove > spaceBelow ? 'above' : 'below';
    const left = Math.max(16, Math.min(rect.left + rect.width / 2, window.innerWidth - 16));
    const top = placement === 'above' ? rect.top - 12 : rect.bottom + 12;
    setTooltipPos({ top, left, placement });
  }, [step, ready, current.targetSelector]);

  if (!ready) return null;

  const isCentered = !tooltipPos;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100]" onClick={onComplete} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`fixed z-[101] pointer-events-none ${isCentered ? 'inset-0 flex items-center justify-center p-4' : ''}`}
          style={!isCentered ? {
            top: tooltipPos!.placement === 'above' ? 'auto' : tooltipPos!.top,
            bottom: tooltipPos!.placement === 'above' ? (window.innerHeight - tooltipPos!.top) : 'auto',
            left: isMobile ? 16 : Math.max(16, tooltipPos!.left - 175),
            right: isMobile ? 16 : 'auto',
          } : undefined}
        >
          <div
            className="w-full rounded-2xl overflow-hidden pointer-events-auto"
            style={{
              maxWidth: isMobile ? '100%' : 350,
              backgroundColor: '#1A1A24',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.15)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1))' }}>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-purple-300" />
                <span className="text-white/60 text-xs font-medium">{step + 1} de {TOUR_STEPS.length}</span>
              </div>
              <button onClick={onComplete} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="h-4 w-4 text-white/50" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-3">
              <h3 className="text-lg font-bold text-white">{current.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{current.description}</p>

              {/* Dots */}
              <div className="flex justify-center gap-1.5 pt-2">
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} className="transition-all rounded-full" style={{
                    width: i === step ? 16 : 6,
                    height: 6,
                    backgroundColor: i === step ? '#8B5CF6' : i < step ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)',
                  }} />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(s => s - 1)}
                  disabled={isFirst}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-0"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                <button
                  onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
                >
                  {isLast ? 'Começar!' : 'Próximo'} {!isLast && <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default CarouselTour;
