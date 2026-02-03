import React, { useState } from 'react';
import { Check, Crown, Zap, Building2, ArrowRight, CreditCard, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  icon: React.ElementType;
  popular?: boolean;
  features: PlanFeature[];
  limits: {
    users: string;
    storage: string;
    aiCredits: string;
    whatsappSessions: string;
  };
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfeito para profissionais autônomos',
    monthlyPrice: 97,
    yearlyPrice: 970, // ~17% discount
    icon: Zap,
    limits: {
      users: '1 usuário',
      storage: '5 GB',
      aiCredits: '100 créditos/mês',
      whatsappSessions: '1 sessão'
    },
    features: [
      { text: 'CRM WhatsApp básico', included: true },
      { text: 'Agenda online', included: true },
      { text: 'Tarefas e lembretes', included: true },
      { text: 'Email marketing (500/mês)', included: true },
      { text: 'Rastreamento de documentos', included: true },
      { text: 'Videoconferências (até 4 participantes)', included: true },
      { text: 'Armazenamento de arquivos', included: true },
      { text: 'Agentes de IA básico', included: true },
      { text: 'Múltiplos usuários', included: false },
      { text: 'WhatsApp multi-sessão', included: false },
      { text: 'API de integrações', included: false },
      { text: 'Relatórios avançados', included: false },
      { text: 'Suporte prioritário', included: false },
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal para pequenas equipes',
    monthlyPrice: 197,
    yearlyPrice: 1970, // ~17% discount
    icon: Crown,
    popular: true,
    limits: {
      users: 'Até 5 usuários',
      storage: '50 GB',
      aiCredits: '500 créditos/mês',
      whatsappSessions: '3 sessões'
    },
    features: [
      { text: 'Tudo do Starter, mais:', included: true },
      { text: 'CRM WhatsApp avançado', included: true },
      { text: 'WhatsApp multi-sessão (3)', included: true },
      { text: 'Email marketing (5.000/mês)', included: true },
      { text: 'Videoconferências (até 25 participantes)', included: true },
      { text: 'Gravação de reuniões', included: true },
      { text: 'Agentes de IA avançados', included: true },
      { text: 'Fluxos de automação', included: true },
      { text: 'Relatórios e analytics', included: true },
      { text: 'Integração Google Calendar', included: true },
      { text: 'Suporte por email', included: true },
      { text: 'API de integrações', included: false },
      { text: 'White-label', included: false },
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Para empresas em crescimento',
    monthlyPrice: 497,
    yearlyPrice: 4970, // ~17% discount
    icon: Building2,
    limits: {
      users: 'Usuários ilimitados',
      storage: '500 GB',
      aiCredits: 'Ilimitado',
      whatsappSessions: 'Ilimitado'
    },
    features: [
      { text: 'Tudo do Professional, mais:', included: true },
      { text: 'Usuários ilimitados', included: true },
      { text: 'WhatsApp ilimitado', included: true },
      { text: 'Email marketing ilimitado', included: true },
      { text: 'Videoconferências ilimitadas', included: true },
      { text: 'Transcrição automática com IA', included: true },
      { text: 'Agentes de IA personalizados', included: true },
      { text: 'API completa de integrações', included: true },
      { text: 'Relatórios personalizados', included: true },
      { text: 'White-label (sua marca)', included: true },
      { text: 'Onboarding dedicado', included: true },
      { text: 'Suporte prioritário 24/7', included: true },
      { text: 'SLA garantido', included: true },
    ]
  }
];

export function SubscriptionPage() {
  const [isYearly, setIsYearly] = useState(false);
  const { user } = useAuth();
  
  // Mock current plan - in real app, fetch from subscription data
  const currentPlan = 'starter';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">Escolha seu plano</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Potencialize seu negócio com as ferramentas certas. Escolha o plano que melhor se adapta às suas necessidades.
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Label 
            htmlFor="billing-toggle" 
            className={cn("cursor-pointer", !isYearly && "font-semibold text-foreground")}
          >
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label 
            htmlFor="billing-toggle" 
            className={cn("cursor-pointer", isYearly && "font-semibold text-foreground")}
          >
            Anual
            <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
              -17%
            </Badge>
          </Label>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const isCurrentPlan = plan.id === currentPlan;
          
          return (
            <Card 
              key={plan.id}
              className={cn(
                "relative flex flex-col transition-all duration-300",
                plan.popular && "border-primary shadow-lg scale-[1.02]",
                isCurrentPlan && "ring-2 ring-primary"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-md">
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="outline" className="bg-background">
                    Plano Atual
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className={cn(
                  "w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4",
                  plan.popular ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Icon className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1">
                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{formatPrice(price)}</span>
                    <span className="text-muted-foreground">
                      /{isYearly ? 'ano' : 'mês'}
                    </span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatPrice(Math.round(price / 12))}/mês
                    </p>
                  )}
                </div>
                
                {/* Limits */}
                <div className="grid grid-cols-2 gap-2 mb-6 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{plan.limits.users}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>{plan.limits.storage}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span>{plan.limits.aiCredits}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{plan.limits.whatsappSessions}</span>
                  </div>
                </div>
                
                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li 
                      key={index}
                      className={cn(
                        "flex items-start gap-3 text-sm",
                        !feature.included && "text-muted-foreground"
                      )}
                    >
                      <Check className={cn(
                        "h-4 w-4 mt-0.5 flex-shrink-0",
                        feature.included ? "text-primary" : "text-muted-foreground/30"
                      )} />
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className={cn(
                    "w-full",
                    plan.popular && "bg-primary hover:bg-primary/90"
                  )}
                  variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "outline"}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? (
                    'Plano Atual'
                  ) : (
                    <>
                      {plan.id === 'enterprise' ? 'Falar com Vendas' : 'Assinar Agora'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Current Plan Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Seu plano atual: Starter</h3>
              <p className="text-sm text-muted-foreground">
                Próxima cobrança: R$ 97,00 em 15/03/2026
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                Gerenciar Pagamento
              </Button>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                Cancelar Assinatura
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Dúvidas Frequentes</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-2">Posso trocar de plano a qualquer momento?</h4>
            <p className="text-sm text-muted-foreground">
              Sim! Você pode fazer upgrade ou downgrade do seu plano quando quiser. O valor é calculado proporcionalmente.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-2">Como funciona o período de teste?</h4>
            <p className="text-sm text-muted-foreground">
              Oferecemos 7 dias de teste gratuito em qualquer plano pago. Você pode cancelar antes e não será cobrado.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-2">Quais formas de pagamento são aceitas?</h4>
            <p className="text-sm text-muted-foreground">
              Aceitamos cartão de crédito (Visa, MasterCard, Elo), boleto bancário e Pix.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-2">Há desconto para pagamento anual?</h4>
            <p className="text-sm text-muted-foreground">
              Sim! Ao optar pelo pagamento anual, você economiza 17% em relação ao pagamento mensal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPage;
