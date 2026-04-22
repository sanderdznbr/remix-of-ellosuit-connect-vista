import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ContentDocumentParser from '@/components/Admin/ContentDocumentParser';
import AuthHeroUploader from '@/components/Admin/AuthHeroUploader';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, CreditCard, Activity, Search, Loader2,
  DollarSign, UserCheck, Clock, Gift,
  RefreshCw, Shield, FileText, Tag, Plus,
  Image as ImageIcon, MessageSquare, BarChart3, Zap,
  CheckCircle2, XCircle, Sparkles,
  ScrollText, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';

const ADMIN_EMAIL = 'admin@gmail.com';
const PURPLE = '#7B50DC';
const PURPLE_SOFT = 'rgba(123,80,220,0.15)';

type Tab =
  | 'overview' | 'analytics' | 'users' | 'posts'
  | 'subscriptions' | 'payments' | 'logs'
  | 'support' | 'coupons' | 'actions' | 'content' | 'appearance';

const fmt = (n: number) => `R$ ${(n || 0).toFixed(2).replace('.', ',')}`;
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const fmtDateTime = (d: string | null) => (d ? new Date(d).toLocaleString('pt-BR') : '—');
const fmtNumber = (n: number) => new Intl.NumberFormat('pt-BR').format(n || 0);
const dayKey = (d: string | Date) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().split('T')[0];
};
const lastNDays = (n: number): string[] => {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
};
const fmtDayLabel = (key: string) => {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
};

const SERVICE_LABELS: Record<string, string> = {
  lovable_ai: 'Ello IA (Texto/Imagem)',
  elevenlabs_tts: 'ElevenLabs TTS',
  elevenlabs_stt: 'ElevenLabs STT',
  openai_whisper: 'OpenAI Whisper',
  openai_tts: 'OpenAI TTS',
  assemblyai: 'AssemblyAI',
  gmail_api: 'Gmail API',
  perplexity: 'Perplexity',
  firecrawl: 'Firecrawl',
};
const labelService = (s: string) => SERVICE_LABELS[s] || s;

