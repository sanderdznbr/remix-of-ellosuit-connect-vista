import React, { useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import { ArrowRight, ChevronRight, Star } from 'lucide-react';
import '@/styles/carousel-loader.css';

// Preview images from assets
import suiteAnalytics from '@/assets/previews/suite-analytics.jpg';
import suiteContratos from '@/assets/previews/suite-contratos.jpg';
import suiteDrive from '@/assets/previews/suite-drive.jpg';
import suiteEquipe from '@/assets/previews/suite-equipe.jpg';
import suitePropostas from '@/assets/previews/suite-propostas.jpg';
import suiteHabitos from '@/assets/previews/suite-habitos.jpg';
import omniAgentesIa from '@/assets/previews/omni-agentes-ia.jpg';
import omniChatbot from '@/assets/previews/omni-chatbot.jpg';
import omniCrmWhatsapp from '@/assets/previews/omni-crm-whatsapp.jpg';
import omniDisparos from '@/assets/previews/omni-disparos.jpg';
import omniAutomacoes from '@/assets/previews/omni-automacoes.jpg';
import omniApiWhatsapp from '@/assets/previews/omni-api-whatsapp.jpg';
import flowAgenda from '@/assets/previews/flow-agenda.jpg';
import flowTasks from '@/assets/previews/flow-tasks.jpg';
import flowFluxos from '@/assets/previews/flow-fluxos.jpg';
import flowReunioes from '@/assets/previews/flow-reunioes.jpg';
import trackLeads from '@/assets/previews/track-leads.jpg';
import trackRastreamento from '@/assets/previews/track-rastreamento.jpg';

// ---- Data ----
const SHOWCASE_SECTIONS = [
  {
    tag: 'IA Generativa',
    title: 'Posts que parecem feitos por uma agência',
    desc: 'A IA cria textos persuasivos e imagens exclusivas para cada card. Sem templates genéricos — cada post é único.',
    images: [suiteAnalytics, omniAgentesIa, suiteContratos],
  },
  {
    tag: 'Estilos Profissionais',
    title: 'Marketplace com dezenas de estilos',
    desc: 'Escolha entre estilos criados por designers profissionais. Aplique a identidade visual da sua marca com um clique.',
    images: [omniChatbot, omniCrmWhatsapp, omniDisparos],
  },
  {
    tag: 'Personalização Total',
    title: 'Seu rosto, seu produto, sua marca',
    desc: 'Envie sua foto ou produto e a IA integra naturalmente nas imagens. Fontes, cores e logo — tudo configurável.',
    images: [suiteEquipe, suitePropostas, suiteDrive],
  },
  {
    tag: 'Produtividade',
    title: 'Do tema ao post pronto em segundos',
    desc: 'Modo Flash para velocidade ou modo Pro para máxima qualidade. Publique direto no Instagram ou exporte em alta resolução.',
    images: [flowAgenda, flowTasks, flowFluxos],
  },
];

const FEATURES_QUICK = [
  { title: 'Post Único ou Carrossel', desc: 'Até 10 slides por carrossel' },
  { title: 'Modo Simples & Avançado', desc: 'Rápido para iniciantes, completo para pros' },
  { title: 'Roteiro por Card', desc: 'Defina textos ou deixe a IA criar' },
  { title: 'Publicação Direta', desc: 'Instagram e download em HD' },
  { title: 'Resolução 1080×1350', desc: 'Formato ideal para feed' },
  { title: 'Geração Rápida', desc: 'Posts prontos em segundos' },
];

// ---- Components ----

function ParallaxImage({ src, alt, index }: { src: string; alt: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const rotate = useTransform(scrollYProgress, [0, 1], [index % 2 === 0 ? 2 : -2, index % 2 === 0 ? -1 : 1]);

  return (
    <motion.div
      ref={ref}
      style={{ y, rotate }}
      className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/[0.08] group"
    >
      <div className="aspect-[1080/1350] overflow-hidden">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

function ShowcaseRow({ section, index }: { section: typeof SHOWCASE_SECTIONS[0]; index: number }) {
  const isReversed = index % 2 === 1;

  return (
    <RevealSection className="py-16 md:py-24">
      <div className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} gap-10 md:gap-16 items-center`}>
        {/* Text */}
        <div className="flex-1 space-y-4">
          <span
            className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(123,80,220,0.15)', color: '#9B6BFF' }}
          >
            {section.tag}
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">{section.title}</h2>
          <p className="text-white/45 text-sm md:text-base leading-relaxed max-w-lg">{section.desc}</p>
        </div>

        {/* Images — 3 stacked cards with parallax */}
        <div className="flex-1 relative flex gap-3 md:gap-4 justify-center">
          {section.images.map((img, i) => (
            <div key={i} className="w-[30%] max-w-[200px]" style={{ marginTop: i === 1 ? '2rem' : '0' }}>
              <ParallaxImage src={img} alt={`${section.tag} preview ${i + 1}`} index={i} />
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

function FloatingGallery() {
  const images = [omniAutomacoes, omniApiWhatsapp, flowReunioes, trackLeads, trackRastreamento, suiteHabitos];
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);

  return (
    <RevealSection className="py-16 md:py-24 overflow-hidden">
      <div className="text-center mb-12">
        <span
          className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
          style={{ backgroundColor: 'rgba(123,80,220,0.15)', color: '#9B6BFF' }}
        >
          Galeria
        </span>
        <h2 className="text-2xl md:text-4xl font-bold text-white">Veja o que é possível criar</h2>
      </div>
      <div ref={containerRef} className="relative">
        <motion.div style={{ x }} className="flex gap-4 md:gap-6 w-max pl-8">
          {images.map((img, i) => (
            <motion.div
              key={i}
              className="w-[220px] md:w-[280px] rounded-2xl overflow-hidden border border-white/[0.06] shrink-0 group"
              whileHover={{ scale: 1.04, y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="aspect-[1080/1350] overflow-hidden">
                <img
                  src={img}
                  alt={`Galeria ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </RevealSection>
  );
}

// ---- Main ----
const Recursos: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Orb animation */}
      <div className="absolute top-[-300px] left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <div className="carousel-loader-wrapper" style={{ width: 'clamp(500px, 80vw, 1200px)', height: 'clamp(500px, 80vw, 1200px)', opacity: 0.5 }}>
          <div className="carousel-loader-spinner" />
        </div>
      </div>

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-5 md:px-8 py-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <div className="flex items-center gap-6 md:gap-8">
          <Link to="/">
            <img src={ellocontentLogo} alt="elloContent" className="h-5 md:h-6 cursor-pointer" />
          </Link>
          <div className="hidden md:flex items-center gap-5">
            {[
              { label: 'Preços', path: '/precos' },
              { label: 'Recursos', path: '/recursos' },
              { label: 'Suporte', path: '/suporte' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  item.path === '/recursos' ? 'text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/auth')} className="text-white/60 hover:text-white text-sm font-medium transition-colors cursor-pointer px-3 py-1.5">
            Login
          </button>
          <button onClick={() => navigate('/register')} className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ backgroundColor: '#7B50DC', color: '#fff' }}>
            Começar grátis
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-5 md:px-8 pt-24 md:pt-32 pb-16 text-center">
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.span
            className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-6"
            style={{ backgroundColor: 'rgba(123,80,220,0.15)', color: '#9B6BFF' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Recursos
          </motion.span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-[1.1] mb-5 tracking-tight">
            Crie conteúdo que
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #9B6BFF 0%, #D946EF 50%, #7B50DC 100%)' }}>
              para o scroll
            </span>
          </h1>
          <p className="text-white/40 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            IA que gera posts e carrosséis completos — texto, imagens e design — em segundos. Explore tudo que o elloContent pode fazer.
          </p>
          <motion.button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)', color: '#fff', boxShadow: '0 8px 32px rgba(123,80,220,0.35)' }}
            whileHover={{ scale: 1.04, boxShadow: '0 12px 40px rgba(123,80,220,0.5)' }}
            whileTap={{ scale: 0.97 }}
          >
            Experimentar agora <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </section>

      {/* Showcase Sections */}
      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8">
        {SHOWCASE_SECTIONS.map((section, i) => (
          <ShowcaseRow key={section.tag} section={section} index={i} />
        ))}
      </div>

      {/* Floating Gallery */}
      <FloatingGallery />

      {/* Quick Features Grid */}
      <RevealSection className="relative z-10 max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">E muito mais</h2>
          <p className="text-white/35 text-sm">Tudo pensado para produtividade máxima</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES_QUICK.map((f, i) => (
            <motion.div
              key={f.title}
              className="rounded-2xl p-5 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-300 group"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -4, backgroundColor: 'rgba(123,80,220,0.06)' }}
            >
              <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-purple-300 transition-colors">{f.title}</h3>
              <p className="text-white/35 text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </RevealSection>

      {/* CTA Bottom */}
      <RevealSection className="relative z-10 px-5 md:px-8 pb-24">
        <div
          className="max-w-2xl mx-auto text-center rounded-3xl p-10 md:p-14 border border-white/[0.08] relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, rgba(123,80,220,0.12) 0%, rgba(10,10,15,0.95) 60%)' }}
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #9B6BFF, transparent)' }} />
          <Star className="w-8 h-8 mx-auto mb-5" style={{ color: '#9B6BFF' }} />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Pronto para criar?
          </h2>
          <p className="text-white/40 text-sm mb-8 max-w-md mx-auto">
            Comece grátis agora mesmo. Sem cartão de crédito, sem compromisso.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              onClick={() => navigate('/')}
              className="px-7 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)', color: '#fff', boxShadow: '0 8px 32px rgba(123,80,220,0.3)' }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              Criar post grátis
            </motion.button>
            <button
              onClick={() => navigate('/precos')}
              className="px-6 py-3 rounded-2xl text-sm font-medium border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all cursor-pointer"
            >
              Ver planos <ChevronRight className="w-4 h-4 inline" />
            </button>
          </div>
        </div>
      </RevealSection>

      {/* Footer */}
      <footer className="relative z-10 px-5 md:px-8 py-6 border-t border-white/[0.04] text-center">
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} elloContent. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};

export default Recursos;
