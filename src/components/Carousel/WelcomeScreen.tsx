import React from 'react';
import { motion } from 'framer-motion';
import '@/styles/carousel-loader.css';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

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
      {/* Horizon gradient glow — like Lovable */}
      <div
        className="absolute left-0 right-0 h-[300px] md:h-[400px] pointer-events-none"
        style={{
          bottom: '15%',
          background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(123,80,220,0.25) 0%, rgba(71,30,236,0.12) 40%, transparent 70%)',
        }}
      />

      {/* Giant orb — mostly hidden, only top ~30% visible */}
      <div className="absolute bottom-[-350px] md:bottom-[-550px] lg:bottom-[-700px] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="carousel-loader-wrapper" style={{ width: 'clamp(500px, 95vw, 1200px)', height: 'clamp(500px, 95vw, 1200px)' }}>
          <div className="carousel-loader-spinner" />
        </div>
        <div
          className="absolute inset-0 rounded-full blur-[150px] md:blur-[250px] opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(123,80,220,0.6) 0%, rgba(71,30,236,0.2) 40%, transparent 70%)' }}
        />
      </div>

      {/* Content — positioned upper-center */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 -mt-16 md:-mt-24">
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
          Crie carrosséis profissionais com inteligência artificial em poucos cliques.
        </motion.p>

        <motion.button
          onClick={onStart}
          className="group relative px-8 py-3 rounded-full text-white font-semibold text-base overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #7B50DC 0%, #471eec 100%)',
            boxShadow: '0 0 30px rgba(123,80,220,0.35), 0 0 60px rgba(123,80,220,0.1)',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1, duration: 0.5, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(123,80,220,0.5), 0 0 90px rgba(123,80,220,0.2)' }}
          whileTap={{ scale: 0.97 }}
        >
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

      {/* Subtle particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            backgroundColor: `rgba(123,80,220,${0.15 + Math.random() * 0.2})`,
            bottom: `${15 + Math.random() * 25}%`,
            left: `${15 + Math.random() * 70}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
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
