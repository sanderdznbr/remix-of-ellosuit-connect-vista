import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { CreditCard, Bell, Shield, Loader2, ChevronRight, Calendar, Receipt, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Subscription {
  plan_name: string;
  status: string;
  monthly_price: number;
  current_period_end: string | null;
  card_brand: string | null;
  card_last_digits: string | null;
  paid_at: string | null;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'payment' | 'notifications' | 'account'>('payment');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifSettings, setNotifSettings] = useState({ email_notifications: true, push_notifications: true, marketing_emails: false });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (cu) {
        const { data: sub } = await supabase
          .from('ellocontent_subscriptions')
          .select('plan_name, status, monthly_price, current_period_end, card_brand, card_last_digits, paid_at')
          .eq('company_id', cu.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setSubscription(sub as Subscription | null);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'payment' as const, label: 'Pagamento', icon: CreditCard },
    { id: 'notifications' as const, label: 'Notificações', icon: Bell },
    { id: 'account' as const, label: 'Conta', icon: Shield },
  ];

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

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
          {tabs.map(tab => (
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

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="space-y-4">
            {/* Current Plan */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ backgroundColor: '#111116' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Plano Atual</h3>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                  subscription?.status === 'active' ? 'bg-green-500/15 text-green-400' :
                  subscription?.status === 'past_due' ? 'bg-yellow-500/15 text-yellow-400' :
                  'bg-white/[0.06] text-white/40'
                }`}>
                  {subscription?.status === 'active' ? 'Ativo' : subscription?.status === 'past_due' ? 'Pendente' : subscription?.status || 'Sem plano'}
                </span>
              </div>
              {subscription ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/40">Plano</span>
                    <span className="text-sm text-white font-medium">{subscription.plan_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/40">Valor mensal</span>
                    <span className="text-sm text-white font-medium">{formatCurrency(subscription.monthly_price)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/40">Próxima cobrança</span>
                    <span className="text-sm text-white/70">{formatDate(subscription.current_period_end)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/40">Último pagamento</span>
                    <span className="text-sm text-white/70">{formatDate(subscription.paid_at)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-white/30 mb-3">Você ainda não possui um plano ativo</p>
                  <button onClick={() => navigate('/precos')}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #7B50DC, #9B6BFF)' }}>
                    Ver planos
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ backgroundColor: '#111116' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Método de Pagamento</h3>
              {subscription?.card_last_digits ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-10 h-7 rounded bg-white/[0.08] flex items-center justify-center">
                    <CreditCard className="w-5 h-3.5 text-white/40" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/70 font-medium">
                      {subscription.card_brand?.toUpperCase() || 'Cartão'} •••• {subscription.card_last_digits}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/30">Nenhum cartão cadastrado</p>
              )}
            </div>

            {/* Billing History shortcut */}
            <button
              onClick={() => navigate('/precos')}
              className="w-full rounded-2xl border border-white/[0.06] p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
              style={{ backgroundColor: '#111116' }}
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4 text-white/30" />
                <span className="text-sm text-white/60">Faturas e Histórico</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </button>
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
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-sm text-white/70">{item.label}</p>
                  <p className="text-[11px] text-white/25 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => {
                    setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }));
                    toast.success('Preferência salva');
                  }}
                  className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${
                    notifSettings[item.key as keyof typeof notifSettings] ? 'bg-purple-500' : 'bg-white/10'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    notifSettings[item.key as keyof typeof notifSettings] ? 'left-5' : 'left-0.5'
                  }`} />
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
                  await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/forgot-password` });
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
                onClick={() => toast.info('Para excluir sua conta, entre em contato com o suporte.')}
                className="px-4 py-2 rounded-xl text-xs font-medium text-red-400/50 border border-red-500/15 hover:border-red-500/30 hover:text-red-400 transition-colors cursor-pointer"
              >
                Excluir conta
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
