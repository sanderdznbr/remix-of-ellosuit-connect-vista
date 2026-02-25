import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import '@/styles/carousel-loader.css';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

interface WelcomeScreenProps {
  onStart: (initialTopic?: string, shouldEnhance?: boolean) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [inputValue, setInputValue] = useState('');

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
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0a0a0f' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Orb */}
      <div className="absolute bottom-[-500px] md:bottom-[-750px] lg:bottom-[-950px] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="carousel-loader-wrapper" style={{ width: 'clamp(600px, 110vw, 1500px)', height: 'clamp(600px, 110vw, 1500px)' }}>
          <div className="carousel-loader-spinner" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 md:px-6 -mt-8 md:-mt-12 w-full max-w-xl">
        {/* Logo */}
        <motion.img
          src={ellocontentLogo}
          alt="elloContent"
          className="h-6 md:h-8 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />

        {/* Title */}
        <motion.h1
          className="text-white text-xl md:text-3xl font-semibold leading-snug mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Construa carrosséis com um prompt
        </motion.h1>

        <motion.p
          className="text-white/35 text-xs md:text-sm max-w-xs mb-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
        >
          Crie carrosséis profissionais com IA em poucos cliques.
        </motion.p>

        {/* Input card — dark, opaque like Lovable */}
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
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o tema do seu carrossel..."
              rows={3}
              className="w-full bg-transparent text-white/90 placeholder-white/20 text-sm md:text-base px-4 py-4 pr-14 resize-none outline-none"
              style={{ fontFamily: "'Inter', sans-serif" }}
            />

            {/* Bottom bar */}
            <div className="flex items-center justify-end px-3 pb-3">
              {/* Send button */}
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
