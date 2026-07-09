import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, Plus, Minus, Sparkle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

/* --------------------------------------------------------------
   ellocontent — Landing (Editorial Noir · v2)
   Inspired by Linear / Superhuman / Vercel / editorial magazines.
   Palette: Noir #0a0a0f + violet #8B5CF6 / #C4B5FD
   Type: Fraunces (display, italic) + Inter (body)
--------------------------------------------------------------- */

const SERIF = "'Fraunces', 'Times New Roman', serif";
const SANS = "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [styles, setStyles] = useState<Array<{ id: string; name: string; preview_images: string[]; category: string }>>([]);
  const [posts, setPosts] = useState<Array<{ id: string; title: string; cover_url: string }>>([]);

  const goCreate = () => navigate('/gerador-de-carrosseis');
  const goPlans = () => navigate('/precos');
  const goLogin = () => navigate('/auth');

  // Real showcase data
  useEffect(() => {
    (async () => {
      try {
        const [{ data: sData }, { data: pData }] = await Promise.all([
          supabase.from('marketplace_styles')
            .select('id, name, preview_images, category, is_featured, sort_order')
            .eq('is_active', true)
            .order('is_featured', { ascending: false })
            .order('sort_order', { ascending: true })
            .limit(9),
          supabase.from('generated_carousels')
            .select('id, title, cover_url, card_count, created_at, marketplace_style_id')
            .not('cover_url', 'is', null)
            .not('marketplace_style_id', 'is', null)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(60),
        ]);
        setStyles(((sData || []) as any[]).filter(s => s.preview_images?.length));
        const seen = new Set<string>();
        const curated = ((pData || []) as any[])
          .filter(p => p.cover_url && (p.title || '').trim().length > 10)
          .filter(p => {
            const k = (p.title || '').toLowerCase().slice(0, 40);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .slice(0, 9);
        setPosts(curated);
      } catch {}
    })();
  }, []);

  const bentoImages = useMemo(() => {
    const covers = posts.map(p => p.cover_url);
    const previews = styles.flatMap(s => s.preview_images || []);
    const mix = [...covers, ...previews].filter(Boolean);
    return mix.slice(0, 11);
  }, [posts, styles]);

  return (
    <div style={{ fontFamily: SANS, backgroundColor: '#08080c', color: '#ECEAF4' }} className="min-h-screen antialiased selection:bg-violet-500/40 selection:text-white overflow-x-hidden">

      {/* ─────────── Global grain + gradient ambient ─────────── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]" style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='1'/></svg>")`,
      }} />

      {/* ─────────── NAV ─────────── */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{
        backdropFilter: 'blur(20px) saturate(150%)',
        backgroundColor: 'rgba(8,8,12,0.55)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div className="max-w-[1240px] mx-auto flex items-center justify-between px-6 md:px-10 h-16">
          <div className="flex items-center gap-10">
            <img src={ellocontentLogo} alt="ellocontent" className="h-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
            <nav className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: 'rgba(236,234,244,0.55)' }}>
              <a href="#estilos" className="hover:text-white transition-colors">Estilos</a>
              <a href="#como" className="hover:text-white transition-colors">Como funciona</a>
              <a href="#showcase" className="hover:text-white transition-colors">Showcase</a>
              <button onClick={goPlans} className="hover:text-white transition-colors">Preços</button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goLogin} className="hidden sm:block text-[13px] px-3 py-1.5 rounded-full transition-colors" style={{ color: 'rgba(236,234,244,0.7)' }}>
              Entrar
            </button>
            <button onClick={goCreate}
              className="group text-[13px] font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all"
              style={{ background: 'linear-gradient(180deg,#F8F6FF 0%,#D8D2E8 100%)', color: '#0a0a0f' }}>
              Criar grátis
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─────────── HERO ─────────── */}
      <section ref={heroRef} className="relative pt-40 pb-24 md:pt-52 md:pb-32 px-6">
        {/* Ambient violet aurora */}
        <div aria-hidden className="absolute inset-0 -z-0 overflow-hidden">
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
               style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.28), transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[1200px] h-[400px]"
               style={{ background: 'radial-gradient(ellipse at center, rgba(196,181,253,0.14), transparent 65%)', filter: 'blur(80px)' }} />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative max-w-[1100px] mx-auto text-center">
          {/* Pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase mb-10"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', color: '#C4B5FD' }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#A78BFA' }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#8B5CF6' }} />
            </span>
            Gemini 3 · Nova safra de estilos
          </motion.div>

          {/* Editorial headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.05 }}
            className="mx-auto max-w-[900px] leading-[0.95] tracking-[-0.03em]"
            style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(3rem, 8vw, 6.5rem)' }}>
            Conteúdo com<br />
            <span style={{ fontStyle: 'italic', fontWeight: 400, background: 'linear-gradient(180deg,#EDE9FE 0%,#A78BFA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              alma editorial
            </span>
            <span style={{ color: 'rgba(236,234,244,0.35)' }}>, </span>
            velocidade de IA.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15 }}
            className="mx-auto max-w-[560px] mt-8 text-[15px] md:text-base leading-relaxed"
            style={{ color: 'rgba(236,234,244,0.55)' }}>
            A ellocontent transforma um prompt em carrosséis e posts únicos para o Instagram — com tipografia refinada, curadoria visual e presets prontos para publicar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.28 }}
            className="mt-10 flex items-center justify-center gap-3">
            <button onClick={goCreate}
              className="group relative px-6 py-3.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(180deg,#FFFFFF 0%,#D9D4E8 100%)', color: '#0a0a0f', boxShadow: '0 20px 60px -20px rgba(196,181,253,0.4), inset 0 -2px 0 rgba(0,0,0,0.08)' }}>
              Começar grátis
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-3.5 rounded-full text-sm font-medium border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(236,234,244,0.85)', background: 'rgba(255,255,255,0.02)' }}>
              Ver showcase
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-6 text-[11px] tracking-wider uppercase"
            style={{ color: 'rgba(236,234,244,0.28)' }}>
            Sem cartão · Primeiro post cortesia
          </motion.p>
        </motion.div>

        {/* Hero cover slabs — real generated posts */}
        <div className="relative max-w-[1200px] mx-auto mt-20 md:mt-28 px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {bentoImages.slice(0, 5).map((src, i) => (
              <motion.div key={i}
                whileHover={{ y: -6 }}
                className="relative rounded-2xl overflow-hidden aspect-[4/5]"
                style={{
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: '#101018',
                  transform: `translateY(${i === 2 ? '-20px' : i === 0 || i === 4 ? '20px' : '0'})`,
                  boxShadow: i === 2 ? '0 40px 80px -30px rgba(139,92,246,0.35)' : '0 20px 50px -20px rgba(0,0,0,0.5)',
                }}>
                <img src={src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(8,8,12,0.5) 100%)' }} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─────────── LOGOS strip ─────────── */}
      <section className="relative py-16 border-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <p className="text-center text-[10px] uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(236,234,244,0.3)' }}>
            Usado por criadores, agências e times de marketing
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
            {['STUDIO NORTE', 'Ateliê 21', 'nex ·', 'Casa Ivo', 'Múltipla', 'REDE·', 'lume.co'].map((n, i) => (
              <span key={i} className="text-[13px] tracking-wide" style={{
                fontFamily: i % 2 === 0 ? SERIF : SANS,
                fontStyle: i === 1 ? 'italic' : 'normal',
                fontWeight: i % 3 === 0 ? 500 : 400,
                color: 'rgba(236,234,244,0.45)',
              }}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── BENTO — Estilos ─────────── */}
      <section id="estilos" className="relative py-32 md:py-40 px-6">
        <div className="max-w-[1240px] mx-auto">
          <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: '#A78BFA' }}>Sistema visual</div>
              <h2 className="tracking-[-0.02em] leading-[1.05]" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2rem, 4.5vw, 3.75rem)' }}>
                Cada estilo é um <em style={{ fontWeight: 400 }}>ponto de vista</em>.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed" style={{ color: 'rgba(236,234,244,0.5)' }}>
              Mais de 60 presets curados — do editorial minimalista ao streetwear vibrante. Cada um com tipografia, paleta e ritmo próprios.
            </p>
          </div>

          {/* Bento grid — aspect-based, faces visible */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <BentoCard className="col-span-2 row-span-2 aspect-square" src={bentoImages[0]} title="Editorial" tag="Serif · Minimal" featured />
            <BentoCard className="aspect-[4/5]" src={bentoImages[1]} title="Neo-Brutal" tag="Grotesk" />
            <BentoCard className="aspect-[4/5]" src={bentoImages[2]} title="Boutique" tag="Serif · Cream" />
            <BentoCard className="aspect-[4/5]" src={bentoImages[3]} title="Streetwear" tag="Display" />
            <BentoCard className="aspect-[4/5]" src={bentoImages[4]} title="Corporate" tag="Sans" />
            <BentoCard className="aspect-[4/5]" src={bentoImages[5]} title="Painel" tag="Mono" />
            <BentoCard className="aspect-[4/5]" src={bentoImages[6]} title="Retrô" tag="Serif itálico" />
            <BentoCard className="aspect-[4/5]" src={bentoImages[7]} title="Cinema" tag="Grotesk XL" />
            <BentoCard className="aspect-[4/5]" src={bentoImages[8]} title="Boho" tag="Serif · Warm" />
          </div>


          <div className="mt-10 flex justify-center">
            <button onClick={goCreate} className="text-[13px] font-medium flex items-center gap-1.5 px-5 py-2.5 rounded-full border transition-colors hover:bg-white/5"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(236,234,244,0.85)' }}>
              Ver todos os estilos <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────── COMO FUNCIONA ─────────── */}
      <section id="como" className="relative py-32 md:py-40 px-6" style={{ background: 'linear-gradient(180deg, transparent, rgba(139,92,246,0.03), transparent)' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: '#A78BFA' }}>Como funciona</div>
            <h2 className="tracking-[-0.02em] leading-[1.05] max-w-3xl mx-auto" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2rem, 4.5vw, 3.75rem)' }}>
              Do prompt ao post — em <em style={{ fontWeight: 400 }}>segundos</em>.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Escreva o tema', d: 'Descreva sua ideia, cole um roteiro ou mencione um prompt salvo com @. A IA entende contexto.' },
              { n: '02', t: 'Escolha o estilo', d: 'Selecione um dos presets editoriais — ou deixe a IA sugerir o mais adequado ao seu nicho.' },
              { n: '03', t: 'Publique', d: 'Baixe em alta resolução, exporte em ZIP ou publique direto no Instagram via integração oficial.' },
            ].map((s, i) => (
              <motion.div key={s.n}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.12 }}
                className="relative p-8 rounded-3xl group"
                style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))' }}>
                <div className="flex items-baseline justify-between mb-8">
                  <span style={{ fontFamily: SERIF, fontWeight: 400, fontStyle: 'italic', fontSize: '2.75rem', color: '#8B5CF6' }}>{s.n}</span>
                  <Sparkle className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-500" style={{ color: '#C4B5FD' }} />
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: '#F5F3FA' }}>{s.t}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(236,234,244,0.5)' }}>{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── SHOWCASE MARQUEE ─────────── */}
      <section id="showcase" className="relative py-32 md:py-40 overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-6 mb-16 flex items-end justify-between flex-wrap gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: '#A78BFA' }}>Feito com ellocontent</div>
            <h2 className="tracking-[-0.02em] leading-[1.05]" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2rem, 4.5vw, 3.75rem)' }}>
              Posts reais. <em style={{ fontWeight: 400 }}>Resultados reais.</em>
            </h2>
          </div>
          <p className="max-w-xs text-sm" style={{ color: 'rgba(236,234,244,0.5)' }}>
            Uma amostra dos últimos carrosséis gerados por nossa comunidade.
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #08080c, transparent)' }} />
          <div className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(-90deg, #08080c, transparent)' }} />
          <div className="flex gap-4 marquee-track">
            {[...bentoImages, ...bentoImages].filter(Boolean).map((src, i) => (
              <div key={i} className="flex-none w-[260px] aspect-[4/5] rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#101018' }}>
                <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes marquee-scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
          .marquee-track { animation: marquee-scroll 60s linear infinite; width: max-content; }
          .marquee-track:hover { animation-play-state: paused; }
        `}</style>
      </section>

      {/* ─────────── QUOTE ─────────── */}
      <section className="relative py-32 md:py-44 px-6">
        <div className="max-w-[900px] mx-auto text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(236,234,244,0.4)' }}>—  Depoimento</div>
          <blockquote style={{ fontFamily: SERIF, fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3.5vw, 2.75rem)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            "Substituí três ferramentas por uma. Meu Instagram ganhou identidade sem eu virar designer."
          </blockquote>
          <div className="mt-10 flex items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full" style={{ background: 'linear-gradient(135deg,#8B5CF6,#EDE9FE)' }} />
            <div className="text-left">
              <div className="text-sm font-medium">Marina Vasques</div>
              <div className="text-xs" style={{ color: 'rgba(236,234,244,0.4)' }}>Fundadora · Atelier Norte</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── PRICING ─────────── */}
      <section className="relative py-32 md:py-40 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: '#A78BFA' }}>Preços</div>
            <h2 className="tracking-[-0.02em] leading-[1.05]" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2rem, 4.5vw, 3.75rem)' }}>
              Comece grátis. <em style={{ fontWeight: 400 }}>Escale quando quiser.</em>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: 'Starter', price: 'R$ 27', period: '/mês', credits: '50 criativos', cta: 'Começar', highlight: false, feats: ['50 criativos/mês', 'Todos os estilos gratuitos', 'Exportação HD'] },
              { name: 'Pro', price: 'R$ 47', period: '/mês', credits: '100 criativos', cta: 'Escolher Pro', highlight: true, feats: ['100 criativos/mês', 'Marketplace completo', 'Rosto & Logo IA', 'Suporte prioritário'] },
              { name: 'Growth', price: 'R$ 87', period: '/mês', credits: '200 criativos', cta: 'Escalar', highlight: false, feats: ['200 criativos/mês', 'Publicação Instagram', 'Ellodrive ilimitado', 'API em breve'] },
            ].map((p) => (
              <div key={p.name}
                className="relative p-8 rounded-3xl flex flex-col"
                style={{
                  border: p.highlight ? '1px solid rgba(139,92,246,0.45)' : '1px solid rgba(255,255,255,0.06)',
                  background: p.highlight
                    ? 'linear-gradient(180deg, rgba(139,92,246,0.1), rgba(139,92,246,0.02))'
                    : 'linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))',
                  boxShadow: p.highlight ? '0 30px 80px -30px rgba(139,92,246,0.4)' : 'none',
                }}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold"
                    style={{ background: '#8B5CF6', color: 'white' }}>Popular</div>
                )}
                <h3 className="text-sm uppercase tracking-widest mb-6" style={{ color: 'rgba(236,234,244,0.6)' }}>{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span style={{ fontFamily: SERIF, fontWeight: 400, fontSize: '3rem', letterSpacing: '-0.02em' }}>{p.price}</span>
                  <span className="text-sm" style={{ color: 'rgba(236,234,244,0.45)' }}>{p.period}</span>
                </div>
                <div className="text-xs mb-8" style={{ color: 'rgba(236,234,244,0.45)' }}>{p.credits}</div>
                <ul className="space-y-3 mb-10 flex-1">
                  {p.feats.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(236,234,244,0.75)' }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: '#A78BFA' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={goPlans}
                  className="w-full py-3 rounded-full text-sm font-medium transition-transform hover:-translate-y-0.5"
                  style={p.highlight
                    ? { background: 'linear-gradient(180deg,#FFFFFF,#D9D4E8)', color: '#0a0a0f' }
                    : { border: '1px solid rgba(255,255,255,0.15)', color: 'white', background: 'transparent' }}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <section className="relative py-32 md:py-40 px-6">
        <div className="max-w-[820px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: '#A78BFA' }}>FAQ</div>
            <h2 className="tracking-[-0.02em]" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2rem, 4.5vw, 3.75rem)' }}>
              Perguntas frequentes
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} style={{ borderTop: i === 0 ? '1px solid rgba(255,255,255,0.06)' : undefined, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between py-6 text-left">
                    <span className="text-base md:text-lg" style={{ fontFamily: SERIF, fontWeight: 400 }}>{f.q}</span>
                    {open ? <Minus className="w-4 h-4 shrink-0 opacity-60" /> : <Plus className="w-4 h-4 shrink-0 opacity-60" />}
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden">
                    <p className="pb-6 text-sm leading-relaxed max-w-xl" style={{ color: 'rgba(236,234,244,0.6)' }}>{f.a}</p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────── CTA FINAL ─────────── */}
      <section className="relative py-32 md:py-44 px-6">
        <div className="max-w-[1000px] mx-auto rounded-[36px] relative overflow-hidden p-12 md:p-20 text-center"
          style={{
            border: '1px solid rgba(139,92,246,0.25)',
            background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.25), transparent 60%), #0d0d15',
          }}>
          <div aria-hidden className="absolute inset-0 opacity-40" style={{
            background: 'radial-gradient(ellipse at center bottom, rgba(196,181,253,0.15), transparent 70%)',
          }} />
          <h2 className="relative tracking-[-0.03em] leading-[1] max-w-2xl mx-auto"
            style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)' }}>
            Seu próximo post <em style={{ fontWeight: 400, color: '#C4B5FD' }}>merece</em> mais.
          </h2>
          <p className="relative mt-6 mx-auto max-w-md text-[15px]" style={{ color: 'rgba(236,234,244,0.55)' }}>
            Experimente o gerador — o primeiro criativo é por nossa conta.
          </p>
          <div className="relative mt-10 flex items-center justify-center gap-3">
            <button onClick={goCreate}
              className="group px-7 py-3.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(180deg,#FFFFFF,#D9D4E8)', color: '#0a0a0f', boxShadow: '0 20px 60px -20px rgba(196,181,253,0.5)' }}>
              Criar meu primeiro post
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="border-t px-6 py-14" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src={ellocontentLogo} alt="ellocontent" className="h-4" />
            <span className="text-xs" style={{ color: 'rgba(236,234,244,0.35)' }}>© {new Date().getFullYear()} · Feito no Brasil</span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[13px]" style={{ color: 'rgba(236,234,244,0.5)' }}>
            <button onClick={goPlans} className="hover:text-white">Preços</button>
            <a href="/ajuda" className="hover:text-white">Ajuda</a>
            <a href="/parceiros" className="hover:text-white">Parceiros</a>
            <a href="/comunidade" className="hover:text-white">Comunidade</a>
            <button onClick={goLogin} className="hover:text-white">Entrar</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* -------------------- helpers -------------------- */

const BentoCard: React.FC<{ className?: string; src?: string; title: string; tag: string; featured?: boolean }> = ({ className, src, title, tag, featured }) => (
  <motion.div
    whileHover={{ scale: 1.008 }}
    transition={{ duration: 0.4 }}
    className={`relative rounded-3xl overflow-hidden group ${className || ''}`}
    style={{
      border: '1px solid rgba(255,255,255,0.06)',
      background: '#101018',
    }}>
    {src ? (
      <img src={src} alt={title} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
    ) : (
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), transparent)' }} />
    )}
    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(8,8,12,0.85) 100%)' }} />
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ background: 'linear-gradient(180deg, rgba(139,92,246,0.15), transparent 50%)' }} />
    <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(196,181,253,0.9)' }}>{tag}</div>
        <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: featured ? '1.75rem' : '1.15rem', color: 'white', letterSpacing: '-0.01em' }}>{title}</div>
      </div>
      <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all" style={{ color: 'white' }} />
    </div>
  </motion.div>
);

const FAQ = [
  { q: 'Preciso saber design?', a: 'Não. Você escreve o tema, escolhe um estilo curado e a IA cuida da composição, tipografia e paleta.' },
  { q: 'Posso usar minha marca?', a: 'Sim — envie seu logo, defina cores e fontes. A ellocontent aplica sua identidade em todos os slides automaticamente.' },
  { q: 'Como funcionam os créditos?', a: 'Cada plano vem com um pacote mensal. Créditos comprados avulsos nunca expiram e ficam disponíveis mesmo após mudança de plano.' },
  { q: 'Publica direto no Instagram?', a: 'Sim, com a integração oficial da Meta você agenda ou publica direto do painel.' },
  { q: 'Posso cancelar quando quiser?', a: 'Claro. Sem multa, sem fidelidade. O acesso segue ativo até o fim do ciclo pago.' },
];

export default Landing;
