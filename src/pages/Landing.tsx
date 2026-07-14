import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight, Plus, Minus, Sparkles, Zap, Instagram, Check, Star, Users, Clock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

/* ─────────────────────────────────────────────────────────────
   ellocontent — Landing (Bold Sans, Editorial-Tech)
   Palette: #0A0A0F base · violet #8B5CF6 accents
   Type: Inter (display + body), tight tracking, high weight
   ───────────────────────────────────────────────────────────── */

const SANS = "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const DISPLAY: React.CSSProperties = {
  fontFamily: SANS,
  fontWeight: 800,
  letterSpacing: '-0.045em',
  lineHeight: 0.92,
};

type Style = { id: string; name: string; category: string; preview_images: string[] };
type Post = { id: string; title: string; cover_url: string };

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [styles, setStyles] = useState<Style[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  const { scrollYProgress } = useScroll();
  const progressBar = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const showcaseRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: showcaseProgress } = useScroll({
    target: showcaseRef, offset: ['start end', 'end start'],
  });
  const railX = useTransform(showcaseProgress, [0, 1], ['5%', '-45%']);

  const goCreate = () => navigate('/gerador-de-carrosseis');
  const goPlans = () => navigate('/precos');
  const goLogin = () => navigate('/auth');

  useEffect(() => {
    (async () => {
      try {
        const [{ data: sData }, { data: pData }] = await Promise.all([
          supabase.from('marketplace_styles')
            .select('id, name, preview_images, category, is_featured, sort_order')
            .eq('is_active', true)
            .order('is_featured', { ascending: false })
            .order('sort_order', { ascending: true })
            .limit(24),
          supabase.from('generated_carousels')
            .select('id, title, cover_url, created_at, marketplace_style_id')
            .not('cover_url', 'is', null)
            .not('marketplace_style_id', 'is', null)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(60),
        ]);
        setStyles(((sData || []) as any[]).filter(s => s.preview_images?.length));
        const seen = new Set<string>();
        setPosts(((pData || []) as any[])
          .filter(p => p.cover_url && (p.title || '').trim().length > 8)
          .filter(p => {
            const k = (p.title || '').toLowerCase().slice(0, 40);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .slice(0, 24)
        );
      } catch {}
    })();
  }, []);

  const heroTiles = useMemo(() => {
    const covers = posts.map(p => ({ src: p.cover_url, label: p.title }));
    const previews = styles.flatMap(s => (s.preview_images || []).map(src => ({ src, label: s.name })));
    const seen = new Set<string>();
    return [...covers, ...previews].filter(t => t.src && !seen.has(t.src) && (seen.add(t.src), true)).slice(0, 12);
  }, [posts, styles]);

  return (
    <div style={{ fontFamily: SANS, background: '#0A0A0F', color: '#F5F5F7' }}
         className="min-h-screen antialiased selection:bg-violet-500/40 selection:text-white overflow-x-hidden">

      {/* Grain */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]" style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
      }} />

      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{
        backdropFilter: 'blur(20px) saturate(160%)',
        backgroundColor: 'rgba(10,10,15,0.7)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 md:px-10 h-16">
          <img src={ellocontentLogo} alt="ellocontent" className="h-4 cursor-pointer"
               onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium"
               style={{ color: 'rgba(245,245,247,0.65)' }}>
            <a href="#estilos" className="hover:text-white transition-colors">Estilos</a>
            <a href="#como" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#showcase" className="hover:text-white transition-colors">Showcase</a>
            <button onClick={goPlans} className="hover:text-white transition-colors">Preços</button>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={goLogin} className="hidden sm:block text-[13px] font-medium px-3 py-1.5 rounded-full hover:text-white transition-colors"
                    style={{ color: 'rgba(245,245,247,0.75)' }}>Entrar</button>
            <button onClick={goCreate}
                    className="group text-[13px] font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 transition-transform hover:scale-[1.03]"
                    style={{ background: '#F5F3FF', color: '#0a0a0f' }}>
              Criar grátis
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
        <motion.div className="absolute bottom-0 left-0 h-[2px] origin-left"
          style={{ scaleX: progressBar, background: 'linear-gradient(90deg,#8B5CF6,#C4B5FD,#8B5CF6)', width: '100%' }} />
      </header>

      {/* HERO */}
      <section className="relative pt-36 md:pt-48 pb-28 md:pb-40 px-6 md:px-10 overflow-hidden">
        {/* Ambient */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.22), transparent 60%)', filter: 'blur(90px)' }} />
          <div className="absolute bottom-[-30%] left-[10%] w-[600px] h-[600px] rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.12), transparent 65%)', filter: 'blur(80px)' }} />
          <div className="absolute inset-0 opacity-[0.07]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '90px 90px',
            maskImage: 'radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)',
          }} />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* LEFT — Type + CTAs */}
          <div className="relative z-10 w-full lg:w-3/5">



            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
              className="text-left"
              style={{ ...DISPLAY, fontSize: 'clamp(3rem, 8.5vw, 7.5rem)' }}>
              Chega de{' '}
              <span style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 45%, #F5F3FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>perder horas</span>{' '}
              no Canva.
            </motion.h1>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center gap-4">
              <button onClick={goCreate}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[15px] font-bold transition-all hover:scale-[1.03]"
                style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 25px 70px -18px rgba(139,92,246,0.75)' }}>
                Criar meu primeiro post grátis
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button onClick={goPlans}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[15px] font-semibold transition-colors hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }}>
                Ver planos
              </button>
            </motion.div>



          </div>

          {/* RIGHT — Floating cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}
            className="w-full lg:w-2/5 relative">
            <div className="relative space-y-4 lg:rotate-[-6deg] lg:scale-105">
              {/* Sub as detached glass card */}
              <div className="relative z-20 p-7 md:p-8 rounded-3xl shadow-2xl"
                   style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <p className="text-lg md:text-xl leading-relaxed" style={{ color: 'rgba(245,245,247,0.85)' }}>
                  Descreva o tema, escolha um estilo editorial e publique um carrossel pronto — em <span className="font-bold" style={{ color: '#fff' }}>menos de 30 segundos</span>. Sem designer, sem briefing.
                </p>
              </div>

              {/* Ornament glow */}
              <div className="absolute -top-12 -right-12 -z-10 w-32 h-32 rounded-2xl rotate-12 opacity-30 blur-xl animate-pulse"
                   style={{ background: '#8B5CF6' }} />

              {/* Broken UI chip */}
              <div className="ml-10 md:ml-14 p-4 rounded-2xl flex items-center gap-4"
                   style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), transparent)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: 'rgba(139,92,246,0.18)' }}>
                  <Instagram className="w-5 h-5" style={{ color: '#A78BFA' }} />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="h-2 w-24 rounded" style={{ background: 'rgba(255,255,255,0.20)' }} />
                  <div className="h-2 w-16 rounded" style={{ background: 'rgba(255,255,255,0.10)' }} />
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>




      {/* ESTILOS */}
      <section id="estilos" className="relative py-24 md:py-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: '#A78BFA' }}>Sistema visual</div>
              <h2 style={{ ...DISPLAY, fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)' }}>
                Crie posts<br />
                <span style={{ color: '#A78BFA' }}>como esses.</span>
              </h2>
            </div>
            <p className="max-w-sm text-[15px] leading-relaxed" style={{ color: 'rgba(245,245,247,0.55)' }}>
              Do editorial minimalista ao streetwear vibrante. Cada preset traz tipografia, paleta e ritmo próprios.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
               style={{ background: 'linear-gradient(90deg, #0A0A0F, transparent)' }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
               style={{ background: 'linear-gradient(-90deg, #0A0A0F, transparent)' }} />
          <div
            className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 md:px-10 pb-2 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}
            onPointerDown={(e) => {
              const el = e.currentTarget;
              const startX = e.pageX;
              const startLeft = el.scrollLeft;
              let moved = false;
              el.setPointerCapture(e.pointerId);
              const onMove = (ev: PointerEvent) => {
                const dx = ev.pageX - startX;
                if (Math.abs(dx) > 3) moved = true;
                el.scrollLeft = startLeft - dx;
              };
              const onUp = (ev: PointerEvent) => {
                el.removeEventListener('pointermove', onMove);
                el.removeEventListener('pointerup', onUp);
                el.removeEventListener('pointercancel', onUp);
                if (moved) {
                  const stop = (e2: Event) => { e2.preventDefault(); e2.stopPropagation(); window.removeEventListener('click', stop, true); };
                  window.addEventListener('click', stop, true);
                }
                try { el.releasePointerCapture(ev.pointerId); } catch {}
              };
              el.addEventListener('pointermove', onMove);
              el.addEventListener('pointerup', onUp);
              el.addEventListener('pointercancel', onUp);
            }}
          >
            {styles.map((s) => (
              <div key={s.id} className="shrink-0 w-[240px] md:w-[300px] snap-start select-none">
                <StyleCard src={s.preview_images[0]} name={s.name} tag={s.category} />
              </div>
            ))}
          </div>

        </div>

        <div className="mt-12 flex justify-center">
          <button onClick={goCreate}
                  className="text-[13px] font-semibold flex items-center gap-1.5 px-6 py-3 rounded-full border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(245,245,247,0.9)' }}>
            Ver todos os estilos <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>



      {/* COMO FUNCIONA */}
      <section id="como" className="relative py-24 md:py-32 px-6 md:px-10"
               style={{ background: 'linear-gradient(180deg, transparent, rgba(139,92,246,0.04), transparent)' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-[11px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: '#A78BFA' }}>Como funciona</div>
            <h2 className="mx-auto max-w-3xl" style={{ ...DISPLAY, fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              Do prompt ao post em segundos.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: '01', icon: Sparkles, t: 'Descreva o tema', d: 'Escreva uma ideia, cole um roteiro ou mencione um prompt salvo com @. A IA entende contexto de marca.' },
              { n: '02', icon: Zap, t: 'Escolha um estilo', d: 'Selecione um dos presets editoriais — ou deixe a curadoria sugerir o mais adequado ao seu nicho.' },
              { n: '03', icon: Instagram, t: 'Publique', d: 'Baixe em alta resolução, exporte em ZIP ou publique direto no Instagram via integração oficial.' },
            ].map((s, i) => (
              <motion.div key={s.n}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="relative p-7 rounded-2xl group"
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between mb-8">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                       style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <s.icon className="w-4 h-4" style={{ color: '#A78BFA' }} />
                  </div>
                  <span className="text-[13px] font-mono font-semibold" style={{ color: 'rgba(245,245,247,0.3)' }}>{s.n}</span>
                </div>
                <h3 className="text-xl font-bold mb-2 tracking-tight">{s.t}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(245,245,247,0.55)' }}>{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE */}
      <section id="showcase" ref={showcaseRef} className="relative py-24 md:py-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="mb-14 flex items-end justify-between flex-wrap gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: '#A78BFA' }}>Showcase</div>
              <h2 style={{ ...DISPLAY, fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
                Feito pela<br /><span style={{ color: '#A78BFA' }}>comunidade.</span>
              </h2>
            </div>
            <p className="max-w-sm text-[15px]" style={{ color: 'rgba(245,245,247,0.55)' }}>
              Role a página — o showcase corre na horizontal.
            </p>
          </div>
        </div>

        {posts.length > 0 ? (
          <motion.div style={{ x: railX }} className="flex gap-4 pl-6 md:pl-10 will-change-transform">
            {posts.slice(0, 14).map((p, i) => (
              <motion.div key={p.id}
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="relative shrink-0 w-[260px] md:w-[320px] aspect-[4/5] overflow-hidden group rounded-2xl"
                style={{ background: '#101018', border: '1px solid rgba(255,255,255,0.08)',
                         boxShadow: '0 30px 60px -30px rgba(139,92,246,0.35)' }}>
                <img src={p.cover_url} alt={p.title} loading="lazy"
                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                     style={{ objectPosition: 'center top' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(5,5,5,0.92) 100%)' }} />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[10px] uppercase tracking-[0.25em] mb-1 font-semibold" style={{ color: '#C4B5FD' }}>№ {String(i + 1).padStart(2, '0')}</p>
                  <p className="text-[15px] font-semibold truncate">{p.title}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // Fallback: usa previews dos estilos para nunca renderizar vazio
          <div className="flex gap-4 pl-6 md:pl-10 overflow-x-auto no-scrollbar">
            {styles.slice(0, 12).map((s, i) => (
              <div key={s.id}
                className="relative shrink-0 w-[260px] md:w-[320px] aspect-[4/5] overflow-hidden rounded-2xl"
                style={{ background: '#101018', border: '1px solid rgba(255,255,255,0.08)',
                         boxShadow: '0 30px 60px -30px rgba(139,92,246,0.35)' }}>
                <img src={s.preview_images[0]} alt={s.name} loading="lazy"
                     className="absolute inset-0 w-full h-full object-cover"
                     style={{ objectPosition: 'center top' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(5,5,5,0.92) 100%)' }} />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[10px] uppercase tracking-[0.25em] mb-1 font-semibold" style={{ color: '#C4B5FD' }}>№ {String(i + 1).padStart(2, '0')}</p>
                  <p className="text-[15px] font-semibold truncate">{s.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* POR QUE ELLOCONTENT (vs alternativas) */}
      <section className="relative py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: '#A78BFA' }}>Por que ellocontent</div>
            <h2 className="mx-auto max-w-3xl" style={{ ...DISPLAY, fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              O que o Canva<br /><span style={{ color: '#A78BFA' }}>não faz por você.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { t: 'IA editorial de verdade', d: 'A ellocontent gera texto, imagem e composição juntos — não é um template com sua foto colada por cima. Cada slide sai com hierarquia, paleta e ritmo pensados.' },
              { t: 'Marketplace de estilos', d: 'Presets curados por designers reais. Tipografia, paleta e ritmo já pensados por nicho — do editorial minimalista ao streetwear.' },
              { t: 'Publica no Instagram', d: 'Integração oficial Meta. Conecta a conta Business e agenda o carrossel sem sair da plataforma. Sem plugin, sem gambiarra.' },
            ].map((f) => (
              <div key={f.t} className="p-7 rounded-2xl"
                   style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <Check className="w-5 h-5 mb-4" style={{ color: '#A78BFA' }} />
                <h3 className="text-lg font-bold mb-2 tracking-tight">{f.t}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(245,245,247,0.6)' }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* PRICING */}
      <section className="relative py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: '#A78BFA' }}>Planos</div>
            <h2 className="mx-auto" style={{ ...DISPLAY, fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              Preço simples.<br /><span style={{ color: '#A78BFA' }}>Sem surpresas.</span>
            </h2>
            <p className="mt-6 mx-auto max-w-xl text-[15px]" style={{ color: 'rgba(245,245,247,0.55)' }}>
              Menos que 1 hora de freelancer por mês. Cancele quando quiser — créditos acumulados continuam válidos.
            </p>
          </div>


          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: 'Starter', p: 'R$ 89,90', c: '50 créditos/mês', f: ['Todos os estilos gratuitos', 'Downloads em alta', 'Suporte por chat'] },
              { n: 'Pro', p: 'R$ 159,90', c: '100 créditos/mês', f: ['Marketplace completo', 'Publicação Instagram', 'Fotos reais + web'], hi: true },
              { n: 'Growth', p: 'R$ 269,90', c: '200 créditos/mês', f: ['Carrosséis até 15 cards', 'Trends & niche packs', 'Prioridade na fila'] },
            ].map((pl) => (
              <div key={pl.n} className="relative p-8 flex flex-col rounded-2xl"
                   style={{
                     border: pl.hi ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                     background: pl.hi ? 'linear-gradient(180deg, rgba(139,92,246,0.10), rgba(139,92,246,0.02))' : 'rgba(255,255,255,0.02)',
                   }}>
                {pl.hi && (
                  <span className="absolute -top-3 left-8 text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
                        style={{ background: '#8B5CF6', color: '#fff' }}>Mais escolhido</span>
                )}
                <div className="text-[12px] font-semibold uppercase tracking-[0.2em] mb-6" style={{ color: 'rgba(245,245,247,0.55)' }}>{pl.n}</div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span style={{ ...DISPLAY, fontSize: '3rem' }}>{pl.p}</span>
                  <span className="text-xs" style={{ color: 'rgba(245,245,247,0.45)' }}>/mês</span>
                </div>
                <p className="text-[13px] mb-8" style={{ color: 'rgba(245,245,247,0.5)' }}>{pl.c}</p>
                <ul className="space-y-3 mb-10 flex-1">
                  {pl.f.map(f => (
                    <li key={f} className="text-[14px] flex items-start gap-2" style={{ color: 'rgba(245,245,247,0.8)' }}>
                      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#A78BFA' }} /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={goPlans}
                        className="w-full py-3 rounded-full text-[13px] font-semibold transition-transform hover:scale-[1.02]"
                        style={pl.hi
                          ? { background: '#8B5CF6', color: '#fff' }
                          : { border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(245,245,247,0.9)' }}>
                  Assinar {pl.n}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-24 md:py-32 px-6">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: '#A78BFA' }}>Dúvidas</div>
            <h2 style={{ ...DISPLAY, fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
              Respostas diretas.
            </h2>
          </div>
          <div>
            {[
              { q: 'Preciso saber design para usar?', a: 'Não. Escolha um estilo curado, descreva o tema e a ellocontent monta o carrossel — tipografia, hierarquia e paleta prontas.' },
              { q: 'Posso usar minhas próprias fotos?', a: 'Sim. Faça upload de rosto, produto e logo — a IA prioriza suas referências e mantém fidelidade visual.' },
              { q: 'Como funcionam os créditos?', a: 'Post simples custa 1 crédito, avançado/extreme custa 2, e usar seu rosto adiciona +4. Planos renovam mensalmente e você pode comprar créditos avulsos via PIX ou cartão.' },
              { q: 'Publica direto no Instagram?', a: 'Sim, via integração oficial Meta. Você conecta sua conta Business e agenda a publicação sem sair da plataforma.' },
              { q: 'Posso cancelar quando quiser?', a: 'Sim, sem multa. Créditos acumulados continuam válidos mesmo após o downgrade.' },
            ].map((item, i) => (
              <div key={i} style={{ borderTop: i === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between py-6 text-left group">
                  <span className="text-[17px] font-semibold">{item.q}</span>
                  {openFaq === i
                    ? <Minus className="w-4 h-4 shrink-0" style={{ color: '#A78BFA' }} />
                    : <Plus className="w-4 h-4 shrink-0" style={{ color: 'rgba(245,245,247,0.5)' }} />}
                </button>
                {openFaq === i && (
                  <p className="pb-6 pr-8 text-[15px] leading-relaxed" style={{ color: 'rgba(245,245,247,0.6)' }}>{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-28 md:py-36 px-6 overflow-hidden">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[500px]"
               style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.28), transparent 70%)', filter: 'blur(60px)' }} />
        </div>
        <div className="relative max-w-[900px] mx-auto text-center">
          <h2 className="mx-auto" style={{ ...DISPLAY, fontSize: 'clamp(2.5rem, 7vw, 5.5rem)' }}>
            Comece com um<br /><span style={{ color: '#A78BFA' }}>post cortesia.</span>
          </h2>
          <p className="mt-6 max-w-md mx-auto text-[16px]" style={{ color: 'rgba(245,245,247,0.6)' }}>
            Sem cartão. Sem compromisso. Publique seu primeiro carrossel em minutos.
          </p>
          <button onClick={goCreate}
                  className="mt-10 group px-8 py-4 rounded-full text-[14px] font-semibold inline-flex items-center gap-2 transition-transform hover:-translate-y-0.5"
                  style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 30px 80px -20px rgba(139,92,246,0.6)' }}>
            Criar meu primeiro post
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t px-6 md:px-10 py-10" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-6">
          <img src={ellocontentLogo} alt="ellocontent" className="h-4" />
          <p className="text-[12px]" style={{ color: 'rgba(245,245,247,0.4)' }}>
            © {new Date().getFullYear()} ellocontent · Feito no Brasil
          </p>
          <div className="flex items-center gap-6 text-[13px] font-medium" style={{ color: 'rgba(245,245,247,0.6)' }}>
            <a href="/precos" className="hover:text-white">Preços</a>
            <a href="/auth" className="hover:text-white">Entrar</a>
            <a href="/ajuda" className="hover:text-white">Suporte</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes ec-marquee-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ec-marquee-left { animation: ec-marquee-left 50s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ec-marquee-left { animation: none; }
        }
      `}</style>
    </div>
  );
};

const StyleCard: React.FC<{ src: string; name: string; tag: string; featured?: boolean }> = ({ src, name, tag, featured }) => (
  <div className={`relative overflow-hidden group rounded-2xl ${featured ? 'col-span-2 row-span-2 aspect-square' : 'aspect-[4/5]'}`}
       style={{ background: '#14141C', border: '1px solid rgba(255,255,255,0.06)' }}>
    {src && <img src={src} alt={name} loading="lazy"
                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                 style={{ objectPosition: 'center top' }} />}
    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(5,5,5,0.92) 100%)' }} />
    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
      <p className="text-[10px] uppercase tracking-[0.25em] mb-1.5 font-semibold" style={{ color: '#C4B5FD' }}>{tag || 'Estilo'}</p>
      <p className={`font-bold tracking-tight ${featured ? 'text-2xl md:text-3xl' : 'text-base'}`}>{name}</p>
    </div>
  </div>
);

export default Landing;
