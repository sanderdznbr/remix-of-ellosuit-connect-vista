import React, { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion';
import { ArrowUpRight, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

const HeroCanvas = lazy(() => import('@/components/landing/HeroCanvas'));

/* ─────────────────────────────────────────────────────────────
   ellocontent — Landing · Asymmetric Marquee (Editorial Noir)
   Palette: #050505 base · violet #8B5CF6 accents
   Type: Fraunces (display, italic) + Inter (body)
   ───────────────────────────────────────────────────────────── */

const SERIF = "'Fraunces', 'Times New Roman', serif";
const SANS = "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

type Style = { id: string; name: string; category: string; preview_images: string[] };
type Post = { id: string; title: string; cover_url: string };

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [styles, setStyles] = useState<Style[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  // ── Scroll orchestration ──
  const heroRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const scrollY = useRef(0); // 0..1 fed into R3F canvas

  const { scrollYProgress } = useScroll();
  const progressBar = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef, offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, -140]);
  const heroOpacity = useTransform(heroProgress, [0, 0.85], [1, 0]);
  const heroScale = useTransform(heroProgress, [0, 1], [1, 0.94]);
  const canvasOpacity = useTransform(heroProgress, [0, 1], [0.55, 0.05]);

  useMotionValueEvent(heroProgress, 'change', (v) => { scrollY.current = v; });

  // Horizontal scroll rail
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

  const tiles = useMemo(() => {
    const covers = posts.map(p => ({ src: p.cover_url, label: p.title }));
    const previews = styles.flatMap(s => (s.preview_images || []).map(src => ({ src, label: s.name })));
    const seen = new Set<string>();
    const mix = [...covers, ...previews].filter(t => t.src && !seen.has(t.src) && (seen.add(t.src), true));
    return mix;
  }, [posts, styles]);

  const colA = tiles.filter((_, i) => i % 2 === 0).slice(0, 6);
  const colB = tiles.filter((_, i) => i % 2 === 1).slice(0, 6);

  return (
    <div style={{ fontFamily: SANS, background: '#050505', color: '#ECEAF4' }}
         className="min-h-screen antialiased selection:bg-violet-500/40 selection:text-white overflow-x-hidden">

      {/* Grain */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
      }} />

      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{
        backdropFilter: 'blur(20px) saturate(150%)',
        backgroundColor: 'rgba(5,5,5,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 md:px-10 h-16">
          <img src={ellocontentLogo} alt="ellocontent" className="h-4 cursor-pointer"
               onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <nav className="hidden md:flex items-center gap-8 text-[12px] uppercase tracking-[0.18em]"
               style={{ color: 'rgba(236,234,244,0.5)' }}>
            <a href="#estilos" className="hover:text-white transition-colors">Estilos</a>
            <a href="#como" className="hover:text-white transition-colors">Método</a>
            <a href="#showcase" className="hover:text-white transition-colors">Showcase</a>
            <button onClick={goPlans} className="hover:text-white transition-colors">Preços</button>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={goLogin} className="hidden sm:block text-[12px] uppercase tracking-[0.18em] px-3 py-1.5"
                    style={{ color: 'rgba(236,234,244,0.7)' }}>Entrar</button>
            <button onClick={goCreate}
                    className="group text-[12px] uppercase tracking-[0.15em] font-semibold px-4 py-2 flex items-center gap-1.5 transition-colors"
                    style={{ background: '#F5F3FF', color: '#0a0a0f' }}>
              Criar grátis
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
        {/* Scroll progress line */}
        <motion.div className="absolute bottom-0 left-0 h-[2px] origin-left"
          style={{ scaleX: progressBar, background: 'linear-gradient(90deg,#8B5CF6,#C4B5FD,#8B5CF6)', width: '100%' }} />
      </header>

      {/* HERO — Asymmetric Marquee + 3D Orb */}
      <section ref={heroRef} className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-6 md:px-12 lg:px-20 min-h-[100vh] overflow-hidden">
        {/* Ambient — subtle radial glow behind headline */}
        <div aria-hidden className="absolute inset-0 -z-0 pointer-events-none">
          <div className="absolute -top-20 -left-40 w-[520px] h-[520px] rounded-full"
               style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.18), transparent 70%)', filter: 'blur(40px)' }} />
        </div>

        {/* 3D Interactive Backdrop — contained behind marquee only */}
        <motion.div aria-hidden
                    className="hidden lg:block absolute top-20 right-0 w-[46%] h-[80%] pointer-events-none z-0 overflow-hidden"
                    style={{ opacity: canvasOpacity, mixBlendMode: 'screen',
                             WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 72%)',
                             maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 72%)' }}>
          <Suspense fallback={null}>
            <HeroCanvas scrollY={scrollY} />
          </Suspense>
        </motion.div>

        <motion.div style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
                    className="relative z-10 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Left — editorial lockup */}
          <div className="lg:col-span-7 flex flex-col justify-between min-h-[640px]">
            <div className="mb-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em]"
                 style={{ color: 'rgba(236,234,244,0.5)' }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#A78BFA' }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#8B5CF6' }} />
              </span>
              Marketplace de estilos · ao vivo
            </div>

            <div className="space-y-10">
              <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}
                className="leading-[0.85] tracking-[-0.035em]"
                style={{ fontFamily: SERIF, fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(3.5rem, 10vw, 8.5rem)' }}>
                Curadoria<br />
                <span style={{ color: '#A78BFA' }}>editorial</span><br />
                <span style={{ fontStyle: 'normal', fontWeight: 400 }}>redefinida.</span>
              </motion.h1>


              <div className="max-w-md space-y-8">
                <p className="text-lg leading-relaxed font-light" style={{ color: 'rgba(236,234,244,0.6)' }}>
                  A ellocontent é o marketplace de arquiteturas de carrossel para Instagram. Um prompt vira narrativa visual sofisticada — com tipografia, ritmo e paleta sob curadoria.
                </p>

                <div className="flex items-center gap-6 flex-wrap">
                  <button onClick={goCreate}
                          className="group px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-violet-500 hover:text-white"
                          style={{ background: '#FFFFFF', color: '#0a0a0f' }}>
                    Explorar estilos
                  </button>
                  <button onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })}
                          className="text-sm underline underline-offset-8 transition-colors hover:text-white"
                          style={{ color: 'rgba(236,234,244,0.5)' }}>
                    Ver showreel
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-16 border-t pt-8 flex gap-14"
                 style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {[
                { n: '12k+', l: 'Criadores' },
                { n: '400+', l: 'Estilos curados' },
                { n: '6M+', l: 'Posts gerados' },
              ].map(s => (
                <div key={s.n}>
                  <p style={{ fontFamily: SERIF, fontWeight: 500, fontSize: '1.75rem', letterSpacing: '-0.02em' }}>{s.n}</p>
                  <p className="text-[10px] uppercase tracking-[0.25em] mt-1" style={{ color: 'rgba(236,234,244,0.4)' }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — dense marketplace marquee */}
          <div className="lg:col-span-5 relative">
            <div className="grid grid-cols-2 gap-4 h-[720px] overflow-hidden"
                 style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
                          maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)' }}>
              <div className="space-y-4 pt-12 ec-marquee-up">
                {[...colA, ...colA].map((t, i) => (
                  <MarqueeTile key={`a${i}`} src={t.src} label={t.label} featured={i === 0} />
                ))}
              </div>
              <div className="space-y-4 ec-marquee-down">
                {[...colB, ...colB].map((t, i) => (
                  <MarqueeTile key={`b${i}`} src={t.src} label={t.label} featured={i === 1} />
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div className="hidden md:flex absolute -bottom-6 -left-6 w-28 h-28 rounded-full items-center justify-center text-center leading-tight font-bold text-[10px] uppercase tracking-[0.15em] rotate-[-6deg]"
                 style={{ background: '#F5F3FF', color: '#0a0a0f', boxShadow: '0 20px 60px -20px rgba(139,92,246,0.5)' }}>
              Somente<br />estilos<br />curados
            </div>
          </div>
        </motion.div>
      </section>

      {/* LOGOS */}
      <section className="relative py-14 border-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-center text-[10px] uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(236,234,244,0.3)' }}>
            Usado por criadores, agências e times de marketing
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-70">
            {['STUDIO NORTE', 'Ateliê 21', 'nex ·', 'Casa Ivo', 'Múltipla', 'REDE·', 'lume.co'].map((n, i) => (
              <span key={i} className="text-[13px] tracking-wide" style={{
                fontFamily: i % 2 === 0 ? SERIF : SANS,
                fontStyle: i === 1 ? 'italic' : 'normal',
                fontWeight: i % 3 === 0 ? 500 : 400,
                color: 'rgba(236,234,244,0.5)',
              }}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ESTILOS BENTO */}
      <section id="estilos" className="relative py-24 md:py-32 px-6 md:px-12 lg:px-20">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: '#A78BFA' }}>Sistema visual</div>
              <h2 className="tracking-[-0.02em] leading-[1]"
                  style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2.25rem, 5vw, 4.25rem)' }}>
                Cada estilo é um<br /><em style={{ fontWeight: 400, color: '#A78BFA' }}>ponto de vista.</em>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed" style={{ color: 'rgba(236,234,244,0.5)' }}>
              Mais de 400 presets curados — do editorial minimalista ao streetwear vibrante. Cada um com tipografia, paleta e ritmo próprios.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {styles.slice(0, 8).map((s, i) => (
              <StyleCard key={s.id} src={s.preview_images[0]} name={s.name} tag={s.category} featured={i === 0} />
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <button onClick={goCreate}
                    className="text-[12px] uppercase tracking-[0.2em] font-medium flex items-center gap-1.5 px-6 py-3 border transition-colors hover:bg-white/5"
                    style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(236,234,244,0.85)' }}>
              Ver todos os estilos <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como" className="relative py-24 md:py-32 px-6 md:px-12"
               style={{ background: 'linear-gradient(180deg, transparent, rgba(139,92,246,0.04), transparent)' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: '#A78BFA' }}>Método</div>
            <h2 className="tracking-[-0.02em] leading-[1] max-w-3xl mx-auto"
                style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}>
              Do prompt ao post — em <em style={{ fontWeight: 400 }}>segundos.</em>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: '01', t: 'Escreva o tema', d: 'Descreva uma ideia, cole um roteiro ou mencione um prompt salvo com @. A IA compreende contexto de marca.' },
              { n: '02', t: 'Escolha o estilo', d: 'Selecione um dos presets editoriais — ou deixe a curadoria sugerir o mais adequado ao seu nicho.' },
              { n: '03', t: 'Publique', d: 'Baixe em alta resolução, exporte em ZIP ou publique direto no Instagram via integração oficial.' },
            ].map((s, i) => (
              <motion.div key={s.n}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
                className="relative p-8 group"
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.015)' }}>
                <div className="flex items-baseline justify-between mb-10">
                  <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '2.5rem', color: '#8B5CF6' }}>{s.n}</span>
                  <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: 'rgba(236,234,244,0.3)' }}>Etapa</span>
                </div>
                <h3 className="text-xl mb-3" style={{ fontFamily: SERIF, fontWeight: 400 }}>{s.t}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(236,234,244,0.55)' }}>{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE */}
      <section id="showcase" ref={showcaseRef} className="relative py-24 md:py-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20">
          <div className="mb-16 flex items-end justify-between flex-wrap gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: '#A78BFA' }}>Showreel</div>
              <h2 className="tracking-[-0.02em] leading-[1]"
                  style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}>
                Feito por nossa <em style={{ fontWeight: 400 }}>comunidade.</em>
              </h2>
            </div>
            <p className="max-w-sm text-sm" style={{ color: 'rgba(236,234,244,0.5)' }}>
              Role a página — o showreel corre na horizontal.
            </p>
          </div>
        </div>

        {/* Horizontal scroll rail driven by page scroll */}
        <motion.div style={{ x: railX }} className="flex gap-4 pl-6 md:pl-12 lg:pl-20 will-change-transform">
          {posts.slice(0, 14).map((p, i) => (
            <motion.div key={p.id}
              whileHover={{ y: -10, rotate: i % 2 ? 1.2 : -1.2 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="relative shrink-0 w-[260px] md:w-[320px] aspect-[4/5] overflow-hidden group"
              style={{ background: '#101018', border: '1px solid rgba(255,255,255,0.08)',
                       boxShadow: '0 30px 60px -30px rgba(139,92,246,0.35)' }}>
              <img src={p.cover_url} alt={p.title} loading="lazy"
                   className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   style={{ objectPosition: 'center top' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(5,5,5,0.9) 100%)' }} />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: '#C4B5FD' }}>№ {String(i + 1).padStart(2, '0')}</p>
                <p className="text-sm truncate" style={{ fontFamily: SERIF, fontStyle: 'italic' }}>{p.title}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* PRICING TEASER */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-4">
          {[
            { n: 'Starter', p: 'R$ 47', c: '50 créditos/mês', f: ['Todos os estilos gratuitos', 'Downloads em alta', 'Suporte por chat'] },
            { n: 'Pro', p: 'R$ 87', c: '100 créditos/mês', f: ['Marketplace completo', 'Publicação Instagram', 'Fotos reais + web'], hi: true },
            { n: 'Growth', p: 'R$ 147', c: '200 créditos/mês', f: ['Carrosséis até 15 cards', 'Trends & niche packs', 'Prioridade na fila'] },
          ].map((pl) => (
            <div key={pl.n} className="relative p-8 flex flex-col"
                 style={{
                   border: pl.hi ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                   background: pl.hi ? 'linear-gradient(180deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))' : 'rgba(255,255,255,0.015)',
                 }}>
              {pl.hi && (
                <span className="absolute -top-2.5 left-8 text-[9px] uppercase tracking-[0.25em] px-2 py-1"
                      style={{ background: '#8B5CF6', color: '#fff' }}>Mais escolhido</span>
              )}
              <div className="text-[10px] uppercase tracking-[0.25em] mb-6" style={{ color: 'rgba(236,234,244,0.5)' }}>{pl.n}</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span style={{ fontFamily: SERIF, fontSize: '2.75rem', fontWeight: 400, letterSpacing: '-0.02em' }}>{pl.p}</span>
                <span className="text-xs" style={{ color: 'rgba(236,234,244,0.4)' }}>/mês</span>
              </div>
              <p className="text-xs mb-8" style={{ color: 'rgba(236,234,244,0.5)' }}>{pl.c}</p>
              <ul className="space-y-3 mb-10 flex-1">
                {pl.f.map(f => (
                  <li key={f} className="text-sm flex items-center gap-2" style={{ color: 'rgba(236,234,244,0.75)' }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: '#A78BFA' }} />{f}
                  </li>
                ))}
              </ul>
              <button onClick={goPlans}
                      className="w-full py-3 text-[12px] uppercase tracking-[0.2em] font-semibold transition-colors"
                      style={pl.hi
                        ? { background: '#F5F3FF', color: '#0a0a0f' }
                        : { border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(236,234,244,0.9)' }}>
                Assinar {pl.n}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: '#A78BFA' }}>Dúvidas</div>
            <h2 className="tracking-[-0.02em] leading-[1]"
                style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
              Respostas <em style={{ fontWeight: 400 }}>diretas.</em>
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {[
              { q: 'Preciso saber design para usar?', a: 'Não. Escolha um estilo curado, descreva o tema e a ellocontent monta o carrossel — tipografia, hierarquia e paleta prontas.' },
              { q: 'Posso usar minhas próprias fotos?', a: 'Sim. Faça upload de rosto, produto e logo — a IA prioriza suas referências e mantém fidelidade visual.' },
              { q: 'Como funcionam os créditos?', a: 'Cada carrossel custa entre 1 e 2 créditos por card. Planos renovam mensalmente e créditos avulsos ficam disponíveis para top-up via PIX ou cartão.' },
              { q: 'Publica direto no Instagram?', a: 'Sim, via integração oficial Meta. Você conecta sua conta Business e agenda a publicação sem sair da plataforma.' },
              { q: 'Posso cancelar quando quiser?', a: 'Sim, sem multa. Créditos acumulados continuam válidos mesmo após o downgrade.' },
            ].map((item, i) => (
              <div key={i} style={{ borderTop: i === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between py-6 text-left group">
                  <span className="text-lg" style={{ fontFamily: SERIF, fontWeight: 400 }}>{item.q}</span>
                  {openFaq === i
                    ? <Minus className="w-4 h-4 shrink-0" style={{ color: '#A78BFA' }} />
                    : <Plus className="w-4 h-4 shrink-0" style={{ color: 'rgba(236,234,244,0.5)' }} />}
                </button>
                {openFaq === i && (
                  <p className="pb-6 pr-8 text-sm leading-relaxed" style={{ color: 'rgba(236,234,244,0.6)' }}>{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[500px]"
               style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.25), transparent 70%)', filter: 'blur(60px)' }} />
        </div>
        <div className="relative max-w-[900px] mx-auto text-center">
          <h2 className="tracking-[-0.03em] leading-[0.95]"
              style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2.5rem, 7vw, 5.5rem)' }}>
            Comece com um<br /><em style={{ fontWeight: 400, color: '#A78BFA' }}>post cortesia.</em>
          </h2>
          <p className="mt-8 max-w-md mx-auto text-base" style={{ color: 'rgba(236,234,244,0.55)' }}>
            Sem cartão de crédito. Sem compromisso. Publique seu primeiro carrossel em minutos.
          </p>
          <button onClick={goCreate}
                  className="mt-10 group px-8 py-4 text-[13px] uppercase tracking-[0.2em] font-semibold inline-flex items-center gap-2 transition-transform hover:-translate-y-0.5"
                  style={{ background: '#FFFFFF', color: '#0a0a0f', boxShadow: '0 30px 80px -20px rgba(139,92,246,0.5)' }}>
            Criar meu primeiro post
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t px-6 md:px-12 py-12" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-6">
          <img src={ellocontentLogo} alt="ellocontent" className="h-4" />
          <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: 'rgba(236,234,244,0.35)' }}>
            © {new Date().getFullYear()} ellocontent · Feito no Brasil
          </p>
          <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'rgba(236,234,244,0.5)' }}>
            <a href="/precos" className="hover:text-white">Preços</a>
            <a href="/auth" className="hover:text-white">Entrar</a>
            <a href="/ajuda" className="hover:text-white">Suporte</a>
          </div>
        </div>
      </footer>

      {/* Marquee animations */}
      <style>{`
        @keyframes ec-marquee-up { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes ec-marquee-down { from { transform: translateY(-50%); } to { transform: translateY(0); } }
        .ec-marquee-up { animation: ec-marquee-up 40s linear infinite; }
        .ec-marquee-down { animation: ec-marquee-down 32s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ec-marquee-up, .ec-marquee-down { animation: none; }
        }
      `}</style>
    </div>
  );
};

/* ─────────── Subcomponents ─────────── */

const MarqueeTile: React.FC<{ src: string; label: string; featured?: boolean }> = ({ src, label, featured }) => (
  <div className="relative aspect-[4/5] overflow-hidden group"
       style={{
         background: '#101018',
         border: featured ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
       }}>
    {src && <img src={src} alt={label} loading="lazy"
                 className="absolute inset-0 w-full h-full object-cover"
                 style={{ objectPosition: 'center top' }} />}
    <div className="absolute inset-0"
         style={{ background: featured
           ? 'linear-gradient(180deg, rgba(139,92,246,0.15) 0%, transparent 50%, rgba(5,5,5,0.9) 100%)'
           : 'linear-gradient(180deg, transparent 55%, rgba(5,5,5,0.85) 100%)' }} />
    <div className="absolute bottom-0 left-0 right-0 p-3">
      {featured && (
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: '#C4B5FD' }}>Destaque</p>
      )}
      <p className="text-sm truncate" style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400 }}>{label}</p>
    </div>
  </div>
);

const StyleCard: React.FC<{ src: string; name: string; tag: string; featured?: boolean }> = ({ src, name, tag, featured }) => (
  <div className={`relative overflow-hidden group ${featured ? 'col-span-2 row-span-2 aspect-square' : 'aspect-[4/5]'}`}
       style={{ background: '#101018', border: '1px solid rgba(255,255,255,0.06)' }}>
    {src && <img src={src} alt={name} loading="lazy"
                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                 style={{ objectPosition: 'center top' }} />}
    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(5,5,5,0.9) 100%)' }} />
    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
      <p className="text-[10px] uppercase tracking-[0.25em] mb-1.5" style={{ color: '#C4B5FD' }}>{tag || 'Estilo'}</p>
      <p className={featured ? 'text-2xl md:text-3xl' : 'text-base'}
         style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400 }}>{name}</p>
    </div>
  </div>
);

export default Landing;
