import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import '@/styles/carousel-loader.css';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

interface WelcomeScreenProps {
  onStart: (initialTopic?: string, shouldEnhance?: boolean) => void;
}

const PLACEHOLDER_SUGGESTIONS = [
  'Crie um post sobre facetas e resinas...',
  'Crie um post sobre como cuidar do MEI em 2026...',
  '5 dicas de skincare para o verão...',
  'Como aumentar suas vendas no Instagram...',
  'Carrossel sobre alimentação saudável para iniciantes...',
  'Tendências de marketing digital para 2026...',
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserTyping = inputValue.length > 0;

  useEffect(() => {
    if (isUserTyping) {
      setAnimatedPlaceholder('');
      return;
    }

    let suggestionIndex = 0;
    let charIndex = 0;
    let erasing = false;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const text = PLACEHOLDER_SUGGESTIONS[suggestionIndex];

      if (!erasing) {
        charIndex++;
        setAnimatedPlaceholder(text.slice(0, charIndex));
        if (charIndex >= text.length) {
          erasing = true;
          timeoutRef.current = setTimeout(tick, 2200);
        } else {
          timeoutRef.current = setTimeout(tick, 55 + Math.random() * 35);
        }
      } else {
        charIndex--;
        setAnimatedPlaceholder(text.slice(0, charIndex));
        if (charIndex <= 0) {
          erasing = false;
          suggestionIndex = (suggestionIndex + 1) % PLACEHOLDER_SUGGESTIONS.length;
          timeoutRef.current = setTimeout(tick, 500);
        } else {
          timeoutRef.current = setTimeout(tick, 25);
        }
      }
    };

    timeoutRef.current = setTimeout(tick, 1000);

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isUserTyping]);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onStart(inputValue.trim(), true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden"
      style={{ backgroundColor: '#0a0a0f' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top Navbar */}
      <motion.nav
        className="relative z-20 flex items-center justify-between px-5 md:px-8 py-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {/* Left: Logo + Links */}
        <div className="flex items-center gap-6 md:gap-8">
          <img src={ellocontentLogo} alt="elloContent" className="h-5 md:h-6" />
          <div className="hidden md:flex items-center gap-5">
            {['Preços', 'Recursos', 'Comunidade', 'Suporte'].map((item) => (
              <button
                key={item}
                className="text-white/50 hover:text-white/80 text-sm font-medium transition-colors cursor-pointer"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Login / Começar */}
        <div className="flex items-center gap-3">
          <button
              onClick={() => navigate('/auth')}
              className="text-white/60 hover:text-white text-sm font-medium transition-colors cursor-pointer px-3 py-1.5"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="text-white text-sm font-medium px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Começar
            </button>
        </div>
      </motion.nav>

      {/* Orb */}
      <div className="absolute bottom-[-500px] md:bottom-[-750px] lg:bottom-[-950px] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="carousel-loader-wrapper" style={{ width: 'clamp(600px, 110vw, 1500px)', height: 'clamp(600px, 110vw, 1500px)' }}>
          <div className="carousel-loader-spinner" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 md:px-6 -mt-8 md:-mt-12 w-full max-w-xl mx-auto">
        {/* Title */}
        <motion.h1
          className="text-white text-xl md:text-3xl font-semibold leading-snug mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Crie algo com ellocontent
        </motion.h1>

        <motion.p
          className="text-white/35 text-xs md:text-sm max-w-xs mb-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
        >
          Desenvolva carrosséis com um prompt.
        </motion.p>

        {/* Input card */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
        >
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(20, 20, 28, 0.95)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
            }}
          >
            {/* Textarea with animated placeholder overlay */}
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="w-full bg-transparent text-white/90 text-sm md:text-base px-4 py-4 pr-14 resize-none outline-none relative z-10"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              {/* Animated placeholder */}
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

            {/* Bottom bar */}
            <div className="flex items-center justify-end px-3 pb-3">
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: inputValue.trim() ? '#7B50DC' : 'rgba(255,255,255,0.08)',
                }}
              >
                <ArrowUp className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Skip link */}
        <motion.button
          onClick={() => onStart()}
          className="mt-4 text-white/20 hover:text-white/40 text-[11px] transition-colors cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.4 }}
        >
          ou pular e configurar manualmente
        </motion.button>
      </div>
    </motion.div>
  );
};

export default WelcomeScreen;
