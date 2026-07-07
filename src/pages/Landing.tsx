import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Minus, Sparkles, Palette, User, Zap, AtSign, FolderOpen, Check, Users, Star, TrendingUp } from 'lucide-react';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import { supabase } from '@/integrations/supabase/client';
import '@/styles/carousel-loader.css';


const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as any },
};

// Brand tokens (ellocontent)
const BG = '#0a0a0f';
const BG_SOFT = '#0f0f15';
const SURFACE = 'rgba(255,255,255,0.04)';
const SURFACE_HOVER = 'rgba(255,255,255,0.07)';
const HAIRLINE = 'rgba(255,255,255,0.08)';
const HAIRLINE_STRONG = 'rgba(255,255,255,0.14)';
const INK = '#ffffff';
const INK_SOFT = 'rgba(255,255,255,0.78)';
const INK_DIM = 'rgba(255,255,255,0.55)';
const PURPLE = '#A78BFA';
const PURPLE_DEEP = '#8B5CF6';
const PURPLE_GLOW = '#C4B5FD';

const FONT_STACK = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', sans-serif";

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showcaseStyles, setShowcaseStyles] = useState<Array<{ id: string; name: string; preview_images: string[]; category: string }>>([]);
  const [recentPosts, setRecentPosts] = useState<Array<{ id: string; title: string; cover_url: string }>>([]);

  const goCreate = () => navigate('/gerador-de-carrosseis');
  const goPlans = () => navigate('/precos');

  // Fetch real marketplace styles for the gallery section
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('marketplace_styles')
          .select('id, name, preview_images, category, is_featured, sort_order')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .limit(6);
        setShowcaseStyles((data || []).filter((s: any) => s.preview_images?.length));
      } catch {}
    })();
  }, []);

  // Fetch + curate best recent generated posts (public — those tied to a marketplace style)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('generated_carousels')
          .select('id, title, cover_url, marketplace_style_id, user_id, card_count, created_at')
          .not('cover_url', 'is', null)
          .not('marketplace_style_id', 'is', null)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(120);

        const raw = (data || []).filter((p: any) => p.cover_url);

        // Curadoria:
        // 1) exige título descritivo (>= 12 chars, sem "sem título")
        // 2) prefere carrossel (card_count >= 3) para covers mais completas
        // 3) dedupe por título normalizado (evita "BPC-157" 6x)
        // 4) diversifica autores — no máximo 2 posts do mesmo user_id
        // 5) prefere estilos distintos — no máximo 3 posts do mesmo marketplace_style_id
        const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60);
        const seenTitle = new Set<string>();
        const perUser: Record<string, number> = {};
        const perStyle: Record<string, number> = {};
        const curated: any[] = [];
        for (const p of raw) {
          const t = (p.title || '').trim();
          if (t.length < 12) continue;
          if (/sem\s*t[ií]tulo|untitled|teste|test\b/i.test(t)) continue;
          const key = norm(t);
          if (seenTitle.has(key)) continue;
          const u = p.user_id || 'x';
          const s = p.marketplace_style_id || 'x';
          if ((perUser[u] || 0) >= 2) continue;
          if ((perStyle[s] || 0) >= 3) continue;
          seenTitle.add(key);
          perUser[u] = (perUser[u] || 0) + 1;
          perStyle[s] = (perStyle[s] || 0) + 1;
          curated.push(p);
          if (curated.length >= 20) break;
        }
        setRecentPosts(curated);
      } catch {}
    })();
  }, []);






  const painPoints = [
    'Passa horas criando um post e no final não fica satisfeito com o resultado',
    'Sabe que precisa postar mas fica travado sem saber o que falar',
    'Paga designer ou social media e ainda depende deles para tudo',
    'Usa o Canva mas o resultado nunca parece profissional de verdade',
    'Fica dias ou semanas sem postar porque não tem tempo',
    'Vê o concorrente crescendo nas redes e não sabe como acompanhar o ritmo',
    'Já tentou ChatGPT mas o resultado não tem design, não tem cara de post',
    'Terceirizou o conteúdo mas a agência não entende o seu negócio do jeito que você entende',
  ];

  const features = [
    { icon: Sparkles, tag: 'IA Generativa', title: 'Conteúdo que parece feito por uma agência', desc: 'A IA cria textos persuasivos e imagens exclusivas para cada card. Não são templates genéricos jogados numa tela. Cada conteúdo é criado do zero, pensado para o seu negócio.' },
    { icon: Palette, tag: 'Estilos Profissionais', title: 'Dezenas de estilos criados por designers profissionais', desc: 'Escolha o visual que combina com a sua marca entre estilos desenvolvidos por designers de verdade. Aplique a identidade visual do seu negócio com um clique.' },
    { icon: User, tag: 'Personalização Total', title: 'Seu rosto, seu produto, sua marca no conteúdo', desc: 'Envie sua foto, a foto do seu produto ou a logo da sua empresa e a IA integra tudo naturalmente nas imagens. O conteúdo sai com a cara do seu negócio, não de qualquer um.' },
    { icon: Zap, tag: 'Velocidade', title: 'Do tema ao conteúdo pronto em minutos', desc: 'Escolha entre o modo Flash para criar rápido ou o modo Pro para máxima qualidade visual. Você decide o ritmo, o Ellocontent entrega.' },
    { icon: AtSign, tag: 'Prompts Salvos', title: 'Sua empresa sempre na memória da IA', desc: 'Salve as informações do seu negócio uma vez e nunca mais precise explicar quem você é. Na hora de criar, é só digitar @ e selecionar o prompt que quiser usar.' },
    { icon: FolderOpen, tag: 'Galeria de Marca', title: 'Tudo da sua marca em um só lugar', desc: 'Armazene sua logo, fotos suas e imagens dos seus produtos direto na plataforma. Na hora de criar, está tudo ali, sem precisar ficar procurando arquivo em pasta nenhuma.' },
  ];

  const plans = [
    { name: 'Starter', desc: 'Ideal para quem está começando a criar conteúdo com IA.', monthly: 69.90, yearly: 49.90, credits: '50 créditos/mês', features: ['50 créditos mensais', '~7 carrosséis simples de 6 cards', '~25 posts estáticos simples', 'Modo Simples — rápido e direto', 'ElloIA Flash', 'Galeria de marca — 1GB', '3 prompts salvos', 'Templates gratuitos', 'Exportação PNG, JPG e ZIP', 'Suporte por e-mail'] },
    { name: 'Pro', desc: 'Para criadores que publicam conteúdo visual com frequência.', monthly: 129.90, yearly: 92.90, credits: '100 créditos/mês', popular: true, features: ['100 créditos mensais', '~14 carrosséis simples ou ~7 avançados', '~50 posts simples ou ~33 avançados', 'Modo Avançado — controle total', 'ElloIA Pro', 'ElloIA Pro + Rosto Pessoal', 'Carrossel contínuo panorâmico', 'Galeria de marca — 5GB', 'Prompts ilimitados', 'Compra de templates premium', 'Exportação PNG, JPG, ZIP e WebP', 'Suporte prioritário'] },
    { name: 'Growth', desc: 'Para quem produz com consistência e quer sempre o melhor resultado.', monthly: 219.90, yearly: 156.90, credits: '200 créditos/mês', features: ['200 créditos mensais', '~28 carrosséis simples ou ~15 avançados', '~100 posts simples ou ~66 avançados', 'Modo Extreme — designs virais do mercado', 'Galeria de marca — 10GB', 'Carrossel com animação (em breve)', 'Geração de fotos realistas com IA (em breve)', 'Acesso a ferramentas exclusivas', 'Suporte via chat'] },
    { name: 'Enterprise', desc: 'Para empresas, franquias e agências que precisam de escala e personalização total.', custom: true, credits: 'Volume e créditos sob medida', features: ['Créditos sob medida', 'Usuários ilimitados na conta', 'Múltiplos workspaces', 'Galeria de marca por workspace', 'Templates personalizados', 'Controle de acesso por papéis', 'Painel de gestão', 'Histórico com auditoria', 'Suporte dedicado com SLA', 'Onboarding e treinamento', 'API de integração e SSO'] },
  ];

  const faqs = [
    { q: 'Preciso saber usar design ou ter conhecimento técnico?', a: 'Não. O Ellocontent foi feito para qualquer pessoa. Você descreve o que quer falar e a IA cuida do resto: roteiro, imagens e design.' },
    { q: 'O conteúdo gerado vai ter a cara da minha empresa?', a: 'Sim. Você envia sua logo, cores, fotos e prompts da sua marca. A IA integra tudo naturalmente para que cada post tenha sua identidade.' },
    { q: 'Tem período de teste gratuito?', a: 'Você pode criar seu primeiro post gratuitamente, sem cadastrar cartão. Assim você testa a qualidade antes de assinar.' },
    { q: 'Meus créditos acumulam se eu não usar?', a: 'Os créditos mensais são renovados todo mês. Créditos extras comprados avulsos têm validade estendida.' },
    { q: 'Funciona para qualquer nicho?', a: 'Sim. Estética, advocacia, gastronomia, imobiliária, infoprodutos, varejo — a IA se adapta ao seu segmento.' },
    { q: 'É diferente do Canva e do ChatGPT?', a: 'Sim. O Canva exige que você desenhe. O ChatGPT só dá texto. O Ellocontent entrega o post pronto: texto + design + imagem com a cara da sua marca.' },
    { q: 'Funciona no celular?', a: 'Sim. A plataforma é totalmente responsiva e otimizada para criar posts direto do celular.' },
    { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem fidelidade, sem multa. Cancele a qualquer momento direto no painel.' },
  ];

  const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full" style={{ border: `1px solid ${HAIRLINE_STRONG}`, backgroundColor: 'rgba(139,92,246,0.08)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PURPLE }} />
      <span className="text-[11px] uppercase tracking-[0.18em] font-medium" style={{ color: PURPLE }}>{children}</span>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: INK, fontFamily: FONT_STACK, WebkitFontSmoothing: 'antialiased' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(10,10,15,0.7)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: `1px solid ${HAIRLINE}` }}>
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <img src={ellocontentLogo} alt="ellocontent" className="h-5" />
            <div className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: 'rgba(245,245,247,0.7)' }}>
              <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
              <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
              <a href="#planos" className="hover:text-white transition-colors">Planos</a>
              <a href="#faq" className="hover:text-white transition-colors">Dúvidas</a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/auth')} className="text-[13px] px-3 py-1.5 transition-opacity hover:opacity-100" style={{ color: 'rgba(245,245,247,0.7)' }}>Login</button>
            <button onClick={goCreate} className="text-[13px] font-medium px-4 py-1.5 rounded-full text-white transition-all hover:scale-[1.02]" style={{ background: `linear-gradient(180deg, ${PURPLE} 0%, ${PURPLE_DEEP} 100%)`, boxShadow: '0 4px 16px -4px rgba(139,92,246,0.5)' }}>
              Começar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Purple ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 800px 500px at 50% -10%, rgba(139,92,246,0.18), transparent 70%)' }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)' }} />

        <div className="relative max-w-[1100px] mx-auto px-6 pt-20 md:pt-28 pb-24 md:pb-32 text-center">

          <motion.h1 {...fadeUp} transition={{ duration: 0.8, delay: 0.05 }} className="font-semibold tracking-tight" style={{ color: '#fff', fontSize: 'clamp(40px, 7vw, 84px)', lineHeight: 1.02, letterSpacing: '-0.03em' }}>
            Da ideia ao conteúdo<br />
            pronto em <span style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, #C4B5FD 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>minutos.</span>
          </motion.h1>

          <motion.p {...fadeUp} transition={{ duration: 0.8, delay: 0.15 }} className="mt-7 mx-auto" style={{ fontSize: 'clamp(17px, 1.5vw, 21px)', lineHeight: 1.5, color: INK_SOFT, maxWidth: 620 }}>
            Crie conteúdos que as pessoas param pra ver. Sem designer, sem agência e sem gastar seu dia nisso. Feito para qualquer negócio e qualquer nicho.
          </motion.p>

          <motion.div {...fadeUp} transition={{ duration: 0.8, delay: 0.25 }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={goCreate} className="text-white text-[15px] font-medium px-7 py-3.5 rounded-full transition-all hover:scale-[1.02]" style={{ background: `linear-gradient(180deg, ${PURPLE} 0%, ${PURPLE_DEEP} 100%)`, boxShadow: '0 8px 24px -8px rgba(139,92,246,0.55)' }}>
              Criar post grátis
            </button>
            <button onClick={goPlans} className="text-[15px] font-medium px-6 py-3.5 rounded-full transition-colors" style={{ color: INK, border: `1px solid ${HAIRLINE_STRONG}` }}>
              Ver planos
            </button>
          </motion.div>
          <motion.p {...fadeUp} transition={{ duration: 0.8, delay: 0.3 }} className="mt-5 text-[12px]" style={{ color: INK_DIM }}>
            Sem precisar cadastrar cartão
          </motion.p>

          {/* Prova social */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[12.5px]"
            style={{ color: INK_DIM }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: PURPLE }} />
              <span><span className="text-white font-semibold">+2.500</span> criadores ativos</span>
            </div>
            <div className="w-px h-4" style={{ backgroundColor: HAIRLINE_STRONG }} />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: PURPLE }} />
              <span><span className="text-white font-semibold">+180 mil</span> posts gerados</span>
            </div>
            <div className="w-px h-4" style={{ backgroundColor: HAIRLINE_STRONG }} />
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: '#FBBF24' }} />
              ))}
              <span className="ml-1"><span className="text-white font-semibold">4.9</span>/5 avaliação</span>
            </div>
          </motion.div>


          {/* Hero visual — live marquee of real recent posts */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 md:mt-24 relative"
          >
            {/* Ambient purple glow behind marquee */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[80%] pointer-events-none" style={{ background: 'radial-gradient(ellipse 900px 300px at 50% 50%, rgba(139,92,246,0.28), transparent 70%)' }} />

            {/* Live badge */}
            <div className="relative flex justify-center mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md" style={{ background: 'rgba(20,15,30,0.7)', border: `1px solid rgba(196,181,253,0.35)` }}>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: PURPLE }} />
                  <span className="relative inline-flex w-2 h-2 rounded-full" style={{ backgroundColor: PURPLE_GLOW, boxShadow: `0 0 10px ${PURPLE}` }} />
                </span>
                <span className="text-[11px] font-medium tracking-wide" style={{ color: '#fff' }}>Feito ao vivo por criadores agora</span>
              </div>
            </div>

            {/* Marquee row 1 — left */}
            <div
              className="relative overflow-hidden py-3"
              style={{
                maskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
              }}
            >
              <div className="flex gap-5 marquee-track-left" style={{ width: 'max-content' }}>
                {(() => {
                  const pool = recentPosts.length ? recentPosts : Array.from({ length: 10 }).map((_, i) => ({ id: `ph1-${i}`, title: '', cover_url: '' }));
                  const doubled = [...pool, ...pool];
                  return doubled.map((p, i) => (
                    <div
                      key={`r1-${p.id}-${i}`}
                      className="shrink-0 rounded-2xl overflow-hidden relative"
                      style={{
                        width: 220,
                        aspectRatio: '4/5',
                        border: `1px solid ${HAIRLINE_STRONG}`,
                        boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1) inset',
                        background: `linear-gradient(135deg, #1a1424 0%, #0f0a18 100%)`,
                      }}
                    >
                      {p.cover_url ? (
                        <img src={p.cover_url} alt={p.title || ''} className="w-full h-full object-cover" loading="lazy" />
                      ) : null}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Marquee row 2 — right (reverse) */}
            <div
              className="relative overflow-hidden py-3 mt-2"
              style={{
                maskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
              }}
            >
              <div className="flex gap-5 marquee-track-right" style={{ width: 'max-content' }}>
                {(() => {
                  const pool = recentPosts.length ? [...recentPosts].reverse() : Array.from({ length: 10 }).map((_, i) => ({ id: `ph2-${i}`, title: '', cover_url: '' }));
                  const doubled = [...pool, ...pool];
                  return doubled.map((p, i) => (
                    <div
                      key={`r2-${p.id}-${i}`}
                      className="shrink-0 rounded-2xl overflow-hidden relative"
                      style={{
                        width: 200,
                        aspectRatio: '1/1',
                        border: `1px solid ${HAIRLINE_STRONG}`,
                        boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1) inset',
                        background: `linear-gradient(135deg, #1a1424 0%, #0f0a18 100%)`,
                      }}
                    >
                      {p.cover_url ? (
                        <img src={p.cover_url} alt={p.title || ''} className="w-full h-full object-cover" loading="lazy" />
                      ) : null}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* CSS keyframes for marquees */}
            <style>{`
              @keyframes marqueeLeft { from { transform: translateX(0); } to { transform: translateX(-50%); } }
              @keyframes marqueeRight { from { transform: translateX(-50%); } to { transform: translateX(0); } }
              .marquee-track-left  { animation: marqueeLeft 60s linear infinite; }
              .marquee-track-right { animation: marqueeRight 75s linear infinite; }
              @media (prefers-reduced-motion: reduce) {
                .marquee-track-left, .marquee-track-right { animation: none; }
              }
            `}</style>
          </motion.div>
        </div>
      </section>

      {/* Pain points */}
      <section className="py-24 md:py-32" style={{ backgroundColor: BG_SOFT, borderTop: `1px solid ${HAIRLINE}` }}>
        <div className="max-w-[1000px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-14">
            <Eyebrow>Você se identifica?</Eyebrow>
            <h2 className="font-semibold tracking-tight mx-auto" style={{ color: '#fff', fontSize: 'clamp(28px, 4.5vw, 48px)', lineHeight: 1.08, letterSpacing: '-0.025em', maxWidth: 760 }}>
              Se você se identificar com alguma dessas situações,{' '}
              <span style={{ color: INK_SOFT }}>o Ellocontent foi feito para você.</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-3">
            {painPoints.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className="p-5 rounded-2xl text-[14.5px] leading-relaxed transition-colors"
                style={{ backgroundColor: SURFACE, border: `1px solid ${HAIRLINE}`, color: 'rgba(245,245,247,0.78)' }}
              >
                {p}
              </motion.div>
            ))}
          </div>
          <motion.p {...fadeUp} className="text-center mt-14 text-[20px] italic" style={{ color: PURPLE, fontWeight: 400 }}>
            Quanto isso custa pra você?
          </motion.p>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 md:py-36 relative overflow-hidden" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 700px 300px at 50% 0%, rgba(139,92,246,0.10), transparent 70%)' }} />
        <div className="relative max-w-[1100px] mx-auto px-6">
          <div className="text-center max-w-[820px] mx-auto mb-16">
            <Eyebrow>Como funciona</Eyebrow>
            <motion.h2 {...fadeUp} className="font-semibold tracking-tight mb-6" style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              Simples assim.
            </motion.h2>
            <motion.p {...fadeUp} className="leading-relaxed" style={{ fontSize: 'clamp(16px, 1.4vw, 19px)', color: INK_SOFT }}>
              Você digita o que quer falar. A IA entende, cria o roteiro, gera as imagens e monta o design. Em poucos cliques, um conteúdo pronto para postar — <span style={{ color: INK }}>100% editável</span>.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: '01', t: 'Descreva o tema', d: 'Fale sobre o que você quer postar. Uma ideia, um lançamento, uma dica. A IA entende o contexto do seu negócio.' },
              { n: '02', t: 'Escolha o estilo', d: 'Selecione um visual profissional criado por designers de verdade. Sua marca, suas cores, seu rosto se quiser.' },
              { n: '03', t: 'Publique em minutos', d: 'Recebe o conteúdo pronto — texto e imagem — e ajusta o que quiser. Baixa e posta direto nas suas redes.' },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="relative p-8 rounded-3xl overflow-hidden"
                style={{
                  background: `linear-gradient(180deg, rgba(139,92,246,0.06) 0%, ${SURFACE} 100%)`,
                  border: `1px solid ${HAIRLINE}`,
                }}
              >
                <div className="absolute -top-6 -right-4 text-[120px] font-bold leading-none select-none" style={{ color: 'rgba(139,92,246,0.08)', letterSpacing: '-0.05em' }}>{s.n}</div>
                <div className="relative">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: PURPLE }}>Passo {s.n}</div>
                  <h3 className="text-[22px] font-semibold mb-3 tracking-tight" style={{ color: '#fff', letterSpacing: '-0.015em' }}>{s.t}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: INK_SOFT }}>{s.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-24 md:py-32" style={{ backgroundColor: BG_SOFT, borderTop: `1px solid ${HAIRLINE}` }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-14">
            <Eyebrow>Recursos</Eyebrow>
            <h2 className="font-semibold tracking-tight" style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              O que o Ellocontent te entrega.
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.06 }}
                  className="group p-7 rounded-3xl transition-all"
                  style={{ backgroundColor: SURFACE, border: `1px solid ${HAIRLINE}` }}
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-6" style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.05))`, border: `1px solid rgba(139,92,246,0.25)` }}>
                    <Icon className="w-5 h-5" style={{ color: PURPLE }} />
                  </div>
                  <p className="text-[10.5px] uppercase tracking-[0.15em] mb-2" style={{ color: PURPLE, fontWeight: 600 }}>{f.tag}</p>
                  <h3 className="text-[19px] font-semibold mb-3 leading-tight tracking-tight" style={{ color: '#fff', letterSpacing: '-0.01em' }}>{f.title}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: INK_SOFT }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Galeria — estilos reais do marketplace */}
      <section className="py-24 md:py-32" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-14">
            <Eyebrow>Galeria</Eyebrow>
            <h2 className="font-semibold tracking-tight" style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              Veja o que é possível criar.
            </h2>
            <p className="mt-4 mx-auto text-[15px]" style={{ color: INK_SOFT, maxWidth: 560 }}>
              Estilos profissionais que sua marca pode usar — criados por designers reais.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(showcaseStyles.length ? showcaseStyles : Array.from({ length: 6 }).map(() => null)).map((style, i) => (
              <motion.button
                key={style?.id || i}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                onClick={() => style?.id ? navigate(`/marketplace/${style.id}`) : goCreate()}
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden transition-all hover:scale-[1.02] cursor-pointer text-left"
                style={{ background: `linear-gradient(135deg, ${BG_SOFT} 0%, #14101c 100%)`, border: `1px solid ${HAIRLINE}` }}
              >
                {style?.preview_images?.[0] ? (
                  <>
                    <img src={style.preview_images[0]} alt={style.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: PURPLE_GLOW }}>{style.category}</p>
                      <p className="text-[13px] font-semibold text-white truncate">{style.name}</p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[12px]" style={{ color: INK_DIM }}>
                    Exemplo de conteúdo
                  </div>
                )}
              </motion.button>
            ))}
          </div>
          <motion.div {...fadeUp} className="mt-10 flex justify-center">
            <button onClick={goCreate} className="text-[14px] font-medium px-6 py-3 rounded-full transition-all hover:scale-[1.02]" style={{ background: `linear-gradient(180deg, ${PURPLE} 0%, ${PURPLE_DEEP} 100%)`, color: '#fff', boxShadow: '0 6px 20px -6px rgba(139,92,246,0.5)' }}>
              Criar com um desses estilos
            </button>
          </motion.div>
        </div>
      </section>


      {/* Preço por post — âncora barata */}
      <section id="planos" className="py-24 md:py-32 relative overflow-hidden" style={{ backgroundColor: BG_SOFT, borderTop: `1px solid ${HAIRLINE}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 700px 400px at 50% 0%, rgba(139,92,246,0.14), transparent 70%)' }} />
        <div className="relative max-w-[1100px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-14">
            <Eyebrow>Menos que um café</Eyebrow>
            <h2 className="font-semibold tracking-tight mb-5" style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              A partir de{' '}
              <span style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_GLOW} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                R$ 1,00 por post.
              </span>
            </h2>
            <p className="mx-auto text-[16px]" style={{ color: INK_SOFT, maxWidth: 620 }}>
              Sem contratar designer, sem pagar agência. Um post pronto pelo preço de um pão na padaria.
            </p>
          </motion.div>

          {/* Comparador emocional */}
          <motion.div {...fadeUp} className="mx-auto mb-12 flex flex-wrap items-center justify-center gap-3 text-[13.5px]" style={{ color: INK_SOFT }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: SURFACE, border: `1px solid ${HAIRLINE}` }}>
              <span className="line-through opacity-60">Designer freelancer</span>
              <span className="font-semibold text-white">R$ 80–200 / post</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: SURFACE, border: `1px solid ${HAIRLINE}` }}>
              <span className="line-through opacity-60">Agência</span>
              <span className="font-semibold text-white">R$ 2.000+ / mês</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', border: `1px solid rgba(139,92,246,0.45)` }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: PURPLE_GLOW }} />
              <span className="font-semibold" style={{ color: '#fff' }}>Ellocontent</span>
              <span className="font-semibold" style={{ color: PURPLE_GLOW }}>a partir de R$ 1 / post</span>
            </div>
          </motion.div>

          {/* Cards por tipo de post */}
          <div className="grid md:grid-cols-3 gap-4 max-w-[980px] mx-auto">
            {[
              {
                tag: 'Post simples',
                price: '1,00',
                unit: 'por post',
                desc: 'Post estático pronto para publicar. Texto + design + imagem.',
                icon: Sparkles,
                popular: false,
              },
              {
                tag: 'Post avançado',
                price: '2,00',
                unit: 'por post',
                desc: 'Com seu rosto, seu produto ou sua logo. Total controle da marca.',
                icon: User,
                popular: true,
              },
              {
                tag: 'Carrossel completo',
                price: '~7,00',
                unit: '6 cards',
                desc: 'Carrossel narrativo de até 6 cards com capa, desenvolvimento e CTA.',
                icon: Palette,
                popular: false,
              },
            ].map((item, i) => {
              const Ic = item.icon;
              return (
                <motion.div
                  key={item.tag}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="relative p-7 rounded-3xl"
                  style={{
                    background: item.popular
                      ? `linear-gradient(180deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.03) 100%)`
                      : SURFACE,
                    border: `1px solid ${item.popular ? 'rgba(139,92,246,0.45)' : HAIRLINE}`,
                    boxShadow: item.popular ? '0 24px 60px -20px rgba(139,92,246,0.4)' : 'none',
                  }}
                >
                  {item.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white" style={{ background: `linear-gradient(180deg, ${PURPLE} 0%, ${PURPLE_DEEP} 100%)`, boxShadow: '0 4px 12px -2px rgba(139,92,246,0.5)' }}>
                      Mais escolhido
                    </div>
                  )}
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5" style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.05))`, border: `1px solid rgba(139,92,246,0.25)` }}>
                    <Ic className="w-5 h-5" style={{ color: PURPLE }} />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: PURPLE }}>{item.tag}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[16px] font-medium" style={{ color: INK_DIM }}>R$</span>
                    <span className="font-semibold tracking-tight" style={{ color: '#fff', fontSize: 56, lineHeight: 1, letterSpacing: '-0.03em' }}>{item.price}</span>
                  </div>
                  <p className="text-[12px] mb-5" style={{ color: INK_DIM }}>{item.unit}</p>
                  <p className="text-[14px] leading-relaxed" style={{ color: INK_SOFT }}>{item.desc}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div {...fadeUp} className="mt-12 flex flex-col items-center gap-3">
            <button onClick={goCreate} className="text-white text-[15px] font-medium px-7 py-3.5 rounded-full transition-all hover:scale-[1.02]" style={{ background: `linear-gradient(180deg, ${PURPLE} 0%, ${PURPLE_DEEP} 100%)`, boxShadow: '0 8px 24px -8px rgba(139,92,246,0.55)' }}>
              Criar meu primeiro post grátis
            </button>
            <button onClick={goPlans} className="text-[13px] transition-colors hover:text-white" style={{ color: INK_DIM }}>
              Ver planos com desconto por volume →
            </button>
            <p className="text-[11.5px] mt-1" style={{ color: INK_DIM }}>
              Preços aproximados baseados nos planos mensais · sem fidelidade · cancele quando quiser
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <div className="max-w-[760px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-12">
            <Eyebrow>Dúvidas</Eyebrow>
            <h2 className="font-semibold tracking-tight" style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              Ficou alguma dúvida?
            </h2>
          </motion.div>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${HAIRLINE}` }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors hover:bg-white/[0.02]"
                >
                  <span className="text-[15px] font-medium pr-4">{f.q}</span>
                  {openFaq === i ? <Minus className="w-4 h-4 shrink-0" style={{ color: PURPLE }} /> : <Plus className="w-4 h-4 shrink-0" style={{ color: INK_DIM }} />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-[14px] leading-relaxed" style={{ color: INK_SOFT }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative py-28 md:py-40 overflow-hidden" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 600px 400px at 50% 100%, rgba(139,92,246,0.18), transparent 70%)' }} />
        <div className="relative max-w-[820px] mx-auto px-6 text-center">
          <motion.h2 {...fadeUp} className="font-semibold tracking-tight" style={{ color: '#fff', fontSize: 'clamp(36px, 5.5vw, 64px)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
            Pronto para criar conteúdo<br />
            <span style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, #C4B5FD 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>que gera resultado?</span>
          </motion.h2>
          <motion.p {...fadeUp} className="mt-6 mx-auto" style={{ fontSize: 'clamp(17px, 1.5vw, 20px)', color: INK_SOFT, maxWidth: 580 }}>
            Comece agora, gere seu primeiro post gratuitamente e veja na prática o que o Ellocontent faz pelo seu negócio.
          </motion.p>
          <motion.div {...fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={goCreate} className="text-white text-[15px] font-medium px-7 py-3.5 rounded-full transition-all hover:scale-[1.02]" style={{ background: `linear-gradient(180deg, ${PURPLE} 0%, ${PURPLE_DEEP} 100%)`, boxShadow: '0 8px 24px -8px rgba(139,92,246,0.55)' }}>
              Criar post grátis
            </button>
            <button onClick={goPlans} className="text-[15px] font-medium px-6 py-3.5 rounded-full" style={{ color: INK, border: `1px solid ${HAIRLINE_STRONG}` }}>
              Ver planos
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10" style={{ borderTop: `1px solid ${HAIRLINE}`, backgroundColor: BG_SOFT }}>
        <div className="max-w-[1100px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px]" style={{ color: INK_DIM }}>
          <div className="flex items-center gap-3">
            <img src={ellocontentLogo} alt="ellocontent" className="h-4 opacity-70" />
            <span>© 2026 Ellocontent. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos de Serviço</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
