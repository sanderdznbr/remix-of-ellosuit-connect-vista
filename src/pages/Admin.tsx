import React, { useState, useEffect, useCallback } from 'react';
import ContentDocumentParser from '@/components/Admin/ContentDocumentParser';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, CreditCard, Activity, Search, Loader2, 
  DollarSign, UserCheck, UserX, Clock, Gift, 
  TrendingUp, Eye, RefreshCw, Shield, ChevronDown, FileText, Tag, Plus, Trash2
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';

const ADMIN_EMAIL = 'admin@gmail.com';

type Tab = 'overview' | 'users' | 'subscriptions' | 'payments' | 'coupons' | 'actions' | 'content';

// ── Helpers ──
const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString('pt-BR') : '—';

function AdminContent() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Overview stats
  const [stats, setStats] = useState({ totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0, totalCarousels: 0 });

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [inlineCredits, setInlineCredits] = useState('');
  const [addingCredits, setAddingCredits] = useState(false);

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  // Payments (ellocontent_subscriptions)
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Actions
  const [actionSearch, setActionSearch] = useState('');
  const [actionResults, setActionResults] = useState<any[]>([]);
  const [actionType, setActionType] = useState<'credits' | 'subscription'>('credits');
  const [creditsAmount, setCreditsAmount] = useState('');
  const [planType, setPlanType] = useState('pro');
  const [actionTarget, setActionTarget] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponUsages, setCouponUsages] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percent: 25, max_uses: 10, description: '' });
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);

  // Auth guard — only block non-admin AFTER auth loads
  useEffect(() => {
    if (!authLoading && user && user.email !== ADMIN_EMAIL) {
      navigate('/');
    }
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load overview
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [{ count: usersCount }, { count: activeSubs }, { data: elloSubs }, { count: carouselsCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('source', 'ellocontent'),
        supabase.from('ellocontent_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('ellocontent_subscriptions').select('monthly_price, status'),
        supabase.from('generated_carousels').select('*', { count: 'exact', head: true }),
      ]);

      const revenue = (elloSubs || [])
        .filter((s: any) => s.status === 'active' || s.status === 'paid')
        .reduce((acc: number, s: any) => acc + (s.monthly_price || 0), 0);

      setStats({
        totalUsers: usersCount || 0,
        activeSubscriptions: activeSubs || 0,
        totalRevenue: revenue,
        totalCarousels: carouselsCount || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) loadOverview();
  }, [user, loadOverview]);

  // Load users
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, created_at, source')
        .eq('source', 'ellocontent')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data } = await query;
      
      if (data && data.length > 0) {
        // Get company info and credits for each user
        const userIds = data.map((u: any) => u.id);
        const [{ data: companyUsers }, { data: elloSubs }] = await Promise.all([
          supabase.from('company_users').select('user_id, company_id, role').in('user_id', userIds),
          supabase.from('ellocontent_subscriptions').select('user_id, plan_name, status, monthly_price, current_period_end').in('user_id', userIds),
        ]);

        const companyMap = new Map((companyUsers || []).map((cu: any) => [cu.user_id, cu]));
        const subMap = new Map((elloSubs || []).map((s: any) => [s.user_id, s]));

        // Get credit balances
        const companyIds = [...new Set((companyUsers || []).map((cu: any) => cu.company_id))];
        const { data: credits } = companyIds.length > 0 
          ? await supabase.from('ai_credit_balances').select('company_id, balance').in('company_id', companyIds)
          : { data: [] };
        const creditMap = new Map((credits || []).map((c: any) => [c.company_id, c.balance]));

        const enriched = data.map((u: any) => {
          const cu = companyMap.get(u.id);
          const sub = subMap.get(u.id);
          return {
            ...u,
            company_id: cu?.company_id || null,
            role: cu?.role || null,
            plan: sub?.plan_name || 'free',
            sub_status: sub?.status || null,
            monthly_price: sub?.monthly_price || 0,
            period_end: sub?.current_period_end || null,
            credits: cu ? (creditMap.get(cu.company_id) ?? 0) : 0,
          };
        });
        setUsers(enriched);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Load subscriptions
  const loadSubscriptions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const { data } = await supabase
        .from('ellocontent_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setSubscriptions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSubsLoading(false);
    }
  }, []);

  // Load payments
  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const { data } = await supabase
        .from('ellocontent_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setPayments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  // Load coupons
  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      setCoupons(data || []);
      // Load usages
      const { data: usages } = await supabase.from('coupon_redemptions').select('*').order('redeemed_at', { ascending: false }).limit(200);
      // Enrich usages with profile names
      if (usages && usages.length > 0) {
        const userIds = [...new Set(usages.map((u: any) => u.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, username').in('id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        const couponMap = new Map((data || []).map((c: any) => [c.id, c.code]));
        setCouponUsages(usages.map((u: any) => ({
          ...u,
          user_name: profileMap.get(u.user_id)?.display_name || profileMap.get(u.user_id)?.username || '—',
          coupon_code: couponMap.get(u.coupon_id) || '—',
        })));
      } else {
        setCouponUsages([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  // Tab change handler
  useEffect(() => {
    if (tab === 'users') loadUsers();
    else if (tab === 'subscriptions') loadSubscriptions();
    else if (tab === 'payments') loadPayments();
    else if (tab === 'coupons') loadCoupons();
  }, [tab, loadUsers, loadSubscriptions, loadPayments, loadCoupons]);

  // Search action users (by email via edge function, or by name/username locally)
  const searchUsers = async () => {
    if (!actionSearch.trim()) return;
    try {
      const isEmailSearch = actionSearch.includes('@');
      
      if (isEmailSearch) {
        // Search by email via edge function (emails are in auth.users)
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL || 'https://jwddiyuezqrpuakazvgg.supabase.co'}/functions/v1/admin-impersonate?action=search-users&q=${encodeURIComponent(actionSearch)}`,
          {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZGRpeXVlenFycHVha2F6dmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDIzNTgsImV4cCI6MjA2NjkxODM1OH0.CrUu3HGCfWh6cPfGsbDXGQNG5AWOsi9X2GGix1-7izg',
            },
          }
        );
        const results = await resp.json();
        if (Array.isArray(results) && results.length > 0) {
          setActionResults(results);
        } else {
          setActionResults([]);
          toast.error('Nenhum usuário encontrado com esse email');
        }
      } else {
        // Search by name/username in profiles
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .or(`display_name.ilike.%${actionSearch}%,username.ilike.%${actionSearch}%`)
          .limit(10);
        
        if (data && data.length > 0) {
          const userIds = data.map((u: any) => u.id);
          const { data: companyUsers } = await supabase.from('company_users').select('user_id, company_id').in('user_id', userIds);
          const cuMap = new Map((companyUsers || []).map((cu: any) => [cu.user_id, cu.company_id]));
          setActionResults(data.map((u: any) => ({ ...u, company_id: cuMap.get(u.id) || null })));
        } else {
          setActionResults([]);
          toast.error('Nenhum usuário encontrado');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Give credits
  const giveCredits = async () => {
    if (!actionTarget?.company_id) { toast.error('Usuário sem empresa vinculada'); return; }
    const amount = parseInt(creditsAmount);
    if (!amount || amount <= 0) { toast.error('Informe um valor válido'); return; }
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('add_ai_credits', {
        p_company_id: actionTarget.company_id,
        p_amount: amount,
        p_description: `Créditos adicionados manualmente pelo admin`,
      });
      if (error) throw error;
      toast.success(`${amount} créditos adicionados para ${actionTarget.display_name || actionTarget.username}!`);
      setCreditsAmount('');
      setActionTarget(null);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Give subscription
  const giveSubscription = async () => {
    if (!actionTarget?.company_id) { toast.error('Usuário sem empresa vinculada'); return; }
    setProcessing(true);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      await supabase.from('ellocontent_subscriptions').upsert({
        user_id: actionTarget.id,
        company_id: actionTarget.company_id,
        plan_name: planType,
        status: 'active',
        monthly_price: 0,
        monthly_credits: planType === 'starter' ? 50 : planType === 'pro' ? 120 : 240,
        extra_credit_price: planType === 'starter' ? 1.5 : planType === 'pro' ? 1.2 : 0.9,
        current_period_start: now.toISOString(),
        current_period_end: endDate.toISOString(),
        payment_method: 'manual_admin',
      } as any, { onConflict: 'user_id' });

      // Also update the subscriptions table
      await supabase.from('subscriptions').upsert({
        company_id: actionTarget.company_id,
        plan_type: planType as any,
        status: 'active' as any,
        monthly_price: 0,
        current_period_start: now.toISOString(),
        current_period_end: endDate.toISOString(),
      } as any, { onConflict: 'company_id' });

      toast.success(`Plano ${planType} ativado para ${actionTarget.display_name || actionTarget.username}!`);
      setActionTarget(null);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Change user plan inline
  const changeUserPlan = async (targetUser: any, newPlan: string) => {
    if (!targetUser?.company_id) { toast.error('Usuário sem empresa vinculada'); return; }
    setChangingPlan(true);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      if (newPlan === 'free') {
        // Cancel subscription
        await supabase.from('ellocontent_subscriptions')
          .update({ status: 'canceled' } as any)
          .eq('user_id', targetUser.id);
        await supabase.from('subscriptions')
          .update({ plan_type: 'free' as any, status: 'free' as any, monthly_price: 0 } as any)
          .eq('company_id', targetUser.company_id);
      } else {
        const creditMap: Record<string, number> = { starter: 50, pro: 120, growth: 240 };
        const priceMap: Record<string, number> = { starter: 1.5, pro: 1.2, growth: 0.9 };
        
        await supabase.from('ellocontent_subscriptions').upsert({
          user_id: targetUser.id,
          company_id: targetUser.company_id,
          plan_name: newPlan,
          status: 'active',
          monthly_price: 0,
          monthly_credits: creditMap[newPlan] || 50,
          extra_credit_price: priceMap[newPlan] || 1.5,
          current_period_start: now.toISOString(),
          current_period_end: endDate.toISOString(),
          payment_method: 'manual_admin',
        } as any, { onConflict: 'user_id' });

        await supabase.from('subscriptions').upsert({
          company_id: targetUser.company_id,
          plan_type: newPlan as any,
          status: 'active' as any,
          monthly_price: 0,
          current_period_start: now.toISOString(),
          current_period_end: endDate.toISOString(),
        } as any, { onConflict: 'company_id' });
      }

      toast.success(`Plano alterado para ${newPlan.toUpperCase()}!`);
      // Update local state
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, plan: newPlan, sub_status: newPlan === 'free' ? 'free' : 'active' } : u));
      setSelectedUser((prev: any) => prev ? { ...prev, plan: newPlan, sub_status: newPlan === 'free' ? 'free' : 'active' } : null);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setChangingPlan(false);
    }
  };

  // Give credits inline from user panel
  const giveInlineCredits = async () => {
    if (!selectedUser?.company_id) { toast.error('Usuário sem empresa vinculada'); return; }
    const amount = parseInt(inlineCredits);
    if (!amount || amount <= 0) { toast.error('Informe um valor válido'); return; }
    setAddingCredits(true);
    try {
      const { error } = await supabase.rpc('add_ai_credits', {
        p_company_id: selectedUser.company_id,
        p_amount: amount,
        p_description: 'Créditos adicionados pelo admin',
      });
      if (error) throw error;
      toast.success(`${amount} créditos adicionados!`);
      setInlineCredits('');
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, credits: u.credits + amount } : u));
      setSelectedUser((prev: any) => prev ? { ...prev, credits: prev.credits + amount } : null);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setAddingCredits(false);
    }
  };

  const filteredUsers = userSearch
    ? users.filter(u => 
        (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  if (authLoading || (user?.email !== ADMIN_EMAIL)) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Visão Geral', icon: Activity },
    { key: 'users', label: 'Usuários', icon: Users },
    { key: 'subscriptions', label: 'Assinaturas', icon: UserCheck },
    { key: 'payments', label: 'Pagamentos', icon: DollarSign },
    { key: 'coupons', label: 'Cupons', icon: Tag },
    { key: 'actions', label: 'Ações Manuais', icon: Gift },
    { key: 'content', label: 'Conteúdo', icon: FileText },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': case 'paid': return 'text-green-400 bg-green-400/10';
      case 'pending': case 'waiting_payment': return 'text-yellow-400 bg-yellow-400/10';
      case 'canceled': case 'cancelled': case 'failed': return 'text-red-400 bg-red-400/10';
      case 'past_due': return 'text-orange-400 bg-orange-400/10';
      default: return 'text-white/40 bg-white/5';
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(123,80,220,0.15)' }}>
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
            <p className="text-white/30 text-xs">Gerencie usuários, pagamentos e assinaturas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                tab === t.key ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Total Usuários', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
                { label: 'Assinaturas Ativas', value: stats.activeSubscriptions, icon: UserCheck, color: 'text-green-400' },
                { label: 'Receita Recorrente', value: fmt(stats.totalRevenue), icon: DollarSign, color: 'text-purple-400' },
                { label: 'Carrosséis Gerados', value: stats.totalCarousels, icon: TrendingUp, color: 'text-orange-400' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
                  <p className="text-white font-bold text-lg">{s.value}</p>
                  <p className="text-white/30 text-[11px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => { loadOverview(); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </button>
            </div>
          </div>
        )}

        {/* ═══ USERS ═══ */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Buscar por nome ou username..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
              <button onClick={loadUsers} className="p-2.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Usuário</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Plano</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Créditos</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Cadastro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)} className="border-t border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">
                                {(u.display_name || u.username || '?')[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white/80 font-medium text-sm">{u.display_name || '—'}</p>
                                <p className="text-white/30 text-[11px]">@{u.username || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-white/60 text-xs capitalize">{u.plan}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColor(u.sub_status || 'free')}`}>
                              {u.sub_status || 'free'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/60 text-xs">{Math.floor(u.credits)}</td>
                          <td className="px-4 py-3 text-white/30 text-[11px]">{fmtDate(u.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 text-[11px] text-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  {filteredUsers.length} usuário(s)
                </div>
              </div>
            )}

            {/* ── User Management Panel ── */}
            {selectedUser && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
                      {(selectedUser.display_name || selectedUser.username || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{selectedUser.display_name || '—'}</p>
                      <p className="text-white/30 text-[11px]">@{selectedUser.username} · {Math.floor(selectedUser.credits)} créditos</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-white/30 hover:text-white/60 text-xs cursor-pointer">✕</button>
                </div>

                {/* Plan switcher */}
                <div className="mb-4">
                  <p className="text-white/40 text-[11px] uppercase font-medium mb-2">Alterar Plano</p>
                  <div className="flex gap-1.5">
                    {['free', 'starter', 'pro', 'growth'].map(plan => {
                      const isCurrent = (selectedUser.plan || 'free').toLowerCase() === plan;
                      return (
                        <button
                          key={plan}
                          disabled={changingPlan || isCurrent}
                          onClick={() => changeUserPlan(selectedUser, plan)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:cursor-default ${
                            isCurrent
                              ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50'
                              : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
                          }`}
                          style={!isCurrent ? { backgroundColor: 'rgba(255,255,255,0.03)' } : undefined}
                        >
                          {changingPlan ? '...' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                          {isCurrent && <span className="block text-[9px] text-purple-400/60 mt-0.5">atual</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick credits */}
                <div>
                  <p className="text-white/40 text-[11px] uppercase font-medium mb-2">Adicionar Créditos</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={inlineCredits}
                      onChange={e => setInlineCredits(e.target.value)}
                      placeholder="Qtd créditos"
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                    <button onClick={giveInlineCredits} disabled={addingCredits}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity"
                      style={{ backgroundColor: '#7B50DC' }}>
                      {addingCredits ? '...' : 'Adicionar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ═══ SUBSCRIPTIONS ═══ */}
        {tab === 'subscriptions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs">{subscriptions.length} assinatura(s)</p>
              <button onClick={loadSubscriptions} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {subsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
            ) : (
              <div className="space-y-2">
                {subscriptions.map(s => (
                  <div key={s.id} className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white/80 text-sm font-medium">{s.customer_name || s.customer_email || 'Sem nome'}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>{s.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-white/30">
                        <span>Plano: <strong className="text-white/50 capitalize">{s.plan_name}</strong></span>
                        <span>{fmt(s.monthly_price)}/mês</span>
                        {s.payment_method && <span>Via {s.payment_method}</span>}
                        <span>Vence: {fmtDate(s.current_period_end)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-white/40 text-[11px]">{fmtDate(s.created_at)}</p>
                      {s.card_brand && <p className="text-white/20 text-[10px]">{s.card_brand} •••• {s.card_last_digits}</p>}
                    </div>
                  </div>
                ))}
                {subscriptions.length === 0 && (
                  <p className="text-center text-white/20 text-xs py-8">Nenhuma assinatura encontrada</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ PAYMENTS ═══ */}
        {tab === 'payments' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs">{payments.length} registro(s)</p>
              <button onClick={loadPayments} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {paymentsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Cliente</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Plano</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Valor</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Método</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-white/70 text-sm">{p.customer_name || '—'}</p>
                            <p className="text-white/25 text-[11px]">{p.customer_email || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-white/60 text-xs capitalize">{p.plan_name}</td>
                          <td className="px-4 py-3 text-white/70 text-sm font-medium">{fmt(p.monthly_price)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs">{p.payment_method || '—'}</td>
                          <td className="px-4 py-3 text-white/30 text-[11px]">{fmtDateTime(p.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ COUPONS ═══ */}
        {tab === 'coupons' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs">{coupons.length} cupom(ns)</p>
              <div className="flex gap-2">
                <button onClick={() => setShowCreateCoupon(v => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: '#7B50DC' }}>
                  <Plus className="w-3.5 h-3.5" /> Novo Cupom
                </button>
                <button onClick={loadCoupons} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showCreateCoupon && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-white font-semibold text-sm mb-4">Criar Cupom</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-white/40 text-[11px] uppercase font-medium mb-1 block">Código</label>
                    <input value={newCoupon.code} onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="EX: PROMO50" className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <div>
                    <label className="text-white/40 text-[11px] uppercase font-medium mb-1 block">Desconto %</label>
                    <input type="number" value={newCoupon.discount_percent} onChange={e => setNewCoupon(p => ({ ...p, discount_percent: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <div>
                    <label className="text-white/40 text-[11px] uppercase font-medium mb-1 block">Limite de usos</label>
                    <input type="number" value={newCoupon.max_uses} onChange={e => setNewCoupon(p => ({ ...p, max_uses: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <div>
                    <label className="text-white/40 text-[11px] uppercase font-medium mb-1 block">Descrição</label>
                    <input value={newCoupon.description} onChange={e => setNewCoupon(p => ({ ...p, description: e.target.value }))} placeholder="Opcional" className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                </div>
                <button disabled={creatingCoupon || !newCoupon.code} onClick={async () => {
                  setCreatingCoupon(true);
                  try {
                    const { error } = await supabase.from('coupons').insert({
                      code: newCoupon.code,
                      coupon_type: 'discount',
                      discount_percent: newCoupon.discount_percent,
                      max_uses: newCoupon.max_uses,
                      is_active: true,
                      description: newCoupon.description || null,
                    });
                    if (error) throw error;
                    toast.success(`Cupom ${newCoupon.code} criado!`);
                    setNewCoupon({ code: '', discount_percent: 25, max_uses: 10, description: '' });
                    setShowCreateCoupon(false);
                    loadCoupons();
                  } catch (err: any) {
                    toast.error('Erro: ' + err.message);
                  } finally {
                    setCreatingCoupon(false);
                  }
                }} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer hover:opacity-90 disabled:opacity-50 transition-all" style={{ backgroundColor: '#7B50DC' }}>
                  {creatingCoupon ? 'Criando...' : 'Criar Cupom'}
                </button>
              </motion.div>
            )}

            {couponsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
            ) : (
              <div className="space-y-2">
                {coupons.map(c => (
                  <div key={c.id} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-purple-400" />
                        <div>
                          <span className="text-white font-bold text-sm">{c.code}</span>
                          {c.description && <p className="text-white/30 text-[11px]">{c.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {c.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        <button onClick={async () => {
                          await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
                          loadCoupons();
                        }} className="text-white/30 hover:text-white/60 text-[11px] cursor-pointer">
                          {c.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-white/40">
                      {c.discount_percent > 0 && <span className="text-purple-400 font-medium">-{c.discount_percent}%</span>}
                      {c.discount_fixed > 0 && <span className="text-purple-400 font-medium">-R${c.discount_fixed?.toFixed(2).replace('.', ',')}</span>}
                      <span>Usos: <strong className="text-white/60">{c.current_uses || 0}</strong>{c.max_uses ? ` / ${c.max_uses}` : ' (ilimitado)'}</span>
                      <span>Tipo: {c.coupon_type}</span>
                      {c.expires_at && <span>Expira: {fmtDate(c.expires_at)}</span>}
                      <span>Criado: {fmtDate(c.created_at)}</span>
                    </div>
                    <button onClick={() => setSelectedCouponId(selectedCouponId === c.id ? null : c.id)} className="text-white/30 hover:text-white/50 text-[11px] mt-2 cursor-pointer">
                      {selectedCouponId === c.id ? '▼ Ocultar usos' : '▶ Ver quem usou'}
                    </button>
                    {selectedCouponId === c.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 overflow-hidden">
                        {couponUsages.filter(u => u.coupon_id === c.id).length === 0 ? (
                          <p className="text-white/20 text-[11px] py-2">Nenhum uso registrado</p>
                        ) : (
                          <div className="space-y-1">
                            {couponUsages.filter(u => u.coupon_id === c.id).map(u => (
                              <div key={u.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <span className="text-white/60 text-[11px]">{u.user_name}</span>
                                <span className="text-white/30 text-[10px]">{fmtDateTime(u.redeemed_at)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                ))}
                {coupons.length === 0 && (
                  <p className="text-center text-white/20 text-xs py-8">Nenhum cupom encontrado</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ MANUAL ACTIONS ═══ */}
        {tab === 'actions' && (
          <div className="max-w-xl">
            <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white font-semibold text-sm mb-4">Buscar Usuário</h3>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={actionSearch}
                    onChange={e => setActionSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchUsers()}
                    placeholder="Email, nome ou username..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
                <button onClick={searchUsers} className="px-4 py-2.5 rounded-lg text-xs font-medium text-white cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: '#7B50DC' }}>
                  Buscar
                </button>
              </div>

              {actionResults.length > 0 && (
                <div className="mt-3 space-y-1">
                  {actionResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setActionTarget(u)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                        actionTarget?.id === u.id ? 'bg-purple-500/20 text-white' : 'text-white/50 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-[10px] font-bold">
                        {(u.display_name || u.username || '?')[0]?.toUpperCase()}
                      </div>
                       <div className="text-left min-w-0">
                        <p className="text-sm truncate">{u.display_name || '—'}</p>
                        <p className="text-[11px] text-white/30 truncate">{u.email || `@${u.username}`}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {actionTarget && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-white/60 text-xs mb-4">
                  Ação para: <strong className="text-white">{actionTarget.display_name || actionTarget.username}</strong>
                </p>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActionType('credits')}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      actionType === 'credits' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    Adicionar Créditos
                  </button>
                  <button
                    onClick={() => setActionType('subscription')}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      actionType === 'subscription' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    Dar Assinatura
                  </button>
                </div>

                {actionType === 'credits' && (
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={creditsAmount}
                      onChange={e => setCreditsAmount(e.target.value)}
                      placeholder="Quantidade de créditos"
                      className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                    <button onClick={giveCredits} disabled={processing}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#7B50DC', color: '#fff' }}>
                      {processing ? 'Processando...' : 'Adicionar Créditos'}
                    </button>
                  </div>
                )}

                {actionType === 'subscription' && (
                  <div className="space-y-3">
                    <select
                      value={planType}
                      onChange={e => setPlanType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg text-sm text-white outline-none cursor-pointer"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <option value="starter" className="bg-[#111]">Starter</option>
                      <option value="pro" className="bg-[#111]">Pro</option>
                      <option value="growth" className="bg-[#111]">Growth</option>
                    </select>
                    <button onClick={giveSubscription} disabled={processing}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#7B50DC', color: '#fff' }}>
                      {processing ? 'Processando...' : `Ativar plano ${planType}`}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* ═══ CONTENT PARSER ═══ */}
        {tab === 'content' && (
          <div className="max-w-2xl">
            <ContentDocumentParser />
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function Admin() {
  return (
    <DashboardLayout>
      <AdminContent />
    </DashboardLayout>
  );
}
