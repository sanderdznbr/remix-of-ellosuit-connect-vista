import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Clock } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import '@/styles/carousel-loader.css';

const PLACEHOLDER_SUGGESTIONS = [
  'Crie um post sobre facetas e resinas...',
  'Crie um post sobre como cuidar do MEI em 2026...',
  '5 dicas de skincare para o verão...',
  'Como aumentar suas vendas no Instagram...',
];

interface DashboardHomeProps {
  onStartCarousel: (topic?: string) => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ onStartCarousel }) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserTyping = inputValue.length > 0;

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuário';

  useEffect(() => {
    if (isUserTyping) { setAnimatedPlaceholder(''); return; }
    let si = 0, ci = 0, erasing = false, cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const text = PLACEHOLDER_SUGGESTIONS[si];
      if (!erasing) {
        ci++;
        setAnimatedPlaceholder(text.slice(0, ci));
        if (ci >= text.length) { erasing = true; timeoutRef.current = setTimeout(tick, 2200); }
        else { timeoutRef.current = setTimeout(tick, 55 + Math.random() * 35); }
      } else {
        ci--;
        setAnimatedPlaceholder(text.slice(0, ci));
        if (ci <= 0) { erasing = false; si = (si + 1) % PLACEHOLDER_SUGGESTIONS.length; timeoutRef.current = setTimeout(tick, 500); }
        else { timeoutRef.current = setTimeout(tick, 25); }
      }
    };
    timeoutRef.current = setTimeout(tick, 1000);
    return () => { cancelled = true; if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isUserTyping]);

  const handleSubmit = () => {
    if (inputValue.trim()) onStartCarousel(inputValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Orb */}
      <div className="absolute bottom-[-500px] md:bottom-[-750px] lg:bottom-[-950px] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="carousel-loader-wrapper" style={{ width: 'clamp(600px, 110vw, 1500px)', height: 'clamp(600px, 110vw, 1500px)' }}>
          <div className="carousel-loader-spinner" />
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 md:px-6 -mt-8 w-full max-w-2xl mx-auto relative z-10">
        <motion.h1
          className="text-white text-2xl md:text-4xl font-semibold leading-snug mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Vamos criar, {username}
        </motion.h1>

        <motion.p
          className="text-white/35 text-xs md:text-sm max-w-xs mb-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          Desenvolva carrosséis com um prompt.
        </motion.p>

        {/* Input */}
        <motion.div
          className="w-full max-w-xl"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(20, 20, 28, 0.95)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
            }}
          >
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="w-full bg-transparent text-white/90 text-sm md:text-base px-4 py-4 pr-14 resize-none outline-none relative z-10"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              {!isUserTyping && (
                <div
                  className="absolute top-0 left-0 px-4 py-4 pr-14 text-sm md:text-base pointer-events-none z-0"
                  style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.25)' }}
                >
                  {animatedPlaceholder}
                  <span className="inline-block w-[2px] h-[1em] bg-white/30 ml-0.5 animate-pulse align-middle" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end px-3 pb-3">
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ backgroundColor: inputValue.trim() ? '#7B50DC' : 'rgba(255,255,255,0.08)' }}
              >
                <ArrowUp className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.button
          onClick={() => onStartCarousel()}
          className="mt-4 text-white/20 hover:text-white/40 text-[11px] transition-colors cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          ou pular e configurar manualmente
        </motion.button>
      </div>

      {/* Recent projects section */}
      <motion.div
        className="relative z-10 px-8 pb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-6 mb-4">
            <button className="text-sm font-medium text-white/70 border-b-2 border-purple-500 pb-1 cursor-pointer">Recentes</button>
            <button className="text-sm font-medium text-white/30 hover:text-white/50 pb-1 cursor-pointer">Meus projetos</button>
            <button className="text-sm font-medium text-white/30 hover:text-white/50 pb-1 cursor-pointer">Favoritos</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Empty state */}
            <div className="aspect-[4/3] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/30 hover:border-white/20 transition-colors cursor-pointer"
              onClick={() => onStartCarousel()}
            >
              <Clock className="w-5 h-5" />
              <span className="text-xs">Criar primeiro carrossel</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHome;
