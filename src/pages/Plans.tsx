import React from 'react';
import { Check, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import ellosuitLogo from '@/assets/logoellosuit.png';

interface Plan {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  highlighted: boolean;
  cta: string;
  ctaAction: 'free' | 'trial';
  features: string[];
  includesFrom?: string;
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    description: 'Para quem está começando a organizar e crescer o negócio',
    monthlyPrice: 49,
    annualPrice: 29,
    highlighted: false,
    cta: 'Começar agora',
    ctaAction: 'free',
    includesFrom: undefined,
    features: [
      'CRM básico com até 500 contatos',
      'Agenda e agendamentos',
      'Tarefas e gestão de projetos',
      'Documentos e contratos',
      '1 usuário',
    ],
  },
  {
    name: 'Pro',
    description: 'Para empreendedores e equipes que querem crescer e automatizar',
    monthlyPrice: 149,
    annualPrice: 97,
    highlighted: true,
    cta: 'Teste grátis 7 dias',
    ctaAction: 'trial',
    includesFrom: 'Tudo do Starter, mais:',
    features: [
      'CRM ilimitado',
      'WhatsApp Business integrado',
      'Email marketing e rastreamento',
      'Agentes de IA',
      'Automações e chatbots',
      'Até 5 usuários',
    ],
  },
  {
    name: 'Business',
    description: 'Para empresas e times que querem o máximo de performance',
    monthlyPrice: 297,
    annualPrice: 197,
    highlighted: false,
    cta: 'Teste grátis 7 dias',
    ctaAction: 'trial',
    includesFrom: 'Tudo do Pro, mais:',
    features: [
      'Usuários ilimitados',
      'WhatsApp multi-sessão',
      'Videoconferência integrada',
      'Rastreamento de documentos e links',
      'Lead funnels e páginas de captura',
      'API de integração',
      'Suporte prioritário',
    ],
  },
];

export default function Plans() {
  const navigate = useNavigate();

  const handleSelectPlan = (plan: Plan) => {
    if (plan.ctaAction === 'trial') {
      navigate('/checkout/ativar');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
        <img src={ellosuitLogo} alt="Ellosuit" className="h-8 w-auto" />
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Continuar grátis
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Escolha o plano ideal para você
          </h1>
          <p className="text-muted-foreground">
            Cancele a qualquer momento. Sem compromisso.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 flex flex-col transition-shadow ${
                plan.highlighted
                  ? 'border-primary bg-primary/[0.03] shadow-lg shadow-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold">
                  Recomendado
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-foreground">R$ {plan.annualPrice}</span>
                  <span className="text-sm text-muted-foreground">BRL/mês</span>
                  <span className="text-sm text-muted-foreground line-through ml-1">R$ {plan.monthlyPrice}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cobrado anualmente, ou R$ {plan.monthlyPrice} mensal
                </p>
              </div>

              <Button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full h-11 rounded-full text-sm font-medium mb-6 ${
                  plan.highlighted
                    ? ''
                    : 'bg-background text-foreground border border-border hover:bg-muted'
                }`}
                variant={plan.highlighted ? 'default' : 'outline'}
              >
                {plan.ctaAction === 'trial' && <Sparkles className="mr-2 h-4 w-4" />}
                {plan.cta}
              </Button>

              <div className="border-t border-border pt-5 flex-1">
                {plan.includesFrom && (
                  <p className="text-sm font-medium text-foreground mb-3">{plan.includesFrom}</p>
                )}
                <ul className="space-y-2.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
