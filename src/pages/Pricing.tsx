import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, X, Zap, Loader2, Gift, Copy, Ticket } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import { toast } from 'sonner';

const PLAN_CONFIG: Record<string, { label: string; price: number; credits: number; extraCredit: number }> = {
  starter: { label: 'Starter', price: 64.50, credits: 50, extraCredit: 1.50 },
  pro: { label: 'Pro', price: 124.90, credits: 120, extraCredit: 1.20 },
  growth: { label: 'Growth', price: 189.90, credits: 240, extraCredit: 0.90 },
};

const CREDIT_TOPUPS = [
  { credits: 10, price: 15 },
  { credits: 25, price: 30 },
  { credits: 50, price: 55 },
  { credits: 100, price: 99 },
  { credits: 250, price: 220 },
  { credits: 500, price: 399 },
];

const GIFT_PACKAGES = [
  { credits: 100, price: 139.90, label: '100 Créditos', description: '~10 carrosséis ou ~14 posts estáticos' },
  { credits: 200, price: 229.90, label: '200 Créditos', description: '~20 carrosséis ou ~28 posts estáticos' },
  { credits: 300, price: 287.90, label: '300 Créditos', description: '~30 carrosséis ou ~42 posts estáticos' },
];

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'Ideal para quem está começando a criar conteúdo com IA.',
    price: 'R$64,50',
    period: '/mês',
    subtitle: '50 créditos/mês',
    badge: null,
    includedLabel: 'O que está incluso:',
    features: [
      '50 créditos mensais',
      '~5 carrosséis (até 10 slides) ou ~7 posts estáticos',
      'Imagens geradas por IA em cada slide',
      'Exportação em PNG/JPG',
      'Galeria de marca e prompts',
      'Suporte por e-mail',
      'Crédito extra: R$1,50/un',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Para criadores que publicam conteúdo visual com frequência.',
    price: 'R$124,90',
    period: '/mês',
    subtitle: '120 créditos/mês',
    badge: 'Mais popular',
    includedLabel: 'Tudo do Starter, mais:',
    features: [
      '120 créditos mensais',
      '~12 carrosséis (até 10 slides) ou ~16 posts estáticos',
      'IA avançada + imagens de referência',
      'Estilos do Marketplace inclusos',
      'Publicação direta em redes sociais',
      'Sem badge elloContent nos cards',
      'Suporte prioritário',
      'Crédito extra: R$1,20/un',
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    description: 'Escale sua produção com volume, equipe e slides extras.',
    price: 'R$189,90',
    period: '/mês',
    subtitle: '240 créditos/mês',
    badge: null,
    includedLabel: 'Tudo do Pro, mais:',
    features: [
      '240 créditos mensais',
      '~24 carrosséis (até 15 slides) ou ~32 posts estáticos',
      'Templates de design personalizados',
      'Workspace de equipe (multi-usuários)',
      'Projetos e galeria privada',
      'Controle de acesso por papéis',
      'Crédito extra: R$0,90/un',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'Para agências e equipes que precisam de escala e personalização total.',
    price: 'Sob consulta',
    period: '',
    subtitle: 'Créditos ilimitados',
    badge: null,
    includedLabel: 'Tudo do Growth, mais:',
    features: [
      'Créditos sob medida (ilimitados)',
      'Suporte dedicado com SLA',
      'Onboarding e treinamento',
      'SSO (Single Sign-On)',
      'API de integração',
      'Relatórios e auditoria',
    ],
  },
];

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

  if (!open) return null;

  const handlePurchase = () => {
    // Redirect to checkout with credit purchase mode
    navigate(`/checkout?modo=creditos&creditos=${selectedTopup}`);
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
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl bg-purple-600 mb-4 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Adicionar créditos</h2>
          <p className="text-sm text-white/40 mb-6">Compre créditos avulsos para usar imediatamente.</p>

          {/* Credit options */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto mb-6">
            {CREDIT_TOPUPS.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedTopup(i)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                  selectedTopup === i
                    ? 'bg-purple-500/20 border border-purple-500/40 text-white'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                <span className="font-medium">+{opt.credits} créditos</span>
                <span className={selectedTopup === i ? 'text-purple-300' : 'text-white/40'}>R${opt.price.toFixed(2)}</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] text-white/60 hover:bg-white/[0.04] transition-colors cursor-pointer">
              Cancelar
            </button>
            <button onClick={handlePurchase}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors cursor-pointer">
              {`Comprar R$${CREDIT_TOPUPS[selectedTopup].price.toFixed(2)}`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ---- Logged-in Pricing (Lovable-style) ----
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
  const [activeSection, setActiveSection] = useState<'none' | 'redeem' | 'gift'>('none');
  const [giftLoading, setGiftLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [purchasedGiftCredits, setPurchasedGiftCredits] = useState<number>(0);

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
    if (tab === 'home') navigate('/');
    else if (tab === 'projects') navigate('/');
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim() || !user || !companyId) return;
    setRedeemLoading(true);
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', redeemCode.trim().toUpperCase())
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
      // Check if already redeemed
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
        // Add credits
        const { error: rpcErr } = await supabase.rpc('add_ai_credits', {
          p_company_id: companyId,
          p_amount: coupon.credits_amount,
          p_description: `Resgate de cupom: ${coupon.code}`,
        });
        if (rpcErr) throw rpcErr;
      } else if (coupon.coupon_type === 'plan' && coupon.plan_type) {
        // Activate plan
        await supabase.from('subscriptions').update({
          plan_type: coupon.plan_type as any,
          status: 'active' as any,
          monthly_price: 0,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (coupon.plan_months || 1) * 30 * 86400000).toISOString(),
        }).eq('company_id', companyId);
      }

      // Record redemption & increment usage
      await supabase.from('coupon_redemptions').insert({
        coupon_id: coupon.id,
        user_id: user.id,
        company_id: companyId,
      });

      toast.success(
        coupon.coupon_type === 'credits'
          ? `+${coupon.credits_amount} créditos adicionados! 🎉`
          : `Plano ${coupon.plan_type} ativado por ${coupon.plan_months || 1} mês(es)! 🎉`
      );
      setRedeemCode('');
      // Refresh data
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
          {/* Page header */}
          <h1 className="text-2xl font-bold text-white mb-1">Plano & Créditos</h1>
          <p className="text-sm text-white/40 mb-8">Gerencie seu plano e saldo de créditos.</p>

          {loading ? (
            <div className="py-20 text-center text-white/30">Carregando...</div>
          ) : (
            <>
              {/* Top cards: Plan + Credits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Current plan card */}
                <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ backgroundColor: 'rgba(20,20,28,0.8)' }}>
                 <p className="text-white font-semibold text-sm">Você está no plano {planLabel}</p>
                  {isActive && subscription?.current_period_end && (
                    <p className="text-white/30 text-xs mt-1">
                      Renova em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Credits remaining */}
                <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ backgroundColor: 'rgba(20,20,28,0.8)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-sm font-medium">Créditos restantes</p>
                    <p className="text-white text-sm font-semibold">{Math.floor(creditBalance)} de {maxCredits}</p>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/[0.06] mb-3">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all"
                      style={{ width: `${Math.min(100, (creditBalance / maxCredits) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <Check className="w-3 h-3" /> {maxCredits} créditos mensais inclusos
                    </div>

                    {/* Dropdown de créditos */}
                    <div className="relative">
                      <button
                        onClick={() => setShowTopUpDropdown(!showTopUpDropdown)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium border border-white/[0.12] text-white/70 hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        Comprar créditos
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showTopUpDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowTopUpDropdown(false)} />
                          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/[0.08] z-50 py-1 shadow-xl" style={{ backgroundColor: '#1a1a24' }}>
                            {CREDIT_TOPUPS.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => { setSelectedTopup(i); setShowTopUpDropdown(false); setShowTopUp(true); }}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-white/70 hover:bg-white/[0.06] transition-colors cursor-pointer"
                              >
                                <span>+{opt.credits} créditos</span>
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

              {/* Plans grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((plan, i) => {
                  const isCurrent = isActive && currentPlanKey ? plan.key === currentPlanKey : false;
                  return (
                    <motion.div
                      key={plan.key}
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
                      transition={{ delay: 0.1 * i, duration: 0.4 }}
                    >
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold text-white bg-purple-600">
                          Seu plano
                        </div>
                      )}
                      {!isCurrent && plan.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold text-white bg-purple-600/70">
                          {plan.badge}
                        </div>
                      )}

                      <h3 className="text-white text-base font-semibold mb-1">{plan.name}</h3>
                      <p className="text-white/40 text-xs leading-relaxed mb-4 min-h-[32px]">{plan.description}</p>

                      <div className="mb-1">
                        <span className="text-white text-2xl font-bold">{plan.price}</span>
                        {plan.period && <span className="text-white/40 text-xs ml-1">{plan.period}</span>}
                      </div>
                      <p className="text-white/25 text-[11px] mb-4">{plan.subtitle}</p>

                      <button
                        onClick={() => {
                          if (plan.key === 'enterprise') {
                            window.open('mailto:contato@ellocontent.com?subject=Plano Enterprise', '_blank');
                          } else if (!isCurrent) {
                            navigate(`/checkout?plano=${plan.key}`);
                          }
                        }}
                        disabled={isCurrent}
                        className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer mb-4 ${
                          isCurrent
                            ? 'bg-white/[0.06] text-white/30 cursor-default'
                            : plan.badge || plan.key === currentPlanKey
                            ? 'bg-purple-600 text-white hover:bg-purple-500'
                            : 'border border-white/[0.12] text-white/70 hover:bg-white/[0.06]'
                        }`}
                      >
                        {isCurrent ? 'Plano atual' : plan.key === 'enterprise' ? 'Falar com vendas' : 'Assinar'}
                      </button>

                      <p className="text-white/40 text-[11px] font-medium mb-2">{plan.includedLabel}</p>
                      <ul className="space-y-1.5 flex-1">
                        {plan.features.map(feat => (
                          <li key={feat} className="flex items-start gap-1.5 text-white/50 text-[11px] leading-relaxed">
                            <Check className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}
              </div>

              {/* Redeem code section */}
              <div className="mt-8 rounded-2xl p-5 border border-white/[0.06]" style={{ backgroundColor: 'rgba(20,20,28,0.8)' }}>
                <h3 className="text-white text-sm font-semibold mb-1">🎁 Resgatar código</h3>
                <p className="text-white/30 text-xs mb-4">Tem um código de presente? Resgate créditos ou planos aqui.</p>
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
              </div>
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

      <motion.div className="text-center pt-12 pb-16 px-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Preços</h1>
        <p className="text-white/40 text-sm md:text-base max-w-md mx-auto">Escolha o plano ideal para escalar sua produção de conteúdo.</p>
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            className="relative rounded-2xl p-6 flex flex-col"
            style={{
              backgroundColor: 'rgba(20, 20, 28, 0.8)',
              border: plan.badge ? '1px solid rgba(123, 80, 220, 0.4)' : '1px solid rgba(255,255,255,0.07)',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * i, duration: 0.5 }}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white bg-[#7B50DC]">{plan.badge}</div>
            )}
            <h3 className="text-white text-lg font-semibold mb-1">{plan.name}</h3>
            <p className="text-white/40 text-xs leading-relaxed mb-5 min-h-[36px]">{plan.description}</p>
            <div className="mb-1">
              <span className="text-white text-3xl font-bold">{plan.price}</span>
              {plan.period && <span className="text-white/40 text-sm ml-1.5">{plan.period}</span>}
            </div>
            <p className="text-white/30 text-xs mb-6">{plan.subtitle}</p>
            <button
              onClick={() => {
                if (plan.key === 'enterprise') window.open('mailto:contato@ellocontent.com?subject=Plano Enterprise', '_blank');
                else navigate('/auth');
              }}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer mb-6 ${
                plan.badge ? 'bg-[#7B50DC] text-white hover:bg-[#6a42c4]' : 'border border-white/20 text-white hover:bg-white/10'
              }`}
            >
              {plan.key === 'enterprise' ? 'Falar com vendas' : 'Começar agora'}
            </button>
            <p className="text-white/50 text-xs font-medium mb-3">{plan.includedLabel}</p>
            <ul className="space-y-2.5 flex-1">
              {plan.features.map(feat => (
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

export default function Pricing() {
  const { user } = useAuth();

  if (user) return <LoggedInPricing />;
  return <PublicPricing />;
}
