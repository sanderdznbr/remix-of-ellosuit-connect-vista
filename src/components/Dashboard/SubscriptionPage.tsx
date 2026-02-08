import React, { useState, useEffect } from 'react';
import { Building2, Sparkles, Check, ArrowRight, CreditCard, HelpCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useSubscription, type ModuleType, type AddonType, type PlanType, type ResourceType } from '@/hooks/useSubscription';
import { ModuleCard } from './subscription/ModuleCard';
import { ComboCard } from './subscription/ComboCard';
import { AddonSelector } from './subscription/AddonSelector';
import { PricingSummary } from './subscription/PricingSummary';
import { UsageDashboard } from './subscription/UsageDashboard';
import { UpgradeModal } from '@/components/shared/UpgradeModal';
import { toast } from 'sonner';

// Base plan info
const BASE_PLAN = {
  name: 'Ellosuit Base',
  price: 97,
  users: 2,
  storage: 5,
  features: [
    'Dashboard e Home',
    'Gestão (Cadastros unificados)',
    'Drive (5 GB)',
    'Analytics e Relatórios',
    'Configurações',
    '2 Usuários incluídos',
  ],
};

// FAQ items
const FAQ_ITEMS = [
  {
    question: 'Como adicionar funcionários à minha empresa?',
    answer: 'Você pode adicionar funcionários em Configurações > Usuários. O plano Base inclui 2 usuários. Para adicionar mais, você pode comprar add-ons de usuários adicionais por R$ 29/mês cada.',
  },
  {
    question: 'Posso ter vários WhatsApps conectados?',
    answer: 'Sim! Com o módulo Omni, você tem 1 sessão de WhatsApp CRM. Você pode comprar sessões adicionais por R$ 67/mês cada para gerenciar múltiplos números.',
  },
  {
    question: 'Como funcionam as agendas online?',
    answer: 'Com o módulo Flow, você pode criar 2 links de agendamento. Cada link pode ser atribuído a um funcionário diferente. Você pode comprar agendas extras por R$ 19/mês cada.',
  },
  {
    question: 'O pagamento é proporcional se eu mudar de plano?',
    answer: 'Sim! Ao fazer upgrade ou downgrade, o valor é calculado proporcionalmente ao período restante do seu ciclo de faturamento atual.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, você pode cancelar sua assinatura quando quiser. Você continuará tendo acesso até o fim do período já pago.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos cartão de crédito (Visa, MasterCard, Elo, American Express), boleto bancário e Pix.',
  },
];

