import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, DollarSign, Users, TrendingUp, Link2, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import { toast } from 'sonner';

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

export default function Parceiros() {
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

  const baseUrl = window.location.origin;

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
    if (!affiliate || !pixKey.trim()) {
      toast.error('Informe sua chave PIX.');
      return;
    }
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 50) {
      toast.error('Valor mínimo de saque: R$ 50,00');
      return;
    }
    if (amount > affiliate.available_balance) {
      toast.error('Saldo insuficiente.');
      return;
    }
    setWithdrawing(true);
    try {
      const { error } = await supabase.from('affiliate_withdrawals' as any).insert({
        affiliate_id: affiliate.id,
        amount,
        pix_key: pixKey.trim(),
      } as any);
      if (error) throw error;
      toast.success('Solicitação de saque enviada! Cairá em até 24h.');
      setShowWithdraw(false);
      setPixKey('');
      setWithdrawAmount('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao solicitar saque.');
    } finally {
      setWithdrawing(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  const affiliateLink = affiliate ? `${baseUrl}/?ref=${affiliate.affiliate_code}` : '';
  const checkoutLink = affiliate ? `${baseUrl}/checkout?ref=${affiliate.affiliate_code}` : '';
  const pricingLink = affiliate ? `${baseUrl}/precos?ref=${affiliate.affiliate_code}` : '';

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      <nav className="flex items-center gap-4 px-6 md:px-10 py-5">
        <button onClick={() => navigate('/')} className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={ellocontentLogo} alt="elloContent" className="h-5 cursor-pointer" onClick={() => navigate('/')} />
      </nav>

      <div className="max-w-2xl mx-auto px-6 md:px-10 pt-8 pb-24">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Programa de Parceiros</h1>
          <p className="text-white/35 text-sm max-w-md mx-auto leading-relaxed">
            Divulgue o elloContent e ganhe 20% de comissão sobre todas as vendas dos seus indicados.
          </p>
        </motion.div>

        {!affiliate ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: 'rgba(123,80,220,0.12)' }}>
              <Users className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">Torne-se um parceiro</h2>
            <p className="text-white/35 text-sm mb-8 max-w-xs mx-auto">
              Crie sua conta de afiliado, compartilhe seu link e comece a ganhar comissões.
            </p>
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
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Receita Total', value: `R$ ${affiliate.total_earnings.toFixed(2).replace('.', ',')}`, icon: DollarSign },
                { label: 'Saldo Disponível', value: `R$ ${affiliate.available_balance.toFixed(2).replace('.', ',')}`, icon: TrendingUp },
                { label: 'Indicados', value: String(referralCount), icon: Users },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <stat.icon className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                  <p className="text-white font-bold text-lg">{stat.value}</p>
                  <p className="text-white/35 text-xs mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Links */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-400" /> Seus links de afiliado
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Link principal', url: affiliateLink },
                  { label: 'Link de preços', url: pricingLink },
                  { label: 'Link direto de checkout', url: checkoutLink },
                ].map((link) => (
                  <div key={link.label} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/40 text-xs mb-0.5">{link.label}</p>
                      <p className="text-white/70 text-xs truncate font-mono">{link.url}</p>
                    </div>
                    <button
                      onClick={() => copyLink(link.url)}
                      className="shrink-0 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Withdraw */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Solicitar saque</h3>
                {!showWithdraw && (
                  <button
                    onClick={() => setShowWithdraw(true)}
                    className="text-xs px-4 py-2 rounded-lg font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ backgroundColor: '#7B50DC', color: '#fff' }}
                  >
                    Solicitar
                  </button>
                )}
              </div>
              {showWithdraw && (
                <div className="space-y-3">
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Valor (mín. R$ 50)</label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="100.00"
                      className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Chave PIX</label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                      className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={requestWithdrawal}
                      disabled={withdrawing}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#7B50DC', color: '#fff' }}
                    >
                      {withdrawing ? 'Enviando...' : 'Confirmar saque'}
                    </button>
                    <button
                      onClick={() => { setShowWithdraw(false); setPixKey(''); setWithdrawAmount(''); }}
                      className="px-4 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 cursor-pointer transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                  <p className="text-white/25 text-xs">O saque será processado em até 24 horas via PIX.</p>
                </div>
              )}
            </div>

            {/* Recent commissions */}
            {commissions.length > 0 && (
              <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-white font-semibold text-sm mb-4">Comissões recentes</h3>
                <div className="space-y-2">
                  {commissions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <div>
                        <p className="text-white/70 text-sm">{c.order_type === 'subscription' ? 'Assinatura' : c.order_type === 'credits' ? 'Créditos' : 'Presente'}</p>
                        <p className="text-white/30 text-xs">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm font-medium">+R$ {c.commission_amount.toFixed(2).replace('.', ',')}</p>
                        <p className="text-white/25 text-xs">{c.status === 'pending' ? 'Pendente' : c.status === 'approved' ? 'Aprovada' : 'Paga'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
