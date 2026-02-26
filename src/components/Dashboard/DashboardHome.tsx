import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Clock } from 'lucide-react';
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
  const isUserTyping = inputValue.length > 0;

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuário';

  // Fetch recent carousels (limit 3, include carousel_data for cover)
  useEffect(() => {
    const fetchRecent = async () => {
      if (!user) return;
      try {
        const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).single();
        if (!companyData) return;
        const { data } = await supabase.from('generated_carousels').select('id, title, topic, created_at, card_count, style_config, carousel_data').eq('company_id', companyData.company_id).order('created_at', { ascending: false }).limit(3);
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

  const getCoverImage = (item: any): string | null => {
    try {
      const cards = item.carousel_data?.cards;
      if (cards && cards.length > 0 && cards[0].imageUrl) {
        return cards[0].imageUrl;
      }
    } catch {}
    return null;
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Hero section — fixed height */}
      <div className="relative flex-shrink-0" style={{ minHeight: '70vh' }}>
        {/* Orb */}
        <div className="absolute bottom-[-400px] md:bottom-[-600px] left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="carousel-loader-wrapper" style={{ width: 'clamp(600px, 110vw, 1500px)', height: 'clamp(600px, 110vw, 1500px)' }}>
            <div className="carousel-loader-spinner" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center px-4 md:px-6 w-full max-w-2xl mx-auto relative z-10" style={{ paddingTop: '18vh', paddingBottom: '4rem' }}>
          <motion.h1
            className="text-2xl md:text-4xl font-semibold leading-snug mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ fontFamily: "'Inter', sans-serif", color: '#ffffff' }}
          >
            Vamos criar, {username}
          </motion.h1>

          <motion.p
            className="text-xs md:text-sm max-w-xs mb-7"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            style={{ color: 'rgba(255,255,255,0.35)' }}
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
            className="mt-4 text-[11px] transition-colors cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.2)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            ou pular e configurar manualmente
          </motion.button>
        </div>
      </div>

      {/* Recent projects section */}
      <motion.div
        className="relative z-10 px-8 pb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium pb-1 border-b-2 border-purple-500" style={{ color: 'rgba(255,255,255,0.7)' }}>Recentes</span>
            </div>
            {recentCarousels.length > 0 && onViewAllProjects && (
              <button
                onClick={onViewAllProjects}
                className="text-xs font-medium transition-colors cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Ver todos →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentCarousels.map((item) => {
              const sc = item.style_config || {};
              const coverImg = getCoverImage(item);
              return (
                <div
                  key={item.id}
                  className="aspect-[4/3] rounded-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden relative group"
                  style={{
                    background: coverImg ? undefined : (sc.bgColor ? `linear-gradient(135deg, ${sc.bgColor}, ${sc.accentColor || sc.bgColor}80)` : 'rgba(255,255,255,0.04)'),
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onClick={() => onLoadCarousel ? onLoadCarousel(item) : onStartCarousel()}
                >
                  {coverImg && (
                    <img src={coverImg} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                    <p className="text-xs font-semibold truncate" style={{ color: '#ffffff' }}>{item.title || item.topic}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.card_count || '?'} cards</p>
                  </div>
                </div>
              );
            })}
            {recentCarousels.length === 0 && (
              <div
                className="aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                style={{ border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' }}
                onClick={() => onStartCarousel()}
              >
                <Clock className="w-5 h-5" />
                <span className="text-xs">Criar primeiro carrossel</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHome;
