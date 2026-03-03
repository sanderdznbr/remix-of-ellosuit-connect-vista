import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface SubscriptionStatus {
  loading: boolean;
  isBlocked: boolean;
  status: string | null;
  planType: string | null;
  expiresAt: string | null;
  monthlyPrice: number | null;
}

export function useSubscriptionGuard(): SubscriptionStatus {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionStatus>({
    loading: true,
    isBlocked: false,
    status: null,
    planType: null,
    expiresAt: null,
    monthlyPrice: null,
  });

  useEffect(() => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const check = async () => {
      try {
        const { data: cu } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!cu) {
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status, plan_type, current_period_end, monthly_price')
          .eq('company_id', cu.company_id)
          .single();

        if (!sub) {
          // No subscription = no plan, not blocked (trial/onboarding)
          setState({
            loading: false,
            isBlocked: false,
            status: null,
            planType: null,
            expiresAt: null,
            monthlyPrice: null,
          });
          return;
        }

        // Blocked if canceled or past_due
        const isBlocked = sub.status === 'canceled' || sub.status === 'past_due';

        setState({
          loading: false,
          isBlocked,
          status: sub.status,
          planType: sub.plan_type,
          expiresAt: sub.current_period_end,
          monthlyPrice: sub.monthly_price,
        });
      } catch {
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    check();
  }, [user]);

  return state;
}
