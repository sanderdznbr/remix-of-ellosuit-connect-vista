import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { isNativeIOS } from '@/lib/platform';

interface Props {
  collapsed?: boolean;
}

const TrialStatusBadge: React.FC<Props> = ({ collapsed }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nativeIOS = isNativeIOS();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user || nativeIOS) return;
    (async () => {
      try {
        const { data: cu } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (!cu) return;
        const { data: sub } = await supabase
          .from('ellocontent_subscriptions')
          .select('status, expires_at, metadata')
          .eq('company_id', cu.company_id)
          .eq('status', 'trialing')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!sub || !sub.expires_at) return;
        const ms = new Date(sub.expires_at).getTime() - Date.now();
        if (ms <= 0) return;
        setDaysLeft(Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24))));
      } catch {}
    })();
  }, [user, nativeIOS]);

  if (nativeIOS || daysLeft === null) return null;

  const urgent = daysLeft <= 2;
  const color = urgent ? '#F59E0B' : '#8B5CF6';

  if (collapsed) {
    return (
      <button
        onClick={() => navigate('/precos')}
        className="w-full flex justify-center py-2"
        title={`Trial: ${daysLeft} dia${daysLeft > 1 ? 's' : ''} restante${daysLeft > 1 ? 's' : ''}`}
      >
        {urgent ? <AlertCircle className="w-4 h-4" style={{ color }} /> : <Clock className="w-4 h-4" style={{ color }} />}
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate('/precos')}
      className="w-full mx-2 px-3 py-2 rounded-lg border text-left flex items-center gap-2 transition-colors hover:bg-white/[0.04]"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}10`, width: 'calc(100% - 16px)' }}
    >
      {urgent ? <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color }} /> : <Clock className="w-3.5 h-3.5 shrink-0" style={{ color }} />}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
          {urgent ? 'Trial acabando' : 'Trial ativo'}
        </div>
        <div className="text-[11px] text-white/60 truncate">
          {daysLeft} dia{daysLeft > 1 ? 's' : ''} • {urgent ? 'Assinar agora' : 'Ver planos'}
        </div>
      </div>
    </button>
  );
};

export default TrialStatusBadge;
