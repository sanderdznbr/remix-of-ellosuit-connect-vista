import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import {
  Sparkles, Image, Palette, Type, UserCircle, ShoppingBag,
  Zap, Wand2, LayoutGrid, FileText, Share2, Download,
  ArrowRight, Star, ChevronRight, Lock
} from 'lucide-react';

interface MarketplacePreview {
  id: string;
  name: string;
  category: string;
  preview_images: string[];
  is_free: boolean;
  price_brl: number;
}

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Geração com IA',
    desc: 'Crie posts e carrosséis completos com texto e imagens gerados por inteligência artificial.',
    color: '#7B50DC',
  },
  {
    icon: Image,
    title: 'Imagens Únicas',
    desc: 'Cada post recebe imagens exclusivas geradas por IA, sem banco de imagens genéricos.',
    color: '#3B82F6',
  },
  {
    icon: Palette,
    title: 'Estilos do Marketplace',
    desc: 'Escolha entre dezenas de estilos profissionais criados por designers.',
    color: '#F59E0B',
  },
  {
    icon: UserCircle,
    title: 'Rosto Personalizado',
    desc: 'Envie sua foto e a IA gera imagens com seu rosto em diferentes contextos.',
    color: '#EC4899',
  },
  {
    icon: ShoppingBag,
    title: 'Produto em Destaque',
    desc: 'Adicione fotos do seu produto e a IA o integra naturalmente nas imagens.',
    color: '#10B981',
  },
  {
    icon: Type,
    title: 'Fontes & Cores',
    desc: 'Controle total sobre tipografia, paleta de cores e identidade visual.',
    color: '#8B5CF6',
  },
  {
    icon: LayoutGrid,
    title: 'Post Único ou Carrossel',
    desc: 'Crie posts individuais ou carrosséis com até 10 slides.',
    color: '#06B6D4',
  },
  {
    icon: Wand2,
    title: 'Modo Simples & Avançado',
    desc: 'Fluxo rápido para iniciantes ou controle total para profissionais.',
    color: '#F97316',
  },
  {
    icon: FileText,
    title: 'Roteiro por Card',
    desc: 'Defina o texto exato de cada card ou deixe a IA criar para você.',
    color: '#14B8A6',
  },
  {
    icon: Share2,
    title: 'Publicação Direta',
    desc: 'Publique direto no Instagram ou baixe para suas redes sociais.',
    color: '#E11D48',
  },
  {
    icon: Download,
    title: 'Export em Alta Qualidade',
    desc: 'Baixe seus posts em resolução 1080x1350 prontos para publicação.',
    color: '#6366F1',
  },
  {
    icon: Zap,
    title: 'Geração Rápida',
    desc: 'Posts prontos em segundos com o modo Flash ou máxima qualidade com o modo Pro.',
    color: '#EAB308',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const Recursos: React.FC = () => {
  const navigate = useNavigate();
  const [styles, setStyles] = useState<MarketplacePreview[]>([]);

  useEffect(() => {
    const fetchStyles = async () => {
      const { data } = await supabase
        .from('marketplace_styles')
        .select('id, name, category, preview_images, is_free, price_brl')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(12);
      if (data) setStyles(data as any[]);
    };
    fetchStyles();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-5 md:px-8 py-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <div className="flex items-center gap-6 md:gap-8">
          <img
            src={ellocontentLogo}
            alt="elloContent"
            className="h-5 md:h-6 cursor-pointer"
            onClick={() => navigate('/')}
          />
          <div className="hidden md:flex items-center gap-5">
            {[
              { label: 'Preços', path: '/precos' },
              { label: 'Recursos', path: '/recursos' },
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
      <section className="relative px-5 md:px-8 pt-16 pb-20 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
            style={{ background: 'radial-gradient(circle, #7B50DC 0%, transparent 70%)' }} />
        </div>
        <motion.div
          className="relative z-10 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
            Tudo que você precisa para criar
            <span className="block" style={{ color: '#9B6BFF' }}>posts incríveis com IA</span>
          </h1>
          <p className="text-white/50 text-base md:text-lg max-w-xl mx-auto mb-8">
            Do tema ao post pronto em segundos. Explore todos os recursos do elloContent.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)', color: '#fff' }}
          >
            Criar meu primeiro post <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="px-5 md:px-8 pb-20 max-w-6xl mx-auto w-full">
        <motion.h2
          className="text-xl md:text-2xl font-bold text-white mb-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Recursos poderosos
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all group"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${f.color}20` }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Marketplace Styles Preview */}
      {styles.length > 0 && (
        <section className="px-5 md:px-8 pb-24 max-w-6xl mx-auto w-full">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              Estilos do Marketplace
            </h2>
            <p className="text-white/40 text-sm">
              Escolha entre estilos profissionais para seu conteúdo
            </p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {styles.map((style, i) => (
              <motion.div
                key={style.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                onClick={() => navigate(`/marketplace/${style.id}`)}
                className="rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer group relative"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                {/* Cover image */}
                <div className="aspect-[16/9] overflow-hidden">
                  {style.preview_images?.[0] ? (
                    <img
                      src={style.preview_images[0]}
                      alt={style.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a24' }}>
                      <Palette className="w-8 h-8 text-white/10" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-white text-xs font-semibold">{style.name}</h3>
                    <p className="text-white/30 text-[10px] capitalize">{style.category}</p>
                  </div>
                  {style.is_free ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
                      Grátis
                    </span>
                  ) : (
                    <span className="text-white/30 text-[10px] font-medium">
                      R$ {style.price_brl?.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Bottom */}
      <section className="px-5 md:px-8 pb-20">
        <motion.div
          className="max-w-2xl mx-auto text-center rounded-3xl p-8 md:p-12 border border-white/[0.06]"
          style={{ background: 'linear-gradient(135deg, rgba(123,80,220,0.1) 0%, rgba(10,10,15,1) 100%)' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Star className="w-8 h-8 mx-auto mb-4" style={{ color: '#9B6BFF' }} />
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            Pronto para criar?
          </h2>
          <p className="text-white/40 text-sm mb-6">
            Comece grátis agora mesmo. Sem cartão de crédito.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)', color: '#fff' }}
            >
              Criar post grátis
            </button>
            <button
              onClick={() => navigate('/precos')}
              className="px-6 py-3 rounded-xl text-sm font-medium border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all cursor-pointer"
            >
              Ver planos <ChevronRight className="w-4 h-4 inline" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-5 md:px-8 py-6 border-t border-white/[0.04] text-center">
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} elloContent. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};

export default Recursos;
