import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, X, Zap, Loader2, Gift, Copy, Ticket } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import { routeFromTab } from '@/utils/dashboard-routes';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import { toast } from 'sonner';
import TrialBanner from '@/components/TrialBanner';

// Prices: annual = billed yearly (per month), monthly = billed monthly
const PLAN_CONFIG: Record<string, {
  label: string;
  annualPrice: number;
  monthlyPrice: number;
  credits: number;
}> = {
  starter: { label: 'Starter', annualPrice: 49.90, monthlyPrice: 59.90, credits: 10 },
  pro: { label: 'Pro', annualPrice: 99.90, monthlyPrice: 119.90, credits: 30 },
  growth: { label: 'Growth', annualPrice: 169.90, monthlyPrice: 199.90, credits: 80 },
};

// Per-criativo pricing by plan
const CREDIT_UNIT_PRICE: Record<string, number> = {
  starter: 5.90,
  pro: 4.90,
  growth: 3.90,
  enterprise: 3.90,
  free: 6.90,
};

const CREDIT_PACKAGES = [5, 10, 20, 50];

function getCreditTopups(planKey: string) {
  const unitPrice = CREDIT_UNIT_PRICE[planKey] || CREDIT_UNIT_PRICE.free;
  return CREDIT_PACKAGES.map(credits => ({
    credits,
    price: parseFloat((credits * unitPrice).toFixed(2)),
  }));
}

const GIFT_PACKAGES = [
  { credits: 10, price: 59.90, label: '10 Criativos', description: '10 gerações completas' },
  { credits: 30, price: 149.90, label: '30 Criativos', description: '30 gerações completas' },
  { credits: 50, price: 199.90, label: '50 Criativos', description: '50 gerações completas' },
];

interface PlanDef {
  key: string;
  name: string;
  description: string;
  annualPrice: string;
  monthlyPrice: string;
  credits: string;
  badge: string | null;
  includedLabel: string;
  features: (string | { text: string; tags?: string[] })[];
  isEnterprise?: boolean;
  enterpriseSubtitle?: string;
  enterpriseSections?: { title: string; items: string[] }[];
}

const plans: PlanDef[] = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'Ideal para quem está começando a criar conteúdo com IA.',
    annualPrice: 'R$49,90',
    monthlyPrice: 'R$59,90',
    credits: '10 criativos/mês',
    badge: null,
    includedLabel: 'O que está incluso:',
    features: [
      '10 criativos mensais',
      '1 criativo = 1 geração completa (carrossel ou post)',
      'Carrosséis de até 5 cards',
      'Modo **Rápido** — simples e direto',
      'ElloIA Flash',
      'Galeria de marca — 1GB',
      '3 prompts salvos',
      'Templates gratuitos',
      'Exportação PNG, JPG e ZIP',
      'Suporte por e-mail',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Para criadores que publicam conteúdo visual com frequência.',
    annualPrice: 'R$99,90',
    monthlyPrice: 'R$119,90',
    credits: '30 criativos/mês',
    badge: 'Mais popular',
    includedLabel: 'Tudo do Starter, mais:',
    features: [
      '30 criativos mensais',
      'Modo **Personalizado** — controle total sobre cores, fontes, roteiro e mais',
      'ElloIA Pro',
      'ElloIA Pro + Rosto Pessoal',
      'Carrossel contínuo panorâmico',
      'Galeria de marca — 5GB',
      'Prompts ilimitados',
      'Compra de templates premium',
      'Exportação PNG, JPG, ZIP e WebP',
      'Suporte prioritário',
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    description: 'Para quem produz com consistência e quer sempre o melhor resultado.',
    annualPrice: 'R$169,90',
    monthlyPrice: 'R$199,90',
    credits: '80 criativos/mês',
    badge: null,
    includedLabel: 'Tudo do Pro, mais:',
    features: [
      '80 criativos mensais',
      'Modo **Extreme** — descreva sua visão, a IA entrega designs modernos e virais',
      'Galeria de marca — 10GB',
      { text: 'Carrossel com animação e inserção de vídeos', tags: ['Exclusivo', 'Em breve'] },
      { text: 'Geração de fotos realistas com IA', tags: ['Exclusivo', 'Em breve'] },
      'Acesso a ferramentas e funcionalidades exclusivas',
      'Suporte via chat',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'Para empresas, franquias e agências que precisam de escala e personalização total.',
    annualPrice: 'Sob consulta',
    monthlyPrice: 'Sob consulta',
    credits: 'Volume e criativos sob medida',
    badge: null,
    includedLabel: 'Tudo do Growth, mais:',
    isEnterprise: true,
    features: [],
    enterpriseSections: [
      {
        title: 'Volume e Acesso',
        items: [
          'Criativos sob medida — configurados conforme o volume de uso',
          'Usuários ilimitados na conta',
          'Múltiplos workspaces por unidade, cliente ou departamento',
        ],
      },
      {
        title: 'Identidade e Marca',
        items: [
          'Galeria de marca separada por workspace',
          'Templates personalizados por workspace',
          'Identidade visual em escala — cada workspace com sua própria marca',
        ],
      },
      {
        title: 'Controle e Gestão',
        items: [
          'Controle de acesso por papéis — criador, aprovador, gestor',
          'Painel de gestão de uso por workspace ou usuário',
          'Histórico completo de criações com auditoria',
        ],
      },
      {
        title: 'Suporte e Onboarding',
        items: [
          'Suporte dedicado',
          'Onboarding guiado e treinamento da equipe',
          'Contrato personalizado com SLA garantido',
        ],
      },
      {
        title: 'Integração',
        items: [
          'API de integração com sistemas internos',
          'SSO — Single Sign-On corporativo',
        ],
      },
    ],
  },
];

function renderFeatureText(text: string) {
  // Bold text between ** **
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="text-white/80 font-semibold">{part}</strong> : part
  );
}

