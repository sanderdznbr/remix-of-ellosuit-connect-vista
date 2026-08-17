import React, { useEffect, useState } from 'react';
import { Sparkles, Gift, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { isNativeIOS } from '@/lib/platform';

interface TrialBannerProps {
  hasActiveSubscription: boolean;
  companyId: string;
  onActivated?: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ hasActiveSubscription, companyId, onActivated }) => {
  const { user } = useAuth();
  const nativeIOS = isNativeIOS();
  const [loading, setLoading] = useState(false);
  const [trialUsed, setTrialUsed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!companyId || nativeIOS) return;
    (async () => {
      const { data } = await supabase
        .from('ellocontent_subscriptions')
        .select('id, metadata')
        .eq('company_id', companyId)
        .contains('metadata', { is_trial: true })
        .limit(1);
      setTrialUsed(!!(data && data.length > 0));
    })();
  }, [companyId, nativeIOS]);

  if (nativeIOS || hasActiveSubscription || trialUsed === null || trialUsed) return null;
  if (!user) return null;

  const start = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-trial');
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      toast.success(`Trial ativado! ${(data as any).trial_credits} créditos por ${(data as any).days} dias.`);
      onActivated?.();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível ativar o trial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-purple-500/30 p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(76,29,149,0.06))' }}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-3xl" style={{ background: '#8B5CF6' }} />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 shrink-0">
            <Gift className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              7 dias grátis no Pro
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200">novo</span>
            </h3>
            <p className="text-sm text-white/60 mt-0.5">
              Ative agora, ganhe <strong className="text-white">30 créditos</strong> e teste tudo por uma semana. Sem cartão de crédito.
            </p>
          </div>
        </div>
        <button
          onClick={start}
          disabled={loading}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Ativando...' : 'Começar grátis'}
        </button>
      </div>
    </div>
  );
};

export default TrialBanner;
