import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Copy, DollarSign, Users, TrendingUp, Link2, Loader2, Wallet,
  BarChart3, Clock, Percent, Shield, CalendarDays, XCircle, CheckCircle2,
  ArrowUpRight, X, Home, LinkIcon, CreditCard, Menu, Sparkles
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

const PIE_COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed'];

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
      <div className="min-h-screen flex items-center justify-center bg-[#08080e]">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl opacity-40 rounded-full" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', width: 80, height: 80, margin: 'auto' }} />
          <Loader2 className="w-7 h-7 animate-spin text-purple-400 relative z-10" />
        </div>
      </div>
    );
  }

  if (!affiliate) return null;

  const affiliateLink = `${DOMAIN}/?ref=${affiliate.affiliate_code}`;
  const pricingLink = `${DOMAIN}/precos?ref=${affiliate.affiliate_code}`;
  const checkoutLink = `${DOMAIN}/checkout?ref=${affiliate.affiliate_code}`;
  const presentearLink = `${DOMAIN}/presentear?ref=${affiliate.affiliate_code}`;

  const fmtMoney = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const SidebarNav = ({ onSelect }: { onSelect?: () => void }) => (
    <nav className="flex-1 px-3 space-y-0.5">
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => { setActiveTab(item.key); onSelect?.(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer relative overflow-hidden group ${
              isActive ? 'text-white' : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(139,92,246,0.08))' }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-purple-500" />
            )}
            <item.icon className={`w-4 h-4 relative z-10 transition-colors ${isActive ? 'text-purple-400' : 'group-hover:text-white/50'}`} />
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const GlowCard = ({ children, className = '', glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) => (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      {glow && <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />}
      <div className="relative z-10 rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-sm h-full">
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#08080e] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 border-r border-white/[0.06] bg-[#0a0a12]/80 backdrop-blur-xl">
        {/* Logo area */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-tight">Parceiro</p>
              <p className="text-purple-400/60 text-[10px] font-mono">{affiliate.affiliate_code}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-2" />

        <SidebarNav />

        {/* Sidebar balance card */}
        <div className="p-4 mt-auto">
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(139,92,246,0.05))' }}>
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-xl" style={{ background: '#7c3aed' }} />
            <p className="text-white/30 text-[10px] uppercase tracking-wider font-medium mb-1">Saldo disponível</p>
            <p className="text-white font-bold text-lg">{fmtMoney(affiliate.available_balance)}</p>
            <button
              onClick={() => setActiveTab('withdraw')}
              className="mt-3 w-full py-2 rounded-lg text-[11px] font-semibold text-purple-300 border border-purple-500/20 hover:bg-purple-500/10 transition-colors cursor-pointer"
            >
              Solicitar saque
            </button>
          </div>

          <div className="mt-3 mx-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors cursor-pointer mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" /> Voltar para o app
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between bg-[#0a0a12]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-white font-bold text-sm">Parceiro</p>
        </div>
        <button onClick={() => setMobileNav(true)} className="text-white/40 hover:text-white/60 cursor-pointer p-1">
          <Menu className="w-5 h-5" />
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-[280px] p-5 bg-[#0a0a12] border-l border-white/[0.06]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">Menu</p>
                </div>
                <button onClick={() => setMobileNav(false)} className="text-white/30 hover:text-white/50 cursor-pointer p-1"><X className="w-5 h-5" /></button>
              </div>
              <SidebarNav onSelect={() => setMobileNav(false)} />
              <div className="mt-8 pt-4 border-t border-white/[0.06]">
                <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] text-white/25 hover:text-white/50 cursor-pointer">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Voltar para o app
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-8 py-8 lg:py-10">

          {/* Mobile tab pills */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none -mx-1 px-1">
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
                    isActive ? 'text-purple-200' : 'text-white/25'
                  }`}
                  style={isActive
                    ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(139,92,246,0.1))', border: '1px solid rgba(139,92,246,0.2)' }
                    : { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }
                  }
                >
                  <item.icon className="w-3 h-3" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* ========== DASHBOARD ========== */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Visão Geral</h1>
                <p className="text-white/30 text-sm">Acompanhe seus ganhos e indicações em tempo real</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Receita Total', value: fmtMoney(affiliate.total_earnings), icon: DollarSign, gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))', iconColor: '#4ade80', border: 'rgba(34,197,94,0.1)' },
                  { label: 'Disponível', value: fmtMoney(affiliate.available_balance), icon: Wallet, gradient: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04))', iconColor: '#a78bfa', border: 'rgba(139,92,246,0.1)' },
                  { label: 'Sacado', value: fmtMoney(affiliate.total_withdrawn), icon: ArrowUpRight, gradient: 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(96,165,250,0.04))', iconColor: '#60a5fa', border: 'rgba(96,165,250,0.1)' },
                  { label: 'Indicados', value: String(referrals.length), icon: Users, gradient: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.04))', iconColor: '#fb923c', border: 'rgba(251,146,60,0.1)' },
                  { label: 'Conversão', value: `${conversionStats.rate}%`, icon: TrendingUp, gradient: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(34,211,238,0.04))', iconColor: '#22d3ee', border: 'rgba(34,211,238,0.1)' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: stat.gradient, border: `1px solid ${stat.border}` }}>
                    <stat.icon className="w-4 h-4 mb-2.5" style={{ color: stat.iconColor }} />
                    <p className="text-white font-bold text-lg tracking-tight">{stat.value}</p>
                    <p className="text-white/30 text-[11px] mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <GlowCard glow>
                  <div className="p-5">
                    <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-400" /> Receita mensal
                    </h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <defs>
                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#13131f', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 32px rgba(124,58,237,0.15)' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                            formatter={(v: number) => [fmtMoney(v), 'Receita']}
                          />
                          <Bar dataKey="earnings" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </GlowCard>

                <GlowCard>
                  <div className="p-5">
                    <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" /> Indicações por mês
                    </h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#13131f', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 32px rgba(124,58,237,0.15)' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                          />
                          <Area type="monotone" dataKey="referrals" stroke="#a78bfa" fill="url(#areaGrad)" strokeWidth={2} name="Indicações" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </GlowCard>
              </div>

              {/* Pie + active commissions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <GlowCard>
                  <div className="p-5">
                    <h3 className="text-white font-semibold text-sm mb-4">Comissões por tipo</h3>
                    {commissionByType.length === 0 ? (
                      <p className="text-white/15 text-xs py-10 text-center">Sem dados ainda</p>
                    ) : (
                      <div className="flex items-center gap-6">
                        <div className="h-[160px] w-[160px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={commissionByType} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                                {commissionByType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#13131f', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [fmtMoney(v), '']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2.5">
                          {commissionByType.map((item, i) => (
                            <div key={item.name} className="flex items-center gap-2.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="text-white/40 text-xs">{item.name}</span>
                              <span className="text-white/60 text-xs font-medium ml-auto">{fmtMoney(item.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </GlowCard>

                <GlowCard>
                  <div className="p-5">
                    <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" /> Comissões ativas
                      {activeCommissions.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.1))', color: '#a78bfa' }}>
                          {activeCommissions.length}
                        </span>
                      )}
                    </h3>
                    {activeCommissions.length === 0 ? (
                      <p className="text-white/15 text-xs py-6 text-center">Nenhuma comissão ativa</p>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {activeCommissions.slice(0, 5).map(c => (
                          <div key={c.id} className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                            <div>
                              <p className="text-white/60 text-xs font-medium">{fmtMoney(c.commission_amount)}/mês</p>
                              <p className="text-white/20 text-[10px]">{c.months_remaining} meses restantes</p>
                            </div>
                            <span className="text-purple-400 text-[10px] font-semibold">Ativa</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </GlowCard>
              </div>
            </motion.div>
          )}

          {/* ========== LINKS ========== */}
          {activeTab === 'links' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Links de Afiliado</h1>
                <p className="text-white/30 text-sm">Compartilhe para ganhar comissões</p>
              </div>
              <GlowCard glow>
                <div className="p-6 space-y-3">
                  {[
                    { label: 'Página principal', desc: 'Link geral do site', url: affiliateLink },
                    { label: 'Página de preços', desc: 'Direciona para planos', url: pricingLink },
                    { label: 'Checkout direto', desc: 'Vai direto para pagamento', url: checkoutLink },
                    { label: 'Presentear', desc: 'Comprar presente com seu link', url: presentearLink },
                  ].map((link) => (
                    <div key={link.label} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-purple-500/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(139,92,246,0.05))' }}>
                        <Link2 className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-sm font-medium">{link.label}</p>
                        <p className="text-white/20 text-[11px]">{link.desc}</p>
                        <p className="text-purple-400/40 text-xs truncate font-mono mt-1">{link.url}</p>
                      </div>
                      <button onClick={() => copyLink(link.url)} className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium text-purple-300 cursor-pointer transition-all hover:bg-purple-500/10 border border-purple-500/20">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </GlowCard>
            </motion.div>
          )}

          {/* ========== COMMISSIONS ========== */}
          {activeTab === 'commissions' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Comissões</h1>
                  <p className="text-white/30 text-sm">{commissions.length} registros</p>
                </div>
                {activeCommissions.length > 0 && (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.08))', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.15)' }}>
                    {activeCommissions.length} ativas
                  </span>
                )}
              </div>
              <GlowCard>
                <div className="overflow-hidden rounded-2xl">
                  {commissions.length === 0 ? (
                    <p className="text-white/15 text-xs py-12 text-center">Nenhuma comissão ainda</p>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {commissions.map((c) => {
                        const si = STATUS_COLORS[c.status] || STATUS_COLORS.pending;
                        return (
                          <div key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.015] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: si.bg }}>
                                {c.status === 'canceled' ? <XCircle className="w-3.5 h-3.5" style={{ color: si.text }} /> : <CheckCircle2 className="w-3.5 h-3.5" style={{ color: si.text }} />}
                              </div>
                              <div>
                                <p className="text-white/70 text-sm font-medium">
                                  {c.order_type === 'subscription' ? 'Assinatura' : c.order_type === 'credits' ? 'Créditos' : 'Presente'}
                                </p>
                                <p className="text-white/20 text-[11px]">
                                  {new Date(c.created_at).toLocaleDateString('pt-BR')}
                                  {c.months_remaining > 0 && c.status !== 'canceled' && ` · ${c.months_remaining} meses restantes`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: si.bg, color: si.text }}>{si.label}</span>
                              <p className={`text-sm font-semibold ${c.status === 'canceled' ? 'text-white/25 line-through' : 'text-purple-300'}`}>
                                +{fmtMoney(c.commission_amount)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </GlowCard>
            </motion.div>
          )}

          {/* ========== REFERRALS ========== */}
          {activeTab === 'referrals' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Indicações</h1>
                <p className="text-white/30 text-sm">Acompanhe seus cliques e conversões</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Cliques', value: conversionStats.total, color: '#a78bfa', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.12)' },
                  { label: 'Convertidos', value: conversionStats.converted, color: '#4ade80', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.12)' },
                  { label: 'Taxa', value: `${conversionStats.rate}%`, color: '#c4b5fd', bg: 'rgba(196,181,253,0.08)', border: 'rgba(196,181,253,0.12)' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-white/25 text-[11px] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <GlowCard>
                <div className="overflow-hidden rounded-2xl">
                  {referrals.length === 0 ? (
                    <p className="text-white/15 text-xs py-12 text-center">Nenhuma indicação ainda</p>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {referrals.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-white/50 text-sm">{r.source_url ? (() => { try { return new URL(r.source_url).pathname; } catch { return 'Link direto'; } })() : 'Link direto'}</p>
                            <p className="text-white/20 text-[11px]">{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full" style={{ backgroundColor: r.converted ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)', color: r.converted ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>
                            {r.converted ? 'Convertido' : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </GlowCard>
            </motion.div>
          )}

          {/* ========== WITHDRAW ========== */}
          {activeTab === 'withdraw' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Saques</h1>
                <p className="text-white/30 text-sm">Solicite a transferência do seu saldo</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(139,92,246,0.04))', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-15 blur-2xl" style={{ background: '#7c3aed' }} />
                  <Wallet className="w-5 h-5 text-purple-400 mb-2 relative z-10" />
                  <p className="text-white font-bold text-2xl relative z-10">{fmtMoney(affiliate.available_balance)}</p>
                  <p className="text-white/25 text-xs mt-1">Saldo disponível para saque</p>
                </div>
                <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.08), rgba(96,165,250,0.02))', border: '1px solid rgba(96,165,250,0.12)' }}>
                  <ArrowUpRight className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-white font-bold text-2xl">{fmtMoney(affiliate.total_withdrawn)}</p>
                  <p className="text-white/25 text-xs mt-1">Total já sacado</p>
                </div>
              </div>

              <GlowCard glow>
                <div className="p-6">
                  <h3 className="text-white font-semibold text-sm mb-5">Solicitar novo saque</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="text-white/35 text-xs mb-1.5 block">Valor (mínimo R$ 50,00)</label>
                      <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="100.00"
                        className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/15 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/30 transition-colors" />
                    </div>
                    <div>
                      <label className="text-white/35 text-xs mb-1.5 block">Chave PIX</label>
                      <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória"
                        className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/15 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/30 transition-colors" />
                    </div>
                    <button onClick={requestWithdrawal} disabled={withdrawing}
                      className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 text-white"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
                      {withdrawing ? 'Enviando...' : 'Solicitar saque via PIX'}
                    </button>
                    <p className="text-white/15 text-[11px]">O saque será processado em até 24 horas úteis.</p>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          )}

          {/* ========== RULES ========== */}
          {activeTab === 'rules' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Regras do Programa</h1>
                <p className="text-white/30 text-sm">Como funciona a comissão de parceiros</p>
              </div>
              <GlowCard glow>
                <div className="p-6 space-y-4">
                  {RULES.map((rule) => (
                    <div key={rule.label} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(139,92,246,0.05))' }}>
                        <rule.icon className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-semibold mb-1">{rule.label}</p>
                        <p className="text-white/30 text-xs leading-relaxed">{rule.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlowCard>

              <GlowCard>
                <div className="p-6">
                  <h3 className="text-white font-semibold text-sm mb-4">Simulação de ganhos por indicação</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-2.5 text-white/25 font-medium">Plano</th>
                          <th className="text-right py-2.5 text-white/25 font-medium">Mensalidade</th>
                          <th className="text-right py-2.5 text-white/25 font-medium">Comissão/mês</th>
                          <th className="text-right py-2.5 text-white/25 font-medium">Total (6 meses)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { plan: 'Starter', price: 89.90 },
                          { plan: 'Pro', price: 159.90 },
                          { plan: 'Growth', price: 269.90 },
                        ].map(row => (
                          <tr key={row.plan} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                            <td className="py-3 text-white/50 font-medium">{row.plan}</td>
                            <td className="py-3 text-right text-white/40">{fmtMoney(row.price)}</td>
                            <td className="py-3 text-right text-purple-300 font-medium">{fmtMoney(row.price * 0.2)}</td>
                            <td className="py-3 text-right text-purple-400 font-bold">{fmtMoney(row.price * 0.2 * 6)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
