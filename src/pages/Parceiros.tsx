import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Link2, Loader2, Wallet, BarChart3, Percent, Shield, CalendarDays, XCircle, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RULES = [
  { icon: Percent, label: 'Comissão', value: '20% sobre a mensalidade do plano contratado', highlight: '20%' },
  { icon: CalendarDays, label: 'Duração', value: '6 meses por cliente indicado', highlight: '6 meses' },
  { icon: XCircle, label: 'Cancelamento', value: 'Se o cliente cancelar antes, a comissão para proporcionalmente' },
  { icon: Wallet, label: 'Pagamento', value: 'Comissão paga mensalmente enquanto o cliente estiver ativo' },
];

const BENEFITS = [
  { icon: Link2, text: 'Links rastreados automaticamente' },
  { icon: Wallet, text: 'Saque via PIX em até 24h' },
  { icon: BarChart3, text: 'Painel de métricas em tempo real' },
  { icon: TrendingUp, text: 'Comissão recorrente por 6 meses' },
];

const EXAMPLES = [
  { plan: 'Starter', price: 89.90, commission: 17.98, months: 6, total: 107.88 },
  { plan: 'Pro', price: 159.90, commission: 31.98, months: 6, total: 191.88 },
  { plan: 'Growth', price: 269.90, commission: 53.98, months: 6, total: 323.88 },
];

export default function Parceiros() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already affiliate, redirect to dashboard
  useEffect(() => {
    if (!user) { setChecking(false); return; }
    (async () => {
      const { data } = await supabase
        .from('affiliate_partners' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        navigate('/area/parceiros', { replace: true });
      } else {
        setChecking(false);
      }
    })();
  }, [user, navigate]);

  const createAffiliate = async () => {
    if (!user) { navigate('/auth'); return; }
    setCreating(true);
    try {
      const code = user.email?.split('@')[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) ||
        Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(36).toUpperCase()).join('').slice(0, 8);
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      const { error } = await supabase.from('affiliate_partners' as any).insert({
        user_id: user.id,
        company_id: cu?.company_id || null,
        affiliate_code: code,
        commission_percent: 20,
      } as any).select().single();
      if (error) throw error;
      toast.success('Conta de parceiro criada!');
      navigate('/area/parceiros');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao criar conta de parceiro.');
    } finally {
      setCreating(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#09090f' }}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090f' }}>
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <button onClick={() => navigate('/')} className="text-white/60 hover:text-white text-sm font-medium cursor-pointer transition-colors">
          ← Voltar
        </button>
        {user ? (
          <button onClick={() => navigate('/')} className="text-white/40 text-xs cursor-pointer hover:text-white/60 transition-colors">
            Ir para o app
          </button>
        ) : (
          <button onClick={() => navigate('/auth')} className="text-xs px-4 py-2 rounded-lg font-medium cursor-pointer transition-all" style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
            Entrar
          </button>
        )}
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-medium" style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
            <Sparkles className="w-3.5 h-3.5" /> Programa de Parceiros elloContent
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Ganhe <span style={{ color: '#a78bfa' }}>20% de comissão</span><br />por cada indicação
          </h1>
          <p className="text-white/40 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Divulgue o elloContent para sua rede e receba comissões recorrentes por 6 meses para cada cliente que assinar através do seu link.
          </p>
          <button
            onClick={createAffiliate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7B50DC, #9333ea)', color: '#fff', boxShadow: '0 8px 30px -10px rgba(139,92,246,0.4)' }}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {creating ? 'Criando conta...' : user ? 'Tornar-me um parceiro' : 'Entrar e ativar'}
          </button>
        </motion.div>
      </div>

      {/* Rules */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" /> Regras de Afiliação
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {RULES.map((rule) => (
                <div key={rule.label} className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.1)' }}>
                    <rule.icon className="w-4.5 h-4.5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-semibold mb-1">{rule.label}</p>
                    <p className="text-white/35 text-xs leading-relaxed">{rule.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Earnings simulation */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-white font-bold text-lg mb-6 text-center">Simulação de ganhos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {EXAMPLES.map((ex) => (
              <div key={ex.plan} className="rounded-xl p-5 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-white/40 text-xs mb-1">Plano</p>
                <p className="text-white font-bold text-lg mb-3">{ex.plan}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-white/40">
                    <span>Mensalidade</span>
                    <span className="text-white/60">R$ {ex.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>Sua comissão/mês</span>
                    <span className="text-green-400 font-medium">R$ {ex.commission.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>Duração</span>
                    <span className="text-white/60">{ex.months} meses</span>
                  </div>
                  <div className="h-px my-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                  <div className="flex justify-between">
                    <span className="text-white/50 font-medium">Total por indicação</span>
                    <span className="text-purple-300 font-bold">R$ {ex.total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-white/20 text-[11px] mt-4">
            * Valores baseados no preço mensal. Com 10 indicações Growth, você pode ganhar até R$ 3.238,80 em 6 meses.
          </p>
        </motion.div>
      </div>

      {/* Benefits */}
      <div className="max-w-4xl mx-auto px-6 mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BENEFITS.map((b) => (
              <div key={b.text} className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <b.icon className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                <p className="text-white/40 text-[11px] leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Final CTA */}
      <div className="max-w-4xl mx-auto px-6 pb-20 text-center">
        <button
          onClick={createAffiliate}
          disabled={creating}
          className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-semibold cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7B50DC, #9333ea)', color: '#fff', boxShadow: '0 8px 30px -10px rgba(139,92,246,0.4)' }}
        >
          {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          {creating ? 'Criando...' : 'Começar agora'}
        </button>
      </div>
    </div>
  );
}
