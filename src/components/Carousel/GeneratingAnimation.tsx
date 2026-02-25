import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  imageGenProgress: string;
}

const STEPS = [
  { icon: '📝', label: 'Criando textos persuasivos...', detail: 'title: "5 Dicas para Crescer no Instagram"' },
  { icon: '🎨', label: 'Definindo paleta de cores...', detail: 'bgColor: #0A0A1A, accent: #7B50DC' },
  { icon: '📐', label: 'Calculando layout dos cards...', detail: 'layout: "editorial", cards: 12' },
  { icon: '🖼️', label: 'Buscando imagens na web...', detail: 'query: "social media growth"' },
  { icon: '✨', label: 'Gerando imagens com IA...', detail: 'model: "nano-banana", style: "realistic"' },
  { icon: '🔤', label: 'Aplicando tipografia...', detail: 'font: "Inter", scale: 1.0' },
  { icon: '📱', label: 'Montando carrossel...', detail: 'format: 1080x1350, slides: ready' },
  { icon: '🚀', label: 'Finalizando...', detail: 'status: "almost_done"' },
];

const CODE_LINES = [
  { type: 'comment', text: '// Gerando carrossel com IA...' },
  { type: 'code', text: 'const carousel = await generate({' },
  { type: 'prop', text: '  topic: "Seu tema incrível",' },
  { type: 'prop', text: '  cards: 12,' },
  { type: 'prop', text: '  style: "editorial",' },
  { type: 'code', text: '});' },
  { type: 'blank', text: '' },
  { type: 'comment', text: '// Definindo identidade visual' },
  { type: 'code', text: 'carousel.applyBrand({' },
  { type: 'prop', text: '  colors: ["#0A0A1A", "#7B50DC"],' },
  { type: 'prop', text: '  font: "Inter",' },
  { type: 'prop', text: '  logo: "uploaded ✓",' },
  { type: 'code', text: '});' },
  { type: 'blank', text: '' },
  { type: 'comment', text: '// Buscando referências visuais' },
  { type: 'code', text: 'const images = await searchWeb({' },
  { type: 'prop', text: '  query: topic,' },
  { type: 'prop', text: '  count: 50,' },
  { type: 'prop', text: '  filter: "no_text",' },
  { type: 'code', text: '});' },
  { type: 'blank', text: '' },
  { type: 'comment', text: '// Gerando imagens únicas com IA' },
  { type: 'code', text: 'for (const card of carousel.cards) {' },
  { type: 'prop', text: '  card.image = await generateImage({' },
  { type: 'prop', text: '    prompt: card.imagePrompt,' },
  { type: 'prop', text: '    model: "nano-banana",' },
  { type: 'prop', text: '    style: "photorealistic",' },
  { type: 'code', text: '  });' },
  { type: 'code', text: '}' },
  { type: 'blank', text: '' },
  { type: 'comment', text: '// Aplicando layout final' },
  { type: 'code', text: 'carousel.render({ format: "1080x1350" });' },
  { type: 'code', text: '// ✓ Carrossel pronto!' },
];

const GeneratingAnimation: React.FC<Props> = ({ imageGenProgress }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [showMiniCards, setShowMiniCards] = useState<number[]>([]);

  // Cycle through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Reveal code lines one by one
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= CODE_LINES.length) return 0; // loop
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Show mini card previews progressively
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowMiniCards(prev => {
        if (prev.length >= 6) return prev;
        return [...prev, prev.length];
      });
    }, 2500);
    const interval = setInterval(() => {
      setShowMiniCards(prev => {
        if (prev.length >= 6) return prev;
        return [...prev, prev.length];
      });
    }, 1800);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  const miniCardColors = useMemo(() => [
    'linear-gradient(135deg, #0A0A1A 0%, #1a1a3e 100%)',
    'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)',
    'linear-gradient(135deg, #0A0A1A 0%, #16213E 100%)',
    'linear-gradient(135deg, #E94560 0%, #FF6B6B 100%)',
    'linear-gradient(135deg, #0F3460 0%, #533483 100%)',
    'linear-gradient(135deg, #0A0A1A 0%, #1a1a3e 100%)',
  ], []);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex"
      style={{ backgroundColor: '#050508' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* LEFT SIDE — Orb + Status */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(123,80,220,0.6) 0%, transparent 70%)' }} />

        {/* Animated orb */}
        <motion.div
          className="relative w-48 h-48 md:w-64 md:h-64"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #7B50DC, #4C1D95, #0A0A1A, #1E1B4B, #7B50DC)',
              boxShadow: '0 0 60px rgba(123,80,220,0.4), inset 0 0 60px rgba(0,0,0,0.5)',
            }} />
          <div className="absolute inset-2 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(123,80,220,0.4), #0A0A1A 70%)',
            }} />
        </motion.div>

        {/* Step indicator */}
        <div className="mt-10 text-center relative z-10">
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
                <p className="text-white/70 text-sm font-medium">{imageGenProgress}</p>
              ) : (
                <>
                  <span className="text-2xl">{STEPS[activeStep].icon}</span>
                  <p className="text-white/70 text-sm font-medium">{STEPS[activeStep].label}</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-5 justify-center">
            {STEPS.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: i === activeStep ? '#7B50DC' : i < activeStep ? 'rgba(123,80,220,0.4)' : 'rgba(255,255,255,0.1)',
                  transform: i === activeStep ? 'scale(1.5)' : 'scale(1)',
                }} />
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — Code flow + Mini cards */}
      <div className="hidden md:flex flex-1 flex-col relative overflow-hidden"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}>

        {/* Code flow section */}
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
                    style={{ backgroundColor: '#7B50DC', marginTop: 2 }}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Fade out bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(transparent, #050508)' }} />
        </div>

        {/* Mini card previews */}
        <div className="p-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-white/20 text-[10px] font-mono uppercase tracking-widest mb-3">Cards sendo criados</p>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={showMiniCards.includes(i) ? { opacity: 1, scale: 1 } : { opacity: 0.1, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="aspect-[4/5] rounded-lg overflow-hidden relative"
                style={{
                  background: showMiniCards.includes(i) ? miniCardColors[i] : 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {showMiniCards.includes(i) && (
                  <>
                    <div className="absolute top-1.5 left-1.5 right-1.5">
                      <div className="h-1 rounded-full mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: '60%' }} />
                      <div className="h-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)', width: '80%' }} />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 h-[40%] rounded"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    <motion.div
                      className="absolute top-1 right-1 w-2 h-2 rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{ backgroundColor: '#28C840' }}
                    />
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GeneratingAnimation;
