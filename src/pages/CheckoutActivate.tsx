import React, { useState } from 'react';
import { ArrowLeft, Check, CreditCard, Loader2, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TRIAL_BENEFITS = [
  'Teste grátis de 7 dias, cancele quando quiser',
  'Enviaremos um e-mail 2 dias antes do trial acabar',
  'Após o trial, você será cobrado automaticamente',
];

export default function CheckoutActivate() {
  const { user } = useAuth();
  const { isFree, refetch } = useSubscription();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [customer, setCustomer] = useState({ name: '', document: '', phone: '' });
  const [card, setCard] = useState({ number: '', holder_name: '', exp_month: '', exp_year: '', cvv: '' });

  const trialEndDate = format(addDays(new Date(), 7), "d 'de' MMMM, yyyy", { locale: ptBR });

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 16);
    const parts = [];
    for (let i = 0; i < v.length; i += 4) parts.push(v.substring(i, i + 4));
    return parts.join(' ');
  };

  const formatDocument = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 11);
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!customer.name || !customer.document || !customer.phone) throw new Error('Preencha todos os campos obrigatórios');
      if (!card.number || !card.holder_name || !card.exp_month || !card.exp_year || !card.cvv) throw new Error('Preencha todos os dados do cartão');

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Você precisa estar logado');

      const response = await supabase.functions.invoke('pagarme-checkout', {
        body: {
          plan_id: 'business',
          billing_cycle: 'monthly',
          payment_method: 'credit_card',
          customer: {
            name: customer.name,
            email: sessionData.session.user.email,
            document: customer.document.replace(/\D/g, ''),
            phone: customer.phone.replace(/\D/g, ''),
          },
          card: {
            number: card.number.replace(/\D/g, ''),
            holder_name: card.holder_name,
            exp_month: parseInt(card.exp_month),
            exp_year: parseInt(card.exp_year),
            cvv: card.cvv,
          },
        },
      });

      if (response.error) throw new Error(response.error.message || 'Erro ao processar');
      toast.success('🎉 Teste grátis de 7 dias ativado! Aproveite o Ellosuit Business.');
      await refetch();
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Activation error:', error);
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFree) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-10">
          {/* Left — Form */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Comece seu teste grátis
            </h1>

            <div className="space-y-3 mb-8">
              {TRIAL_BENEFITS.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{b}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Payment */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Pagamento</h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="card_number" className="text-xs text-muted-foreground">Número do cartão</Label>
                    <Input
                      id="card_number"
                      value={card.number}
                      onChange={(e) => setCard(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                      placeholder="1234 1234 1234 1234"
                      maxLength={19}
                      className="h-12"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="exp" className="text-xs text-muted-foreground">Data de validade</Label>
                      <div className="flex gap-2">
                        <Input
                          id="exp_month"
                          value={card.exp_month}
                          onChange={(e) => setCard(prev => ({ ...prev, exp_month: e.target.value.replace(/\D/g, '').substring(0, 2) }))}
                          placeholder="MM"
                          maxLength={2}
                          className="h-12"
                        />
                        <span className="flex items-center text-muted-foreground">/</span>
                        <Input
                          id="exp_year"
                          value={card.exp_year}
                          onChange={(e) => setCard(prev => ({ ...prev, exp_year: e.target.value.replace(/\D/g, '').substring(0, 4) }))}
                          placeholder="AAAA"
                          maxLength={4}
                          className="h-12"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-xs text-muted-foreground">Código de segurança</Label>
                      <Input
                        id="cvv"
                        type="password"
                        value={card.cvv}
                        onChange={(e) => setCard(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').substring(0, 4) }))}
                        placeholder="CVV"
                        maxLength={4}
                        className="h-12"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="holder_name" className="text-xs text-muted-foreground">Nome no cartão</Label>
                    <Input
                      id="holder_name"
                      value={card.holder_name}
                      onChange={(e) => setCard(prev => ({ ...prev, holder_name: e.target.value.toUpperCase() }))}
                      placeholder="NOME COMO NO CARTÃO"
                      className="h-12"
                    />
                  </div>
                </div>
              </section>

              {/* Billing details */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Dados de cobrança</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-xs text-muted-foreground">Nome completo</Label>
                    <Input
                      id="name"
                      value={customer.name}
                      onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Seu nome completo"
                      className="h-12"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="document" className="text-xs text-muted-foreground">CPF ou CNPJ</Label>
                    <Input
                      id="document"
                      value={customer.document}
                      onChange={(e) => setCustomer(prev => ({ ...prev, document: formatDocument(e.target.value) }))}
                      placeholder="000.000.000-00"
                      className="h-12"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs text-muted-foreground">Telefone</Label>
                    <Input
                      id="phone"
                      value={customer.phone}
                      onChange={(e) => setCustomer(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                      placeholder="(11) 99999-9999"
                      className="h-12"
                      required
                    />
                  </div>
                </div>
              </section>
            </form>
          </div>

          {/* Right — Summary card */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
              <h2 className="text-lg font-bold text-foreground">Seu plano trial</h2>

              <div>
                <p className="text-sm font-medium text-foreground mb-3">Ciclo de cobrança</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                    <span className="text-sm text-foreground">Mensal</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Ellosuit Business</span>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground line-through">R$ 297,00</span>
                    <p className="text-xs text-primary font-medium">Grátis por 7 dias!</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Cobrança em {trialEndDate}</span>
                  <span>R$ 297/mês</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Total hoje</span>
                  <span className="text-xl font-bold text-foreground">R$ 0</span>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full h-12 text-base rounded-xl"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Iniciar teste grátis
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Seu plano começa em {trialEndDate}, a menos que cancele. Cancele a qualquer momento.
              </p>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                Pagamento seguro via Pagar.me
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
