import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ChevronLeft, ChevronRight, Loader2, Trash2, Sparkles, Instagram, ChevronDown, ChevronUp, Square, RectangleVertical, Smartphone } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import '@/styles/carousel-loader.css';
import PromptMentionInput, { PromptMentionRef } from '@/components/Carousel/wizard/PromptMention';

export type PostFormat = 'portrait' | 'square' | 'story';

export const POST_FORMAT_OPTIONS = [
  { value: 'portrait' as PostFormat, label: 'Post Retrato', sublabel: '4:5 (1080×1350)', icon: RectangleVertical, w: 1080, h: 1350 },
  { value: 'square' as PostFormat, label: 'Post Quadrado', sublabel: '1:1 (1080×1080)', icon: Square, w: 1080, h: 1080 },
  { value: 'story' as PostFormat, label: 'Stories', sublabel: '9:16 (1080×1920)', icon: Smartphone, w: 1080, h: 1920 },
];

const PLACEHOLDER_SUGGESTIONS = [
  'Crie um post sobre facetas e resinas...',
  'Crie um post sobre como cuidar do MEI em 2026...',
  '5 dicas de skincare para o verão...',
  'Como aumentar suas vendas no Instagram...',
];

interface MentionedPrompt {
  id: string;
  title: string;
  avatar_url: string | null;
  content: string;
}

interface ActiveJob {
  id: string;
  topic: string;
  progress_message: string | null;
  status: string;
  progress_current: number;
  progress_total: number;
  updated_at: string;
  product_context: string | null;
  marketplace_style_id: string | null;
}

