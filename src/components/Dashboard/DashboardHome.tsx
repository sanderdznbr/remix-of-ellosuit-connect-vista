import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ChevronLeft, ChevronRight, Loader2, Trash2, Sparkles, Instagram, ChevronDown, ChevronUp, Square, RectangleVertical, Smartphone, Film, SlidersHorizontal } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import '@/styles/carousel-loader.css';
import PromptMentionInput, { PromptMentionRef } from '@/components/Carousel/wizard/PromptMention';
import OnboardingModal from '@/components/Dashboard/OnboardingModal';
import QuickTemplates from '@/components/Dashboard/QuickTemplates';
import LowCreditsBanner from '@/components/Dashboard/LowCreditsBanner';

export type PostFormat = 'portrait' | 'square' | 'story';

export const POST_FORMAT_OPTIONS = [
  { value: 'portrait' as PostFormat, label: 'Post Retrato', sublabel: '4:5 (1080×1350)', icon: RectangleVertical, w: 1080, h: 1350 },
  { value: 'square' as PostFormat, label: 'Post Quadrado', sublabel: '1:1 (1080×1080)', icon: Square, w: 1080, h: 1080 },
  { value: 'story' as PostFormat, label: 'Stories', sublabel: '9:16 (1080×1920)', icon: Smartphone, w: 1080, h: 1920 },
  { value: 'video' as const, label: 'Vídeo', sublabel: 'Em breve', icon: Film, w: 1080, h: 1920, disabled: true },
];

const PLACEHOLDER_SUGGESTIONS = [
  'Crie um post sobre facetas e resinas...',
  'Crie um post sobre como cuidar do MEI em 2026...',
  '5 dicas de skincare para o verão...',
  'Como aumentar suas vendas no Instagram...',
];

const GREETINGS = [
  'O que vamos criar hoje?',
  'Qual é a ideia de hoje?',
  'Pronto para criar algo incrível?',
  'Transforme suas ideias em posts',
  'Vamos produzir conteúdo?',
  'Hora de criar conteúdo',
  'Sua próxima criação começa aqui',
  'Inspire-se e crie agora',
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
  const { isMobile } = useIsMobile();
  const navigate = useNavigate();
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
  const [showRecent, setShowRecent] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(() => Math.floor(Math.random() * GREETINGS.length));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<PromptMentionRef>(null);

  // Rotate greeting text every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingIndex(prev => (prev + 1) % GREETINGS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);
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
        if (ci >= text.length) { erasing = true; timeoutRef.current = setTimeout(tick, 5000); }
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
    const text = inputValue.trim();
    if (!text) return;
    // Route everything through the new conversational chat creator
    navigate(`/criar?prompt=${encodeURIComponent(text)}`);
  };

  const handleAdvancedMode = () => {
    if (isGenerating) {
      toast.error('Aguarde o post atual terminar antes de criar outro.');
      return;
    }
    const text = inputValue.trim();
    onStartCarousel(text || undefined, mentionedPrompts.length ? mentionedPrompts : undefined, postFormat);
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
    <div
      className="flex-1 flex flex-col relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #0a0813 0%, #050509 55%, #030305 100%)',
        minHeight: 0,
      }}
    >
      <OnboardingModal />
      <LowCreditsBanner balance={creditBalance} />

      {/* Layered dark background — subtle grid + soft violet aurora + film grain */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%)',
          }}
        />

        {/* Soft violet aurora — main */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '780px',
            height: '780px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, rgba(88,28,135,0.10) 40%, transparent 70%)',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            filter: 'blur(90px)',
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.8, 0.55] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Cool blue accent — left */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '420px',
            height: '420px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)',
            top: '30%',
            left: '5%',
            filter: 'blur(110px)',
          }}
          animate={{ x: [0, 30, 0], opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Warm violet accent — right */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '380px',
            height: '380px',
            background: 'radial-gradient(circle, rgba(168,85,247,0.16) 0%, transparent 70%)',
            top: '20%',
            right: '8%',
            filter: 'blur(100px)',
          }}
          animate={{ x: [0, -25, 0], scale: [1, 1.12, 1], opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Deep bottom vignette to anchor the input */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
        />

        {/* Film grain overlay for texture */}
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
      </div>

      {/* Center content — title + input */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center text-center px-5 md:px-6 w-full max-w-2xl mx-auto relative z-10 min-h-0"
        layout
        transition={{ layout: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }}
      >
        <AnimatePresence mode="wait">
          <motion.h1
            key={greetingIndex}
            className="text-2xl md:text-4xl font-semibold leading-snug mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            style={{ fontFamily: "'Inter', sans-serif", color: '#ffffff' }}
          >
            {GREETINGS[greetingIndex]}
          </motion.h1>
        </AnimatePresence>

        <motion.p
          className="text-xs md:text-sm max-w-xs mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Crie posts e criativos com um prompt.
        </motion.p>

        {/* Active jobs indicator removed from here — shown only in Recentes */}

        <motion.div
          className="w-full max-w-xl"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="saber-border relative w-full rounded-2xl p-[1.5px] overflow-hidden">
            <div
              className="relative w-full rounded-2xl overflow-visible"
              style={{
                backgroundColor: 'rgba(8, 8, 12, 0.92)',
                boxShadow: '0 4px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.03)',
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
                  className="w-full bg-transparent text-white/90 text-sm md:text-base px-4 py-4 pr-14 resize-none outline-none relative z-10 min-h-[84px] text-left"
                />
                {!isUserTyping && mentionedPrompts.length === 0 && (
                  <div
                    className="absolute top-0 left-0 px-4 py-4 pr-14 text-sm md:text-base pointer-events-none z-0 text-left"
                    style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.25)' }}
                  >
                    {animatedPlaceholder}
                    <span className="inline-block w-[2px] h-[1em] ml-0.5 animate-pulse align-middle" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleAdvancedMode}
                    disabled={isGenerating}
                    className="w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-white/30 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Modo avançado (wizard com etapas)"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
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
          </div>
        </motion.div>

        {/* Templates rápidos removidos a pedido do usuário */}


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
          <div className={`flex items-center mb-4 ${isMobile && !showRecent ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRecent(prev => !prev)}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer backdrop-blur-xl hover:bg-white/[0.03]"
                style={{
                  backgroundColor: 'rgba(8, 8, 12, 0.92)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.5)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.02)',
                }}
                title={showRecent ? 'Ocultar recentes' : 'Mostrar recentes'}
              >
                <span className="text-xs font-medium">Recentes</span>
                <motion.div animate={{ rotate: showRecent ? 0 : 180 }} transition={{ duration: 0.3 }}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </motion.div>
              </button>
            </div>
            {showRecent && (
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
            )}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardHome;
