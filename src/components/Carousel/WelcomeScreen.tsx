import React from 'react';
import { motion } from 'framer-motion';
import '@/styles/carousel-loader.css';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#050508' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Giant orb — much larger on desktop */}
      <div className="absolute bottom-[-180px] md:bottom-[-300px] lg:bottom-[-400px] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="carousel-loader-wrapper" style={{ width: 'clamp(400px, 80vw, 900px)', height: 'clamp(400px, 80vw, 900px)' }}>
          <div className="carousel-loader-spinner" />
        </div>
        {/* Extra ambient glow behind the orb */}
        <div
          className="absolute inset-0 rounded-full blur-[120px] md:blur-[180px] opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(123,80,220,0.7) 0%, rgba(71,30,236,0.3) 40%, transparent 70%)' }}
        />
      </div>

      {/* Subtle top ambient glow */}
      <div
        className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px] opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(123,80,220,0.8) 0%, transparent 70%)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 mb-32 md:mb-40">
        <motion.p
          className="text-white/40 text-xs md:text-sm uppercase tracking-[0.3em] font-mono mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          elloContent
        </motion.p>

        <motion.h1
          className="text-white text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Olá, seja bem-vindo ao
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, #ad5fff 0%, #7B50DC 50%, #471eec 100%)',
            }}
          >
            Criador de Carrosséis
          </span>
        </motion.h1>

        <motion.p
          className="text-white/50 text-base md:text-lg max-w-md mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Crie carrosséis profissionais com inteligência artificial em poucos cliques.
        </motion.p>

        <motion.button
          onClick={onStart}
          className="group relative px-10 py-4 rounded-full text-white font-semibold text-lg overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #7B50DC 0%, #471eec 100%)',
            boxShadow: '0 0 40px rgba(123,80,220,0.4), 0 0 80px rgba(123,80,220,0.15)',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1, duration: 0.5, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(123,80,220,0.6), 0 0 100px rgba(123,80,220,0.25)' }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
          />
          <span className="relative z-10">Vamos começar? 🚀</span>
        </motion.button>
      </div>

      {/* Bottom decorative particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 3 + Math.random() * 4,
            height: 3 + Math.random() * 4,
            backgroundColor: `rgba(123,80,220,${0.2 + Math.random() * 0.3})`,
            bottom: `${10 + Math.random() * 30}%`,
            left: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
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
