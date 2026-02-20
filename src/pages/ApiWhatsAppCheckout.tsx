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

const PLANS: Plan[] = [
  {
    id: 'starter',
    label: 'Starter',
    sessions: 1,
    price: 30000,
    features: ['1 sessão WhatsApp', '500 msgs/dia', 'Suporte por email', 'Rate limit: 30/min'],
  },
  {
    id: 'professional',
    label: 'Professional',
    sessions: 3,
    price: 79700,
    features: ['3 sessões WhatsApp', '2.000 msgs/dia', 'Suporte prioritário', 'Rate limit: 60/min', 'Webhooks'],
    recommended: true,
  },
  {
    id: 'business',
    label: 'Business',
    sessions: 5,
    price: 149700,
    features: ['5 sessões WhatsApp', '5.000 msgs/dia', 'Suporte dedicado', 'Rate limit: 120/min', 'Webhooks + Analytics'],
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="p-4 md:p-6" style={{ background: 'linear-gradient(135deg, #FF4500, #FF6B35)' }}>
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/dashboard/api-whatsapp')} className="text-white hover:bg-white/20 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Zap className="h-7 w-7" />
            API WhatsApp — Planos
          </h1>
          <p className="text-white/80 mt-1">Escolha o plano ideal para sua integração. Pagamento anual com até 12x no cartão.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Plan Selection */}
        {!selectedPlan ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  plan.recommended ? 'border-[#FF4500] ring-2 ring-[#FF4500]/20' : 'border-border'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.recommended && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FF4500] text-white text-xs">
                    Recomendado
                  </Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold">{plan.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.sessions} {plan.sessions === 1 ? 'sessão' : 'sessões'} WhatsApp</p>

                  <div className="mt-4">
                    <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                    <span className="text-sm text-muted-foreground">/ano</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ou 12x de {formatCurrency(Math.ceil(plan.price / 12))}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full mt-6"
                    style={{ backgroundColor: '#FF4500' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan);
                    }}
                  >
                    Selecionar
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
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}x de {formatCurrency(Math.ceil(selectedPlan.price / n))}
                            {n === 1 ? ' (à vista)' : ''}
                          </option>
                        ))}
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
