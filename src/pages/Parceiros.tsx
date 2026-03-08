import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Copy, DollarSign, Users, TrendingUp, Link2, Loader2, Wallet, BarChart3, Clock, Percent } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';

interface AffiliateData {
  id: string;
  affiliate_code: string;
  commission_percent: number;
  total_earnings: number;
  available_balance: number;
  total_withdrawn: number;
  is_active: boolean;
}

interface Commission {
  id: string;
  order_type: string;
  order_amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
}

const DOMAIN = 'https://ellocontent.com';

function ParceirosContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [referralCount, setReferralCount] = useState(0);

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
          supabase.from('affiliate_commissions' as any).select('*').eq('affiliate_id', (aff as any).id).order('created_at', { ascending: false }).limit(20),
          supabase.from('affiliate_referrals' as any).select('id').eq('affiliate_id', (aff as any).id),
        ]);
        setCommissions((comms || []) as any);
        setReferralCount((refs || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  if (!affiliate) {
    return (
      <div className="max-w-lg mx-auto py-20 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: 'rgba(123,80,220,0.1)' }}>
            <Users className="w-7 h-7 text-purple-400" />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Programa de Parceiros</h2>
          <p className="text-white/40 text-sm mb-3 max-w-sm mx-auto leading-relaxed">
            Divulgue o elloContent e ganhe <strong className="text-white/60">20% de comissão</strong> sobre todas as vendas dos seus indicados — planos, créditos e presentes.
          </p>
          <div className="flex flex-col gap-2 text-left max-w-xs mx-auto mb-8 text-white/35 text-xs">
            <div className="flex items-center gap-2"><Percent className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Comissão recorrente em assinaturas</div>
            <div className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Links rastreados automaticamente</div>
            <div className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Saque via PIX em até 24h</div>
            <div className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Painel com métricas em tempo real</div>
          </div>
          <button
            onClick={createAffiliate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#7B50DC', color: '#fff' }}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {creating ? 'Criando...' : 'Ativar conta de parceiro'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">Painel de Parceiro</h1>
          <p className="text-white/35 text-sm">Acompanhe sua receita, indicações e links de afiliação.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Receita Total', value: `R$ ${affiliate.total_earnings.toFixed(2).replace('.', ',')}`, icon: DollarSign, color: 'text-green-400' },
            { label: 'Disponível', value: `R$ ${affiliate.available_balance.toFixed(2).replace('.', ',')}`, icon: Wallet, color: 'text-purple-400' },
            { label: 'Já sacado', value: `R$ ${affiliate.total_withdrawn.toFixed(2).replace('.', ',')}`, icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Indicados', value: String(referralCount), icon: Users, color: 'text-orange-400' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
              <p className="text-white font-bold text-base">{stat.value}</p>
              <p className="text-white/30 text-[11px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Links */}
        <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <p className="text-white/25 text-[11px] flex items-center gap-1.5">
              <Percent className="w-3 h-3" /> Comissão: {affiliate.commission_percent}% sobre cada venda
            </p>
          </div>
        </div>

        {/* Withdraw */}
        <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" /> Solicitar saque
            </h3>
            {!showWithdraw && (
              <button onClick={() => setShowWithdraw(true)} className="text-xs px-4 py-2 rounded-lg font-medium cursor-pointer transition-all hover:opacity-90" style={{ backgroundColor: '#7B50DC', color: '#fff' }}>
                Solicitar
              </button>
            )}
          </div>
          {!showWithdraw && <p className="text-white/25 text-[11px] mt-1">Saldo disponível: R$ {affiliate.available_balance.toFixed(2).replace('.', ',')}</p>}
          {showWithdraw && (
            <div className="space-y-3 mt-4">
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
              <div className="flex gap-3">
                <button onClick={requestWithdrawal} disabled={withdrawing}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#7B50DC', color: '#fff' }}>
                  {withdrawing ? 'Enviando...' : 'Confirmar saque'}
                </button>
                <button onClick={() => { setShowWithdraw(false); setPixKey(''); setWithdrawAmount(''); }}
                  className="px-4 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 cursor-pointer transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancelar
                </button>
              </div>
              <p className="text-white/20 text-[11px]">O saque será processado em até 24 horas via PIX.</p>
            </div>
          )}
        </div>

        {/* Commissions */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" /> Comissões recentes
          </h3>
          {commissions.length === 0 ? (
            <p className="text-white/20 text-xs py-4 text-center">Nenhuma comissão ainda. Compartilhe seus links para começar a ganhar!</p>
          ) : (
            <div className="space-y-1">
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                  <div>
                    <p className="text-white/70 text-sm">{c.order_type === 'subscription' ? 'Assinatura' : c.order_type === 'credits' ? 'Créditos' : 'Presente'}</p>
                    <p className="text-white/25 text-[11px]">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-medium">+R$ {c.commission_amount.toFixed(2).replace('.', ',')}</p>
                    <p className="text-white/20 text-[11px]">{c.status === 'pending' ? 'Pendente' : c.status === 'approved' ? 'Aprovada' : 'Paga'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
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
