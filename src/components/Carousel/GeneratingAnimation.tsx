import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '@/styles/carousel-loader.css';

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
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4">
        {/* Ambient glow */}
        <div className="absolute w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full opacity-20 blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(123,80,220,0.6) 0%, transparent 70%)' }} />

        {/* Animated orb — uses carousel-loader CSS */}
        <div className="carousel-loader-wrapper" style={{ width: 200, height: 200 }}>
          <div className="carousel-loader-spinner" />
        </div>

        {/* Percentage display on mobile */}
        {imageGenProgress && (
          <motion.div
            className="md:hidden mt-6 flex flex-col items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-white text-lg font-bold">{imageGenProgress}</p>
          </motion.div>
        )}

        {/* Step indicator */}
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
                <p className="hidden md:block text-white/70 text-sm font-medium">{imageGenProgress}</p>
              ) : (
                <>
                  <span className="text-2xl">{STEPS[activeStep].icon}</span>
                  <p className="text-white/70 text-sm font-medium">{STEPS[activeStep].label}</p>
                </>
              )}
              {!imageGenProgress && (
                <span className="text-2xl md:hidden">{STEPS[activeStep].icon}</span>
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

        {/* Mini card previews — realistic */}
        <div className="p-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-white/20 text-[10px] font-mono uppercase tracking-widest mb-3">Cards sendo criados</p>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => {
              const isActive = showMiniCards.includes(i);
              const cardTypes = ['cover', 'content', 'content', 'image', 'content', 'cta'];
              const type = cardTypes[i];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0.1, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="aspect-[4/5] rounded-lg overflow-hidden relative"
                  style={{
                    background: isActive ? miniCardColors[i] : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {isActive && (
                    <>
                      <motion.div
                        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full z-10"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        style={{ backgroundColor: '#28C840' }}
                      />

                      {type === 'cover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                          <motion.div className="w-5 h-1.5 rounded-full mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                            initial={{ width: 0 }} animate={{ width: 20 }} transition={{ duration: 0.8, delay: 0.3 }} />
                          <motion.div className="h-1.5 rounded-full mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.35)', width: '70%' }}
                            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.6 }} />
                          <motion.div className="h-1 rounded-full mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: '50%' }}
                            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.9 }} />
                          <motion.div className="h-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)', width: '40%' }}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} />
                        </div>
                      )}

                      {type === 'content' && (
                        <div className="absolute inset-0 p-1.5 flex flex-col">
                          <motion.div className="w-3 h-3 rounded-full mb-1.5 flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(123,80,220,0.5)' }}
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                            <span className="text-white text-[5px] font-bold">{i}</span>
                          </motion.div>
                          <motion.div className="h-1 rounded-full mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.3)', width: '80%' }}
                            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.4 }} />
                          {[65, 90, 75, 50].map((w, j) => (
                            <motion.div key={j} className="h-0.5 rounded-full mb-0.5"
                              style={{ backgroundColor: 'rgba(255,255,255,0.1)', width: `${w}%` }}
                              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3, delay: 0.6 + j * 0.15 }} />
                          ))}
                          <motion.div className="mt-auto rounded h-[35%]"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
                            <motion.div className="w-full h-full rounded flex items-center justify-center"
                              animate={{ opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}>
                              <span className="text-[6px] text-white/20">🖼️</span>
                            </motion.div>
                          </motion.div>
                        </div>
                      )}

                      {type === 'image' && (
                        <div className="absolute inset-0 flex flex-col">
                          <motion.div className="flex-1 relative overflow-hidden"
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                            <motion.div className="absolute inset-0"
                              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)' }}
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                          </motion.div>
                          <div className="p-1.5">
                            <motion.div className="h-1 rounded-full mb-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.25)', width: '75%' }}
                              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.8 }} />
                            <motion.div className="h-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)', width: '55%' }}
                              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.4, delay: 1 }} />
                          </div>
                        </div>
                      )}

                      {type === 'cta' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                          <motion.div className="w-4 h-4 rounded-full mb-1.5 flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(123,80,220,0.4)' }}
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}>
                            <span className="text-[6px]">🚀</span>
                          </motion.div>
                          <motion.div className="h-1 rounded-full mb-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.3)', width: '60%' }}
                            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.6 }} />
                          <motion.div className="h-2.5 rounded-full px-2 flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(123,80,220,0.6)', width: '65%' }}
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.9 }}>
                            <div className="h-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.5)', width: '70%' }} />
                          </motion.div>
                        </div>
                      )}

                      {i === showMiniCards.length - 1 && (
                        <motion.div className="absolute bottom-1 left-1.5 w-0.5 h-2 rounded-full"
                          style={{ backgroundColor: '#7B50DC' }}
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }} />
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GeneratingAnimation;
