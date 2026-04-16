import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Minus, Sparkles, Palette, User, Zap, AtSign, FolderOpen, Check } from 'lucide-react';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as any },
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
    {
      name: 'Starter',
      desc: 'Ideal para quem está começando a criar conteúdo com IA.',
      monthly: 69.90,
      yearly: 49.90,
      credits: '50 créditos/mês',
      features: ['50 créditos mensais', '~7 carrosséis simples de 6 cards', '~25 posts estáticos simples', 'Modo Simples — rápido e direto', 'ElloIA Flash', 'Galeria de marca — 1GB', '3 prompts salvos', 'Templates gratuitos', 'Exportação PNG, JPG e ZIP', 'Suporte por e-mail'],
    },
    {
      name: 'Pro',
      desc: 'Para criadores que publicam conteúdo visual com frequência.',
      monthly: 129.90,
      yearly: 92.90,
      credits: '100 créditos/mês',
      popular: true,
      features: ['100 créditos mensais', '~14 carrosséis simples ou ~7 avançados', '~50 posts simples ou ~33 avançados', 'Modo Avançado — controle total', 'ElloIA Pro', 'ElloIA Pro + Rosto Pessoal', 'Carrossel contínuo panorâmico', 'Galeria de marca — 5GB', 'Prompts ilimitados', 'Compra de templates premium', 'Exportação PNG, JPG, ZIP e WebP', 'Suporte prioritário'],
    },
    {
      name: 'Growth',
      desc: 'Para quem produz com consistência e quer sempre o melhor resultado.',
      monthly: 219.90,
      yearly: 156.90,
      credits: '200 créditos/mês',
      features: ['200 créditos mensais', '~28 carrosséis simples ou ~15 avançados', '~100 posts simples ou ~66 avançados', 'Modo Extreme — designs virais do mercado', 'Galeria de marca — 10GB', 'Carrossel com animação (em breve)', 'Geração de fotos realistas com IA (em breve)', 'Acesso a ferramentas exclusivas', 'Suporte via chat'],
    },
    {
      name: 'Enterprise',
      desc: 'Para empresas, franquias e agências que precisam de escala e personalização total.',
      custom: true,
      credits: 'Volume e créditos sob medida',
      features: ['Créditos sob medida', 'Usuários ilimitados na conta', 'Múltiplos workspaces', 'Galeria de marca por workspace', 'Templates personalizados', 'Controle de acesso por papéis', 'Painel de gestão', 'Histórico com auditoria', 'Suporte dedicado com SLA', 'Onboarding e treinamento', 'API de integração e SSO'],
    },
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

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={ellocontentLogo} alt="ellocontent" className="h-5" />
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <a href="#faq" className="hover:text-white transition-colors">Dúvidas</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/auth')} className="text-sm text-white/70 hover:text-white px-3 py-1.5 transition-colors">Login</button>
            <button onClick={goCreate} className="text-sm bg-white text-black px-4 py-1.5 rounded-full font-medium hover:bg-white/90 transition-colors">Começar</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(123,80,220,0.15), transparent 60%)' }} />
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-32 text-center">
          <motion.h1 {...fadeUp} className="text-4xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Da ideia ao conteúdo pronto<br />
            <span className="text-white/40">em minutos, tão fácil que parece até mágica.</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ duration: 0.7, delay: 0.1 }} className="mt-8 text-lg md:text-xl text-white/55 max-w-2xl mx-auto leading-relaxed">
            Crie conteúdos que as pessoas param pra ver. Sem designer, sem agência e sem gastar seu dia nisso. Feito para qualquer negócio e qualquer nicho.
          </motion.p>
          <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.2 }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={goCreate} className="bg-white text-black px-8 py-3.5 rounded-full font-medium hover:bg-white/90 transition-all hover:scale-[1.02]">
              Criar post grátis
            </button>
            <button onClick={goPlans} className="text-white px-8 py-3.5 rounded-full font-medium border border-white/15 hover:bg-white/5 transition-colors">
              Ver planos
            </button>
          </motion.div>
          <motion.p {...fadeUp} transition={{ duration: 0.7, delay: 0.3 }} className="mt-5 text-xs text-white/35">
            Sem precisar cadastrar cartão
          </motion.p>
        </div>
      </section>

      {/* Pain points */}
      <section className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Você se identifica?</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Se você se identificar com alguma dessas situações,<br />
              <span className="text-white/40">o Ellocontent foi feito para você.</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-3">
            {painPoints.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-white/70 text-sm md:text-base leading-relaxed"
              >
                {p}
              </motion.div>
            ))}
          </div>
          <motion.p {...fadeUp} className="text-center mt-12 text-white/40 text-lg italic">
            Quanto isso custa pra você?
          </motion.p>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.p {...fadeUp} className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Como funciona</motion.p>
          <motion.h2 {...fadeUp} className="text-3xl md:text-5xl font-semibold tracking-tight mb-8">
            Simples assim.
          </motion.h2>
          <motion.p {...fadeUp} className="text-lg md:text-xl text-white/55 leading-relaxed max-w-3xl mx-auto">
            Você digita o que quer falar, pode ser uma ideia, um tema ou até um texto pronto. A IA entende, cria o roteiro, gera as imagens e monta o design. Com poucos cliques você tem um conteúdo pronto para baixar e postar. Sem complicação, sem curva de aprendizado e <span className="text-white">100% editável</span> do jeito que você quiser.
          </motion.p>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Recursos</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
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
                  className="p-8 rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent hover:border-white/[0.12] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-6">
                    <Icon className="w-5 h-5 text-white/80" />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2">{f.tag}</p>
                  <h3 className="text-xl font-semibold mb-3 leading-tight">{f.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Galeria */}
      <section className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Galeria</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">Veja o que é possível criar.</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="aspect-[4/5] rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center text-white/30 text-xs"
              >
                Exemplo de conteúdo
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Planos</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-8">Planos e Preços.</h2>
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-white/10 bg-white/[0.02]">
              <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-white text-black' : 'text-white/60'}`}>Mensal</button>
              <button onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${annual ? 'bg-white text-black' : 'text-white/60'}`}>Anual <span className="text-xs opacity-70">−29%</span></button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`relative p-6 rounded-3xl border flex flex-col ${p.popular ? 'border-white/30 bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-black text-[10px] font-semibold uppercase tracking-wider">Mais popular</div>
                )}
                <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
                <p className="text-xs text-white/50 mb-6 min-h-[3em]">{p.desc}</p>
                <div className="mb-6">
                  {p.custom ? (
                    <div className="text-2xl font-semibold">Sob consulta</div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-semibold">R${(annual ? p.yearly! : p.monthly!).toFixed(2).replace('.', ',')}</span>
                        <span className="text-xs text-white/40">/mês</span>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-white/40 mt-1">{p.credits}</p>
                </div>
                <button
                  onClick={p.custom ? () => navigate('/suporte') : goPlans}
                  className={`w-full py-2.5 rounded-full text-sm font-medium mb-6 transition-colors ${p.popular ? 'bg-white text-black hover:bg-white/90' : 'border border-white/15 text-white hover:bg-white/5'}`}
                >
                  {p.custom ? 'Falar com vendas' : 'Assinar'}
                </button>
                <ul className="space-y-2.5 text-xs text-white/65">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex gap-2">
                      <Check className="w-3.5 h-3.5 text-white/40 mt-0.5 shrink-0" />
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
      <section id="faq" className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Dúvidas</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">Ficou alguma dúvida?</h2>
          </motion.div>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <div key={i} className="border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.02]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm md:text-base font-medium pr-4">{f.q}</span>
                  {openFaq === i ? <Minus className="w-4 h-4 text-white/50 shrink-0" /> : <Plus className="w-4 h-4 text-white/50 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-white/55 leading-relaxed">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.h2 {...fadeUp} className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
            Pronto para criar conteúdo<br /><span className="text-white/40">que gera resultado?</span>
          </motion.h2>
          <motion.p {...fadeUp} className="mt-6 text-lg text-white/55 max-w-xl mx-auto">
            Comece agora, gere seu primeiro post gratuitamente e veja na prática o que o Ellocontent faz pelo seu negócio.
          </motion.p>
          <motion.div {...fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={goCreate} className="bg-white text-black px-8 py-3.5 rounded-full font-medium hover:bg-white/90 transition-all hover:scale-[1.02]">
              Criar post grátis
            </button>
            <button onClick={goPlans} className="text-white px-8 py-3.5 rounded-full font-medium border border-white/15 hover:bg-white/5 transition-colors">
              Ver planos
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div className="flex items-center gap-3">
            <img src={ellocontentLogo} alt="ellocontent" className="h-4 opacity-60" />
            <span>© 2026 Ellocontent. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white/70 transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:text-white/70 transition-colors">Termos de Serviço</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
