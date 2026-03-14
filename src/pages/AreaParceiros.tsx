import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Copy, DollarSign, Users, TrendingUp, Link2, Loader2, Wallet,
  BarChart3, Clock, Percent, Shield, CalendarDays, XCircle, CheckCircle2,
  ArrowUpRight, X, Home, LinkIcon, CreditCard, Settings, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface AffiliateData {
  id: string;
  affiliate_code: string;
  commission_percent: number;
  total_earnings: number;
  available_balance: number;
  total_withdrawn: number;
  is_active: boolean;
  created_at: string;
}

interface Commission {
  id: string;
  order_type: string;
  order_amount: number;
  commission_amount: number;
  commission_percent: number;
  status: string;
  created_at: string;
  months_remaining: number;
  expires_at: string | null;
}

interface Referral {
  id: string;
  converted: boolean;
  created_at: string;
  converted_at: string | null;
  source_url: string | null;
}

const DOMAIN = 'https://ellocontent.com';

const RULES = [
  { icon: Percent, label: 'Comissão', value: '20% sobre a mensalidade do plano contratado' },
  { icon: CalendarDays, label: 'Duração', value: '6 meses por cliente indicado' },
  { icon: XCircle, label: 'Cancelamento', value: 'Se o cliente cancelar antes, a comissão para proporcionalmente' },
  { icon: Wallet, label: 'Pagamento', value: 'Comissão paga mensalmente enquanto o cliente estiver ativo' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'rgba(234,179,8,0.12)', text: '#fbbf24', label: 'Pendente' },
  approved: { bg: 'rgba(34,197,94,0.12)', text: '#4ade80', label: 'Aprovada' },
  paid: { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa', label: 'Paga' },
  canceled: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', label: 'Cancelada' },
};

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b'];

type NavTab = 'dashboard' | 'links' | 'commissions' | 'referrals' | 'withdraw' | 'rules';

const NAV_ITEMS: { key: NavTab; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'links', label: 'Links', icon: LinkIcon },
  { key: 'commissions', label: 'Comissões', icon: CreditCard },
  { key: 'referrals', label: 'Indicações', icon: Users },
  { key: 'withdraw', label: 'Saques', icon: Wallet },
  { key: 'rules', label: 'Regras', icon: Shield },
];

