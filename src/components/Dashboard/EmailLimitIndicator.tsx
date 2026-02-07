import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EmailLimitIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const EmailLimitIndicator: React.FC<EmailLimitIndicatorProps> = ({ 
  className = '', 
  showDetails = true 
}) => {
  const [sentCount, setSentCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(500);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLimits = async () => {
      if (!user) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('email_send_limits')
          .select('sent_count, daily_limit')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (!error && data) {
          setSentCount(data.sent_count);
          setDailyLimit(data.daily_limit);
        } else {
          // No record for today means 0 sent
          setSentCount(0);
        }
      } catch (error) {
        console.error('Error fetching email limits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, [user]);

  const percentage = dailyLimit > 0 ? (sentCount / dailyLimit) * 100 : 0;
  const remaining = dailyLimit - sentCount;
  const isNearLimit = percentage >= 80;
  const isAtLimit = sentCount >= dailyLimit;

  if (loading) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {sentCount}/{dailyLimit}
        </span>
      </div>
      
      {showDetails && (
        <div className="flex-1 max-w-[120px]">
          <Progress 
            value={percentage} 
            className={`h-2 ${
              isAtLimit 
                ? 'bg-red-100 [&>div]:bg-red-500' 
                : isNearLimit 
                  ? 'bg-amber-100 [&>div]:bg-amber-500' 
                  : 'bg-muted [&>div]:bg-primary'
            }`}
          />
        </div>
      )}

      {isAtLimit && (
        <div className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-medium">Limite atingido</span>
        </div>
      )}
      
      {isNearLimit && !isAtLimit && (
        <span className="text-xs text-amber-600 font-medium">
          Restam {remaining}
        </span>
      )}
    </div>
  );
};

export default EmailLimitIndicator;
