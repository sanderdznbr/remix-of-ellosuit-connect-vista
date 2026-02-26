import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import '@/styles/carousel-loader.css';

const PLACEHOLDER_SUGGESTIONS = [
  'Crie um post sobre facetas e resinas...',
  'Crie um post sobre como cuidar do MEI em 2026...',
  '5 dicas de skincare para o verão...',
  'Como aumentar suas vendas no Instagram...',
];

interface DashboardHomeProps {
  onStartCarousel: (topic?: string) => void;
  onLoadCarousel?: (carouselItem: any) => void;
  onViewAllProjects?: () => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ onStartCarousel, onLoadCarousel, onViewAllProjects }) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const [recentCarousels, setRecentCarousels] = useState<any[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserTyping = inputValue.length > 0;

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuário';

  // Fetch recent carousels metadata with cover_url
  useEffect(() => {
    const fetchRecent = async () => {
      if (!user) return;
      try {
        const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).single();
        if (!companyData) return;
        const { data } = await supabase.from('generated_carousels').select('id, title, topic, created_at, card_count, style_config, cover_url').eq('company_id', companyData.company_id).order('created_at', { ascending: false }).limit(10);
        setRecentCarousels(data || []);
      } catch (err) { console.error(err); }
    };
    fetchRecent();
  }, [user]);

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
    <div className="flex-1 flex flex-col relative overflow-auto" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Orb — large, positioned lower so only ~40% visible */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[60%] pointer-events-none hidden md:block">
        <div className="carousel-loader-wrapper" style={{ width: 'min(1200px, 130vw)', height: 'min(1200px, 130vw)' }}>
          <div className="carousel-loader-spinner" />
        </div>
      </div>

      {/* Center content — title + input */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-5 md:px-6 w-full max-w-2xl mx-auto relative z-10 py-10 md:py-0 min-h-0">
        <motion.h1
          className="text-2xl md:text-4xl font-semibold leading-snug mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ fontFamily: "'Inter', sans-serif", color: '#ffffff' }}
        >
          Vamos criar, {username}
        </motion.h1>

        <motion.p
          className="text-xs md:text-sm max-w-xs mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Desenvolva carrosséis com um prompt.
        </motion.p>

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
                className="w-full bg-transparent text-sm md:text-base px-4 py-4 pr-14 resize-none outline-none relative z-10"
                style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.9)' }}
              />
              {!isUserTyping && (
                <div
                  className="absolute top-0 left-0 px-4 py-4 pr-14 text-sm md:text-base pointer-events-none z-0"
                  style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.25)' }}
                >
                  {animatedPlaceholder}
                  <span className="inline-block w-[2px] h-[1em] ml-0.5 animate-pulse align-middle" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
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
                <ArrowUp className="w-4 h-4" style={{ color: '#ffffff' }} />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.button
          onClick={() => onStartCarousel()}
          className="mt-5 text-[11px] transition-colors cursor-pointer"
          style={{ color: 'rgba(255,255,255,0.2)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          ou pular e configurar manualmente
        </motion.button>
      </div>

      {/* Recent projects — pinned to bottom with horizontal slider */}
      <motion.div
        className="relative z-10 px-4 md:px-8 pb-6 shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium pb-1 border-b-2 border-purple-500" style={{ color: 'rgba(255,255,255,0.7)' }}>Recentes</span>
            </div>
            <div className="flex items-center gap-2">
              {recentCarousels.length > 4 && (
                <>
                  <button
                    onClick={() => scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
              {recentCarousels.length > 0 && onViewAllProjects && (
                <button
                  onClick={onViewAllProjects}
                  className="text-xs font-medium transition-colors cursor-pointer ml-2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Ver todos →
                </button>
              )}
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {recentCarousels.map((item) => {
              const sc = item.style_config || {};
              const cover = item.cover_url;
              return (
                <div
                  key={item.id}
                  className="rounded-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden relative group shrink-0"
                  style={{
                    width: '160px',
                    height: '200px',
                    background: cover
                      ? `url(${cover}) center/cover no-repeat`
                      : sc.bgColor
                        ? `linear-gradient(135deg, ${sc.bgColor}, ${sc.accentColor || sc.bgColor}80)`
                        : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onClick={() => onLoadCarousel ? onLoadCarousel(item) : onStartCarousel()}
                >
                  <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                    <p className="text-[11px] font-semibold truncate" style={{ color: '#ffffff' }}>{item.title || item.topic}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.card_count || '?'} cards</p>
                  </div>
                </div>
              );
            })}
            {recentCarousels.length === 0 && (
              <div
                className="rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
                style={{ width: '160px', height: '200px', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' }}
                onClick={() => onStartCarousel()}
              >
                <Clock className="w-4 h-4" />
                <span className="text-[10px]">Criar primeiro carrossel</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHome;