interface DashboardHomeProps {
  onStartCarousel: (topic?: string, mentionedPrompts?: MentionedPrompt[], postFormat?: PostFormat) => void;
  onLoadCarousel?: (carouselItem: any) => void;
  onViewAllProjects?: () => void;
  onResumeJob?: (jobId: string) => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ onStartCarousel, onLoadCarousel, onViewAllProjects, onResumeJob }) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const [recentCarousels, setRecentCarousels] = useState<any[]>([]);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [mentionedPrompts, setMentionedPrompts] = useState<MentionedPrompt[]>([]);
  const [postFormat, setPostFormat] = useState<PostFormat>('portrait');
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [showRecent, setShowRecent] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<PromptMentionRef>(null);
  const isUserTyping = inputValue.length > 0;

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuário';

  // Fetch recent carousels metadata with cover_url
  const fetchRecent = async () => {
    if (!user) return;
    try {
      const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).single();
      if (!companyData) return;
      const { data } = await supabase.from('generated_carousels').select('id, title, topic, created_at, card_count, cover_url, post_format').eq('company_id', companyData.company_id).order('created_at', { ascending: false }).limit(10);
      setRecentCarousels(data || []);
      const { data: balanceData } = await supabase.from('ai_credit_balances').select('balance').eq('company_id', companyData.company_id).maybeSingle();
      setCreditBalance(balanceData?.balance ?? 0);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRecent(); }, [user]);

  // Refetch every time the component mounts (e.g., returning from generator)
  useEffect(() => {
    fetchRecent();
  }, []);

  // Refetch when tab/window becomes visible (user navigated back)
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') fetchRecent(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  // Wheel → horizontal scroll on recents container
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    let animFrame = 0;
    let targetScroll = el.scrollLeft;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        targetScroll += e.deltaY;
        targetScroll = Math.max(0, Math.min(targetScroll, el.scrollWidth - el.clientWidth));
        if (!animFrame) {
          const step = () => {
            const diff = targetScroll - el.scrollLeft;
            if (Math.abs(diff) < 0.5) { el.scrollLeft = targetScroll; animFrame = 0; return; }
            el.scrollLeft += diff * 0.15;
            animFrame = requestAnimationFrame(step);
          };
          animFrame = requestAnimationFrame(step);
        }
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); if (animFrame) cancelAnimationFrame(animFrame); };
  }, [recentCarousels.length]);

  // ===== ACTIVE JOBS: Check for pending cloud generation jobs =====
  useEffect(() => {
    if (!user) return;

    const checkActiveJobs = async () => {
      try {
        const { data } = await supabase
          .from('carousel_generation_jobs')
          .select('id, topic, progress_message, status, progress_current, progress_total, updated_at, product_context, marketplace_style_id, carousel_id, completed_at')
          .eq('user_id', user.id)
          .in('status', ['pending', 'generating_text', 'generating_images'])
          .is('completed_at', null)
          .order('created_at', { ascending: false })
          .limit(3);

        const rows = data || [];
        const now = Date.now();
        const staleThresholdMs = 2 * 60 * 1000;

        // Mark as stale if updated_at is too old OR if carousel_id is already set (generation finished but status wasn't updated)
        const staleIds = rows
          .filter((job) => now - new Date(job.updated_at).getTime() >= staleThresholdMs || job.carousel_id)
          .map((job) => job.id);

        if (staleIds.length > 0) {
          // For jobs with carousel_id, mark as completed; otherwise mark as failed
          const completedIds = rows.filter(j => j.carousel_id && staleIds.includes(j.id)).map(j => j.id);
          const failedIds = staleIds.filter(id => !completedIds.includes(id));

          if (completedIds.length > 0) {
            await supabase
              .from('carousel_generation_jobs')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .in('id', completedIds);
          }
          if (failedIds.length > 0) {
            await supabase
              .from('carousel_generation_jobs')
              .update({ status: 'failed', error_message: 'A geração expirou.', completed_at: new Date().toISOString() })
              .in('id', failedIds);
          }
          fetchRecent();
        }

        // Filter out jobs that already have carousel_id (local generation already saved them)
        const validJobs = rows.filter((job) => !staleIds.includes(job.id) && !job.carousel_id);
        setActiveJobs(validJobs as ActiveJob[]);
      } catch (err) {
        console.error('Failed to check active jobs:', err);
      }
    };

    checkActiveJobs();
    const interval = setInterval(checkActiveJobs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // ===== REALTIME: Subscribe to active job updates =====
  useEffect(() => {
    if (!user || activeJobs.length === 0) return;
    const channels = activeJobs.map(job => {
      return supabase
        .channel(`home-job-${job.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'carousel_generation_jobs',
          filter: `id=eq.${job.id}`,
        }, (payload: any) => {
          const updated = payload.new;
          if (!updated) return;
          if (updated.status === 'completed') {
            setActiveJobs(prev => prev.filter(j => j.id !== job.id));
            toast.success('Post gerado com sucesso! 🎉');
            fetchRecent(); // Refresh recents
          } else if (updated.status === 'failed') {
            setActiveJobs(prev => prev.filter(j => j.id !== job.id));
            toast.error('Erro ao gerar post em segundo plano');
          } else {
            setActiveJobs(prev => prev.map(j => j.id === job.id ? {
              ...j,
              status: updated.status,
              progress_message: updated.progress_message,
              progress_current: updated.progress_current ?? j.progress_current,
              progress_total: updated.progress_total ?? j.progress_total,
            } : j));
          }
        })
        .subscribe();
    });
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [user, activeJobs.map(j => j.id).join(',')]);

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

  const isGenerating = activeJobs.length > 0;

  const handleSubmit = () => {
    if (isGenerating) {
      toast.error('Aguarde o post atual terminar antes de criar outro.');
      return;
    }
    if (inputValue.trim()) onStartCarousel(inputValue.trim(), mentionedPrompts, postFormat);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      setRecentCarousels(prev => prev.filter(c => c.id !== id));
      setDeleteConfirmId(null);
      const { error } = await supabase.from('generated_carousels').delete().eq('id', id);
      if (error) { toast.error('Erro ao excluir'); } else { toast.success('Projeto excluído'); }
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden" style={{ backgroundColor: '#0a0a0f', minHeight: 0 }}>

      {/* Background purple glow animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '700px',
            height: '700px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(88,28,135,0.18) 40%, transparent 70%)',
            top: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            filter: 'blur(80px)',
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.6, 0.85, 0.6],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
            top: '20%',
            left: '30%',
            filter: 'blur(100px)',
          }}
          animate={{
            x: [0, 30, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)',
            top: '10%',
            right: '15%',
            filter: 'blur(90px)',
          }}
          animate={{
            x: [0, -20, 0],
            scale: [1, 1.1, 1],
            opacity: [0.25, 0.45, 0.25],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Center content — title + input */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center text-center px-5 md:px-6 w-full max-w-2xl mx-auto relative z-10 min-h-0"
        layout
        transition={{ layout: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }}
      >
        <motion.h1
          className="text-2xl md:text-4xl font-semibold leading-snug mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ fontFamily: "'Inter', sans-serif", color: '#ffffff' }}
        >
          Crie seu post com a Ello
        </motion.h1>

        <motion.p
          className="text-xs md:text-sm max-w-xs mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Desenvolva carrosséis com um prompt.
        </motion.p>

        {/* Active jobs indicator removed from here — shown only in Recentes */}

        <motion.div
          className="w-full max-w-xl"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div
            className="relative w-full rounded-2xl overflow-visible"
            style={{
              backgroundColor: 'rgba(20, 20, 28, 0.5)',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="relative">
              <PromptMentionInput
                ref={mentionRef}
                value={inputValue}
                onChange={setInputValue}
                mentionedPrompts={mentionedPrompts}
                onMentionAdd={(p) => setMentionedPrompts(prev => [...prev, p])}
                onMentionRemove={(id) => setMentionedPrompts(prev => prev.filter(m => m.id !== id))}
                className="w-full bg-transparent text-white/90 text-sm md:text-base px-4 py-4 pr-14 resize-none outline-none relative z-10 min-h-[84px]"
              />
              {!isUserTyping && mentionedPrompts.length === 0 && (
                <div
                  className="absolute top-0 left-0 px-4 py-4 pr-14 text-sm md:text-base pointer-events-none z-0"
                  style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.25)' }}
                >
                  {animatedPlaceholder}
                  <span className="inline-block w-[2px] h-[1em] ml-0.5 animate-pulse align-middle" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="relative">
                <button
                  onClick={() => setFormatDropdownOpen(!formatDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  title="Formato do post"
                >
                  <Instagram className="w-4 h-4" />
                  <span className="text-[11px]">{POST_FORMAT_OPTIONS.find(f => f.value === postFormat)?.label}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {formatDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setFormatDropdownOpen(false)} />
                      <motion.div
                        className="absolute bottom-full left-0 mb-2 w-56 rounded-xl overflow-hidden z-40"
                        style={{ backgroundColor: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        {POST_FORMAT_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const isActive = postFormat === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => { setPostFormat(opt.value); setFormatDropdownOpen(false); }}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors cursor-pointer"
                              style={{
                                backgroundColor: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                              }}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              <div className="text-left">
                                <p className="text-xs font-medium" style={{ color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.7)' }}>{opt.label}</p>
                                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{opt.sublabel}</p>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isGenerating}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ backgroundColor: inputValue.trim() && !isGenerating ? '#ffffff' : 'rgba(255,255,255,0.08)' }}
                title={isGenerating ? 'Aguarde o post atual terminar' : undefined}
              >
                <ArrowUp className="w-4 h-4" style={{ color: inputValue.trim() && !isGenerating ? '#0a0a0f' : '#ffffff' }} />
              </button>
            </div>
          </div>
        </motion.div>

      </motion.div>

      {/* Recent projects — pinned to bottom with horizontal slider */}
      <AnimatePresence>
        {(recentCarousels.length > 0 || activeJobs.length > 0) && (
      <motion.div
        className="relative z-[1] px-4 md:px-8 shrink-0"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        layout
      >

        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Recentes</span>
              <button
                onClick={() => setShowRecent(prev => !prev)}
                className="w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                title={showRecent ? 'Ocultar recentes' : 'Mostrar recentes'}
              >
                <motion.div animate={{ rotate: showRecent ? 0 : 180 }} transition={{ duration: 0.3 }}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {showRecent && recentCarousels.length > 4 && (
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
              {showRecent && recentCarousels.length > 0 && onViewAllProjects && (
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

          <AnimatePresence initial={false}>
            {showRecent && (
              <motion.div
                className="-mr-4 md:-mr-8"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  ref={scrollContainerRef}
                  className="flex gap-3 overflow-x-auto pb-2 pr-4 md:pr-8 scrollbar-hide touch-pan-x"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' as any, scrollSnapType: 'x proximity' }}
                >
            {/* Placeholder cards for active generation jobs */}
            {activeJobs.map((job) => {
              const isExtreme = job.product_context?.startsWith('EXTREME_VISION:');
              const isAdvanced = !isExtreme && !!job.marketplace_style_id;
              const modeColor = isExtreme ? '#F97316' : isAdvanced ? '#EF4444' : '#A855F7';
              const pct = job.progress_total > 0 ? Math.round((job.progress_current / job.progress_total) * 100) : 0;
              return (
                <div
                  key={`job-${job.id}`}
                  className="rounded-xl overflow-hidden relative shrink-0 flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-all duration-200"
                  style={{
                    width: '160px',
                    height: '200px',
                    background: '#0A0A0F',
                    border: `1px solid ${modeColor}33`,
                  }}
                  onClick={() => onResumeJob?.(job.id)}
                >
                  {/* Glow background */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ background: `radial-gradient(circle at center, ${modeColor}60 0%, transparent 70%)` }}
                  />
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full border-2 animate-spin"
                      style={{
                        borderColor: `${modeColor}30`,
                        borderTopColor: modeColor,
                      }}
                    />
                    <p className="text-[10px] font-medium text-white/50 text-center px-3 line-clamp-2">
                      {job.topic.length > 30 ? job.topic.substring(0, 30) + '...' : job.topic}
                    </p>
                    {job.progress_total > 0 && (
                      <div className="w-20 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ backgroundColor: modeColor, width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {recentCarousels.map((item) => {
              const sc = item.style_config || {};
              const cover = item.cover_url;
              const format = item.post_format || 'portrait';
              const isStory = format === 'story';
              const cardCount = item.card_count || 1;
              const typeLabel = isStory ? 'Stories' : format === 'square' ? 'Quadrado' : 'Retrato';
              return (
                <div
                  key={item.id}
                  className="rounded-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden relative group shrink-0"
                  style={{
                    width: isStory ? '112px' : format === 'square' ? '160px' : '160px',
                    height: isStory ? '199px' : '200px',
                    background: !cover
                      ? sc.bgColor
                        ? `linear-gradient(135deg, ${sc.bgColor}, ${sc.accentColor || sc.bgColor}80)`
                        : 'rgba(255,255,255,0.04)'
                      : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onClick={async () => {
                    if (onLoadCarousel) {
                      setLoadingId(item.id);
                      try { await onLoadCarousel(item); } finally { setLoadingId(null); }
                    } else { onStartCarousel(); }
                  }}
                >
                  {cover && (
                    <img
                      src={cover}
                      alt={item.title || item.topic}
                      className={`absolute inset-0 w-full h-full ${isStory ? 'object-contain' : 'object-cover'}`}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  {/* Type badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {typeLabel}
                    </span>
                  </div>
                  {loadingId === item.id && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardHome;
