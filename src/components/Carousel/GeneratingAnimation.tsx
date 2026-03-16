import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home } from 'lucide-react';
import '@/styles/carousel-loader.css';

interface Props {
  imageGenProgress: string;
  topic?: string;
  cardCount?: number;
  bgColor?: string;
  accentColor?: string;
  textColor?: string;
  selectedFont?: string;
  brandName?: string;
  logoUrl?: string | null;
  skipWebSearch?: boolean;
  onGoHome?: () => void;
  isExtreme?: boolean;
  wizardMode?: 'simple' | 'advanced' | 'extreme';
  isCompleting?: boolean;
  onCompleteAnimationDone?: () => void;
}

// Fixed bright colors for loading UI - never uses user's accent color
const LOADING_PURPLE = '#A855F7';
const LOADING_ORANGE = '#F97316';
const LOADING_RED = '#EF4444';

const GeneratingAnimation: React.FC<Props> = ({
  imageGenProgress,
  topic = 'Seu tema incrível',
  cardCount = 8,
  bgColor = '#0A0A1A',
  accentColor = LOADING_PURPLE,
  textColor = '#FFFFFF',
  selectedFont = 'Inter',
  brandName = '',
  logoUrl = null,
  skipWebSearch = false,
  onGoHome,
  isExtreme = false,
  wizardMode = 'simple',
  isCompleting = false,
  onCompleteAnimationDone,
}) => {
  // Use orange for extreme mode, red for advanced, purple otherwise
  const loadingColor = isExtreme ? LOADING_ORANGE : wizardMode === 'advanced' ? LOADING_RED : LOADING_PURPLE;
  const [activeStep, setActiveStep] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [showMiniCards, setShowMiniCards] = useState<number[]>([]);
  const [completionPhase, setCompletionPhase] = useState(false);

  // When isCompleting becomes true, trigger zoom animation
  useEffect(() => {
    if (isCompleting && !completionPhase) {
      setCompletionPhase(true);
      const timer = setTimeout(() => {
        onCompleteAnimationDone?.();
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [isCompleting]);

  // Build real code lines from actual params
  const CODE_LINES = useMemo(() => {
    const truncatedTopic = topic.length > 40 ? topic.substring(0, 40) + '...' : topic;
    const styles = ['editorial', 'minimalista', 'moderno', 'criativo', 'corporativo'];
    const imgStyles = ['photorealistic', 'cinematic', 'editorial', 'lifestyle', 'dramatic'];
    const webCounts = [30, 40, 50, 60, 80];
    const formats = ['1080x1350', '1080x1080', '1080x1920'];
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const lines: { type: string; text: string }[] = [
      { type: 'comment', text: '// Gerando carrossel com IA...' },
      { type: 'code', text: 'const carousel = await generate({' },
      { type: 'prop', text: `  topic: "${truncatedTopic}",` },
      { type: 'prop', text: `  cards: ${cardCount},` },
      { type: 'prop', text: `  style: "${pick(styles)}",` },
      { type: 'code', text: '});' },
      { type: 'blank', text: '' },
      { type: 'comment', text: '// Definindo identidade visual' },
      { type: 'code', text: 'carousel.applyBrand({' },
      { type: 'prop', text: `  colors: ["${bgColor}", "${accentColor}"],` },
      { type: 'prop', text: `  textColor: "${textColor}",` },
      ...(brandName ? [{ type: 'prop', text: `  brand: "${brandName}",` }] : []),
      { type: 'prop', text: `  logo: ${logoUrl ? '"uploaded ✓"' : '"none"'},` },
      { type: 'code', text: '});' },
      { type: 'blank', text: '' },
    ];

    if (!skipWebSearch) {
      lines.push(
        { type: 'comment', text: '// Buscando referências visuais' },
        { type: 'code', text: 'const images = await searchWeb({' },
        { type: 'prop', text: `  query: "${truncatedTopic}",` },
        { type: 'prop', text: `  count: ${pick(webCounts)},` },
        { type: 'prop', text: '  filter: "no_text",' },
        { type: 'code', text: '});' },
        { type: 'blank', text: '' },
      );
    }

    lines.push(
      { type: 'comment', text: '// Gerando imagens únicas com IA' },
      { type: 'code', text: 'for (const card of carousel.cards) {' },
      { type: 'prop', text: '  card.image = await generateImage({' },
      { type: 'prop', text: '    prompt: card.imagePrompt,' },
      { type: 'prop', text: '    model: "elloia",' },
      { type: 'prop', text: `    style: "${pick(imgStyles)}",` },
      { type: 'code', text: '  });' },
      { type: 'code', text: '}' },
      { type: 'blank', text: '' },
      { type: 'comment', text: '// Aplicando layout final' },
      { type: 'code', text: `carousel.render({ format: "${pick(formats)}", slides: ${cardCount} });` },
      { type: 'code', text: '// ✓ Carrossel pronto!' },
    );

    return lines;
  }, [topic, cardCount, bgColor, accentColor, textColor, brandName, logoUrl, skipWebSearch]);

  const STEPS = useMemo(() => [
    { label: 'Criando textos persuasivos...' },
    { label: 'Definindo paleta de cores...' },
    { label: `Calculando layout de ${cardCount} cards...` },
    ...(skipWebSearch ? [] : [{ label: 'Buscando imagens na web...' }]),
    { label: 'Gerando imagens com IA...' },
    { label: 'Aplicando tipografia...' },
    { label: 'Montando carrossel...' },
    { label: 'Finalizando...' },
  ], [cardCount, selectedFont, skipWebSearch]);

  const displayCardCount = Math.min(cardCount, 8);

  // Cycle through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [STEPS.length]);

  // Reveal code lines one by one
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= CODE_LINES.length) return 0;
        return prev + 1;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [CODE_LINES.length]);

  // Show mini card previews progressively
  useEffect(() => {
    setShowMiniCards([]);
    const timeout = setTimeout(() => {
      setShowMiniCards([0]);
    }, 2500);
    const interval = setInterval(() => {
      setShowMiniCards(prev => {
        if (prev.length >= displayCardCount) return prev;
        return [...prev, prev.length];
      });
    }, 1800);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [displayCardCount]);

  const miniCardColors = useMemo(() => {
    const base = [
      `linear-gradient(135deg, ${bgColor} 0%, ${accentColor}40 100%)`,
      `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
      `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}CC 100%)`,
      `linear-gradient(135deg, #E94560 0%, #FF6B6B 100%)`,
      `linear-gradient(135deg, ${accentColor}80 0%, ${bgColor} 100%)`,
      `linear-gradient(135deg, ${bgColor} 0%, ${accentColor}60 100%)`,
      `linear-gradient(135deg, ${accentColor}60 0%, ${bgColor} 100%)`,
      `linear-gradient(135deg, ${bgColor}80 0%, ${accentColor} 100%)`,
    ];
    return base.slice(0, displayCardCount);
  }, [bgColor, accentColor, displayCardCount]);

  // Card type pattern based on real card count
  const cardTypes = useMemo(() => {
    const types: string[] = ['cover'];
    for (let i = 1; i < displayCardCount - 1; i++) {
      types.push(i % 3 === 0 ? 'image' : 'content');
    }
    if (displayCardCount > 1) types.push('cta');
    return types;
  }, [displayCardCount]);

  // Grid columns based on card count
  const gridCols = displayCardCount <= 4 ? `grid-cols-${displayCardCount}` : displayCardCount <= 6 ? 'grid-cols-6' : 'grid-cols-8';

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex"
      style={{ backgroundColor: '#050508' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Home button — continue in background */}
      {onGoHome && (
        <button
          onClick={onGoHome}
          className="absolute top-4 left-4 z-[70] p-2.5 rounded-full transition-all cursor-pointer hover:bg-white/10"
        >
          <Home className="w-4 h-4 text-white/40" />
        </button>
      )}
      {/* LEFT SIDE — Orb + Status */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4">
        <div className="absolute w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full opacity-20 blur-[100px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${loadingColor}99 0%, transparent 70%)` }} />

        <motion.div
          className="carousel-loader-wrapper"
          style={{ width: 200, height: 200 }}
          animate={completionPhase ? { scale: 18, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={completionPhase ? { duration: 1.0, ease: [0.22, 1, 0.36, 1] } : {}}
        >
          <div className={`carousel-loader-spinner ${isExtreme ? 'carousel-loader-spinner--orange' : wizardMode === 'advanced' ? 'carousel-loader-spinner--red' : ''}`} />
        </motion.div>

        <motion.div
          animate={completionPhase ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
        {imageGenProgress && (
          <motion.div className="md:hidden mt-6 flex flex-col items-center gap-2 w-full max-w-[260px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-white text-base font-bold">{imageGenProgress}</p>
            {(() => {
              const match = imageGenProgress.match(/(\d+)\/(\d+)/);
              if (!match) return null;
              const current = parseInt(match[1]);
              const total = parseInt(match[2]);
              const pct = total > 0 ? (current / total) * 100 : 0;
              return (
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: loadingColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              );
            })()}
          </motion.div>
        )}

        <div className="mt-6 md:mt-10 text-center relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={imageGenProgress || activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              {imageGenProgress ? (
                <div className="hidden md:flex flex-col items-center gap-2 w-full max-w-[300px]">
                  <p className="text-white/70 text-sm font-medium">{imageGenProgress}</p>
                  {(() => {
                    const match = imageGenProgress.match(/(\d+)\/(\d+)/);
                    if (!match) return null;
                    const current = parseInt(match[1]);
                    const total = parseInt(match[2]);
                    const pct = total > 0 ? (current / total) * 100 : 0;
                    return (
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: loadingColor }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <>
                  <p className="text-white/70 text-sm font-medium">{STEPS[activeStep]?.label}</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-1.5 mt-5 justify-center">
            {STEPS.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: i === activeStep ? loadingColor : i < activeStep ? `${loadingColor}66` : 'rgba(255,255,255,0.1)',
                  transform: i === activeStep ? 'scale(1.5)' : 'scale(1)',
                }} />
            ))}
          </div>
        </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE — Code flow + Mini cards */}
      <motion.div className="hidden md:flex flex-1 flex-col relative overflow-hidden"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}
        animate={completionPhase ? { opacity: 0, x: 40 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >

        <div className="flex-1 p-8 overflow-hidden relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF5F57' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FEBC2E' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#28C840' }} />
            <span className="text-white/20 text-xs ml-2 font-mono">carousel-generator.ts</span>
          </div>

          <div className="font-mono text-[11px] leading-6 space-y-0 overflow-hidden">
            {CODE_LINES.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={`${i}-${Math.floor(visibleLines / CODE_LINES.length)}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex"
              >
                <span className="w-8 text-right mr-4 select-none" style={{ color: 'rgba(255,255,255,0.12)' }}>{i + 1}</span>
                {line.type === 'comment' && <span style={{ color: '#6A9955' }}>{line.text}</span>}
                {line.type === 'code' && <span style={{ color: '#D4D4D4' }}>{line.text}</span>}
                {line.type === 'prop' && <span style={{ color: '#9CDCFE' }}>{line.text}</span>}
                {line.type === 'blank' && <span>&nbsp;</span>}
                {i === visibleLines - 1 && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="inline-block w-2 h-4 ml-0.5"
                    style={{ backgroundColor: loadingColor, marginTop: 2 }}
                  />
                )}
              </motion.div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(transparent, #050508)' }} />
        </div>

      </motion.div>
    </motion.div>
  );
};

export default GeneratingAnimation;
