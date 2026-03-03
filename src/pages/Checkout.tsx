import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, QrCode, Check, Loader2, Sparkles, Zap, Lock } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import { toast } from '@/hooks/use-toast';

const PLANS: Record<string, { name: string; price: number; credits: number; extraPrice: string; features: string[] }> = {
  starter: {
    name: 'Starter',
    price: 49,
    credits: 40,
    extraPrice: 'R$2,50',
    features: ['40 créditos mensais', 'Em média 5 carrosséis de 8 slides', 'Geração com IA', 'Exportação em imagem'],
  },
  pro: {
    name: 'Pro',
    price: 97,
    credits: 100,
    extraPrice: 'R$2,00',
    features: ['100 créditos mensais', 'Em média 12 carrosséis de 8 slides', 'IA avançada (Nano Banana)', 'Publicação em redes sociais', 'Suporte prioritário'],
  },
  growth: {
    name: 'Growth',
    price: 197,
    credits: 250,
    extraPrice: 'R$1,50',
    features: ['250 créditos mensais', 'Em média 31 carrosséis de 8 slides', 'Templates de design', 'Workspace de equipe', 'Projetos privados'],
  },
};

function CheckoutContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const planKey = searchParams.get('plano') || 'starter';
  const plan = PLANS[planKey] || PLANS.starter;

  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'pix'>('form');
  const [pixData, setPixData] = useState<{ qrCode?: string; qrCodeUrl?: string; expiration?: string } | null>(null);

  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Credit balance
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

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

  const formatCPF = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || !customerDocument.trim()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    if (paymentMethod === 'credit_card') {
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

      const body: any = {
        plan_id: planKey,
        billing_cycle: 'monthly',
        payment_method: paymentMethod,
        customer: {
          name: customerName,
          email: user?.email || '',
          document: customerDocument.replace(/\D/g, ''),
          phone: customerPhone.replace(/\D/g, '') || '11999999999',
        },
      };

      if (paymentMethod === 'credit_card') {
        body.card = {
          number: cardNumber.replace(/\D/g, ''),
          holder_name: cardHolder,
          exp_month: expMonth,
          exp_year: expYear,
          cvv: cardCvv,
        };
      }

      const { data, error } = await supabase.functions.invoke('pagarme-checkout', { body });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro no pagamento');

      if (paymentMethod === 'pix' && data.pix) {
        setPixData({
          qrCode: data.pix.qr_code,
          qrCodeUrl: data.pix.qr_code_url,
          expiration: data.pix.expires_at,
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
    navigate('/auth');
    return null;
  }

  const inputStyle = { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-lg mx-auto px-4 py-8 md:py-16">
        {/* Back */}
        <button
          onClick={() => navigate('/precos')}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar aos planos
        </button>

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {/* Plan summary */}
              <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: 'rgba(20, 20, 28, 0.8)', border: '1px solid rgba(123, 80, 220, 0.3)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-white text-xl font-bold">Plano {plan.name}</h2>
                    <p className="text-white/40 text-xs mt-0.5">{plan.credits} créditos/mês • Crédito extra: {plan.extraPrice}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-white text-2xl font-bold">R${plan.price}</span>
                    <span className="text-white/40 text-xs block">/mês</span>
                  </div>
                </div>
                {currentBalance !== null && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(123, 80, 220, 0.8)' }}>
                    <Sparkles className="w-3 h-3" />
                    Saldo atual: {currentBalance} créditos
                  </div>
                )}
              </div>

              {/* Payment method */}
              <h3 className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wider">Método de pagamento</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('credit_card')}
                  className="flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all text-sm"
                  style={{
                    backgroundColor: paymentMethod === 'credit_card' ? 'rgba(123, 80, 220, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: paymentMethod === 'credit_card' ? '1px solid rgba(123, 80, 220, 0.4)' : '1px solid rgba(255,255,255,0.07)',
                    color: paymentMethod === 'credit_card' ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  <CreditCard className="w-4 h-4" /> Cartão
                </button>
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className="flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all text-sm"
                  style={{
                    backgroundColor: paymentMethod === 'pix' ? 'rgba(123, 80, 220, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: paymentMethod === 'pix' ? '1px solid rgba(123, 80, 220, 0.4)' : '1px solid rgba(255,255,255,0.07)',
                    color: paymentMethod === 'pix' ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  <QrCode className="w-4 h-4" /> PIX
                </button>
              </div>

              {/* Card fields */}
              {paymentMethod === 'credit_card' && (
                <>
                  <h3 className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wider">Dados do cartão</h3>
                  <div className="space-y-3 mb-6">
                    <input
                      type="text"
                      placeholder="Número do cartão"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      placeholder="Nome no cartão"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={inputStyle}
                      />
                      <input
                        type="text"
                        placeholder="CVV"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Customer info */}
              <h3 className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wider">Dados do pagante</h3>
              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="CPF"
                  value={customerDocument}
                  onChange={(e) => setCustomerDocument(formatCPF(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Telefone (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Features */}
              <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-white/40 text-xs font-medium mb-2">Incluso no plano:</p>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-white/60 text-xs">
                      <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#7B50DC' }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-50"
                style={{ backgroundColor: '#7B50DC', color: '#ffffff' }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  `Assinar por R$${plan.price}/mês`
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3">
                <Lock className="w-3 h-3 text-white/20" />
                <p className="text-white/20 text-[10px]">
                  Pagamento seguro processado por Pagar.me. Cancele quando quiser.
                </p>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#7B50DC' }} />
              <p className="text-white/60 text-sm">Processando pagamento...</p>
            </motion.div>
          )}

          {step === 'pix' && pixData && (
            <motion.div key="pix" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-8">
              <QrCode className="w-8 h-8 mb-4" style={{ color: '#7B50DC' }} />
              <h2 className="text-white text-xl font-bold mb-2">Pague com PIX</h2>
              <p className="text-white/40 text-sm mb-6 text-center">
                Escaneie o QR Code abaixo ou copie o código PIX para pagar R${plan.price}
              </p>
              {pixData.qrCodeUrl && (
                <img src={pixData.qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 rounded-lg mb-4" />
              )}
              {pixData.qrCode && (
                <button
                  onClick={() => { navigator.clipboard.writeText(pixData.qrCode!); toast({ title: 'Código PIX copiado!' }); }}
                  className="px-4 py-2 rounded-lg text-xs cursor-pointer transition-colors mb-4"
                  style={{ backgroundColor: 'rgba(123, 80, 220, 0.2)', color: '#7B50DC', border: '1px solid rgba(123, 80, 220, 0.3)' }}
                >
                  Copiar código PIX
                </button>
              )}
              <p className="text-white/30 text-xs">Após o pagamento, seus créditos serão adicionados automaticamente.</p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(123, 80, 220, 0.15)' }}>
                <Zap className="w-8 h-8" style={{ color: '#7B50DC' }} />
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">Assinatura ativa! 🎉</h2>
              <p className="text-white/50 text-sm mb-8 text-center">
                {plan.credits} créditos foram adicionados à sua conta. Vamos criar!
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                style={{ backgroundColor: '#7B50DC', color: '#ffffff' }}
              >
                Começar a criar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;

  const handleTabChange = (tab: string) => {
    if (tab === 'home') navigate('/');
    else if (tab === 'projects') navigate('/');
    else if (tab === 'pricing') navigate('/precos');
  };

  if (isLoggedIn) {
    return (
      <div className="flex h-screen w-full" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="hidden md:block">
          <DashboardSidebar activeTab="pricing" onTabChange={handleTabChange} onSearch={() => {}} />
        </div>
        <CheckoutContent />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto z-50" style={{ backgroundColor: '#0a0a0f' }}>
      <CheckoutContent />
    </div>
  );
}
