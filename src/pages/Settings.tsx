import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { CreditCard, Bell, Shield, Loader2, ChevronRight, Calendar, Receipt, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthRedirectUrl, isNativeIOS } from '@/lib/platform';

interface SubscriptionData {
  plan_type: string;
  status: string;
  monthly_price: number;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  billing_cycle: string | null;
}

interface ElloSub {
  plan_name: string;
  status: string;
  monthly_price: number;
  card_brand: string | null;
  card_last_digits: string | null;
  paid_at: string | null;
  current_period_end: string | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  paid_at: string | null;
  due_date: string | null;
  card_brand: string | null;
  card_last_digits: string | null;
  created_at: string;
}

interface CreditBalance {
  balance: number;
  total_consumed: number;
  total_purchased: number;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuito',
  base: 'Starter',
  starter: 'Starter',
  pro: 'Pro',
  growth: 'Growth',
  business: 'Business',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-green-500/15 text-green-400' },
  trialing: { label: 'Período de teste', color: 'bg-blue-500/15 text-blue-400' },
  past_due: { label: 'Pagamento pendente', color: 'bg-yellow-500/15 text-yellow-400' },
  canceled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400' },
  free: { label: 'Gratuito', color: 'bg-white/[0.06] text-white/40' },
};

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'plan' | 'notifications' | 'account'>('plan');
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [elloSub, setElloSub] = useState<ElloSub | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    marketing_emails: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: cu } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!cu) return;

      const [subRes, elloRes, paymentsRes, creditsRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('plan_type, status, monthly_price, current_period_start, current_period_end, trial_ends_at, billing_cycle')
          .eq('company_id', cu.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('ellocontent_subscriptions')
          .select('plan_name, status, monthly_price, card_brand, card_last_digits, paid_at, current_period_end')
          .eq('company_id', cu.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('subscription_payments')
          .select('id, amount, status, description, paid_at, due_date, card_brand, card_last_digits, created_at')
          .eq('company_id', cu.company_id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('ai_credit_balances')
          .select('balance, total_consumed, total_purchased')
          .eq('company_id', cu.company_id)
          .maybeSingle(),
      ]);

      setSubscription((subRes.data as SubscriptionData) || null);
      setElloSub((elloRes.data as ElloSub) || null);
      setPayments((paymentsRes.data as PaymentRecord[]) || []);
      setCredits((creditsRes.data as CreditBalance) || null);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeSub = elloSub?.status === 'active' || elloSub?.status === 'trialing' ? elloSub : null;
  const mainSub = subscription;
  const planName = activeSub?.plan_name || (mainSub ? PLAN_LABELS[mainSub.plan_type] || mainSub.plan_type : 'Gratuito');
  const planStatus = activeSub?.status || mainSub?.status || 'free';
  const planPrice = activeSub?.monthly_price ?? mainSub?.monthly_price ?? 0;
  const nextBilling = activeSub?.current_period_end || mainSub?.current_period_end || null;
  const cardBrand = activeSub?.card_brand || null;
  const cardDigits = activeSub?.card_last_digits || null;
  const statusInfo = STATUS_LABELS[planStatus] || STATUS_LABELS.free;

  const tabs = [
    { id: 'plan' as const, label: 'Plano', icon: Crown },
    { id: 'notifications' as const, label: 'Notificações', icon: Bell },
    { id: 'account' as const, label: 'Conta', icon: Shield },
  ];

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(
      'Esta ação é permanente e excluirá sua conta e seus dados. Digite EXCLUIR para confirmar.',
    );
    if (confirmation !== 'EXCLUIR') return;

    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', { body: {} });
      if (error) throw error;

      await supabase.auth.signOut({ scope: 'local' });
      toast.success('Sua conta foi excluída.');
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir sua conta. Tente novamente.',
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-white/30" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Configurações</h1>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Plan Tab */}
        {activeTab === 'plan' && (
          <div className="space-y-4">
            {/* Current Plan Card */}
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ backgroundColor: '#111116' }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-white">Seu Plano</h3>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7B50DC, #9B6BFF)' }}>
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{planName}</p>
                    <p className="text-sm text-white/40">
                      {planPrice > 0 ? `${formatCurrency(planPrice)}/mês` : 'Plano gratuito'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-sm text-white/40 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Próxima cobrança
                    </span>
                    <span className="text-sm text-white/70">{formatDate(nextBilling)}</span>
                  </div>

                  {mainSub?.trial_ends_at && planStatus === 'trialing' && (
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-sm text-white/40">Teste expira em</span>
                      <span className="text-sm text-yellow-400/80">{formatDate(mainSub.trial_ends_at)}</span>
                    </div>
                  )}

                  {credits && (
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-sm text-white/40 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" /> Créditos restantes
                      </span>
                      <span className="text-sm text-white font-medium">{Math.floor(credits.balance)}</span>
                    </div>
                  )}
                </div>
              </div>

              {!isNativeIOS() && <div className="border-t border-white/[0.06] p-4 flex gap-2">
                <button
                  onClick={() => navigate('/precos')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7B50DC, #9B6BFF)' }}
                >
                  {planPrice > 0 ? 'Gerenciar Plano' : 'Fazer Upgrade'}
                </button>
              </div>}
            </div>

            {/* Payment Method */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ backgroundColor: '#111116' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Método de Pagamento</h3>
              {cardDigits ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-10 h-7 rounded bg-white/[0.08] flex items-center justify-center">
                    <CreditCard className="w-5 h-3.5 text-white/40" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/70 font-medium">
                      {cardBrand?.toUpperCase() || 'Cartão'} •••• {cardDigits}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/30">Nenhum cartão cadastrado</p>
              )}
            </div>

            {/* Payments History */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ backgroundColor: '#111116' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-white/30" /> Histórico de Pagamentos
              </h3>
              {payments.length === 0 ? (
                <p className="text-sm text-white/25 text-center py-4">Nenhum pagamento registrado</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                      <div>
                        <p className="text-sm text-white/70">{p.description || 'Pagamento'}</p>
                        <p className="text-[11px] text-white/25 mt-0.5">
                          {formatDate(p.paid_at || p.created_at)}
                          {p.card_last_digits ? ` • •••• ${p.card_last_digits}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white font-medium">{formatCurrency(p.amount)}</p>
                        <span className={`text-[10px] font-semibold uppercase ${
                          p.status === 'paid' ? 'text-green-400' :
                          p.status === 'pending' ? 'text-yellow-400' :
                          'text-white/30'
                        }`}>
                          {p.status === 'paid' ? 'Pago' : p.status === 'pending' ? 'Pendente' : p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="rounded-2xl border border-white/[0.06] p-5 space-y-4" style={{ backgroundColor: '#111116' }}>
            <h3 className="text-sm font-semibold text-white mb-2">Preferências de Notificação</h3>
            {[
              { key: 'email_notifications', label: 'Notificações por e-mail', desc: 'Receba atualizações sobre seus posts e conta' },
              { key: 'push_notifications', label: 'Notificações push', desc: 'Alertas no navegador sobre novidades' },
              { key: 'marketing_emails', label: 'E-mails promocionais', desc: 'Novidades, dicas e ofertas especiais' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-sm text-white/70">{item.label}</p>
                  <p className="text-[11px] text-white/25 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => {
                    setNotifSettings((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }));
                    toast.success('Preferência salva');
                  }}
                  className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${
                    notifSettings[item.key as keyof typeof notifSettings] ? 'bg-purple-500' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      notifSettings[item.key as keyof typeof notifSettings] ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ backgroundColor: '#111116' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Informações da Conta</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">E-mail</span>
                  <span className="text-sm text-white/70">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Conta criada em</span>
                  <span className="text-sm text-white/70">{user?.created_at ? formatDate(user.created_at) : '—'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ backgroundColor: '#111116' }}>
              <h3 className="text-sm font-semibold text-white mb-2">Alterar Senha</h3>
              <p className="text-[11px] text-white/25 mb-3">Um e-mail será enviado com as instruções para redefinir sua senha.</p>
              <button
                onClick={async () => {
                  if (!user?.email) return;
                  await supabase.auth.resetPasswordForEmail(user.email, {
                    redirectTo: getAuthRedirectUrl('/reset-password'),
                  });
                  toast.success('E-mail de redefinição enviado!');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 border border-white/[0.08] hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Enviar e-mail de redefinição
              </button>
            </div>

            <div className="rounded-2xl border border-red-500/10 p-5" style={{ backgroundColor: '#111116' }}>
              <h3 className="text-sm font-semibold text-red-400/70 mb-2">Zona de Perigo</h3>
              <p className="text-[11px] text-white/25 mb-3">Ações irreversíveis para sua conta.</p>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-xl text-xs font-medium text-red-400/50 border border-red-500/15 hover:border-red-500/30 hover:text-red-400 transition-colors cursor-pointer"
              >
                {deletingAccount ? 'Excluindo...' : 'Excluir conta'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
