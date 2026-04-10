import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, QrCode, Check, Loader2, Sparkles, Zap, Lock, Copy, Tag, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { getAffiliateRef } from '@/hooks/useAffiliateTracking';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import { toast } from '@/hooks/use-toast';

const PLANS: Record<string, { name: string; annualPrice: number; monthlyPrice: number; credits: number; extraPrice: string; features: string[] }> = {
  test: {
    name: 'Teste', annualPrice: 1.00, monthlyPrice: 1.00, credits: 5, extraPrice: 'R$1,00',
    features: ['Plano de teste — R$1,00', '5 créditos para testar', 'Acesso temporário'],
  },
  starter: {
    name: 'Starter', annualPrice: 69.90, monthlyPrice: 89.90, credits: 50, extraPrice: 'R$1,50',
    features: ['~7 carrosséis simples de 6 cards', '~25 posts estáticos simples', 'Modo Simples', 'Exportação PNG/JPG', 'Galeria de marca — 1GB'],
  },
  pro: {
    name: 'Pro', annualPrice: 129.90, monthlyPrice: 159.90, credits: 100, extraPrice: 'R$1,20',
    features: ['~14 carrosséis simples ou ~7 avançados', '~50 posts simples ou ~33 avançados', 'Modo Avançado', 'Estilos do Marketplace', 'Suporte prioritário'],
  },
  growth: {
    name: 'Growth', annualPrice: 219.90, monthlyPrice: 269.90, credits: 200, extraPrice: 'R$0,90',
    features: ['~28 carrosséis simples ou ~15 avançados/Extreme', '~100 posts simples ou ~66 avançados', 'Modo Extreme', 'Templates personalizados', 'Workspace de equipe'],
  },
};

const CREDIT_TOPUPS = [
  { credits: 10, price: 15 },
  { credits: 25, price: 30 },
  { credits: 50, price: 55 },
  { credits: 100, price: 99 },
  { credits: 250, price: 220 },
  { credits: 500, price: 399 },
];

const GIFT_PRICES: Record<number, number> = {
  100: 129.90,
  200: 209.90,
  300: 239.90,
};

// ── Format helpers ──
const formatCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};
const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const formatCardNumber = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
};