function FeatureItem({ feat, iconColor = 'text-purple-400' }: { feat: string | { text: string; tags?: string[] }; iconColor?: string }) {
  const isObj = typeof feat === 'object';
  const text = isObj ? feat.text : feat;
  const tags = isObj ? feat.tags : undefined;

  return (
    <li className="flex items-start gap-1.5 text-white/50 text-[11px] leading-relaxed">
      <Check className={`w-3 h-3 ${iconColor} mt-0.5 shrink-0`} />
      <span>
        {renderFeatureText(text)}
        {tags?.map((tag, i) => (
          <span key={i} className={`ml-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
            tag === 'Exclusivo' ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/15 text-amber-400'
          }`}>
            {tag}
          </span>
        ))}
      </span>
    </li>
  );
}

// ---- Toggle Component ----
function BillingToggle({ isAnnual, onChange }: { isAnnual: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-10">
      <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-white' : 'text-white/40'}`}>Anual</span>
      <button
        onClick={() => onChange(!isAnnual)}
        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${isAnnual ? 'bg-purple-600' : 'bg-white/20'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isAnnual ? 'left-1' : 'left-7'}`} />
      </button>
      <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-white/40'}`}>Mensal</span>
      {isAnnual && (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20">
          Economize até 29% no anual
        </span>
      )}
    </div>
  );
}