export function SubscriptionPage() {
  const subscription = useSubscription();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedModules, setSelectedModules] = useState<ModuleType[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Record<AddonType, number>>({
    users: 0,
    storage: 0,
    emails: 0,
    ai_agents: 0,
    whatsapp_sessions: 0,
    booking_links: 0,
    meeting_hours: 0,
    tracked_docs: 0,
    priority_support: 0,
  });
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeResource, setUpgradeResource] = useState<ResourceType | undefined>();

  // Sync selected modules with current subscription
  useEffect(() => {
    const activeModules: ModuleType[] = [];
    if (subscription.hasOmni) activeModules.push('omni');
    if (subscription.hasFlow) activeModules.push('flow');
    if (subscription.hasTrack) activeModules.push('track');
    setSelectedModules(activeModules);
  }, [subscription.hasOmni, subscription.hasFlow, subscription.hasTrack]);

  const handleModuleToggle = (module: ModuleType) => {
    setSelectedModules(prev => {
      if (prev.includes(module)) {
        return prev.filter(m => m !== module);
      }
      return [...prev, module];
    });
  };

  const handleAddonChange = (type: AddonType, quantity: number) => {
    setSelectedAddons(prev => ({
      ...prev,
      [type]: quantity,
    }));
  };

  const handleComboSelect = (planType: PlanType) => {
    switch (planType) {
      case 'pro':
        setSelectedModules(['omni', 'flow']);
        break;
      case 'business':
        setSelectedModules(['omni', 'flow', 'track']);
        break;
      case 'enterprise':
        setSelectedModules(['omni', 'flow', 'track']);
        break;
    }
    toast.success(`Combo ${planType.charAt(0).toUpperCase() + planType.slice(1)} selecionado!`);
  };

  const handleUpgradeClick = (resource: ResourceType) => {
    setUpgradeResource(resource);
    setUpgradeModalOpen(true);
  };

  const handleCheckout = () => {
    toast.info('Funcionalidade de pagamento será implementada com Stripe');
  };

  if (subscription.isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="h-80 bg-muted rounded-xl" />
            <div className="h-80 bg-muted rounded-xl" />
            <div className="h-80 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Plano Modular para Empresas</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Escale sua empresa com o Ellosuit
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Monte o plano ideal para seu time. Escolha os módulos que precisa e adicione recursos conforme cresce.
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Label 
            htmlFor="billing-toggle" 
            className={cn("cursor-pointer text-base", billingCycle === 'monthly' && "font-semibold text-foreground")}
          >
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <Label 
            htmlFor="billing-toggle" 
            className={cn("cursor-pointer text-base flex items-center gap-2", billingCycle === 'yearly' && "font-semibold text-foreground")}
          >
            Anual
            <Badge className="bg-primary/10 text-primary">
              Economia de 17%
            </Badge>
          </Label>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-12">
          {/* Base Plan - Always Included */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Plano Base</h2>
              <Badge variant="secondary">Obrigatório</Badge>
            </div>
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{BASE_PLAN.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Incluído em todos os planos. Gestão completa para sua empresa.
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold">R$ {BASE_PLAN.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {BASE_PLAN.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Modules Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Módulos</h2>
              <Badge variant="outline">Escolha os que precisa</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <ModuleCard
                type="omni"
                isSelected={selectedModules.includes('omni')}
                isOwned={subscription.hasOmni}
                onToggle={handleModuleToggle}
              />
              <ModuleCard
                type="flow"
                isSelected={selectedModules.includes('flow')}
                isOwned={subscription.hasFlow}
                onToggle={handleModuleToggle}
              />
              <ModuleCard
                type="track"
                isSelected={selectedModules.includes('track')}
                isOwned={subscription.hasTrack}
                onToggle={handleModuleToggle}
              />
            </div>
          </section>

          {/* Combos Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Combos</h2>
              <Badge variant="outline">Economize até 18%</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <ComboCard
                type="pro"
                isCurrentPlan={subscription.planType === 'pro'}
                onSelect={handleComboSelect}
              />
              <ComboCard
                type="business"
                isCurrentPlan={subscription.planType === 'business'}
                onSelect={handleComboSelect}
              />
              <ComboCard
                type="enterprise"
                isCurrentPlan={subscription.planType === 'enterprise'}
                onSelect={handleComboSelect}
              />
            </div>
          </section>

          {/* Add-ons Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Personalize seu Plano</h2>
              <Badge variant="outline">Add-ons avulsos</Badge>
            </div>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="team">Equipe</TabsTrigger>
                <TabsTrigger value="communication">Comunicação</TabsTrigger>
                <TabsTrigger value="productivity">Produtividade</TabsTrigger>
                <TabsTrigger value="storage">Armazenamento</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <AddonSelector
                  selectedAddons={selectedAddons}
                  onAddonChange={handleAddonChange}
                  category="all"
                />
              </TabsContent>
              <TabsContent value="team">
                <AddonSelector
                  selectedAddons={selectedAddons}
                  onAddonChange={handleAddonChange}
                  category="team"
                />
              </TabsContent>
              <TabsContent value="communication">
                <AddonSelector
                  selectedAddons={selectedAddons}
                  onAddonChange={handleAddonChange}
                  category="communication"
                />
              </TabsContent>
              <TabsContent value="productivity">
                <AddonSelector
                  selectedAddons={selectedAddons}
                  onAddonChange={handleAddonChange}
                  category="productivity"
                />
              </TabsContent>
              <TabsContent value="storage">
                <AddonSelector
                  selectedAddons={selectedAddons}
                  onAddonChange={handleAddonChange}
                  category="storage"
                />
              </TabsContent>
            </Tabs>
          </section>

          {/* Current Usage (if subscriber) */}
          {subscription.isActive && (
            <section>
              <UsageDashboard
                limits={subscription.limits}
                usage={subscription.usage}
                hasOmni={subscription.hasOmni}
                hasFlow={subscription.hasFlow}
                hasTrack={subscription.hasTrack}
                onUpgrade={handleUpgradeClick}
              />
            </section>
          )}

          {/* Current Plan Info */}
          {subscription.isActive && (
            <section>
              <Card className="bg-muted/30">
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold mb-1">
                        Seu plano atual: {subscription.planType.charAt(0).toUpperCase() + subscription.planType.slice(1)}
                        {subscription.status === 'trialing' && (
                          <Badge variant="secondary" className="ml-2">Trial</Badge>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {subscription.currentPeriodEnd && (
                          <>Próxima cobrança: R$ {subscription.monthlyPrice.toFixed(2)} em {subscription.currentPeriodEnd.toLocaleDateString('pt-BR')}</>
                        )}
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
            </section>
          )}

          {/* FAQ Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Dúvidas Frequentes</h2>
            </div>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, index) => (
                <Collapsible key={index}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="py-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium text-left">
                            {item.question}
                          </CardTitle>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        <p className="text-sm text-muted-foreground">
                          {item.answer}
                        </p>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </section>
        </div>

        {/* Sticky Pricing Summary */}
        <div className="hidden lg:block">
          <PricingSummary
            selectedModules={selectedModules.filter(m => !subscription.hasModule(m))}
            selectedAddons={selectedAddons}
            billingCycle={billingCycle}
            onCheckout={handleCheckout}
            isCurrentSubscription={subscription.isActive}
          />
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t lg:hidden">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-sm text-muted-foreground">Total mensal</p>
            <p className="text-xl font-bold">
              R$ {BASE_PLAN.price + selectedModules.filter(m => !subscription.hasModule(m)).reduce((t, m) => {
                const prices = { omni: 147, flow: 97, track: 67 };
                return t + prices[m];
              }, 0) + Object.entries(selectedAddons).reduce((t, [type, qty]) => {
                const prices: Record<string, number> = {
                  users: 29, storage: 19, emails: 29, ai_agents: 39,
                  whatsapp_sessions: 67, booking_links: 19, meeting_hours: 49,
                  tracked_docs: 29, priority_support: 97
                };
                return t + (prices[type] || 0) * qty;
              }, 0)}
            </p>
          </div>
          <Button size="lg" onClick={handleCheckout}>
            {subscription.isActive ? 'Atualizar' : 'Assinar'}
          </Button>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        resource={upgradeResource}
        currentUsage={upgradeResource ? subscription.usage[
          upgradeResource === 'users' ? 'currentUsers' :
          upgradeResource === 'storage_gb' ? 'storageUsedGb' :
          upgradeResource === 'emails_sent' ? 'emailsSentThisMonth' :
          upgradeResource === 'ai_agents_active' ? 'aiAgentsActive' :
          upgradeResource === 'whatsapp_sessions_active' ? 'whatsappSessionsActive' :
          upgradeResource === 'booking_links_active' ? 'bookingLinksActive' :
          upgradeResource === 'meeting_hours_used' ? 'meetingHoursUsed' :
          upgradeResource === 'tracked_docs_created' ? 'trackedDocsCreated' :
          upgradeResource === 'tracked_links_created' ? 'trackedLinksCreated' :
          'trackedVideosCreated'
        ] : undefined}
        maxLimit={upgradeResource ? subscription.limits[
          upgradeResource === 'users' ? 'maxUsers' :
          upgradeResource === 'storage_gb' ? 'maxStorageGb' :
          upgradeResource === 'emails_sent' ? 'maxEmailsMonth' :
          upgradeResource === 'ai_agents_active' ? 'maxAiAgents' :
          upgradeResource === 'whatsapp_sessions_active' ? 'maxWhatsappSessions' :
          upgradeResource === 'booking_links_active' ? 'maxBookingLinks' :
          upgradeResource === 'meeting_hours_used' ? 'maxMeetingHours' :
          upgradeResource === 'tracked_docs_created' ? 'maxTrackedDocs' :
          upgradeResource === 'tracked_links_created' ? 'maxTrackedLinks' :
          'maxTrackedVideos'
        ] : undefined}
      />
    </div>
  );
}

export default SubscriptionPage;
