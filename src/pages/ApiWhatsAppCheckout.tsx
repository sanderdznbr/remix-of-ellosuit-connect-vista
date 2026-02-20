import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Shield, Check, CreditCard, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const BEEHIVE_PUBLIC_KEY = import.meta.env.VITE_BEEHIVE_PUBLIC_KEY || '';

interface Plan {
  id: string;
  label: string;
  sessions: number;
  price: number; // cents
  features: string[];
  recommended?: boolean;
}

const INSTALLMENT_FEES: Record<number, number> = {
  1: 3.99, 2: 13.83, 3: 14.28, 4: 15.24, 5: 16.18, 6: 17.11,
  7: 19.88, 8: 20.78, 9: 21.67, 10: 22.54, 11: 23.40, 12: 24.26,
};

const PLANS: Plan[] = [
  {
    id: 'starter',
    label: 'Starter',
    sessions: 1,
    price: 30000,
    features: ['1 sessão WhatsApp', '2.000 msgs/dia', 'Suporte por email', 'Rate limit: 30/min'],
  },
  {
    id: 'growth',
    label: 'Growth',
    sessions: 2,
    price: 54700,
    features: ['2 sessões WhatsApp', '5.000 msgs/dia', 'Suporte por email', 'Rate limit: 45/min', 'Webhooks'],
  },
  {
    id: 'professional',
    label: 'Professional',
    sessions: 3,
    price: 79700,
    features: ['3 sessões WhatsApp', '10.000 msgs/dia', 'Suporte prioritário', 'Rate limit: 60/min', 'Webhooks'],
    recommended: true,
  },
  {
    id: 'business',
    label: 'Business',
    sessions: 5,
    price: 149700,
    features: ['5 sessões WhatsApp', '20.000 msgs/dia', 'Suporte dedicado', 'Rate limit: 120/min', 'Webhooks + Analytics'],
  },
  {
    id: 'scale',
    label: 'Scale',
    sessions: 8,
    price: 219700,
    features: ['8 sessões WhatsApp', '40.000 msgs/dia', 'Suporte dedicado', 'Rate limit: 200/min', 'Webhooks + Analytics', 'SLA 99.5%'],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    sessions: 10,
    price: 300000,
    features: ['10 sessões WhatsApp', 'Msgs ilimitadas', 'Gerente de conta', 'Rate limit: custom', 'SLA 99.9%', 'IP dedicado'],
  },
];

declare global {
  interface Window {
    HopyPay?: {
      setPublicKey: (key: string) => void;
      setTestMode: (test: boolean) => void;
      encrypt: (card: { number: string; holderName: string; expMonth: number; expYear: number; cvv: string }) => Promise<string>;
      is3DSAvailable: () => Promise<boolean>;
      authenticate3DS: (opts: { amount: number; currency: string; installments: number; card: { number: string; holderName: string; expMonth: number; expYear: number; cvv: string } }) => Promise<void>;
    };
  }
}

