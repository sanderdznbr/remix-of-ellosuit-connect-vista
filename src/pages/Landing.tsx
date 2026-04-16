import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Minus, Sparkles, Palette, User, Zap, AtSign, FolderOpen, Check } from 'lucide-react';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as any },
};

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const goCreate = () => navigate('/gerador-de-carrosseis');
  const goPlans = () => navigate('/precos');

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

  // Apple-like type system
  const FONT_STACK = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const INK = '#1d1d1f';
  const INK_SOFT = '#86868b';
  const HAIRLINE = 'rgba(0,0,0,0.08)';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fbfbfd', color: INK, fontFamily: FONT_STACK, WebkitFontSmoothing: 'antialiased' }}>
      {/* Nav — Apple translucent */}
      <nav className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(251,251,253,0.72)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: `1px solid ${HAIRLINE}` }}>
        <div className="max-w-[980px] mx-auto px-6 h-12 flex items-center justify-between">
          <img src={ellocontentLogo} alt="ellocontent" className="h-4" style={{ filter: 'invert(1) brightness(0.1)' }} />
          <div className="hidden md:flex items-center gap-8 text-[12px]" style={{ color: INK }}>
            <a href="#recursos" className="opacity-80 hover:opacity-100 transition-opacity">Recursos</a>
            <a href="#como-funciona" className="opacity-80 hover:opacity-100 transition-opacity">Como funciona</a>
            <a href="#planos" className="opacity-80 hover:opacity-100 transition-opacity">Planos</a>
            <a href="#faq" className="opacity-80 hover:opacity-100 transition-opacity">Dúvidas</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth')} className="text-[12px] opacity-80 hover:opacity-100 transition-opacity">Login</button>
            <button onClick={goCreate} className="text-[12px] font-medium px-4 py-1.5 rounded-full text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: INK }}>Começar</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-[1100px] mx-auto px-6 pt-20 md:pt-32 pb-24 md:pb-40 text-center">
          <motion.h1
            {...fadeUp}
            className="font-semibold tracking-tight"
            style={{ fontSize: 'clamp(40px, 7vw, 80px)', lineHeight: 1.05, letterSpacing: '-0.025em', color: INK }}
          >
            Da ideia ao conteúdo pronto<br className="hidden md:block" />{' '}
            <span style={{ color: INK_SOFT }}>em minutos.</span>
            <br />
            <span style={{ color: INK_SOFT, fontSize: '0.5em', fontWeight: 400, letterSpacing: '-0.01em' }}>Tão fácil que parece até mágica.</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-8 mx-auto"
            style={{ fontSize: 'clamp(17px, 1.5vw, 21px)', lineHeight: 1.5, color: INK_SOFT, maxWidth: 640, fontWeight: 400 }}
          >
            Crie conteúdos que as pessoas param pra ver. Sem designer, sem agência e sem gastar seu dia nisso. Feito para qualquer negócio e qualquer nicho.
          </motion.p>

          <motion.div {...fadeUp} transition={{ duration: 0.8, delay: 0.2 }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={goCreate} className="text-white text-[15px] font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.02]" style={{ backgroundColor: '#0071e3' }}>
              Criar post grátis
            </button>
            <button onClick={goPlans} className="text-[15px] font-medium px-1 py-3 transition-opacity hover:opacity-70" style={{ color: '#0071e3' }}>
              Ver planos ›
            </button>
          </motion.div>
          <motion.p {...fadeUp} transition={{ duration: 0.8, delay: 0.3 }} className="mt-5 text-[12px]" style={{ color: INK_SOFT }}>
            Sem precisar cadastrar cartão
          </motion.p>

          {/* Hero visual mock */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 mx-auto rounded-[28px] overflow-hidden relative"
            style={{ maxWidth: 980, aspectRatio: '16/9', background: 'linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.15)' }}
          >
            <div className="absolute inset-0 flex items-center justify-center" style={{ color: INK_SOFT, fontSize: 13 }}>
              Pré-visualização do app
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pain points */}
      <section className="py-24 md:py-32" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-[980px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <p className="text-[12px] uppercase tracking-[0.15em] mb-5" style={{ color: '#0071e3', fontWeight: 600 }}>Você se identifica?</p>
            <h2 className="font-semibold tracking-tight mx-auto" style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', lineHeight: 1.1, letterSpacing: '-0.02em', maxWidth: 760 }}>
              Se você se identificar com alguma dessas situações,{' '}
              <span style={{ color: INK_SOFT }}>o Ellocontent foi feito para você.</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-3">
            {painPoints.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className="p-6 rounded-2xl text-[15px] leading-relaxed"
                style={{ backgroundColor: '#f5f5f7', color: INK }}
              >
                {p}
              </motion.div>
            ))}
          </div>
          <motion.p {...fadeUp} className="text-center mt-14 text-[20px]" style={{ color: INK_SOFT, fontWeight: 400 }}>
            Quanto isso custa pra você?
          </motion.p>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 md:py-36" style={{ backgroundColor: '#fbfbfd' }}>
        <div className="max-w-[820px] mx-auto px-6 text-center">
          <motion.p {...fadeUp} className="text-[12px] uppercase tracking-[0.15em] mb-5" style={{ color: '#0071e3', fontWeight: 600 }}>Como funciona</motion.p>
          <motion.h2 {...fadeUp} className="font-semibold tracking-tight mb-8" style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            Simples assim.
          </motion.h2>
          <motion.p {...fadeUp} className="leading-relaxed" style={{ fontSize: 'clamp(18px, 1.6vw, 22px)', color: INK_SOFT, fontWeight: 400 }}>
            Você digita o que quer falar, pode ser uma ideia, um tema ou até um texto pronto. A IA entende, cria o roteiro, gera as imagens e monta o design. Com poucos cliques você tem um conteúdo pronto para baixar e postar. Sem complicação, sem curva de aprendizado e <span style={{ color: INK }}>100% editável</span> do jeito que você quiser.
          </motion.p>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-24 md:py-32" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <p className="text-[12px] uppercase tracking-[0.15em] mb-5" style={{ color: '#0071e3', fontWeight: 600 }}>Recursos</p>
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
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
                  className="p-8 rounded-3xl"
                  style={{ backgroundColor: '#f5f5f7' }}
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <Icon className="w-5 h-5" style={{ color: '#0071e3' }} />
                  </div>
                  <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: '#0071e3', fontWeight: 600 }}>{f.tag}</p>
                  <h3 className="text-[20px] font-semibold mb-3 leading-tight tracking-tight" style={{ color: INK, letterSpacing: '-0.01em' }}>{f.title}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: INK_SOFT }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Galeria */}
      <section className="py-24 md:py-32" style={{ backgroundColor: '#fbfbfd' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <p className="text-[12px] uppercase tracking-[0.15em] mb-5" style={{ color: '#0071e3', fontWeight: 600 }}>Galeria</p>
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Veja o que é possível criar.
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="aspect-[4/5] rounded-2xl flex items-center justify-center text-[12px]"
                style={{ background: 'linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%)', color: INK_SOFT }}
              >
                Exemplo de conteúdo
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-24 md:py-32" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-[12px] uppercase tracking-[0.15em] mb-5" style={{ color: '#0071e3', fontWeight: 600 }}>Planos</p>
            <h2 className="font-semibold tracking-tight mb-8" style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Planos e Preços.
            </h2>
            <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ backgroundColor: '#f5f5f7' }}>
              <button onClick={() => setAnnual(false)} className="px-5 py-2 rounded-full text-[13px] font-medium transition-all" style={{ backgroundColor: !annual ? INK : 'transparent', color: !annual ? '#fff' : INK }}>Mensal</button>
              <button onClick={() => setAnnual(true)} className="px-5 py-2 rounded-full text-[13px] font-medium transition-all" style={{ backgroundColor: annual ? INK : 'transparent', color: annual ? '#fff' : INK }}>
                Anual <span className="opacity-70 ml-1">−29%</span>
              </button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="relative p-7 rounded-3xl flex flex-col"
                style={{
                  backgroundColor: p.popular ? INK : '#f5f5f7',
                  color: p.popular ? '#fff' : INK,
                }}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: '#0071e3', color: '#fff' }}>Mais popular</div>
                )}
                <h3 className="text-[20px] font-semibold mb-1 tracking-tight" style={{ letterSpacing: '-0.01em' }}>{p.name}</h3>
                <p className="text-[13px] mb-6 min-h-[3.2em]" style={{ color: p.popular ? 'rgba(255,255,255,0.6)' : INK_SOFT }}>{p.desc}</p>
                <div className="mb-6">
                  {p.custom ? (
                    <div className="text-[26px] font-semibold tracking-tight">Sob consulta</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-[36px] font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>R${(annual ? p.yearly! : p.monthly!).toFixed(2).replace('.', ',')}</span>
                      <span className="text-[12px]" style={{ color: p.popular ? 'rgba(255,255,255,0.5)' : INK_SOFT }}>/mês</span>
                    </div>
                  )}
                  <p className="text-[12px] mt-1" style={{ color: p.popular ? 'rgba(255,255,255,0.5)' : INK_SOFT }}>{p.credits}</p>
                </div>
                <button
                  onClick={p.custom ? () => navigate('/suporte') : goPlans}
                  className="w-full py-2.5 rounded-full text-[13px] font-medium mb-6 transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: p.popular ? '#fff' : '#0071e3',
                    color: p.popular ? INK : '#fff',
                  }}
                >
                  {p.custom ? 'Falar com vendas' : 'Assinar'}
                </button>
                <ul className="space-y-2.5 text-[13px]" style={{ color: p.popular ? 'rgba(255,255,255,0.75)' : INK }}>
                  {p.features.map((f, j) => (
                    <li key={j} className="flex gap-2">
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: p.popular ? 'rgba(255,255,255,0.5)' : '#0071e3' }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32" style={{ backgroundColor: '#fbfbfd' }}>
        <div className="max-w-[760px] mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-[12px] uppercase tracking-[0.15em] mb-5" style={{ color: '#0071e3', fontWeight: 600 }}>Dúvidas</p>
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Ficou alguma dúvida?
            </h2>
          </motion.div>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', border: `1px solid ${HAIRLINE}` }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors hover:bg-black/[0.015]"
                >
                  <span className="text-[15px] font-medium pr-4" style={{ color: INK }}>{f.q}</span>
                  {openFaq === i ? <Minus className="w-4 h-4 shrink-0" style={{ color: INK_SOFT }} /> : <Plus className="w-4 h-4 shrink-0" style={{ color: INK_SOFT }} />}
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
      <section className="py-28 md:py-40" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-[820px] mx-auto px-6 text-center">
          <motion.h2 {...fadeUp} className="font-semibold tracking-tight" style={{ fontSize: 'clamp(36px, 5.5vw, 64px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            Pronto para criar conteúdo<br />
            <span style={{ color: INK_SOFT }}>que gera resultado?</span>
          </motion.h2>
          <motion.p {...fadeUp} className="mt-6 mx-auto" style={{ fontSize: 'clamp(17px, 1.5vw, 20px)', color: INK_SOFT, maxWidth: 580 }}>
            Comece agora, gere seu primeiro post gratuitamente e veja na prática o que o Ellocontent faz pelo seu negócio.
          </motion.p>
          <motion.div {...fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={goCreate} className="text-white text-[15px] font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.02]" style={{ backgroundColor: '#0071e3' }}>
              Criar post grátis
            </button>
            <button onClick={goPlans} className="text-[15px] font-medium px-1 py-3 transition-opacity hover:opacity-70" style={{ color: '#0071e3' }}>
              Ver planos ›
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10" style={{ borderTop: `1px solid ${HAIRLINE}`, backgroundColor: '#f5f5f7' }}>
        <div className="max-w-[980px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px]" style={{ color: INK_SOFT }}>
          <span>© 2026 Ellocontent. Todos os direitos reservados.</span>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:underline">Política de Privacidade</a>
            <a href="#" className="hover:underline">Termos de Serviço</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
