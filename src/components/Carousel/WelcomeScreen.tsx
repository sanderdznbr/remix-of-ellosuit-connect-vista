import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import '@/styles/carousel-loader.css';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

interface WelcomeScreenProps {
  onStart: (initialTopic?: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onStart(inputValue.trim());
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
      style={{ backgroundColor: '#050508' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Giant orb — mostly hidden */}
      <div className="absolute bottom-[-350px] md:bottom-[-550px] lg:bottom-[-700px] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="carousel-loader-wrapper" style={{ width: 'clamp(500px, 95vw, 1200px)', height: 'clamp(500px, 95vw, 1200px)' }}>
          <div className="carousel-loader-spinner" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 -mt-10 md:-mt-16 w-full max-w-2xl">
        {/* ElloContent Logo */}
        <motion.img
          src={ellocontentLogo}
          alt="elloContent"
          className="h-8 md:h-10 lg:h-12 mb-5 md:mb-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        />

        <motion.h1
          className="text-white text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Construa carrosséis com um prompt
        </motion.h1>

        <motion.p
          className="text-white/40 text-sm md:text-base max-w-sm mb-8"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Crie carrosséis profissionais com IA em poucos cliques.
        </motion.p>

        {/* Input box — Lovable style */}
        <motion.div
          className="w-full relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o tema do seu carrossel..."
              rows={3}
              className="w-full bg-transparent text-white/90 placeholder-white/25 text-base px-5 py-4 pr-14 resize-none outline-none"
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="absolute right-3 bottom-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                backgroundColor: inputValue.trim() ? '#7B50DC' : 'rgba(255,255,255,0.1)',
              }}
            >
              <ArrowUp className="w-5 h-5 text-white" />
            </button>
          </div>
        </motion.div>

        {/* Skip link */}
        <motion.button
          onClick={() => onStart()}
          className="mt-4 text-white/25 hover:text-white/50 text-xs transition-colors cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          ou pular e configurar manualmente
        </motion.button>
      </div>

      {/* Subtle particles */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            backgroundColor: `rgba(123,80,220,${0.1 + Math.random() * 0.15})`,
            bottom: `${10 + Math.random() * 20}%`,
            left: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: 5 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
};

export default WelcomeScreen;