const inputStyle = { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' };

function CheckoutContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Mode: 'plan' for subscription, 'credits' for avulso, 'style' for marketplace style, 'gift' for presente
  const modoParam = searchParams.get('modo');
  const mode = modoParam === 'creditos' ? 'credits' : modoParam === 'style' ? 'style' : modoParam === 'presente' ? 'gift' : 'plan';
  const planKey = searchParams.get('plano') || 'starter';
  const billingPeriod = searchParams.get('periodo') || searchParams.get('billing') || 'annual';
  const isAnnual = billingPeriod === 'annual';
  const creditIdx = parseInt(searchParams.get('creditos') || '2');
  const plan = PLANS[planKey] || PLANS.starter;
  const planPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const creditPack = CREDIT_TOPUPS[creditIdx] || CREDIT_TOPUPS[2];

  // Gift params
  const giftCredits = parseInt(searchParams.get('credits') || '100');
  const giftPrice = parseFloat(searchParams.get('price') || '129.90');

  // Style purchase params
  const styleId = searchParams.get('style_id');
  const styleName = searchParams.get('style_name') ? decodeURIComponent(searchParams.get('style_name')!) : '';
  const stylePrice = parseFloat(searchParams.get('style_price') || '9.90');

  const metodoParam = searchParams.get('metodo');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>(metodoParam === 'pix' ? 'pix' : 'credit_card');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'pix'>('form');
  const [pixData, setPixData] = useState<{ qrCode?: string; qrCodeUrl?: string } | null>(null);

  // Customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  
  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount_percent: number; discount_fixed: number } | null>(null);

  // Admin check
  const isAdmin = user?.email === 'admin@gmail.com';

  useEffect(() => {
    if (!user) return;
    const fetchBalance = async () => {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).single();
      if (!cu) return;
      const { data } = await supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).single();
      setCurrentBalance(data?.balance || 0);
    };
    fetchBalance();
  }, [user]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('id, code, coupon_type, discount_percent, discount_fixed, max_uses, current_uses, expires_at')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .eq('coupon_type', 'discount')
        .maybeSingle();

      if (error || !coupon) {
        toast({ title: 'Cupom inválido', description: 'Verifique o código e tente novamente.', variant: 'destructive' });
        return;
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast({ title: 'Cupom expirado', variant: 'destructive' });
        return;
      }
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast({ title: 'Cupom esgotado', variant: 'destructive' });
        return;
      }
      const { data: existing } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (existing) {
        toast({ title: 'Você já usou este cupom', variant: 'destructive' });
        return;
      }
      setAppliedCoupon({
        id: coupon.id,
        code: coupon.code,
        discount_percent: coupon.discount_percent || 0,
        discount_fixed: coupon.discount_fixed || 0,
      });
      toast({ title: `Cupom ${coupon.code} aplicado!` });
    } catch {
      toast({ title: 'Erro ao validar cupom', variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleAdminConfirm = async () => {
    if (!isAdmin || !user) return;
    setLoading(true);
    setStep('processing');
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).single();
      if (!cu) throw new Error('Sem empresa');

      if (mode === 'plan') {
        // Activate subscription directly
        const planConfig = PLANS[planKey];
        await supabase.from('subscriptions').upsert({
          company_id: cu.company_id,
          plan_type: planKey as any,
          status: 'active' as any,
          monthly_price: isAnnual ? planConfig.annualPrice : planConfig.monthlyPrice,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        }, { onConflict: 'company_id' });

        // Add credits
        await supabase.rpc('add_ai_credits', {
          p_company_id: cu.company_id,
          p_amount: planConfig.credits,
          p_description: `Admin: Plano ${planConfig.name} ativado`,
        });
      } else if (mode === 'credits') {
        await supabase.rpc('add_ai_credits', {
          p_company_id: cu.company_id,
          p_amount: creditPack.credits,
          p_description: `Admin: +${creditPack.credits} créditos`,
        });
      } else if (mode === 'gift') {
        // For gift, redirect back to presentear to generate key
        setStep('success');
        setLoading(false);
        return;
      } else if (mode === 'style' && styleId) {
        await supabase.from('marketplace_purchases' as any).insert({
          user_id: user.id,
          company_id: cu.company_id,
          style_id: styleId,
          payment_method: 'admin',
          amount_paid: 0,
        } as any);
      }

      setStep('success');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || !customerDocument.trim()) {
      toast({ title: 'Preencha nome e CPF', variant: 'destructive' });
      return;
    }

    const needsCard = mode === 'plan' || paymentMethod === 'credit_card';
    if (needsCard) {
      const cardDigits = cardNumber.replace(/\D/g, '');
      if (cardDigits.length < 13 || !cardHolder.trim() || cardExpiry.length < 5 || cardCvv.length < 3) {
        toast({ title: 'Preencha todos os dados do cartão', variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    setStep('processing');

    try {
      const expiryParts = cardExpiry.split('/');
      const expMonth = parseInt(expiryParts[0] || '0');
      const expYear = parseInt(`20${expiryParts[1] || '00'}`);

      const customer = {
        name: customerName,
        email: user?.email || '',
        document: customerDocument.replace(/\D/g, ''),
        phone: customerPhone.replace(/\D/g, '') || '11999999999',
      };

      const cardData = needsCard ? {
        number: cardNumber.replace(/\D/g, ''),
        holder_name: cardHolder,
        exp_month: expMonth,
        exp_year: expYear,
        cvv: cardCvv,
      } : undefined;

      let body: any;

      if (mode === 'plan') {
        body = {
          action: 'subscribe',
          plan_id: planKey,
          customer,
          card: cardData,
        };
      } else if (mode === 'style') {
        body = {
          action: 'buy_style',
          style_id: styleId,
          price_cents: Math.round(stylePrice * 100),
          payment_method: paymentMethod,
          customer,
          card: cardData,
        };
      } else if (mode === 'gift') {
        body = {
          action: 'buy_credits',
          credits: giftCredits,
          price_cents: Math.round(giftPrice * 100),
          payment_method: paymentMethod,
          customer,
          card: cardData,
          is_gift: true,
        };
      } else {
        body = {
          action: 'buy_credits',
          credits: creditPack.credits,
          price_cents: creditPack.price * 100,
          payment_method: paymentMethod,
          customer,
          card: cardData,
        };
      }

      // Attach affiliate tracking if present
      const affiliateRef = getAffiliateRef();
      if (affiliateRef) {
        body.affiliate_code = affiliateRef;
      }

      // Attach coupon discount
      if (appliedCoupon) {
        body.coupon_code = appliedCoupon.code;
        body.coupon_discount_percent = appliedCoupon.discount_percent;
        body.coupon_discount_fixed = appliedCoupon.discount_fixed;
      }

      const { data, error } = await supabase.functions.invoke('pagarme-checkout', { body });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || data?.details || 'Erro no pagamento');

      // Coupon usage is now recorded server-side in the edge function

      if (paymentMethod === 'pix' && data.pix) {
        setPixData({
          qrCode: data.pix.qr_code,
          qrCodeUrl: data.pix.qr_code_url,
        });
        setStep('pix');
      } else {
        setStep('success');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast({ title: 'Erro no checkout', description: err.message || 'Tente novamente', variant: 'destructive' });
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const basePrice = mode === 'plan' ? planPrice : mode === 'style' ? stylePrice : mode === 'gift' ? giftPrice : creditPack.price;
  const discount = appliedCoupon
    ? appliedCoupon.discount_percent > 0
      ? basePrice * (appliedCoupon.discount_percent / 100)
      : appliedCoupon.discount_fixed
    : 0;
  const displayPrice = Math.max(0, basePrice - discount);
  const displayTitle = mode === 'plan' ? `Plano ${plan.name} (${isAnnual ? 'Anual' : 'Mensal'})` : mode === 'style' ? `Estilo: ${styleName}` : mode === 'gift' ? `Presente: ${giftCredits} créditos` : `+${creditPack.credits} créditos`;
  const displaySubtitle = mode === 'plan'
    ? `${plan.credits} créditos/mês • Crédito extra: ${plan.extraPrice}`
    : mode === 'style'
    ? `Compra avulsa do estilo do Marketplace`
    : mode === 'gift'
    ? `Chave de presente para enviar a alguém`
    : `Créditos avulsos para uso imediato`;

  const handleSuccessAction = () => {
    if (mode === 'gift') {
      navigate(`/presentear?purchased=true&credits=${giftCredits}&price=${giftPrice}`);
    } else if (mode === 'style') {
      navigate('/?tab=marketplace');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-lg mx-auto px-4 py-8 md:py-16">
        <button onClick={() => navigate(mode === 'gift' ? '/presentear' : '/precos')} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 cursor-pointer transition-colors">
          <ArrowLeft className="w-4 h-4" /> {mode === 'gift' ? 'Voltar' : 'Voltar aos planos'}
        </button>

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {/* Summary */}
              <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: 'rgba(20, 20, 28, 0.8)', border: '1px solid rgba(123, 80, 220, 0.3)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-white text-xl font-bold">{displayTitle}</h2>
                    <p className="text-white/40 text-xs mt-0.5">{displaySubtitle}</p>
                  </div>
                  <div className="text-right">
                    {discount > 0 && (
                      <span className="text-white/30 text-sm line-through block">R${basePrice.toFixed(2).replace('.', ',')}</span>
                    )}
                    <span className="text-white text-2xl font-bold">R${displayPrice.toFixed(2).replace('.', ',')}</span>
                    <span className="text-white/40 text-xs block">{mode === 'plan' ? '/mês' : ''}</span>
                  </div>
                </div>
                {currentBalance !== null && mode !== 'gift' && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(123, 80, 220, 0.8)' }}>
                    <Sparkles className="w-3 h-3" /> Saldo atual: {Math.floor(currentBalance)} créditos
                  </div>
                )}
              </div>

              {/* Admin bypass button */}
              {isAdmin && (
                <button
                  onClick={handleAdminConfirm}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all mb-6 disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80' }}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Confirmar admin
                </button>
              )}

              {/* Coupon */}
              <div className="mb-6">
                <h3 className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wider">Cupom de desconto</h3>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(123, 80, 220, 0.1)', border: '1px solid rgba(123, 80, 220, 0.25)' }}>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" style={{ color: '#7B50DC' }} />
                      <span className="text-sm text-white/80 font-medium">{appliedCoupon.code}</span>
                      <span className="text-xs" style={{ color: '#7B50DC' }}>
                        {appliedCoupon.discount_percent > 0 ? `-${appliedCoupon.discount_percent}%` : `-R$${appliedCoupon.discount_fixed.toFixed(2).replace('.', ',')}`}
                      </span>
                    </div>
                    <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="text-white/30 hover:text-white/60 text-xs cursor-pointer">Remover</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite o cupom"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all disabled:opacity-40"
                      style={{ backgroundColor: 'rgba(123, 80, 220, 0.2)', color: '#7B50DC', border: '1px solid rgba(123, 80, 220, 0.3)' }}
                    >
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                    </button>
                  </div>
                )}
              </div>

              {/* Payment method - show toggle for credits and gifts */}
              {(mode === 'credits' || mode === 'gift') && (
                <>
                  <h3 className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wider">Método de pagamento</h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {(['credit_card', 'pix'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className="flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all text-sm"
                        style={{
                          backgroundColor: paymentMethod === m ? 'rgba(123, 80, 220, 0.15)' : 'rgba(255,255,255,0.03)',
                          border: paymentMethod === m ? '1px solid rgba(123, 80, 220, 0.4)' : '1px solid rgba(255,255,255,0.07)',
                          color: paymentMethod === m ? '#ffffff' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {m === 'credit_card' ? <CreditCard className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                        {m === 'credit_card' ? 'Cartão' : 'PIX'}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {mode === 'plan' && (
                <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: 'rgba(123, 80, 220, 0.1)', border: '1px solid rgba(123, 80, 220, 0.2)', color: 'rgba(123, 80, 220, 0.9)' }}>
                  <CreditCard className="w-3.5 h-3.5" />
                  Planos mensais são cobrados via cartão de crédito com renovação automática.
                </div>
              )}

              {/* Card fields */}
              {(mode === 'plan' || paymentMethod === 'credit_card') && (
                <>
                  <h3 className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wider">Dados do cartão</h3>
                  <div className="space-y-3 mb-6">
                    <input type="text" placeholder="Número do cartão" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                    <input type="text" placeholder="Nome no cartão" value={cardHolder} onChange={e => setCardHolder(e.target.value.toUpperCase())} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="MM/AA" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                      <input type="text" placeholder="CVV" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                    </div>
                  </div>
                </>
              )}

              {/* Customer info */}
              <h3 className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wider">Dados do pagante</h3>
              <div className="space-y-3 mb-6">
                <input type="text" placeholder="Nome completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                <input type="text" placeholder="CPF" value={customerDocument} onChange={e => setCustomerDocument(formatCPF(e.target.value))} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                <input type="text" placeholder="Telefone (opcional)" value={customerPhone} onChange={e => setCustomerPhone(formatPhone(e.target.value))} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>

              {/* Features (plan only) */}
              {mode === 'plan' && (
                <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-white/40 text-xs font-medium mb-2">Incluso no plano:</p>
                  <ul className="space-y-1.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-white/60 text-xs">
                        <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#7B50DC' }} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-50" style={{ backgroundColor: '#7B50DC', color: '#ffffff' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : mode === 'plan' ? `Assinar por R$${displayPrice.toFixed(2).replace('.', ',')}/mês` : `Pagar R$${displayPrice.toFixed(2).replace('.', ',')}`}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3">
                <Lock className="w-3 h-3 text-white/20" />
                <p className="text-white/20 text-[10px]">Pagamento seguro processado por Pagar.me{mode === 'plan' ? '. Cancele quando quiser.' : '.'}</p>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#7B50DC' }} />
              <p className="text-white/60 text-sm">Processando...</p>
            </motion.div>
          )}

          {step === 'pix' && pixData && (
            <motion.div key="pix" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-8">
              <QrCode className="w-8 h-8 mb-4" style={{ color: '#7B50DC' }} />
              <h2 className="text-white text-xl font-bold mb-2">Pague com PIX</h2>
              <p className="text-white/40 text-sm mb-6 text-center">Escaneie o QR Code ou copie o código para pagar R${displayPrice}</p>
              {pixData.qrCodeUrl && <img src={pixData.qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 rounded-lg mb-4" />}
              {pixData.qrCode && (
                <button
                  onClick={() => { navigator.clipboard.writeText(pixData.qrCode!); toast({ title: 'Código PIX copiado!' }); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs cursor-pointer transition-colors mb-4"
                  style={{ backgroundColor: 'rgba(123, 80, 220, 0.2)', color: '#7B50DC', border: '1px solid rgba(123, 80, 220, 0.3)' }}
                >
                  <Copy className="w-3 h-3" /> Copiar código PIX
                </button>
              )}
              <p className="text-white/30 text-xs">Após o pagamento, seus créditos serão adicionados automaticamente.</p>
              <button onClick={() => navigate('/precos')} className="mt-6 text-white/40 text-xs hover:text-white/60 cursor-pointer transition-colors">
                Voltar aos planos
              </button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(123, 80, 220, 0.15)' }}>
                <Zap className="w-8 h-8" style={{ color: '#7B50DC' }} />
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">
                {mode === 'plan' ? 'Assinatura ativa!' : mode === 'style' ? 'Estilo adquirido!' : mode === 'gift' ? 'Pagamento confirmado!' : 'Créditos adicionados!'}
              </h2>
              <p className="text-white/50 text-sm mb-8 text-center">
                {mode === 'plan'
                  ? `${plan.credits} créditos foram adicionados à sua conta.`
                  : mode === 'style'
                  ? `O estilo "${styleName}" já está disponível.`
                  : mode === 'gift'
                  ? `Agora vamos gerar sua chave de presente.`
                  : `+${creditPack.credits} créditos adicionados ao seu saldo.`}
              </p>
              <button onClick={handleSuccessAction} className="px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all" style={{ backgroundColor: '#7B50DC', color: '#ffffff' }}>
                {mode === 'gift' ? 'Gerar chave de presente' : mode === 'style' ? 'Voltar ao Marketplace' : 'Começar a criar'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    if (tab === 'home') navigate('/');
    else if (tab === 'projects') navigate('/');
    else if (tab === 'pricing') navigate('/precos');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#0a0a0f' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7B50DC' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="hidden md:block">
        <DashboardSidebar activeTab="pricing" onTabChange={handleTabChange} onSearch={() => {}} />
      </div>
      <CheckoutContent />
    </div>
  );
}
