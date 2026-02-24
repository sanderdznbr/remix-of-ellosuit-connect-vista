import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Coins, Zap, TrendingDown, ShoppingCart, Bot, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreditBalance {
  balance: number;
  total_purchased: number;
  total_consumed: number;
}

interface CreditTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  agent_id: string | null;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_brl: number;
  description: string;
  is_popular: boolean;
}

const AiCreditsPage = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };
    fetchCompanyId();
  }, [user?.id]);

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    
    const [balRes, txRes, pkgRes] = await Promise.all([
      supabase.from('ai_credit_balances').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('ai_credit_transactions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
      supabase.from('ai_credit_packages').select('*').eq('is_active', true).order('sort_order'),
    ]);

    if (balRes.data) {
      setBalance({
        balance: Number(balRes.data.balance),
        total_purchased: Number(balRes.data.total_purchased),
        total_consumed: Number(balRes.data.total_consumed),
      });
    } else {
      setBalance({ balance: 0, total_purchased: 0, total_consumed: 0 });
    }

    setTransactions((txRes.data || []) as CreditTransaction[]);
    setPackages((pkgRes.data || []) as CreditPackage[]);
    setLoading(false);
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!companyId) return;
    
    const { error } = await supabase.rpc('add_ai_credits', {
      p_company_id: companyId,
      p_amount: pkg.credits,
      p_description: `Compra: ${pkg.name} (${pkg.credits} créditos)`,
    });
    
    if (error) {
      toast.error('Erro ao adicionar créditos');
      console.error(error);
    } else {
      toast.success(`${pkg.credits} créditos adicionados com sucesso!`);
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const usagePercent = balance && balance.total_purchased > 0
    ? Math.min(100, (balance.total_consumed / balance.total_purchased) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
          <Coins className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Créditos de IA</h1>
          <p className="text-muted-foreground text-sm">Gerencie o consumo dos seus agentes inteligentes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Saldo Atual</p>
                <p className="text-3xl font-bold text-primary">
                  {balance?.balance.toFixed(1) || '0.0'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">créditos disponíveis</p>
              </div>
              <Sparkles className="h-10 w-10 text-primary/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Comprado</p>
                <p className="text-2xl font-bold">{balance?.total_purchased.toFixed(1) || '0.0'}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Consumido</p>
                <p className="text-2xl font-bold">{balance?.total_consumed.toFixed(1) || '0.0'}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-muted-foreground/30" />
            </div>
            {balance && balance.total_purchased > 0 && (
              <Progress value={usagePercent} className="mt-3 h-1.5" />
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Comprar Créditos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative transition-all hover:shadow-lg ${
                pkg.is_popular ? 'border-2 border-primary shadow-primary/10' : ''
              }`}
            >
              {pkg.is_popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Mais Popular
                </Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-center">
                  <span className="text-3xl font-bold">{pkg.credits}</span>
                  <span className="text-muted-foreground ml-1">créditos</span>
                </div>
                <p className="text-center text-lg font-semibold text-primary mt-1">
                  R$ {pkg.price_brl.toFixed(2)}
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  R$ {(pkg.price_brl / pkg.credits).toFixed(3)}/crédito
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full gap-2"
                  variant={pkg.is_popular ? 'default' : 'outline'}
                  onClick={() => handlePurchase(pkg)}
                >
                  Comprar <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Histórico de Transações
        </h2>
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma transação registrada ainda.</p>
              <p className="text-sm">Os créditos são consumidos automaticamente quando seus agentes de IA respondem.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <Card key={tx.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      tx.transaction_type === 'consumption'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {tx.transaction_type === 'consumption' ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <Coins className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${
                      Number(tx.amount) < 0 ? 'text-destructive' : 'text-primary'
                    }`}>
                      {Number(tx.amount) > 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Saldo: {Number(tx.balance_after).toFixed(1)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4" /> Como funciona?
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• Cada mensagem enviada por um agente de IA consome <strong>0.10 créditos</strong></li>
            <li>• Créditos são descontados automaticamente quando o agente responde no WhatsApp</li>
            <li>• Se os créditos acabarem, os agentes pausam até nova recarga</li>
            <li>• Você começa com <strong>10 créditos gratuitos</strong></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AiCreditsPage;