// ---- Top-up Modal ----
interface TopUpModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan: string;
  companyId: string;
  initialTopup?: number;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ open, onClose, currentPlan, companyId, initialTopup = 2 }) => {
  const navigate = useNavigate();
  const [selectedTopup, setSelectedTopup] = useState(initialTopup);
  const topups = getCreditTopups(currentPlan || 'free');
  const unitPrice = CREDIT_UNIT_PRICE[currentPlan || 'free'] || CREDIT_UNIT_PRICE.free;

  if (!open) return null;

  const handlePurchase = () => {
    navigate(`/checkout?modo=creditos&creditos=${selectedTopup}&plano=${currentPlan}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#18181f', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="w-10 h-10 rounded-xl bg-purple-600 mb-4 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Adicionar criativos</h2>
          <p className="text-sm text-white/40 mb-2">Compre criativos avulsos para usar imediatamente.</p>
          <p className="text-xs text-purple-300/60 mb-6">
            Seu plano: <span className="font-semibold text-purple-300">{(currentPlan || 'free').charAt(0).toUpperCase() + (currentPlan || 'free').slice(1)}</span> — R${unitPrice.toFixed(2)}/criativo
          </p>

          <div className="space-y-2 max-h-[300px] overflow-y-auto mb-6">
            {topups.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedTopup(i)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                  selectedTopup === i
                    ? 'bg-purple-500/20 border border-purple-500/40 text-white'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                <span className="font-medium">+{opt.credits} criativos</span>
                <span className={selectedTopup === i ? 'text-purple-300' : 'text-white/40'}>R${opt.price.toFixed(2)}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] text-white/60 hover:bg-white/[0.04] transition-colors cursor-pointer">
              Cancelar
            </button>
            <button onClick={handlePurchase}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors cursor-pointer">
              {`Comprar R$${topups[selectedTopup]?.price.toFixed(2)}`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ---- Plan Card Component ----
function PlanCard({
  plan,
  isAnnual,
  isCurrent,
  onSelect,
}: {
  plan: PlanDef;
  isAnnual: boolean;
  isCurrent?: boolean;
  onSelect: () => void;
}) {
  const price = plan.isEnterprise
    ? 'Sob consulta'
    : isAnnual ? plan.annualPrice : plan.monthlyPrice;

  return (
    <motion.div
      className="relative rounded-2xl p-5 flex flex-col"
      style={{
        backgroundColor: 'rgba(20, 20, 28, 0.8)',
        border: isCurrent
          ? '1px solid rgba(123, 80, 220, 0.5)'
          : plan.badge
          ? '1px solid rgba(123, 80, 220, 0.3)'
          : '1px solid rgba(255,255,255,0.06)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold text-white bg-purple-600 uppercase tracking-wider">
          Seu plano
        </div>
      )}
      {!isCurrent && plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold text-white bg-purple-600 uppercase tracking-wider">
          {plan.badge}
        </div>
      )}

      <h3 className="text-white text-base font-semibold mb-1">{plan.name}</h3>
      <p className="text-white/40 text-xs leading-relaxed mb-4 min-h-[32px]">{plan.description}</p>

      <div className="mb-1 overflow-hidden">
        {plan.isEnterprise ? (
          <span className="text-white text-2xl font-bold">Sob consulta</span>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={price}
              initial={{ y: -20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-white text-2xl font-bold">{price}</span>
              <span className="text-white/40 text-xs ml-1">/mês</span>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      <p className="text-white/25 text-[11px] mb-4">{plan.credits}</p>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer mb-4 ${
          isCurrent
            ? 'bg-white/[0.06] text-white/30 cursor-default'
            : plan.badge || isCurrent
            ? 'bg-purple-600 text-white hover:bg-purple-500'
            : 'border border-white/[0.12] text-white/70 hover:bg-white/[0.06]'
        }`}
      >
        {isCurrent ? 'Plano atual' : plan.isEnterprise ? 'Falar com vendas' : 'Assinar'}
      </button>

      <p className="text-white/40 text-[11px] font-medium mb-2 uppercase tracking-wider">{plan.includedLabel}</p>

      {/* Regular features */}
      {plan.features.length > 0 && (
        <ul className="space-y-1.5 flex-1">
          {plan.features.map((feat, i) => (
            <FeatureItem key={i} feat={feat} />
          ))}
        </ul>
      )}

      {/* Enterprise sections */}
      {plan.enterpriseSections && (
        <div className="space-y-4 flex-1">
          {plan.enterpriseSections.map((section, si) => (
            <div key={si}>
              <p className="text-purple-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">{section.title}</p>
              <ul className="space-y-1.5">
                {section.items.map((item, ii) => (
                  <FeatureItem key={ii} feat={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ---- Logged-in Pricing ----
function LoggedInPricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<any>(null);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [companyId, setCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showTopUpDropdown, setShowTopUpDropdown] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState(2);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'none' | 'redeem'>('none');
  const [isAnnual, setIsAnnual] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
        if (!cu) return;
        setCompanyId(cu.company_id);

        const [{ data: sub }, { data: credits }] = await Promise.all([
          supabase.from('subscriptions').select('*').eq('company_id', cu.company_id).maybeSingle(),
          supabase.from('ai_credit_balances').select('balance, total_purchased').eq('company_id', cu.company_id).maybeSingle(),
        ]);
        setSubscription(sub);
        setCreditBalance(credits?.balance ?? 0);
        setTotalCredits(credits?.total_purchased ?? 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const currentPlanKey = subscription?.plan_type || null;
  const isActive = subscription && subscription.status === 'active';
  const planConfig = currentPlanKey && isActive ? PLAN_CONFIG[currentPlanKey] : null;
  const planLabel = planConfig?.label || 'Sem plano';
  const maxCredits = planConfig?.credits || 0;

  const handleTabChange = (tab: string) => {
    navigate(routeFromTab(tab));
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim() || !user || !companyId) return;
    setRedeemLoading(true);
    try {
      const code = redeemCode.trim().toUpperCase();

      if (code.startsWith('GIFT-')) {
        const { data: giftKey, error: giftErr } = await supabase
          .from('gift_keys' as any)
          .select('*')
          .eq('gift_key', code)
          .eq('status', 'available')
          .maybeSingle();

        if (giftErr || !giftKey) {
          toast.error('Código inválido ou já resgatado.');
          return;
        }

        const gk = giftKey as any;

        const { error: rpcErr } = await supabase.rpc('add_ai_credits', {
          p_company_id: companyId,
          p_amount: gk.credits,
          p_description: `Presente resgatado: ${code}`,
        });
        if (rpcErr) throw rpcErr;

        await supabase.from('gift_keys' as any).update({
          status: 'redeemed',
          redeemed_by: user.id,
          redeemed_at: new Date().toISOString(),
          redeemed_company_id: companyId,
        } as any).eq('gift_key', code);

        toast.success(`+${gk.credits} criativos adicionados! 🎉`);
        setRedeemCode('');
        window.location.reload();
        return;
      }

      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !coupon) {
        toast.error('Código inválido. Verifique e tente novamente.');
        return;
      }
      if (!['credits', 'plan'].includes(coupon.coupon_type)) {
        toast.error('Este código não é um código de resgate.');
        return;
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast.error('Código expirado.');
        return;
      }
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast.error('Código já foi totalmente utilizado.');
        return;
      }
      const { data: existing } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        toast.error('Você já resgatou este código.');
        return;
      }

      if (coupon.coupon_type === 'credits') {
        const { error: rpcErr } = await supabase.rpc('add_ai_credits', {
          p_company_id: companyId,
          p_amount: coupon.credits_amount,
          p_description: `Resgate de cupom: ${coupon.code}`,
        });
        if (rpcErr) throw rpcErr;
      } else if (coupon.coupon_type === 'plan' && coupon.plan_type) {
        await supabase.from('subscriptions').update({
          plan_type: coupon.plan_type as any,
          status: 'active' as any,
          monthly_price: 0,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (coupon.plan_months || 1) * 30 * 86400000).toISOString(),
        }).eq('company_id', companyId);
      }

      await supabase.from('coupon_redemptions').insert({
        coupon_id: coupon.id,
        user_id: user.id,
        company_id: companyId,
      });

      toast.success(
        coupon.coupon_type === 'credits'
          ? `+${coupon.credits_amount} criativos adicionados! 🎉`
          : `Plano ${coupon.plan_type} ativado por ${coupon.plan_months || 1} mês(es)! 🎉`
      );
      setRedeemCode('');
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao resgatar código.');
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="hidden md:block">
        <DashboardSidebar activeTab="pricing" onTabChange={handleTabChange} onSearch={() => {}} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={() => navigate('/')} className="text-white/40 text-sm cursor-pointer">← Voltar</button>
          <img src={ellocontentLogo} alt="elloContent" className="h-4" />
          <div className="w-12" />
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          <h1 className="text-2xl font-bold text-white mb-1">Plano & Criativos</h1>
          <p className="text-sm text-white/40 mb-8">Gerencie seu plano e saldo de criativos.</p>

          {loading ? (
            <div className="py-20 text-center text-white/30">Carregando...</div>
          ) : (
            <>
              {/* Top cards: Plan + Credits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ backgroundColor: 'rgba(20,20,28,0.8)' }}>
                  <p className="text-white font-semibold text-sm">Você está no plano {planLabel}</p>
                  {isActive && subscription?.current_period_end && (
                    <p className="text-white/30 text-xs mt-1">
                      Renova em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ backgroundColor: 'rgba(20,20,28,0.8)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-sm font-medium">Criativos restantes</p>
                    <p className="text-white text-sm font-semibold">{Math.floor(creditBalance)} de {maxCredits}</p>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/[0.06] mb-3">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all"
                      style={{ width: `${maxCredits > 0 ? Math.min(100, (creditBalance / maxCredits) * 100) : 0}%` }}
                    />
                  </div>
                  {/* Next credit reset info */}
                  {isActive && subscription?.current_period_start && (() => {
                    const start = new Date(subscription.credits_last_reset_at || subscription.current_period_start);
                    const nextReset = new Date(start);
                    nextReset.setMonth(nextReset.getMonth() + 1);
                    const now = new Date();
                    while (nextReset <= now) {
                      nextReset.setMonth(nextReset.getMonth() + 1);
                    }
                    const daysLeft = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(123, 80, 220, 0.08)', border: '1px solid rgba(123, 80, 220, 0.15)' }}>
                        <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7B50DC' }} />
                        <div className="flex-1">
                          <p className="text-white/60 text-[11px]">
                            Próximo reset: <span className="text-white/80 font-medium">
                              {nextReset.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {nextReset.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-white/30 ml-1">({daysLeft} dia{daysLeft !== 1 ? 's' : ''})</span>
                          </p>
                          <p className="text-white/30 text-[10px]">
                            Seus {maxCredits} criativos serão renovados automaticamente
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <Check className="w-3 h-3" /> {maxCredits} criativos mensais inclusos
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowTopUpDropdown(!showTopUpDropdown)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium border border-white/[0.12] text-white/70 hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        Comprar criativos
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showTopUpDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowTopUpDropdown(false)} />
                          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/[0.08] z-50 py-1 shadow-xl" style={{ backgroundColor: '#1a1a24' }}>
                            {getCreditTopups(currentPlanKey || 'free').map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => { setSelectedTopup(i); setShowTopUpDropdown(false); setShowTopUp(true); }}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-white/70 hover:bg-white/[0.06] transition-colors cursor-pointer"
                              >
                                <span>+{opt.credits} criativos</span>
                                <span className="text-white/40">R${opt.price.toFixed(2)}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing toggle */}
              <BillingToggle isAnnual={isAnnual} onChange={setIsAnnual} />

              {/* Plans grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((plan) => {
                  const isCurrent = isActive && currentPlanKey ? plan.key === currentPlanKey : false;
                  return (
                    <PlanCard
                      key={plan.key}
                      plan={plan}
                      isAnnual={isAnnual}
                      isCurrent={isCurrent}
                      onSelect={() => {
                        if (plan.isEnterprise) {
                          window.open('mailto:contato@ellocontent.com?subject=Plano Enterprise', '_blank');
                        } else if (!isCurrent) {
                          navigate(`/checkout?plano=${plan.key}&billing=${isAnnual ? 'annual' : 'monthly'}`);
                        }
                      }}
                    />
                  );
                })}
              </div>

              {/* Admin-only test plan */}
              {user?.email === 'admin@gmail.com' && (
                <div className="mt-4">
                  <motion.div
                    className="rounded-2xl p-4 border border-yellow-500/30"
                    style={{ backgroundColor: 'rgba(234, 179, 8, 0.05)' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold">Admin Only</span>
                        <h3 className="text-white font-bold text-sm mt-1">Plano Teste — R$1,00</h3>
                        <p className="text-white/40 text-xs">5 criativos • Para testar pagamento com cartão real</p>
                      </div>
                      <button
                        onClick={() => navigate('/checkout?plano=test&billing=monthly')}
                        className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                        style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }}
                      >
                        Testar R$1,00
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setActiveSection(activeSection === 'redeem' ? 'none' : 'redeem')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    activeSection === 'redeem'
                      ? 'bg-purple-600 text-white'
                      : 'border border-white/[0.12] text-white/70 hover:bg-white/[0.06]'
                  }`}
                >
                  <Ticket className="w-4 h-4" />
                  Resgatar cupom
                </button>
                <button
                  onClick={() => navigate('/presentear')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border border-white/[0.12] text-white/70 hover:bg-white/[0.06]"
                >
                  <Gift className="w-4 h-4" />
                  Presentear
                </button>
              </div>

              {/* Redeem section */}
              {activeSection === 'redeem' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-2xl p-5 border border-white/[0.06]"
                  style={{ backgroundColor: 'rgba(20,20,28,0.8)' }}
                >
                  <h3 className="text-white text-sm font-semibold mb-1">🎁 Resgatar código</h3>
                  <p className="text-white/30 text-xs mb-4">Tem um código de presente? Resgate criativos ou planos aqui.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite o código"
                      value={redeemCode}
                      onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter') handleRedeemCode(); }}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                    />
                    <button
                      onClick={handleRedeemCode}
                      disabled={redeemLoading || !redeemCode.trim()}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-40"
                      style={{ backgroundColor: '#7B50DC', color: '#fff' }}
                    >
                      {redeemLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resgatar'}
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      <TopUpModal open={showTopUp} onClose={() => { setShowTopUp(false); window.location.reload(); }} currentPlan={currentPlanKey} companyId={companyId} initialTopup={selectedTopup} />
    </div>
  );
}

// ---- Public Pricing ----
function PublicPricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div className="fixed inset-0 overflow-y-auto z-50" style={{ backgroundColor: '#0a0a0f' }}>
      <nav className="flex items-center justify-between px-5 md:px-8 py-4 relative z-20">
        <div className="flex items-center gap-6 md:gap-8">
          <img src={ellocontentLogo} alt="elloContent" className="h-5 md:h-6 cursor-pointer" onClick={() => navigate('/')} />
          <div className="hidden md:flex items-center gap-5">
            {[
              { label: 'Preços', path: '/precos' },
              { label: 'Recursos', path: '/recursos' },
              { label: 'Suporte', path: '/suporte' },
            ].map(item => (
              <button key={item.label} onClick={() => item.path !== '#' && navigate(item.path)}
                className={`text-sm font-medium transition-colors cursor-pointer ${item.path === '/precos' ? 'text-white/90' : 'text-white/50 hover:text-white/80'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/auth')} className="text-white/60 hover:text-white text-sm font-medium transition-colors cursor-pointer px-3 py-1.5">Login</button>
          <button onClick={() => navigate('/auth')} className="text-white text-sm font-medium px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors cursor-pointer">Começar</button>
        </div>
      </nav>

      <motion.div className="text-center pt-12 pb-8 px-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Planos e Preços</h1>
        <p className="text-white/40 text-sm md:text-base max-w-md mx-auto mb-8">Rápido, fácil e profissional. Sem precisar de designer, sem perder tempo.</p>
      </motion.div>

      <div className="max-w-6xl mx-auto px-4">
        <BillingToggle isAnnual={isAnnual} onChange={setIsAnnual} />
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            isAnnual={isAnnual}
            onSelect={() => {
              if (plan.isEnterprise) window.open('mailto:contato@ellocontent.com?subject=Plano Enterprise', '_blank');
              else navigate('/auth');
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Pricing() {
  const { user } = useAuth();

  if (user) return <LoggedInPricing />;
  return <PublicPricing />;
}