export default function AreaParceiros() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [withdrawing, setWithdrawing] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: aff } = await supabase
        .from('affiliate_partners' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!aff) {
        navigate('/parceiros', { replace: true });
        return;
      }

      setAffiliate(aff as any);
      const [{ data: comms }, { data: refs }] = await Promise.all([
        supabase.from('affiliate_commissions' as any).select('*').eq('affiliate_id', (aff as any).id).order('created_at', { ascending: false }).limit(100),
        supabase.from('affiliate_referrals' as any).select('*').eq('affiliate_id', (aff as any).id).order('created_at', { ascending: false }).limit(100),
      ]);
      setCommissions((comms || []) as any);
      setReferrals((refs || []) as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
  }, [user, fetchData, navigate]);

  // Charts data
  const monthlyData = useMemo(() => {
    const months: { month: string; earnings: number; referrals: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('pt-BR', { month: 'short' });
      const monthEarnings = commissions
        .filter(c => {
          const cd = new Date(c.created_at);
          return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear() && c.status !== 'canceled';
        })
        .reduce((sum, c) => sum + c.commission_amount, 0);
      const monthRefs = referrals.filter(r => {
        const rd = new Date(r.created_at);
        return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      }).length;
      months.push({ month: key, earnings: monthEarnings, referrals: monthRefs });
    }
    return months;
  }, [commissions, referrals]);

  const conversionStats = useMemo(() => {
    const total = referrals.length;
    const converted = referrals.filter(r => r.converted).length;
    const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';
    return { total, converted, rate };
  }, [referrals]);

  const commissionByType = useMemo(() => {
    const byType: Record<string, number> = {};
    commissions.filter(c => c.status !== 'canceled').forEach(c => {
      const label = c.order_type === 'subscription' ? 'Assinatura' : c.order_type === 'credits' ? 'Créditos' : 'Presente';
      byType[label] = (byType[label] || 0) + c.commission_amount;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [commissions]);

  const activeCommissions = commissions.filter(c => c.status === 'pending' && (c.months_remaining || 0) > 0);

  const copyLink = (link: string) => { navigator.clipboard.writeText(link); toast.success('Link copiado!'); };

  const requestWithdrawal = async () => {
    if (!affiliate || !pixKey.trim()) { toast.error('Informe sua chave PIX.'); return; }
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 50) { toast.error('Valor mínimo de saque: R$ 50,00'); return; }
    if (amount > affiliate.available_balance) { toast.error('Saldo insuficiente.'); return; }
    setWithdrawing(true);
    try {
      const { error } = await supabase.from('affiliate_withdrawals' as any).insert({
        affiliate_id: affiliate.id, amount, pix_key: pixKey.trim(),
      } as any);
      if (error) throw error;
      toast.success('Saque solicitado! Cairá em até 24h.');
      setPixKey(''); setWithdrawAmount('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao solicitar saque.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#09090f' }}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!affiliate) return null;

  const affiliateLink = `${DOMAIN}/?ref=${affiliate.affiliate_code}`;
  const pricingLink = `${DOMAIN}/precos?ref=${affiliate.affiliate_code}`;
  const checkoutLink = `${DOMAIN}/checkout?ref=${affiliate.affiliate_code}`;
  const presentearLink = `${DOMAIN}/presentear?ref=${affiliate.affiliate_code}`;

  const fmtMoney = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#09090f' }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 h-screen sticky top-0" style={{ backgroundColor: '#0e0e16', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="p-5 mb-2">
          <p className="text-white font-bold text-sm">Painel de Parceiro</p>
          <p className="text-white/30 text-[11px] font-mono mt-1">{affiliate.affiliate_code}</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                activeTab === item.key
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
              }`}
              style={activeTab === item.key ? { backgroundColor: 'rgba(139,92,246,0.12)' } : {}}
            >
              <item.icon className="w-4 h-4" style={activeTab === item.key ? { color: '#a78bfa' } : {}} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 mt-auto space-y-1">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-colors cursor-pointer">
            <ArrowUpRight className="w-4 h-4" /> Ir para o app
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#0e0e16', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-white font-bold text-sm">Parceiro</p>
        <button onClick={() => setMobileNav(true)} className="text-white/50 cursor-pointer">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
            onClick={() => setMobileNav(false)}
          >
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-[260px] p-4"
              style={{ backgroundColor: '#0e0e16', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <p className="text-white font-bold text-sm">Navegação</p>
                <button onClick={() => setMobileNav(false)} className="text-white/40 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.key}
                    onClick={() => { setActiveTab(item.key); setMobileNav(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                      activeTab === item.key ? 'text-white' : 'text-white/40'
                    }`}
                    style={activeTab === item.key ? { backgroundColor: 'rgba(139,92,246,0.12)' } : {}}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="mt-8 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/30 hover:text-white/60 cursor-pointer">
                  <ArrowUpRight className="w-4 h-4" /> Ir para o app
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

          {/* Mobile tab pills */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  activeTab === item.key ? 'text-white' : 'text-white/30'
                }`}
                style={activeTab === item.key ? { backgroundColor: 'rgba(139,92,246,0.15)' } : { backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                <item.icon className="w-3 h-3" />
                {item.label}
              </button>
            ))}
          </div>

          {/* ========== DASHBOARD ========== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white mb-1">Visão Geral</h1>
                <p className="text-white/30 text-sm">Acompanhe seus ganhos e indicações</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Receita Total', value: fmtMoney(affiliate.total_earnings), icon: DollarSign, color: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
                  { label: 'Disponível', value: fmtMoney(affiliate.available_balance), icon: Wallet, color: '#a78bfa', bg: 'rgba(139,92,246,0.08)' },
                  { label: 'Sacado', value: fmtMoney(affiliate.total_withdrawn), icon: ArrowUpRight, color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
                  { label: 'Indicados', value: String(referrals.length), icon: Users, color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
                  { label: 'Conversão', value: `${conversionStats.rate}%`, icon: TrendingUp, color: '#22d3ee', bg: 'rgba(34,211,238,0.08)' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl p-4" style={{ backgroundColor: stat.bg, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <stat.icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
                    <p className="text-white font-bold text-lg">{stat.value}</p>
                    <p className="text-white/30 text-[11px] mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Earnings chart */}
                <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" /> Receita mensal
                  </h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                          formatter={(v: number) => [fmtMoney(v), 'Receita']}
                        />
                        <Bar dataKey="earnings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Referrals trend */}
                <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" /> Indicações por mês
                  </h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                        />
                        <Area type="monotone" dataKey="referrals" stroke="#22d3ee" fill="rgba(34,211,238,0.1)" strokeWidth={2} name="Indicações" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Pie + active commissions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="text-white font-semibold text-sm mb-4">Comissões por tipo</h3>
                  {commissionByType.length === 0 ? (
                    <p className="text-white/20 text-xs py-10 text-center">Sem dados</p>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="h-[160px] w-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={commissionByType} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                              {commissionByType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [fmtMoney(v), '']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {commissionByType.map((item, i) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-white/50 text-xs">{item.name}</span>
                            <span className="text-white/70 text-xs font-medium ml-auto">{fmtMoney(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Active commissions */}
                <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-400" /> Comissões ativas
                    {activeCommissions.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>
                        {activeCommissions.length}
                      </span>
                    )}
                  </h3>
                  {activeCommissions.length === 0 ? (
                    <p className="text-white/20 text-xs py-6 text-center">Nenhuma comissão ativa</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {activeCommissions.slice(0, 5).map(c => (
                        <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <div>
                            <p className="text-white/60 text-xs">{fmtMoney(c.commission_amount)}/mês</p>
                            <p className="text-white/25 text-[10px]">{c.months_remaining} meses restantes</p>
                          </div>
                          <span className="text-green-400 text-[10px] font-medium">Ativa</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========== LINKS ========== */}
          {activeTab === 'links' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white mb-1">Links de Afiliado</h1>
                <p className="text-white/30 text-sm">Compartilhe para ganhar comissões</p>
              </div>
              <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="space-y-4">
                  {[
                    { label: 'Página principal', desc: 'Link geral do site', url: affiliateLink },
                    { label: 'Página de preços', desc: 'Direciona para planos', url: pricingLink },
                    { label: 'Checkout direto', desc: 'Vai direto para pagamento', url: checkoutLink },
                    { label: 'Presentear', desc: 'Comprar presente com seu link', url: presentearLink },
                  ].map((link) => (
                    <div key={link.label} className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.1)' }}>
                        <Link2 className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-sm font-medium">{link.label}</p>
                        <p className="text-white/25 text-[11px]">{link.desc}</p>
                        <p className="text-white/40 text-xs truncate font-mono mt-1">{link.url}</p>
                      </div>
                      <button onClick={() => copyLink(link.url)} className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium text-purple-300 cursor-pointer transition-all hover:bg-purple-500/10" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========== COMMISSIONS ========== */}
          {activeTab === 'commissions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white mb-1">Comissões</h1>
                  <p className="text-white/30 text-sm">{commissions.length} registros</p>
                </div>
                {activeCommissions.length > 0 && (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>
                    {activeCommissions.length} ativas
                  </span>
                )}
              </div>
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {commissions.length === 0 ? (
                  <p className="text-white/20 text-xs py-12 text-center">Nenhuma comissão ainda</p>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {commissions.map((c) => {
                      const si = STATUS_COLORS[c.status] || STATUS_COLORS.pending;
                      return (
                        <div key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: si.bg }}>
                              {c.status === 'canceled' ? <XCircle className="w-3.5 h-3.5" style={{ color: si.text }} /> : <CheckCircle2 className="w-3.5 h-3.5" style={{ color: si.text }} />}
                            </div>
                            <div>
                              <p className="text-white/70 text-sm font-medium">
                                {c.order_type === 'subscription' ? 'Assinatura' : c.order_type === 'credits' ? 'Créditos' : 'Presente'}
                              </p>
                              <p className="text-white/25 text-[11px]">
                                {new Date(c.created_at).toLocaleDateString('pt-BR')}
                                {c.months_remaining > 0 && c.status !== 'canceled' && ` · ${c.months_remaining} meses restantes`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: si.bg, color: si.text }}>{si.label}</span>
                            <p className={`text-sm font-semibold ${c.status === 'canceled' ? 'text-white/30 line-through' : 'text-green-400'}`}>
                              +{fmtMoney(c.commission_amount)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== REFERRALS ========== */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white mb-1">Indicações</h1>
                <p className="text-white/30 text-sm">Acompanhe seus cliques e conversões</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.1)' }}>
                  <p className="text-2xl font-bold text-purple-300">{conversionStats.total}</p>
                  <p className="text-white/30 text-[11px] mt-1">Cliques</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
                  <p className="text-2xl font-bold text-green-300">{conversionStats.converted}</p>
                  <p className="text-white/30 text-[11px] mt-1">Convertidos</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.1)' }}>
                  <p className="text-2xl font-bold text-cyan-300">{conversionStats.rate}%</p>
                  <p className="text-white/30 text-[11px] mt-1">Taxa</p>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {referrals.length === 0 ? (
                  <p className="text-white/20 text-xs py-12 text-center">Nenhuma indicação ainda</p>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {referrals.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-white/60 text-sm">{r.source_url ? (() => { try { return new URL(r.source_url).pathname; } catch { return 'Link direto'; } })() : 'Link direto'}</p>
                          <p className="text-white/25 text-[11px]">{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: r.converted ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', color: r.converted ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                          {r.converted ? 'Convertido' : 'Pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== WITHDRAW ========== */}
          {activeTab === 'withdraw' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white mb-1">Saques</h1>
                <p className="text-white/30 text-sm">Solicite a transferência do seu saldo</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <Wallet className="w-5 h-5 text-purple-400 mb-2" />
                  <p className="text-white font-bold text-2xl">{fmtMoney(affiliate.available_balance)}</p>
                  <p className="text-white/30 text-xs mt-1">Saldo disponível para saque</p>
                </div>
                <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}>
                  <ArrowUpRight className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-white font-bold text-2xl">{fmtMoney(affiliate.total_withdrawn)}</p>
                  <p className="text-white/30 text-xs mt-1">Total já sacado</p>
                </div>
              </div>

              <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-white font-semibold text-sm mb-5">Solicitar novo saque</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="text-white/40 text-xs mb-1.5 block">Valor (mínimo R$ 50,00)</label>
                    <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="100.00"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1.5 block">Chave PIX</label>
                    <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <button onClick={requestWithdrawal} disabled={withdrawing}
                    className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7B50DC, #9333ea)', color: '#fff' }}>
                    {withdrawing ? 'Enviando...' : 'Solicitar saque via PIX'}
                  </button>
                  <p className="text-white/20 text-[11px]">O saque será processado em até 24 horas úteis.</p>
                </div>
              </div>
            </div>
          )}

          {/* ========== RULES ========== */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white mb-1">Regras do Programa</h1>
                <p className="text-white/30 text-sm">Como funciona a comissão</p>
              </div>
              <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="space-y-5">
                  {RULES.map((rule) => (
                    <div key={rule.label} className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.1)' }}>
                        <rule.icon className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-semibold mb-1">{rule.label}</p>
                        <p className="text-white/35 text-xs leading-relaxed">{rule.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earnings table */}
              <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-white font-semibold text-sm mb-4">Simulação de ganhos por indicação</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th className="text-left py-2.5 text-white/30 font-medium">Plano</th>
                        <th className="text-right py-2.5 text-white/30 font-medium">Mensalidade</th>
                        <th className="text-right py-2.5 text-white/30 font-medium">Comissão/mês</th>
                        <th className="text-right py-2.5 text-white/30 font-medium">Total (6 meses)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { plan: 'Starter', price: 89.90 },
                        { plan: 'Pro', price: 159.90 },
                        { plan: 'Growth', price: 269.90 },
                      ].map(p => (
                        <tr key={p.plan} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2.5 text-white/60 font-medium">{p.plan}</td>
                          <td className="py-2.5 text-white/40 text-right">{fmtMoney(p.price)}</td>
                          <td className="py-2.5 text-green-400 text-right font-medium">{fmtMoney(p.price * 0.2)}</td>
                          <td className="py-2.5 text-purple-300 text-right font-bold">{fmtMoney(p.price * 0.2 * 6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
