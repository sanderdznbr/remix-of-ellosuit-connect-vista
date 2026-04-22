import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import '@/styles/carousel-loader.css';

interface AuthSplitLayoutProps {
  topRightSlot?: React.ReactNode;
  children: React.ReactNode;
  tagline?: { title: React.ReactNode; subtitle?: string };
}

const defaultTagline = {
  title: (
    <>
      Crie posts que<br />
      <span className="text-white/50">conectam, em segundos.</span>
    </>
  ),
  subtitle: 'A plataforma de IA mais elegante para criar conteúdo visual para suas redes.',
};

export default function AuthSplitLayout({ topRightSlot, children, tagline = defaultTagline }: AuthSplitLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* ─── LEFT: Brand / Orb ─── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden border-r border-white/[0.06]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="carousel-loader-wrapper" style={{ width: 'clamp(500px, 55vw, 850px)', height: 'clamp(500px, 55vw, 850px)' }}>
            <div className="carousel-loader-spinner" />
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, rgba(10,10,15,0.4) 70%, rgba(10,10,15,0.95) 100%)' }} />

        <motion.div
          className="absolute top-8 left-8 z-10"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <img src={ellocontentLogo} alt="elloContent" className="h-6 cursor-pointer" onClick={() => navigate('/')} />
        </motion.div>

        <motion.div
          className="absolute bottom-12 left-12 right-12 z-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <h2 className="text-white text-3xl xl:text-4xl font-semibold leading-tight tracking-tight mb-3">
            {tagline.title}
          </h2>
          {tagline.subtitle && (
            <p className="text-white/40 text-sm max-w-md leading-relaxed">{tagline.subtitle}</p>
          )}
        </motion.div>
      </div>

      {/* ─── RIGHT: Form ─── */}
      <div className="w-full lg:w-1/2 flex flex-col relative">
        <motion.nav
          className="flex items-center justify-between px-6 lg:px-10 py-5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <img src={ellocontentLogo} alt="elloContent" className="h-5 cursor-pointer lg:invisible" onClick={() => navigate('/')} />
          {topRightSlot}
        </motion.nav>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <motion.div
            className="w-full max-w-[400px] space-y-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
