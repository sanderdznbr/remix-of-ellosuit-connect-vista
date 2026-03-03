import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, AtSign } from 'lucide-react';
import '@/styles/carousel-loader.css';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import PromptMentionInput, { PromptMentionRef } from './wizard/PromptMention';

interface MentionedPrompt {
  id: string;
  title: string;
  avatar_url: string | null;
  content: string;
}

type ContentMode = 'carousel' | 'single-post';

interface WelcomeScreenProps {
  onStart: (initialTopic?: string, shouldEnhance?: boolean, mentionedPrompts?: MentionedPrompt[], contentMode?: ContentMode, manualPostText?: string) => void;
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
  const [mentionedPrompts, setMentionedPrompts] = useState<MentionedPrompt[]>([]);
  const [contentMode, setContentMode] = useState<ContentMode>('carousel');
  const [manualPostText, setManualPostText] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionRef = useRef<PromptMentionRef>(null);
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
      onStart(inputValue.trim(), false, mentionedPrompts, contentMode, contentMode === 'single-post' ? manualPostText : undefined);
    }
  };

  const handleMentionAdd = (p: MentionedPrompt) => {
    setMentionedPrompts(prev => [...prev, p]);
  };

  const handleMentionRemove = (id: string) => {
    setMentionedPrompts(prev => prev.filter(m => m.id !== id));
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
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-center gap-6 md:gap-8">
          <img src={ellocontentLogo} alt="elloContent" className="h-5 md:h-6" />
          <div className="hidden md:flex items-center gap-5">
            {[
              { label: 'Preços', path: '/precos' },
              { label: 'Recursos', path: '/recursos' },
              { label: 'Comunidade', path: '#' },
              { label: 'Suporte', path: '#' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => item.path !== '#' && navigate(item.path)}
                className="text-white/50 hover:text-white/80 text-sm font-medium transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/auth')} className="text-white/60 hover:text-white text-sm font-medium transition-colors cursor-pointer px-3 py-1.5">Login</button>
          <button onClick={() => navigate('/auth')} className="text-white text-sm font-medium px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors cursor-pointer">Começar</button>
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
        <motion.h1
          className="text-white text-xl md:text-3xl font-semibold leading-snug mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          Crie algo com ellocontent
        </motion.h1>

        <motion.p
          className="text-white/35 text-xs md:text-sm max-w-xs mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
        >
          Desenvolva carrosséis ou posts com um prompt.
        </motion.p>

        {/* Content mode selector */}
        <motion.div
          className="flex items-center gap-2 mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
        >
          <button
            onClick={() => setContentMode('carousel')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: contentMode === 'carousel' ? 'rgba(123,80,220,0.25)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${contentMode === 'carousel' ? 'rgba(123,80,220,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: contentMode === 'carousel' ? '#C4B5FD' : 'rgba(255,255,255,0.4)',
            }}
          >
            Carrossel
          </button>
          <button
            onClick={() => setContentMode('single-post')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: contentMode === 'single-post' ? 'rgba(123,80,220,0.25)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${contentMode === 'single-post' ? 'rgba(123,80,220,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: contentMode === 'single-post' ? '#C4B5FD' : 'rgba(255,255,255,0.4)',
            }}
          >
            Post Único
          </button>
        </motion.div>

        {/* Input card */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
        >
          <div
            className="relative w-full rounded-2xl overflow-visible"
            style={{
              backgroundColor: 'rgba(20, 20, 28, 0.95)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
            }}
          >
            <div className="relative">
              <PromptMentionInput
                ref={mentionRef}
                value={inputValue}
                onChange={setInputValue}
                mentionedPrompts={mentionedPrompts}
                onMentionAdd={handleMentionAdd}
                onMentionRemove={handleMentionRemove}
              placeholder={contentMode === 'single-post' ? "Descreva o tema do post (ex: dicas de skincare)..." : " "}
                className="w-full bg-transparent text-white/90 text-sm md:text-base px-4 py-4 pr-14 resize-none outline-none relative z-10 min-h-[84px]"
              />
              {/* Animated placeholder */}
              {!isUserTyping && mentionedPrompts.length === 0 && contentMode === 'carousel' && (
                <div
                  className="absolute top-0 left-0 px-4 py-4 pr-14 text-sm md:text-base pointer-events-none z-0"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  {animatedPlaceholder}
                  <span className="inline-block w-[2px] h-[1em] bg-white/30 ml-0.5 animate-pulse align-middle" />
                </div>
              )}
            </div>


            {/* Bottom bar */}
            <div className="flex items-center justify-between px-3 pb-3">
              <button
                onClick={() => mentionRef.current?.triggerMention()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all cursor-pointer"
                title="Mencionar prompt salvo"
              >
                <AtSign className="w-4 h-4" />
              </button>
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
