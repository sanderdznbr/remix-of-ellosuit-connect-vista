import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Copy, DollarSign, Users, TrendingUp, Link2, Loader2, Wallet, BarChart3, Clock, Percent, Shield, CalendarDays, XCircle, CheckCircle2, ArrowUpRight, Info, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

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

function ParceirosContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'referrals'>('overview');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: aff } = await supabase
        .from('affiliate_partners' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (aff) {
        setAffiliate(aff as any);
        const [{ data: comms }, { data: refs }] = await Promise.all([
          supabase.from('affiliate_commissions' as any).select('*').eq('affiliate_id', (aff as any).id).order('created_at', { ascending: false }).limit(50),
          supabase.from('affiliate_referrals' as any).select('*').eq('affiliate_id', (aff as any).id).order('created_at', { ascending: false }).limit(50),
        ]);
        setCommissions((comms || []) as any);
        setReferrals((refs || []) as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Monthly earnings chart data (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { month: string; earnings: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const monthEarnings = commissions
        .filter(c => {
          const cd = new Date(c.created_at);
          return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear() && c.status !== 'canceled';
        })
        .reduce((sum, c) => sum + c.commission_amount, 0);
      months.push({ month: key, earnings: monthEarnings });
    }
    return months;
  }, [commissions]);

  // Conversion stats
  const conversionStats = useMemo(() => {
    const total = referrals.length;
    const converted = referrals.filter(r => r.converted).length;
    const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';
    return { total, converted, rate };
  }, [referrals]);

  // Commission by type pie
  const commissionByType = useMemo(() => {
    const byType: Record<string, number> = {};
    commissions.filter(c => c.status !== 'canceled').forEach(c => {
      const label = c.order_type === 'subscription' ? 'Assinatura' : c.order_type === 'credits' ? 'Créditos' : 'Presente';
      byType[label] = (byType[label] || 0) + c.commission_amount;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [commissions]);

  // Active commissions (still earning)
  const activeCommissions = commissions.filter(c => c.status === 'pending' && (c.months_remaining || 0) > 0);

  const createAffiliate = async () => {
    if (!user) { navigate('/auth'); return; }
    setCreating(true);
    try {
      const code = user.email?.split('@')[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) ||
        Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(36).toUpperCase()).join('').slice(0, 8);
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      const { data, error } = await supabase.from('affiliate_partners' as any).insert({
        user_id: user.id,
        company_id: cu?.company_id || null,
        affiliate_code: code,
        commission_percent: 20,
      } as any).select().single();
      if (error) throw error;
      setAffiliate(data as any);
      toast.success('Conta de parceiro criada!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao criar conta de parceiro.');
    } finally {
      setCreating(false);
    }
  };

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
      toast.success('Solicitação de saque enviada! Cairá em até 24h.');
      setShowWithdraw(false); setPixKey(''); setWithdrawAmount('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao solicitar saque.');
    } finally {
      setWithdrawing(false);
    }
  };

  const copyLink = (link: string) => { navigator.clipboard.writeText(link); toast.success('Link copiado!'); };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  const affiliateLink = affiliate ? `${DOMAIN}/?ref=${affiliate.affiliate_code}` : '';
  const pricingLink = affiliate ? `${DOMAIN}/precos?ref=${affiliate.affiliate_code}` : '';
  const checkoutLink = affiliate ? `${DOMAIN}/checkout?ref=${affiliate.affiliate_code}` : '';
  const presentearLink = affiliate ? `${DOMAIN}/presentear?ref=${affiliate.affiliate_code}` : '';

  // Not yet an affiliate — onboarding
  if (!affiliate) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))' }}>
              <Users className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-white font-bold text-2xl mb-2">Programa de Parceiros</h2>
            <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
              Divulgue o elloContent e ganhe comissões recorrentes sobre todas as vendas dos seus indicados.
            </p>
          </div>

          {/* Rules */}
          <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-white font-semibold text-sm mb-5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" /> Regras de Afiliação
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {RULES.map((rule) => (
                <div key={rule.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <rule.icon className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white/70 text-xs font-semibold">{rule.label}</p>
                    <p className="text-white/35 text-[11px] mt-0.5 leading-relaxed">{rule.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-3 text-white/30 text-xs mb-2">
              <span className="flex items-center gap-1"><Link2 className="w-3 h-3 text-purple-400" /> Links rastreados</span>
              <span className="flex items-center gap-1"><Wallet className="w-3 h-3 text-purple-400" /> Saque via PIX</span>
              <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-purple-400" /> Métricas em tempo real</span>
            </div>
            <button
              onClick={createAffiliate}
              disabled={creating}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7B50DC, #9333ea)', color: '#fff' }}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              {creating ? 'Criando...' : 'Ativar conta de parceiro'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Affiliate dashboard
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">Painel de Parceiro</h1>
            <p className="text-white/35 text-sm">Código: <span className="font-mono text-purple-300">{affiliate.affiliate_code}</span></p>
          </div>
          <button
            onClick={() => setShowWithdraw(true)}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7B50DC, #9333ea)', color: '#fff' }}
          >
            <Wallet className="w-4 h-4" /> Solicitar saque
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Receita Total', value: `R$ ${affiliate.total_earnings.toFixed(2).replace('.', ',')}`, icon: DollarSign, color: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
            { label: 'Disponível', value: `R$ ${affiliate.available_balance.toFixed(2).replace('.', ',')}`, icon: Wallet, color: '#a78bfa', bg: 'rgba(139,92,246,0.08)' },
            { label: 'Já sacado', value: `R$ ${affiliate.total_withdrawn.toFixed(2).replace('.', ',')}`, icon: ArrowUpRight, color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
            { label: 'Indicados', value: String(referrals.length), icon: Users, color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
            { label: 'Taxa conversão', value: `${conversionStats.rate}%`, icon: TrendingUp, color: '#22d3ee', bg: 'rgba(34,211,238,0.08)' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-4" style={{ backgroundColor: stat.bg, border: '1px solid rgba(255,255,255,0.04)' }}>
              <stat.icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
              <p className="text-white font-bold text-lg">{stat.value}</p>
              <p className="text-white/30 text-[11px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          {[
            { key: 'overview' as const, label: 'Visão Geral' },
            { key: 'commissions' as const, label: 'Comissões' },
            { key: 'referrals' as const, label: 'Indicações' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === tab.key ? 'text-white' : 'text-white/40 hover:text-white/60'
              }`}
              style={activeTab === tab.key ? { backgroundColor: 'rgba(139,92,246,0.2)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
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
                      formatter={(v: number) => [`R$ ${v.toFixed(2).replace('.', ',')}`, 'Receita']}
                    />
                    <Bar dataKey="earnings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie chart + conversion */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" /> Comissões por tipo
              </h3>
              {commissionByType.length === 0 ? (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-white/20 text-xs">Sem dados ainda</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="h-[180px] w-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={commissionByType} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {commissionByType.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                          formatter={(v: number) => [`R$ ${v.toFixed(2).replace('.', ',')}`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {commissionByType.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-white/50 text-xs">{item.name}</span>
                        <span className="text-white/70 text-xs font-medium ml-auto">R$ {item.value.toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Links */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-400" /> Links de afiliado
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Página principal', url: affiliateLink },
                  { label: 'Página de preços', url: pricingLink },
                  { label: 'Checkout direto', url: checkoutLink },
                  { label: 'Presentear', url: presentearLink },
                ].map((link) => (
                  <div key={link.label} className="flex items-center gap-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/40 text-[11px] mb-0.5">{link.label}</p>
                      <p className="text-white/60 text-xs truncate font-mono">{link.url}</p>
                    </div>
                    <button onClick={() => copyLink(link.url)} className="shrink-0 p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" /> Regras
              </h3>
              <div className="space-y-3">
                {RULES.map((rule) => (
                  <div key={rule.label} className="flex items-start gap-3">
                    <rule.icon className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white/60 text-xs font-medium">{rule.label}</p>
                      <p className="text-white/30 text-[11px] mt-0.5">{rule.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Commissions */}
        {activeTab === 'commissions' && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" /> Histórico de comissões
              </h3>
              {activeCommissions.length > 0 && (
                <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>
                  {activeCommissions.length} ativas
                </span>
              )}
            </div>
            {commissions.length === 0 ? (
              <p className="text-white/20 text-xs py-10 text-center">Nenhuma comissão ainda. Compartilhe seus links!</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {commissions.map((c) => {
                  const statusInfo = STATUS_COLORS[c.status] || STATUS_COLORS.pending;
                  return (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: statusInfo.bg }}>
                          {c.status === 'canceled' ? <XCircle className="w-3.5 h-3.5" style={{ color: statusInfo.text }} /> : <CheckCircle2 className="w-3.5 h-3.5" style={{ color: statusInfo.text }} />}
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
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}>
                          {statusInfo.label}
                        </span>
                        <p className={`text-sm font-semibold ${c.status === 'canceled' ? 'text-white/30 line-through' : 'text-green-400'}`}>
                          +R$ {c.commission_amount.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Referrals */}
        {activeTab === 'referrals' && (
          <div className="space-y-4">
            {/* Conversion funnel */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.1)' }}>
                <p className="text-2xl font-bold text-purple-300">{conversionStats.total}</p>
                <p className="text-white/30 text-[11px] mt-1">Cliques no link</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
                <p className="text-2xl font-bold text-green-300">{conversionStats.converted}</p>
                <p className="text-white/30 text-[11px] mt-1">Convertidos</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.1)' }}>
                <p className="text-2xl font-bold text-cyan-300">{conversionStats.rate}%</p>
                <p className="text-white/30 text-[11px] mt-1">Taxa de conversão</p>
              </div>
            </div>

            {/* List */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" /> Indicações recentes
                </h3>
              </div>
              {referrals.length === 0 ? (
                <p className="text-white/20 text-xs py-10 text-center">Nenhuma indicação ainda.</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {referrals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-white/60 text-sm">
                          {r.source_url ? new URL(r.source_url).pathname : 'Link direto'}
                        </p>
                        <p className="text-white/25 text-[11px]">{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        r.converted
                          ? 'text-green-400'
                          : 'text-white/30'
                      }`} style={{ backgroundColor: r.converted ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)' }}>
                        {r.converted ? 'Convertido' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile withdraw button */}
        <div className="sm:hidden mt-6">
          <button
            onClick={() => setShowWithdraw(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7B50DC, #9333ea)', color: '#fff' }}
          >
            <Wallet className="w-4 h-4" /> Solicitar saque
          </button>
        </div>
      </motion.div>

      {/* Withdraw modal */}
      <AnimatePresence>
        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowWithdraw(false)}
          >
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-[420px] max-w-[95vw] rounded-2xl p-6"
              style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-purple-400" /> Solicitar saque
                </h3>
                <button onClick={() => setShowWithdraw(false)} className="text-white/30 hover:text-white/60 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-white/30 text-xs mb-4">Disponível: <span className="text-white/60 font-medium">R$ {affiliate.available_balance.toFixed(2).replace('.', ',')}</span></p>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Valor (mín. R$ 50)</label>
                  <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="100.00"
                    className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Chave PIX</label>
                  <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória"
                    className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={requestWithdrawal} disabled={withdrawing}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7B50DC, #9333ea)', color: '#fff' }}>
                  {withdrawing ? 'Enviando...' : 'Confirmar saque'}
                </button>
                <button onClick={() => { setShowWithdraw(false); setPixKey(''); setWithdrawAmount(''); }}
                  className="px-4 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 cursor-pointer transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancelar
                </button>
              </div>
              <p className="text-white/20 text-[11px] mt-3">O saque será processado em até 24 horas via PIX.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Parceiros() {
  return (
    <DashboardLayout>
      <ParceirosContent />
    </DashboardLayout>
  );
}
