import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import '@/styles/carousel-loader.css';

const plans = [
  {
    name: 'Grátis',
    description: 'Descubra o que a ellocontent pode fazer por você',
    price: 'R$0',
    period: 'por mês',
    subtitle: 'Sem cartão de crédito',
    badge: null,
    cta: 'Começar grátis',
    ctaStyle: 'border border-white/20 text-white hover:bg-white/10',
    includedLabel: 'Grátis para todos',
    features: [
      '5 créditos diários (até 30/mês)',
      'Projetos públicos',
      'Colaboradores ilimitados',
      'Geração de carrosséis com IA',
      'Exportação em imagem',
    ],
  },
  {
    name: 'Pro',
    description: 'Para criadores e equipes que produzem conteúdo em alta velocidade.',
    price: 'R$97',
    period: 'por mês',
    subtitle: 'compartilhado entre usuários ilimitados',
    badge: 'Mais popular',
    cta: 'Começar agora',
    ctaStyle: 'bg-[#7B50DC] text-white hover:bg-[#6a42c4]',
    includedLabel: 'Tudo do Grátis, mais:',
    features: [
      '100 créditos mensais',
      '5 créditos diários (até 150/mês)',
      'IA avançada (GPT-4o + imagens)',
      'Rolagem de créditos',
      'Compra de créditos extras',
      'Domínio personalizado',
      'Publicação em redes sociais',
      'Remover badge ellocontent',
      'Suporte prioritário',
    ],
  },
  {
    name: 'Business',
    description: 'Controles avançados e recursos de poder para equipes em crescimento.',
    price: 'R$197',
    period: 'por mês',
    subtitle: 'compartilhado entre usuários ilimitados',
    badge: null,
    cta: 'Começar agora',
    ctaStyle: 'border border-white/20 text-white hover:bg-white/10',
    includedLabel: 'Tudo do Pro, mais:',
    features: [
      '300 créditos mensais',
      'Publicação interna',
      'SSO (Single Sign-On)',
      'Workspace de equipe',
      'Projetos privados',
      'Templates de design',
      'Controle de acesso por papéis',
      'Central de segurança',
    ],
  },
  {
    name: 'Enterprise',
    description: 'Para grandes organizações que precisam de flexibilidade, escala e governança.',
    price: 'Sob consulta',
    period: '',
    subtitle: 'Planos flexíveis',
    badge: null,
    cta: 'Falar com vendas',
    ctaStyle: 'border border-white/20 text-white hover:bg-white/10',
    includedLabel: 'Tudo do Business, mais:',
    features: [
      'Suporte dedicado',
      'Onboarding personalizado',
      'Design systems',
      'SCIM',
      'Conectores personalizados',
      'Controles de publicação',
      'Controles de compartilhamento',
      'Logs de auditoria',
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-5 md:px-8 py-4 relative z-20">
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
              { label: 'Recursos', path: '#' },
              { label: 'Comunidade', path: '#' },
              { label: 'Suporte', path: '#' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => item.path !== '#' && navigate(item.path)}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  item.path === '/precos' ? 'text-white/90' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className="text-white/60 hover:text-white text-sm font-medium transition-colors cursor-pointer px-3 py-1.5"
          >
            Login
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="text-white text-sm font-medium px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Começar
          </button>
        </div>
      </nav>

      {/* Header */}
      <motion.div
        className="text-center pt-12 pb-16 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1
          className="text-3xl md:text-5xl font-bold text-white mb-4"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Preços
        </h1>
        <p className="text-white/40 text-sm md:text-base max-w-md mx-auto">
          Comece de graça. Faça upgrade para ter a capacidade que sua equipe precisa.
        </p>
      </motion.div>

      {/* Plans Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            className="relative rounded-2xl p-6 flex flex-col"
            style={{
              backgroundColor: 'rgba(20, 20, 28, 0.8)',
              border: plan.badge
                ? '1px solid rgba(123, 80, 220, 0.4)'
                : '1px solid rgba(255,255,255,0.07)',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * i, duration: 0.5 }}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white bg-[#7B50DC]">
                {plan.badge}
              </div>
            )}

            <h3 className="text-white text-lg font-semibold mb-1">{plan.name}</h3>
            <p className="text-white/40 text-xs leading-relaxed mb-5 min-h-[36px]">
              {plan.description}
            </p>

            <div className="mb-1">
              <span className="text-white text-3xl font-bold">{plan.price}</span>
              {plan.period && (
                <span className="text-white/40 text-sm ml-1.5">{plan.period}</span>
              )}
            </div>
            <p className="text-white/30 text-xs mb-6">{plan.subtitle}</p>

            <button
              onClick={() => navigate('/auth')}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer mb-6 ${plan.ctaStyle}`}
            >
              {plan.cta}
            </button>

            <p className="text-white/50 text-xs font-medium mb-3">{plan.includedLabel}</p>
            <ul className="space-y-2.5 flex-1">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-white/60 text-xs leading-relaxed">
                  <Check className="w-3.5 h-3.5 text-[#7B50DC] mt-0.5 flex-shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