const formatCurrency = (cents: number) => {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

const ApiWhatsAppCheckout: React.FC = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [installments, setInstallments] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Load BeehiveHub SDK
  useEffect(() => {
    if (document.querySelector('script[src*="paybeehive"]')) {
      setSdkLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://api.conta.paybeehive.com.br/v1/js';
    script.onload = () => {
      setSdkLoaded(true);
      if (window.HopyPay && BEEHIVE_PUBLIC_KEY) {
        window.HopyPay.setPublicKey(BEEHIVE_PUBLIC_KEY);
      }
    };
    document.head.appendChild(script);
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSub = async () => {
      if (!user) return;
      const { data: cu } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!cu) return;

      const { data } = await supabase
        .from('api_whatsapp_subscriptions')
        .select('*')
        .eq('company_id', cu.company_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setActiveSubscription(data[0]);
      }
    };
    checkSub();
  }, [user]);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const formatDocument = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '');
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/-$/, '');
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedPlan || !session) return;

    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 13 || !cardName || !cardExpiry || cardCvv.length < 3 || !customerDocument) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setProcessing(true);

    try {
      const [expMonth, expYear] = cardExpiry.split('/').map(Number);
      const fullExpYear = expYear < 100 ? 2000 + expYear : expYear;

      let cardToken = '';

      // Tokenize card via BeehiveHub SDK
      if (window.HopyPay) {
        // Try 3DS first
        const is3DS = await window.HopyPay.is3DSAvailable();
        if (is3DS) {
          await window.HopyPay.authenticate3DS({
            amount: selectedPlan.price,
            currency: 'brl',
            installments,
            card: {
              number: cleanCardNumber,
              holderName: cardName,
              expMonth,
              expYear: fullExpYear,
              cvv: cardCvv,
            },
          });
        }

        cardToken = await window.HopyPay.encrypt({
          number: cleanCardNumber,
          holderName: cardName,
          expMonth,
          expYear: fullExpYear,
          cvv: cardCvv,
        });
      } else {
        toast({ title: 'SDK de pagamento não carregado. Recarregue a página.', variant: 'destructive' });
        setProcessing(false);
        return;
      }

      // Call checkout edge function
      const { data, error } = await supabase.functions.invoke('beehive-checkout', {
        body: {
          plan_name: selectedPlan.id,
          installments,
          card_token: cardToken,
          customer_name: customerName || cardName,
          customer_document: customerDocument.replace(/\D/g, ''),
          customer_phone: customerPhone.replace(/\D/g, ''),
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: '🎉 Pagamento processado!', description: 'Sua assinatura da API WhatsApp está ativa.' });
        navigate('/dashboard/api-whatsapp');
      } else {
        throw new Error(data?.error || data?.details || 'Pagamento recusado');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast({
        title: 'Erro no pagamento',
        description: err.message || 'Tente novamente ou use outro cartão.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  }, [selectedPlan, cardNumber, cardName, cardExpiry, cardCvv, customerDocument, customerName, customerPhone, installments, session, toast, navigate]);

  const installmentAmount = selectedPlan ? Math.ceil(selectedPlan.price / installments) : 0;

  if (activeSubscription) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/dashboard/api-whatsapp')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Card>
            <CardContent className="p-8 text-center">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Assinatura Ativa</h2>
              <p className="text-muted-foreground mb-4">
                Plano <strong>{activeSubscription.plan_label}</strong> • {activeSubscription.sessions_included} sessões
              </p>
              <p className="text-sm text-muted-foreground">
                Válida até {new Date(activeSubscription.expires_at).toLocaleDateString('pt-BR')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #FF4500, #FF6B35, #FF8C42)' }} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptLTQgOHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Button variant="ghost" onClick={() => navigate('/dashboard/api-whatsapp')} className="text-white/90 hover:text-white hover:bg-white/15 mb-5 -ml-2 rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">API WhatsApp — Planos</h1>
                <p className="text-white/70 mt-0.5 text-sm md:text-base">Escolha o plano ideal para sua integração. Pagamento anual com até 12x.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {!selectedPlan ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-2xl overflow-hidden group ${
                  plan.recommended ? 'ring-2 ring-[#FF4500] shadow-lg shadow-[#FF4500]/10' : 'border-border hover:border-[#FF4500]/30'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #FF4500, #FF6B35)' }} />
                )}
                {plan.recommended && (
                  <Badge className="absolute top-3 right-3 bg-[#FF4500] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    ⭐ Recomendado
                  </Badge>
                )}
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold">{plan.label}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{plan.sessions} {plan.sessions === 1 ? 'sessão' : 'sessões'} WhatsApp</p>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight">{formatCurrency(plan.price)}</span>
                      <span className="text-sm text-muted-foreground font-medium">/ano</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ou 12x de {formatCurrency(Math.ceil(plan.price / 12))}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <ul className="space-y-2.5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm">
                          <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-foreground/80">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    className={`w-full mt-6 rounded-xl h-11 font-semibold transition-all ${
                      plan.recommended
                        ? 'text-white shadow-md shadow-[#FF4500]/20'
                        : 'bg-foreground/5 text-foreground hover:bg-foreground/10 border border-border'
                    }`}
                    style={plan.recommended ? { backgroundColor: '#FF4500' } : undefined}
                    variant={plan.recommended ? 'default' : 'ghost'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan);
                    }}
                  >
                    {plan.recommended ? 'Começar agora' : 'Selecionar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Checkout Form */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Payment Form */}
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Dados do Pagamento
                  </h3>

                  <div className="space-y-4">
                    {/* Customer info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome completo</Label>
                        <Input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Nome no cartão"
                        />
                      </div>
                      <div>
                        <Label>CPF/CNPJ *</Label>
                        <Input
                          value={customerDocument}
                          onChange={(e) => setCustomerDocument(formatDocument(e.target.value))}
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="11999999999"
                      />
                    </div>

                    <hr className="my-2" />

                    {/* Card fields */}
                    <div>
                      <Label>Número do cartão *</Label>
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                      />
                    </div>

                    <div>
                      <Label>Nome impresso no cartão *</Label>
                      <Input
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        placeholder="NOME COMPLETO"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Validade *</Label>
                        <Input
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          placeholder="MM/AA"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label>CVV *</Label>
                        <Input
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="123"
                          maxLength={4}
                          type="password"
                        />
                      </div>
                    </div>

                    {/* Installments */}
                    <div>
                      <Label>Parcelas</Label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                          const fee = INSTALLMENT_FEES[n] || 0;
                          return (
                            <option key={n} value={n}>
                              {n}x de {formatCurrency(Math.ceil(selectedPlan.price / n))}
                              {n === 1 ? ` (à vista) — ${fee}%` : ` — ${fee.toFixed(2).replace('.', ',')}%`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Shield className="h-4 w-4 text-green-500" />
                Pagamento seguro via PayBeeHive com criptografia 3DS
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Resumo do Pedido</h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plano</span>
                      <span className="font-medium">{selectedPlan.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sessões</span>
                      <span>{selectedPlan.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Período</span>
                      <span>Anual (12 meses)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parcelas</span>
                      <span>{installments}x de {formatCurrency(installmentAmount)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span style={{ color: '#FF4500' }}>{formatCurrency(selectedPlan.price)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 h-12 text-base font-semibold"
                    style={{ backgroundColor: '#FF4500' }}
                    disabled={processing || !sdkLoaded}
                    onClick={handleSubmit}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Assinar {formatCurrency(selectedPlan.price)}/ano
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full mt-2 text-sm"
                    onClick={() => setSelectedPlan(null)}
                    disabled={processing}
                  >
                    Trocar plano
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiWhatsAppCheckout;