const StatCard: React.FC<{
  label: string; value: React.ReactNode; icon: React.ElementType;
  color?: string; sub?: string; trend?: number;
}> = ({ label, value, icon: Icon, color = 'text-purple-400', sub, trend }) => (
  <div className="rounded-xl p-4 transition-all hover:bg-white/[0.05]"
    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="flex items-start justify-between mb-2">
      <Icon className={`w-4 h-4 ${color}`} />
      {trend !== undefined && (
        <span className={`flex items-center gap-0.5 text-[10px] font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-white font-bold text-lg leading-tight">{value}</p>
    <p className="text-white/40 text-[11px] mt-0.5">{label}</p>
    {sub && <p className="text-white/25 text-[10px] mt-0.5">{sub}</p>}
  </div>
);

const Panel: React.FC<{ title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, right, children, className }) => (
  <div className={`rounded-xl p-5 ${className || ''}`}
    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
    {(title || right) && (
      <div className="flex items-center justify-between mb-4">
        {title && <h3 className="text-white/80 text-sm font-semibold">{title}</h3>}
        {right}
      </div>
    )}
    {children}
  </div>
);

function AdminContent() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overview, setOverview] = useState({
    totalUsers: 0, newUsers7d: 0, newUsers30d: 0,
    activeSubs: 0, canceledSubs: 0, pendingPayments: 0,
    monthlyRevenue: 0, totalRevenuePaid: 0, pendingRevenue: 0,
    totalCarousels: 0, carousels7d: 0,
    creditsConsumed30d: 0, totalCreditsBalance: 0, apiCalls30d: 0,
  });
  const [signupSeries, setSignupSeries] = useState<{ day: string; count: number }[]>([]);
  const [postSeries, setPostSeries] = useState<{ day: string; count: number }[]>([]);
  const [creditSeries, setCreditSeries] = useState<{ day: string; consumed: number; purchased: number }[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [serviceUsage, setServiceUsage] = useState<{ service: string; count: number; cost: number }[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);

  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<{ posts: number; credits_consumed: number; api_calls: number } | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [inlineCredits, setInlineCredits] = useState('');
  const [addingCredits, setAddingCredits] = useState(false);

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsFilter, setSubsFilter] = useState<'all' | 'active' | 'canceled' | 'pending'>('all');

  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsFilter, setPaymentsFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState<'all' | 'credits' | 'webhooks' | 'impersonations'>('all');

  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(0);

  const [supportConvos, setSupportConvos] = useState<any[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedConvo, setSelectedConvo] = useState<any>(null);
  const [convoMessages, setConvoMessages] = useState<any[]>([]);
  const [convoMsgsLoading, setConvoMsgsLoading] = useState(false);

  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponUsages, setCouponUsages] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percent: 25, max_uses: 10, description: '' });
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);

  const [actionSearch, setActionSearch] = useState('');
  const [actionResults, setActionResults] = useState<any[]>([]);
  const [actionType, setActionType] = useState<'credits' | 'subscription'>('credits');
  const [creditsAmount, setCreditsAmount] = useState('');
  const [planType, setPlanType] = useState('pro');
  const [actionTarget, setActionTarget] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && user && user.email !== ADMIN_EMAIL) navigate('/');
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const now = new Date();
      const days30 = new Date(now); days30.setDate(days30.getDate() - 30);
      const days7 = new Date(now); days7.setDate(days7.getDate() - 7);

      const [
        profilesAll, profiles7, profiles30,
        elloSubs, allCarousels, carousels30,
        creditTxs, apiLogs, balances,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('source', 'ellocontent'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('source', 'ellocontent').gte('created_at', days7.toISOString()),
        supabase.from('profiles').select('id, created_at').eq('source', 'ellocontent').gte('created_at', days30.toISOString()).order('created_at', { ascending: true }).limit(2000),
        supabase.from('ellocontent_subscriptions').select('id, status, plan_name, monthly_price, created_at, paid_at, user_id, customer_name, customer_email'),
        supabase.from('generated_carousels').select('*', { count: 'exact', head: true }),
        supabase.from('generated_carousels').select('id, created_at, user_id').gte('created_at', days30.toISOString()).order('created_at', { ascending: true }).limit(5000),
        supabase.from('ai_credit_transactions').select('amount, transaction_type, created_at').gte('created_at', days30.toISOString()).limit(5000),
        supabase.from('api_usage_logs').select('service_type, total_cost, created_at').gte('created_at', days30.toISOString()).limit(5000),
        supabase.from('ai_credit_balances').select('balance'),
      ]);

      const subs = elloSubs.data || [];
      const activeSubs = subs.filter(s => s.status === 'active');
      const canceledSubs = subs.filter(s => s.status === 'canceled' || s.status === 'cancelled');
      const pending = subs.filter(s => ['pending', 'waiting_payment', 'processing'].includes(s.status));

      const monthlyRevenue = activeSubs.reduce((a, s) => a + Number(s.monthly_price || 0), 0);
      const pendingRevenue = pending.reduce((a, s) => a + Number(s.monthly_price || 0), 0);
      const totalPaid = subs.filter(s => s.paid_at).reduce((a, s) => a + Number(s.monthly_price || 0), 0);

      const credits30 = (creditTxs.data || []).filter(t => t.transaction_type === 'consumption').reduce((a, t) => a + Math.abs(Number(t.amount || 0)), 0);
      const totalBalance = (balances.data || []).reduce((a, b) => a + Number(b.balance || 0), 0);
      const apiCalls30 = (apiLogs.data || []).length;

      const days = lastNDays(30);
      const signupMap: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
      (profiles30.data || []).forEach(p => { const k = dayKey(p.created_at); if (k in signupMap) signupMap[k]++; });
      setSignupSeries(days.map(d => ({ day: d, count: signupMap[d] })));

      const postMap: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
      (carousels30.data || []).forEach(p => { const k = dayKey(p.created_at); if (k in postMap) postMap[k]++; });
      setPostSeries(days.map(d => ({ day: d, count: postMap[d] })));

      const consMap: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
      const purMap: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
      (creditTxs.data || []).forEach(t => {
        const k = dayKey(t.created_at);
        if (!(k in consMap)) return;
        if (t.transaction_type === 'consumption') consMap[k] += Math.abs(Number(t.amount));
        else if (t.transaction_type === 'purchase') purMap[k] += Math.abs(Number(t.amount));
      });
      setCreditSeries(days.map(d => ({ day: d, consumed: Math.round(consMap[d]), purchased: Math.round(purMap[d]) })));

      const planCounts: Record<string, number> = {};
      activeSubs.forEach(s => {
        const k = (s.plan_name || 'free').toLowerCase();
        planCounts[k] = (planCounts[k] || 0) + 1;
      });
      const planColors: Record<string, string> = { starter: '#3B82F6', pro: '#7B50DC', growth: '#EC4899', free: '#64748B' };
      setPlanDistribution(Object.entries(planCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value, color: planColors[name] || '#94A3B8',
      })));

      const svcMap: Record<string, { count: number; cost: number }> = {};
      (apiLogs.data || []).forEach(l => {
        const k = l.service_type || 'unknown';
        if (!svcMap[k]) svcMap[k] = { count: 0, cost: 0 };
        svcMap[k].count++;
        svcMap[k].cost += Number(l.total_cost || 0);
      });
      setServiceUsage(Object.entries(svcMap).map(([service, v]) => ({ service, count: v.count, cost: v.cost })).sort((a, b) => b.count - a.count));

      const userPostCount: Record<string, number> = {};
      (carousels30.data || []).forEach(c => { userPostCount[c.user_id] = (userPostCount[c.user_id] || 0) + 1; });
      const topUserIds = Object.entries(userPostCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
      if (topUserIds.length > 0) {
        const { data: topProfiles } = await supabase.from('profiles').select('id, display_name, username, avatar_url').in('id', topUserIds);
        const map = new Map((topProfiles || []).map((p: any) => [p.id, p]));
        setTopUsers(topUserIds.map(id => ({ ...(map.get(id) || { id }), posts: userPostCount[id] })));
      } else { setTopUsers([]); }

      setOverview({
        totalUsers: profilesAll.count || 0,
        newUsers7d: profiles7.count || 0,
        newUsers30d: profiles30.data?.length || 0,
        activeSubs: activeSubs.length,
        canceledSubs: canceledSubs.length,
        pendingPayments: pending.length,
        monthlyRevenue, totalRevenuePaid: totalPaid, pendingRevenue,
        totalCarousels: allCarousels.count || 0,
        carousels7d: (carousels30.data || []).filter(c => new Date(c.created_at) >= days7).length,
        creditsConsumed30d: Math.round(credits30),
        totalCreditsBalance: Math.round(totalBalance),
        apiCalls30d: apiCalls30,
      });
    } catch (e) { console.error(e); }
    finally { setOverviewLoading(false); }
  }, []);

  useEffect(() => { if (user?.email === ADMIN_EMAIL) loadOverview(); }, [user, loadOverview]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data } = await supabase.from('profiles')
        .select('id, display_name, username, avatar_url, created_at, source')
        .eq('source', 'ellocontent').order('created_at', { ascending: false }).limit(200);

      if (data && data.length > 0) {
        const userIds = data.map((u: any) => u.id);
        const [{ data: companyUsers }, { data: elloSubs }, { data: postCounts }] = await Promise.all([
          supabase.from('company_users').select('user_id, company_id, role').in('user_id', userIds),
          supabase.from('ellocontent_subscriptions').select('user_id, plan_name, status, monthly_price, current_period_end, paid_at').in('user_id', userIds),
          supabase.from('generated_carousels').select('user_id').in('user_id', userIds).limit(10000),
        ]);
        const companyMap = new Map((companyUsers || []).map((cu: any) => [cu.user_id, cu]));
        const subMap = new Map((elloSubs || []).map((s: any) => [s.user_id, s]));
        const postMap: Record<string, number> = {};
        (postCounts || []).forEach((p: any) => { postMap[p.user_id] = (postMap[p.user_id] || 0) + 1; });

        const companyIds = [...new Set((companyUsers || []).map((cu: any) => cu.company_id))];
        const { data: credits } = companyIds.length > 0
          ? await supabase.from('ai_credit_balances').select('company_id, balance, total_consumed').in('company_id', companyIds)
          : { data: [] };
        const creditMap = new Map((credits || []).map((c: any) => [c.company_id, c]));

        setUsers(data.map((u: any) => {
          const cu = companyMap.get(u.id);
          const sub = subMap.get(u.id);
          const cr: any = cu ? creditMap.get(cu.company_id) : null;
          return {
            ...u,
            company_id: cu?.company_id || null, role: cu?.role || null,
            plan: sub?.plan_name || 'free', sub_status: sub?.status || null,
            monthly_price: sub?.monthly_price || 0, paid_at: sub?.paid_at || null,
            period_end: sub?.current_period_end || null,
            credits: cr?.balance ?? 0, consumed: cr?.total_consumed ?? 0,
            posts: postMap[u.id] || 0,
          };
        }));
      } else { setUsers([]); }
    } catch (e) { console.error(e); }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => {
    if (!selectedUser?.id || !selectedUser?.company_id) { setUserDetails(null); return; }
    (async () => {
      const [{ count: postsCount }, { data: txs }, { count: apiCount }] = await Promise.all([
        supabase.from('generated_carousels').select('*', { count: 'exact', head: true }).eq('user_id', selectedUser.id),
        supabase.from('ai_credit_transactions').select('amount').eq('company_id', selectedUser.company_id).eq('transaction_type', 'consumption').limit(5000),
        supabase.from('api_usage_logs').select('*', { count: 'exact', head: true }).eq('company_id', selectedUser.company_id),
      ]);
      const consumed = (txs || []).reduce((a, t: any) => a + Math.abs(Number(t.amount || 0)), 0);
      setUserDetails({ posts: postsCount || 0, credits_consumed: Math.round(consumed), api_calls: apiCount || 0 });
    })();
  }, [selectedUser?.id, selectedUser?.company_id]);

  const loadSubscriptions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const { data } = await supabase.from('ellocontent_subscriptions').select('*').order('created_at', { ascending: false }).limit(200);
      setSubscriptions(data || []);
    } catch (e) { console.error(e); }
    finally { setSubsLoading(false); }
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const { data } = await supabase.from('ellocontent_subscriptions').select('*').order('created_at', { ascending: false }).limit(500);
      setPayments(data || []);
    } catch (e) { console.error(e); }
    finally { setPaymentsLoading(false); }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const [{ data: credits }, { data: webhooks }, { data: impers }] = await Promise.all([
        supabase.from('ai_credit_transactions').select('id, company_id, transaction_type, amount, balance_after, description, created_at').order('created_at', { ascending: false }).limit(80),
        supabase.from('webhook_logs').select('id, provider, event_type, processed_at, created_at').order('created_at', { ascending: false }).limit(80),
        supabase.from('admin_impersonation_logs').select('id, admin_user_id, target_user_id, reason, started_at, ip_address').order('started_at', { ascending: false }).limit(40),
      ]);
      const merged: any[] = [];
      (credits || []).forEach(c => merged.push({ kind: 'credits', id: c.id, ts: c.created_at, ...c }));
      (webhooks || []).forEach(w => merged.push({ kind: 'webhooks', id: w.id, ts: w.created_at, ...w }));
      (impers || []).forEach(i => merged.push({ kind: 'impersonations', id: i.id, ts: i.started_at, ...i }));
      merged.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setLogs(merged);
    } catch (e) { console.error(e); }
    finally { setLogsLoading(false); }
  }, []);

  const loadAllPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const { data } = await supabase.from('generated_carousels')
        .select('id, title, topic, post_format, card_count, cover_url, created_at, user_id, company_id')
        .order('created_at', { ascending: false }).range(postsPage * 50, (postsPage + 1) * 50 - 1);
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((p: any) => p.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, username').in('id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        setAllPosts(data.map((p: any) => ({ ...p, user_name: (profileMap.get(p.user_id) as any)?.display_name || (profileMap.get(p.user_id) as any)?.username || '—' })));
      } else { setAllPosts([]); }
    } catch (e) { console.error(e); }
    finally { setPostsLoading(false); }
  }, [postsPage]);

  const loadSupport = useCallback(async () => {
    setSupportLoading(true);
    try {
      const { data } = await supabase.from('support_chat_conversations').select('*').order('updated_at', { ascending: false }).limit(100);
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, username').in('id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        setSupportConvos(data.map((c: any) => ({ ...c, user_name: (profileMap.get(c.user_id) as any)?.display_name || (profileMap.get(c.user_id) as any)?.username || '—' })));
      } else { setSupportConvos([]); }
    } catch (e) { console.error(e); }
    finally { setSupportLoading(false); }
  }, []);

  const loadConvoMessages = async (convoId: string) => {
    setConvoMsgsLoading(true);
    try {
      const { data } = await supabase.from('support_chat_messages').select('*').eq('conversation_id', convoId).order('created_at', { ascending: true });
      setConvoMessages(data || []);
    } catch (e) { console.error(e); }
    finally { setConvoMsgsLoading(false); }
  };

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      setCoupons(data || []);
      const { data: usages } = await supabase.from('coupon_redemptions').select('*').order('redeemed_at', { ascending: false }).limit(200);
      if (usages && usages.length > 0) {
        const userIds = [...new Set(usages.map((u: any) => u.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, username').in('id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        const couponMap = new Map((data || []).map((c: any) => [c.id, c.code]));
        setCouponUsages(usages.map((u: any) => ({
          ...u,
          user_name: (profileMap.get(u.user_id) as any)?.display_name || (profileMap.get(u.user_id) as any)?.username || '—',
          coupon_code: couponMap.get(u.coupon_id) || '—',
        })));
      } else { setCouponUsages([]); }
    } catch (e) { console.error(e); }
    finally { setCouponsLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    else if (tab === 'subscriptions') loadSubscriptions();
    else if (tab === 'payments') loadPayments();
    else if (tab === 'logs') loadLogs();
    else if (tab === 'coupons') loadCoupons();
    else if (tab === 'posts') loadAllPosts();
    else if (tab === 'support') loadSupport();
    else if (tab === 'analytics') loadOverview();
  }, [tab, loadUsers, loadSubscriptions, loadPayments, loadLogs, loadCoupons, loadAllPosts, loadSupport, loadOverview]);

  const searchUsers = async () => {
    if (!actionSearch.trim()) return;
    try {
      const isEmail = actionSearch.includes('@');
      if (isEmail) {
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
        if (Array.isArray(results) && results.length > 0) setActionResults(results);
        else { setActionResults([]); toast.error('Nenhum usuário encontrado'); }
      } else {
        const { data } = await supabase.from('profiles').select('id, display_name, username')
          .or(`display_name.ilike.%${actionSearch}%,username.ilike.%${actionSearch}%`).limit(10);
        if (data && data.length > 0) {
          const userIds = data.map((u: any) => u.id);
          const { data: companyUsers } = await supabase.from('company_users').select('user_id, company_id').in('user_id', userIds);
          const cuMap = new Map((companyUsers || []).map((cu: any) => [cu.user_id, cu.company_id]));
          setActionResults(data.map((u: any) => ({ ...u, company_id: cuMap.get(u.id) || null })));
        } else { setActionResults([]); toast.error('Nenhum usuário encontrado'); }
      }
    } catch (e) { console.error(e); }
  };

  const giveCredits = async () => {
    if (!actionTarget?.company_id) { toast.error('Sem empresa vinculada'); return; }
    const amount = parseInt(creditsAmount);
    if (!amount || amount <= 0) { toast.error('Informe um valor válido'); return; }
    setProcessing(true);
    try {
      const { error } = await supabase.rpc('add_ai_credits', { p_company_id: actionTarget.company_id, p_amount: amount, p_description: 'Créditos adicionados pelo admin' });
      if (error) throw error;
      toast.success(`${amount} créditos adicionados!`);
      setCreditsAmount(''); setActionTarget(null);
    } catch (err: any) { toast.error('Erro: ' + err.message); }
    finally { setProcessing(false); }
  };

  const giveSubscription = async () => {
    if (!actionTarget?.company_id) { toast.error('Sem empresa vinculada'); return; }
    setProcessing(true);
    try {
      const now = new Date(); const endDate = new Date(now); endDate.setMonth(endDate.getMonth() + 1);
      await supabase.from('ellocontent_subscriptions').upsert({
        user_id: actionTarget.id, company_id: actionTarget.company_id, plan_name: planType, status: 'active', monthly_price: 0,
        monthly_credits: planType === 'starter' ? 50 : planType === 'pro' ? 120 : 240,
        extra_credit_price: planType === 'starter' ? 1.5 : planType === 'pro' ? 1.2 : 0.9,
        current_period_start: now.toISOString(), current_period_end: endDate.toISOString(), payment_method: 'manual_admin',
      } as any, { onConflict: 'user_id' });
      await supabase.from('subscriptions').upsert({
        company_id: actionTarget.company_id, plan_type: planType as any, status: 'active' as any,
        monthly_price: 0, current_period_start: now.toISOString(), current_period_end: endDate.toISOString(),
      } as any, { onConflict: 'company_id' });
      toast.success(`Plano ${planType} ativado!`);
      setActionTarget(null);
    } catch (err: any) { toast.error('Erro: ' + err.message); }
    finally { setProcessing(false); }
  };

  const changeUserPlan = async (target: any, newPlan: string) => {
    if (!target?.company_id) { toast.error('Sem empresa vinculada'); return; }
    setChangingPlan(true);
    try {
      const now = new Date(); const endDate = new Date(now); endDate.setMonth(endDate.getMonth() + 1);
      if (newPlan === 'free') {
        await supabase.from('ellocontent_subscriptions').update({ status: 'canceled' } as any).eq('user_id', target.id);
        await supabase.from('subscriptions').update({ plan_type: 'free' as any, status: 'free' as any, monthly_price: 0 } as any).eq('company_id', target.company_id);
      } else {
        const cm: Record<string, number> = { starter: 50, pro: 120, growth: 240 };
        const pm: Record<string, number> = { starter: 1.5, pro: 1.2, growth: 0.9 };
        await supabase.from('ellocontent_subscriptions').upsert({
          user_id: target.id, company_id: target.company_id, plan_name: newPlan, status: 'active', monthly_price: 0,
          monthly_credits: cm[newPlan] || 50, extra_credit_price: pm[newPlan] || 1.5,
          current_period_start: now.toISOString(), current_period_end: endDate.toISOString(), payment_method: 'manual_admin',
        } as any, { onConflict: 'user_id' });
        await supabase.from('subscriptions').upsert({
          company_id: target.company_id, plan_type: newPlan as any, status: 'active' as any,
          monthly_price: 0, current_period_start: now.toISOString(), current_period_end: endDate.toISOString(),
        } as any, { onConflict: 'company_id' });
      }
      toast.success(`Plano alterado para ${newPlan.toUpperCase()}`);
      setUsers(prev => prev.map(u => u.id === target.id ? { ...u, plan: newPlan, sub_status: newPlan === 'free' ? 'free' : 'active' } : u));
      setSelectedUser((prev: any) => prev ? { ...prev, plan: newPlan, sub_status: newPlan === 'free' ? 'free' : 'active' } : null);
    } catch (err: any) { toast.error('Erro: ' + err.message); }
    finally { setChangingPlan(false); }
  };

  const giveInlineCredits = async () => {
    if (!selectedUser?.company_id) { toast.error('Sem empresa vinculada'); return; }
    const amount = parseInt(inlineCredits);
    if (!amount || amount <= 0) { toast.error('Valor inválido'); return; }
    setAddingCredits(true);
    try {
      const { error } = await supabase.rpc('add_ai_credits', { p_company_id: selectedUser.company_id, p_amount: amount, p_description: 'Créditos adicionados pelo admin' });
      if (error) throw error;
      toast.success(`${amount} créditos adicionados!`);
      setInlineCredits('');
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, credits: u.credits + amount } : u));
      setSelectedUser((prev: any) => prev ? { ...prev, credits: prev.credits + amount } : null);
    } catch (err: any) { toast.error('Erro: ' + err.message); }
    finally { setAddingCredits(false); }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u => (u.display_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q));
  }, [users, userSearch]);

  const filteredSubs = useMemo(() => {
    if (subsFilter === 'all') return subscriptions;
    if (subsFilter === 'pending') return subscriptions.filter(s => ['pending', 'waiting_payment', 'processing'].includes(s.status));
    if (subsFilter === 'canceled') return subscriptions.filter(s => ['canceled', 'cancelled'].includes(s.status));
    return subscriptions.filter(s => s.status === subsFilter);
  }, [subscriptions, subsFilter]);

  const filteredPayments = useMemo(() => {
    if (paymentsFilter === 'all') return payments;
    if (paymentsFilter === 'paid') return payments.filter(p => p.status === 'active' || p.status === 'paid' || p.paid_at);
    if (paymentsFilter === 'pending') return payments.filter(p => ['pending', 'waiting_payment', 'processing'].includes(p.status));
    if (paymentsFilter === 'failed') return payments.filter(p => ['failed', 'canceled', 'cancelled', 'past_due'].includes(p.status));
    return payments;
  }, [payments, paymentsFilter]);

  const filteredLogs = useMemo(() => logsFilter === 'all' ? logs : logs.filter(l => l.kind === logsFilter), [logs, logsFilter]);

  const paymentTotals = useMemo(() => {
    const t = { paid: 0, pending: 0, failed: 0, paidValue: 0, pendingValue: 0 };
    payments.forEach(p => {
      const val = Number(p.monthly_price || 0);
      if (p.status === 'active' || p.status === 'paid' || p.paid_at) { t.paid++; t.paidValue += val; }
      else if (['pending', 'waiting_payment', 'processing'].includes(p.status)) { t.pending++; t.pendingValue += val; }
      else if (['failed', 'canceled', 'cancelled', 'past_due'].includes(p.status)) { t.failed++; }
    });
    return t;
  }, [payments]);

  if (authLoading || (user?.email !== ADMIN_EMAIL)) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Visão Geral', icon: Activity },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'users', label: 'Usuários', icon: Users },
    { key: 'posts', label: 'Posts', icon: ImageIcon },
    { key: 'subscriptions', label: 'Assinaturas', icon: UserCheck },
    { key: 'payments', label: 'Pagamentos', icon: DollarSign },
    { key: 'logs', label: 'Logs', icon: ScrollText },
    { key: 'support', label: 'Suporte', icon: MessageSquare },
    { key: 'coupons', label: 'Cupons', icon: Tag },
    { key: 'actions', label: 'Ações Manuais', icon: Gift },
    { key: 'content', label: 'Conteúdo', icon: FileText },
    { key: 'appearance', label: 'Aparência', icon: ImageIcon },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': case 'paid': return 'text-green-400 bg-green-400/10';
      case 'pending': case 'waiting_payment': case 'processing': return 'text-yellow-400 bg-yellow-400/10';
      case 'canceled': case 'cancelled': case 'failed': return 'text-red-400 bg-red-400/10';
      case 'past_due': return 'text-orange-400 bg-orange-400/10';
      default: return 'text-white/40 bg-white/5';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: PURPLE_SOFT }}>
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
              <p className="text-white/30 text-xs">Visão completa da plataforma EllosContent</p>
            </div>
          </div>
          <button onClick={loadOverview} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                tab === t.key ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
              }`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            {overviewLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Usuários totais" value={fmtNumber(overview.totalUsers)} icon={Users} color="text-blue-400" sub={`+${overview.newUsers7d} esta semana`} />
                  <StatCard label="Assinaturas ativas" value={overview.activeSubs} icon={UserCheck} color="text-green-400" sub={`${overview.canceledSubs} canceladas`} />
                  <StatCard label="MRR (Receita Mensal)" value={fmt(overview.monthlyRevenue)} icon={DollarSign} color="text-purple-400" sub={`Recebido: ${fmt(overview.totalRevenuePaid)}`} />
                  <StatCard label="Posts gerados" value={fmtNumber(overview.totalCarousels)} icon={ImageIcon} color="text-pink-400" sub={`+${overview.carousels7d} últimos 7 dias`} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Pagamentos pendentes" value={overview.pendingPayments} icon={Clock} color="text-yellow-400" sub={fmt(overview.pendingRevenue)} />
                  <StatCard label="Créditos consumidos (30d)" value={fmtNumber(overview.creditsConsumed30d)} icon={Zap} color="text-orange-400" />
                  <StatCard label="Saldo total na plataforma" value={fmtNumber(overview.totalCreditsBalance)} icon={Sparkles} color="text-purple-400" sub="créditos disponíveis" />
                  <StatCard label="Chamadas de API (30d)" value={fmtNumber(overview.apiCalls30d)} icon={Activity} color="text-cyan-400" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Panel title="Cadastros — últimos 30 dias">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={signupSeries}>
                        <defs>
                          <linearGradient id="g-sign" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={PURPLE} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={PURPLE} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="day" tickFormatter={fmtDayLabel} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelFormatter={fmtDayLabel} />
                        <Area type="monotone" dataKey="count" stroke={PURPLE} strokeWidth={2} fill="url(#g-sign)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Panel>
                  <Panel title="Posts criados — últimos 30 dias">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={postSeries}>
                        <defs>
                          <linearGradient id="g-post" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EC4899" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="day" tickFormatter={fmtDayLabel} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelFormatter={fmtDayLabel} />
                        <Area type="monotone" dataKey="count" stroke="#EC4899" strokeWidth={2} fill="url(#g-post)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Panel>
                  <Panel title="Distribuição de planos ativos">
                    {planDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={planDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                            {planDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-white/30 text-xs text-center py-12">Sem assinaturas ativas</p>}
                  </Panel>
                  <Panel title="Top usuários (30 dias)">
                    {topUsers.length === 0 ? <p className="text-white/30 text-xs text-center py-12">Sem dados</p> : (
                      <div className="space-y-2">
                        {topUsers.map((u, idx) => (
                          <div key={u.id} className="flex items-center gap-3">
                            <span className="text-white/30 text-xs font-bold w-4">{idx + 1}</span>
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                              {(u.display_name || u.username || '?')[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white/80 text-sm truncate">{u.display_name || u.username || '—'}</p>
                              <p className="text-white/30 text-[10px]">@{u.username || '—'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white text-sm font-semibold">{u.posts}</p>
                              <p className="text-white/30 text-[10px]">posts</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'analytics' && (
          <div className="space-y-6">
            <Panel title="Consumo vs Compra de créditos (30 dias)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={creditSeries}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={fmtDayLabel} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelFormatter={fmtDayLabel} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }} />
                  <Bar dataKey="consumed" name="Consumidos" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchased" name="Comprados" fill={PURPLE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Uso por serviço de IA (30 dias)">
              {serviceUsage.length === 0 ? <p className="text-white/30 text-xs text-center py-8">Sem dados</p> : (
                <div className="space-y-2">
                  {serviceUsage.map(s => {
                    const max = serviceUsage[0].count || 1;
                    const pct = (s.count / max) * 100;
                    return (
                      <div key={s.service}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/70 text-xs">{labelService(s.service)}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-white/40 text-[11px]">{fmt(s.cost)}</span>
                            <span className="text-white text-xs font-semibold">{fmtNumber(s.count)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${PURPLE}, #EC4899)` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel title="Cadastros diários">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={signupSeries}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={fmtDayLabel} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelFormatter={fmtDayLabel} />
                    <Bar dataKey="count" fill={PURPLE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Posts diários">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={postSeries}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={fmtDayLabel} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelFormatter={fmtDayLabel} />
                    <Bar dataKey="count" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Buscar por nome ou username..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <button onClick={loadUsers} className="p-2.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
            </div>
            {usersLoading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Usuário</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Plano</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Status</th>
                        <th className="text-right px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Posts</th>
                        <th className="text-right px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Créditos</th>
                        <th className="text-right px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Consumido</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Cadastro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                          className="border-t border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer">
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
                          <td className="px-4 py-3 text-white/60 text-xs capitalize">{u.plan}</td>
                          <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColor(u.sub_status || 'free')}`}>{u.sub_status || 'free'}</span></td>
                          <td className="px-4 py-3 text-right text-white/70 text-xs font-medium">{u.posts}</td>
                          <td className="px-4 py-3 text-right text-white/60 text-xs">{Math.floor(u.credits)}</td>
                          <td className="px-4 py-3 text-right text-white/40 text-xs">{Math.floor(u.consumed)}</td>
                          <td className="px-4 py-3 text-white/30 text-[11px]">{fmtDate(u.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 text-[11px] text-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>{filteredUsers.length} usuário(s)</div>
              </div>
            )}
            {selectedUser && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
                      {(selectedUser.display_name || selectedUser.username || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{selectedUser.display_name || '—'}</p>
                      <p className="text-white/30 text-[11px]">@{selectedUser.username} · cadastrado {fmtDate(selectedUser.created_at)}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-white/30 hover:text-white/60 text-xs cursor-pointer">✕</button>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-white text-base font-bold">{userDetails?.posts ?? '...'}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">Posts</p>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-white text-base font-bold">{Math.floor(selectedUser.credits)}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">Saldo</p>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-white text-base font-bold">{userDetails?.credits_consumed ?? '...'}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">Consumido</p>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-white text-base font-bold">{userDetails?.api_calls ?? '...'}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">Chamadas API</p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-white/40 text-[11px] uppercase font-medium mb-2">Alterar Plano</p>
                  <div className="flex gap-1.5">
                    {['free', 'starter', 'pro', 'growth'].map(plan => {
                      const isCurrent = (selectedUser.plan || 'free').toLowerCase() === plan;
                      return (
                        <button key={plan} disabled={changingPlan || isCurrent} onClick={() => changeUserPlan(selectedUser, plan)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:cursor-default ${isCurrent ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'}`}
                          style={!isCurrent ? { backgroundColor: 'rgba(255,255,255,0.03)' } : undefined}>
                          {changingPlan ? '...' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                          {isCurrent && <span className="block text-[9px] text-purple-400/60 mt-0.5">atual</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-white/40 text-[11px] uppercase font-medium mb-2">Adicionar Créditos</p>
                  <div className="flex gap-2">
                    <input type="number" value={inlineCredits} onChange={e => setInlineCredits(e.target.value)} placeholder="Qtd créditos"
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <button onClick={giveInlineCredits} disabled={addingCredits} className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity" style={{ backgroundColor: PURPLE }}>
                      {addingCredits ? '...' : 'Adicionar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {tab === 'posts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs">{allPosts.length} post(s)</p>
              <button onClick={loadAllPosts} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
            </div>
            {postsLoading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
              <>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Post</th>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Usuário</th>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Formato</th>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Cards</th>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allPosts.map(p => (
                          <tr key={p.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {p.cover_url ? <img src={p.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" /> :
                                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0"><ImageIcon className="w-4 h-4 text-purple-400/50" /></div>}
                                <div className="min-w-0">
                                  <p className="text-white/80 text-sm font-medium truncate max-w-[240px]">{p.title || p.topic || '—'}</p>
                                  <p className="text-white/25 text-[11px] truncate max-w-[240px]">{p.topic}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-white/50 text-xs">{p.user_name}</td>
                            <td className="px-4 py-3 text-white/40 text-xs capitalize">{p.post_format || '—'}</td>
                            <td className="px-4 py-3 text-white/50 text-xs">{p.card_count}</td>
                            <td className="px-4 py-3 text-white/30 text-[11px]">{fmtDateTime(p.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button disabled={postsPage === 0} onClick={() => setPostsPage(p => Math.max(0, p - 1))} className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.06] cursor-pointer disabled:opacity-30">← Anterior</button>
                  <span className="text-white/30 text-xs">Página {postsPage + 1}</span>
                  <button disabled={allPosts.length < 50} onClick={() => setPostsPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.06] cursor-pointer disabled:opacity-30">Próxima →</button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'subscriptions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                {(['all', 'active', 'pending', 'canceled'] as const).map(f => (
                  <button key={f} onClick={() => setSubsFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${subsFilter === f ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'}`}>
                    {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : f === 'pending' ? 'Pendentes' : 'Canceladas'}
                  </button>
                ))}
              </div>
              <button onClick={loadSubscriptions} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
            </div>
            {subsLoading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
              <div className="space-y-2">
                {filteredSubs.map(s => (
                  <div key={s.id} className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white/80 text-sm font-medium">{s.customer_name || s.customer_email || 'Sem nome'}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>{s.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-white/30 flex-wrap">
                        <span>Plano: <strong className="text-white/50 capitalize">{s.plan_name}</strong></span>
                        <span>{fmt(s.monthly_price)}/mês</span>
                        {s.payment_method && <span>Via {s.payment_method}</span>}
                        <span>Vence: {fmtDate(s.current_period_end)}</span>
                        {s.paid_at && <span className="text-green-400">Pago em {fmtDate(s.paid_at)}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-white/40 text-[11px]">{fmtDate(s.created_at)}</p>
                      {s.card_brand && <p className="text-white/20 text-[10px]">{s.card_brand} •••• {s.card_last_digits}</p>}
                    </div>
                  </div>
                ))}
                {filteredSubs.length === 0 && <p className="text-center text-white/20 text-xs py-8">Nenhuma assinatura</p>}
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Pagos" value={paymentTotals.paid} icon={CheckCircle2} color="text-green-400" sub={fmt(paymentTotals.paidValue)} />
              <StatCard label="Pendentes" value={paymentTotals.pending} icon={Clock} color="text-yellow-400" sub={fmt(paymentTotals.pendingValue)} />
              <StatCard label="Falhados/Cancelados" value={paymentTotals.failed} icon={XCircle} color="text-red-400" />
              <StatCard label="Total registros" value={payments.length} icon={CreditCard} color="text-purple-400" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                {(['all', 'paid', 'pending', 'failed'] as const).map(f => (
                  <button key={f} onClick={() => setPaymentsFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${paymentsFilter === f ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'}`}>
                    {f === 'all' ? 'Todos' : f === 'paid' ? 'Pagos' : f === 'pending' ? 'Pendentes' : 'Falhados'}
                  </button>
                ))}
              </div>
              <button onClick={loadPayments} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
            </div>
            {paymentsLoading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
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
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Pago em</th>
                        <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase">Criado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map(p => (
                        <tr key={p.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <p className="text-white/70 text-sm">{p.customer_name || '—'}</p>
                            <p className="text-white/25 text-[11px]">{p.customer_email || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-white/60 text-xs capitalize">{p.plan_name}</td>
                          <td className="px-4 py-3 text-white/70 text-sm font-medium">{fmt(p.monthly_price)}</td>
                          <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>{p.status}</span></td>
                          <td className="px-4 py-3 text-white/40 text-xs">{p.payment_method || '—'}</td>
                          <td className="px-4 py-3 text-green-400/60 text-[11px]">{p.paid_at ? fmtDate(p.paid_at) : '—'}</td>
                          <td className="px-4 py-3 text-white/30 text-[11px]">{fmtDateTime(p.created_at)}</td>
                        </tr>
                      ))}
                      {filteredPayments.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-white/20 text-xs">Nenhum pagamento</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                {(['all', 'credits', 'webhooks', 'impersonations'] as const).map(f => (
                  <button key={f} onClick={() => setLogsFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${logsFilter === f ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'}`}>
                    {f === 'all' ? 'Tudo' : f === 'credits' ? 'Créditos' : f === 'webhooks' ? 'Webhooks' : 'Impersonações'}
                  </button>
                ))}
              </div>
              <button onClick={loadLogs} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
            </div>
            {logsLoading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
              <div className="space-y-1.5">
                {filteredLogs.map(l => {
                  const Icon = l.kind === 'credits' ? Zap : l.kind === 'webhooks' ? Activity : Shield;
                  const color = l.kind === 'credits' ? (l.transaction_type === 'consumption' ? 'text-orange-400' : 'text-green-400') : l.kind === 'webhooks' ? 'text-blue-400' : 'text-purple-400';
                  return (
                    <div key={`${l.kind}-${l.id}`} className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {l.kind === 'credits' && (
                          <>
                            <p className="text-white/80 text-xs">
                              <span className={`font-medium ${color}`}>{l.transaction_type === 'consumption' ? 'Consumo' : l.transaction_type === 'purchase' ? 'Compra' : l.transaction_type}</span>
                              <span className="mx-1.5 text-white/30">·</span>
                              <span className="font-semibold">{Number(l.amount) > 0 ? '+' : ''}{Math.round(Number(l.amount))} créditos</span>
                              <span className="mx-1.5 text-white/30">·</span>
                              <span className="text-white/40">saldo: {Math.round(Number(l.balance_after))}</span>
                            </p>
                            {l.description && <p className="text-white/30 text-[11px] mt-0.5 truncate">{l.description}</p>}
                          </>
                        )}
                        {l.kind === 'webhooks' && (
                          <p className="text-white/80 text-xs">
                            <span className="font-medium text-blue-400 capitalize">{l.provider}</span>
                            <span className="mx-1.5 text-white/30">·</span>{l.event_type}
                            {l.processed_at && <span className="text-green-400 text-[10px] ml-2">✓ processado</span>}
                          </p>
                        )}
                        {l.kind === 'impersonations' && (
                          <p className="text-white/80 text-xs">
                            <span className="font-medium text-purple-400">Impersonação</span>
                            <span className="mx-1.5 text-white/30">·</span>{l.reason || 'Sem motivo'}
                            {l.ip_address && <span className="text-white/30 text-[10px] ml-2">{l.ip_address}</span>}
                          </p>
                        )}
                      </div>
                      <p className="text-white/30 text-[10px] shrink-0">{fmtDateTime(l.ts)}</p>
                    </div>
                  );
                })}
                {filteredLogs.length === 0 && <p className="text-center text-white/20 text-xs py-8">Nenhum log encontrado</p>}
              </div>
            )}
          </div>
        )}

        {tab === 'support' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs">{supportConvos.length} conversa(s)</p>
              <button onClick={loadSupport} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
            </div>
            {supportLoading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  {supportConvos.map(c => (
                    <button key={c.id} onClick={() => { setSelectedConvo(c); loadConvoMessages(c.id); }}
                      className={`w-full text-left rounded-xl p-4 transition-all cursor-pointer ${selectedConvo?.id === c.id ? 'ring-1 ring-purple-500/40' : 'hover:bg-white/[0.04]'}`}
                      style={{ backgroundColor: selectedConvo?.id === c.id ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-white/80 text-sm font-medium">{c.user_name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>{c.status}</span>
                      </div>
                      <p className="text-white/30 text-[11px] truncate">{c.last_message_preview || 'Sem mensagens'}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-white/20">
                        <span>{c.message_count} msg</span>
                        <span>{fmtDateTime(c.updated_at)}</span>
                      </div>
                    </button>
                  ))}
                  {supportConvos.length === 0 && <p className="text-center text-white/20 text-xs py-8">Nenhuma conversa</p>}
                </div>
                <div>
                  {selectedConvo ? (
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div>
                          <p className="text-white/80 text-sm font-medium">{selectedConvo.user_name}</p>
                          <p className="text-white/30 text-[10px]">{fmtDateTime(selectedConvo.created_at)}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(selectedConvo.status)}`}>{selectedConvo.status}</span>
                      </div>
                      <div className="max-h-[500px] overflow-y-auto px-4 py-4 space-y-2">
                        {convoMsgsLoading ? <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-white/30" /></div> :
                          convoMessages.length === 0 ? <p className="text-center text-white/20 text-xs py-4">Nenhuma mensagem</p> :
                            convoMessages.map(m => (
                              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${m.role === 'user' ? 'text-white rounded-br-md' : 'text-white/80 rounded-bl-md'}`}
                                  style={{ backgroundColor: m.role === 'user' ? '#7C3AED' : 'rgba(255,255,255,0.06)' }}>
                                  {m.content}
                                  <p className={`text-[9px] mt-1 ${m.role === 'user' ? 'text-white/40' : 'text-white/20'}`}>
                                    {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <p className="text-white/20 text-xs">Selecione uma conversa</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'coupons' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs">{coupons.length} cupom(ns)</p>
              <div className="flex gap-2">
                <button onClick={() => setShowCreateCoupon(v => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white cursor-pointer hover:opacity-90" style={{ backgroundColor: PURPLE }}>
                  <Plus className="w-3.5 h-3.5" /> Novo Cupom
                </button>
                <button onClick={loadCoupons} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
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
                    const { error } = await supabase.from('coupons').insert({ code: newCoupon.code, coupon_type: 'discount', discount_percent: newCoupon.discount_percent, max_uses: newCoupon.max_uses, is_active: true, description: newCoupon.description || null });
                    if (error) throw error;
                    toast.success(`Cupom ${newCoupon.code} criado!`);
                    setNewCoupon({ code: '', discount_percent: 25, max_uses: 10, description: '' });
                    setShowCreateCoupon(false); loadCoupons();
                  } catch (err: any) { toast.error('Erro: ' + err.message); }
                  finally { setCreatingCoupon(false); }
                }} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: PURPLE }}>
                  {creatingCoupon ? 'Criando...' : 'Criar Cupom'}
                </button>
              </motion.div>
            )}
            {couponsLoading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div> : (
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
                        <button onClick={async () => { await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id); loadCoupons(); }} className="text-white/30 hover:text-white/60 text-[11px] cursor-pointer">
                          {c.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-white/40 flex-wrap">
                      {c.discount_percent > 0 && <span className="text-purple-400 font-medium">-{c.discount_percent}%</span>}
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
                        {couponUsages.filter(u => u.coupon_id === c.id).length === 0 ? <p className="text-white/20 text-[11px] py-2">Nenhum uso</p> : (
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
                {coupons.length === 0 && <p className="text-center text-white/20 text-xs py-8">Nenhum cupom</p>}
              </div>
            )}
          </div>
        )}

        {tab === 'actions' && (
          <div className="max-w-xl">
            <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white font-semibold text-sm mb-4">Buscar Usuário</h3>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={actionSearch} onChange={e => setActionSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUsers()}
                    placeholder="Email, nome ou username..." className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
                <button onClick={searchUsers} className="px-4 py-2.5 rounded-lg text-xs font-medium text-white cursor-pointer hover:opacity-90" style={{ backgroundColor: PURPLE }}>Buscar</button>
              </div>
              {actionResults.length > 0 && (
                <div className="mt-3 space-y-1">
                  {actionResults.map(u => (
                    <button key={u.id} onClick={() => setActionTarget(u)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer ${actionTarget?.id === u.id ? 'bg-purple-500/20 text-white' : 'text-white/50 hover:bg-white/[0.04]'}`}>
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
                <p className="text-white/60 text-xs mb-4">Ação para: <strong className="text-white">{actionTarget.display_name || actionTarget.username}</strong></p>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setActionType('credits')} className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer ${actionType === 'credits' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'}`}>Adicionar Créditos</button>
                  <button onClick={() => setActionType('subscription')} className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer ${actionType === 'subscription' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'}`}>Dar Assinatura</button>
                </div>
                {actionType === 'credits' && (
                  <div className="space-y-3">
                    <input type="number" value={creditsAmount} onChange={e => setCreditsAmount(e.target.value)} placeholder="Quantidade de créditos"
                      className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <button onClick={giveCredits} disabled={processing} className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: PURPLE, color: '#fff' }}>
                      {processing ? 'Processando...' : 'Adicionar Créditos'}
                    </button>
                  </div>
                )}
                {actionType === 'subscription' && (
                  <div className="space-y-3">
                    <select value={planType} onChange={e => setPlanType(e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm text-white outline-none cursor-pointer" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <option value="starter" className="bg-[#111]">Starter</option>
                      <option value="pro" className="bg-[#111]">Pro</option>
                      <option value="growth" className="bg-[#111]">Growth</option>
                    </select>
                    <button onClick={giveSubscription} disabled={processing} className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: PURPLE, color: '#fff' }}>
                      {processing ? 'Processando...' : `Ativar plano ${planType}`}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {tab === 'content' && <div className="max-w-2xl"><ContentDocumentParser /></div>}

        {tab === 'appearance' && <div className="max-w-2xl"><AuthHeroUploader /></div>}
      </motion.div>
    </div>
  );
}

export default function Admin() {
  return <DashboardLayout><AdminContent /></DashboardLayout>;
}
