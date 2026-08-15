import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { isNativeIOS } from '@/lib/platform';

export function ExpiringCreditsBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expiringData, setExpiringData] = useState<{
    extraCredits: number;
    expiresAt: string;
    daysLeft: number;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      try {
        const { data: cu } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!cu) return;

        const { data: balance } = await supabase
          .from('ai_credit_balances')
          .select('extra_credits, extra_credits_expires_at')
          .eq('company_id', cu.company_id)
          .maybeSingle();

        if (!balance) return;

        const b = balance as any;
        if (b.extra_credits > 0 && b.extra_credits_expires_at) {
          const expiresAt = new Date(b.extra_credits_expires_at);
          const now = new Date();
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysLeft > 0 && daysLeft <= 30) {
            setExpiringData({
              extraCredits: b.extra_credits,
              expiresAt: b.extra_credits_expires_at,
              daysLeft,
            });
          }
        }
      } catch (err) {
        console.error('ExpiringCreditsBanner error:', err);
      }
    };

    check();
  }, [user]);

  if (!expiringData || dismissed) return null;

  const isUrgent = expiringData.daysLeft <= 7;
  const nativeIOS = isNativeIOS();
  const formattedDate = new Date(expiringData.expiresAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });

  return (
    <div
      className="relative mx-3 mt-2 mb-1 rounded-xl px-3 py-2.5 flex items-start gap-2.5 shrink-0 sm:mx-4 sm:mt-3 sm:px-4 sm:py-3 sm:gap-3"
      style={{
        backgroundColor: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
        border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
        }}
      >
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
        ) : (
          <Clock className="w-4 h-4" style={{ color: '#eab308' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90">
          {isUrgent
            ? `${expiringData.extraCredits} créditos extras expiram em ${expiringData.daysLeft} dia${expiringData.daysLeft > 1 ? 's' : ''}!`
            : `${expiringData.extraCredits} créditos extras expiram em ${formattedDate}`}
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          {isUrgent
            ? 'Renove seu plano para manter seus créditos, ou use-os antes que expirem.'
            : 'Seus créditos extras serão removidos caso não haja um plano ativo vinculado.'}
        </p>
        {!nativeIOS && (
          <button
            onClick={() => navigate('/precos')}
            className="mt-2 text-xs font-medium px-3 py-1 rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
              color: isUrgent ? '#fca5a5' : '#fde047',
            }}
          >
            Renovar plano
          </button>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="text-white/20 hover:text-white/50 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
