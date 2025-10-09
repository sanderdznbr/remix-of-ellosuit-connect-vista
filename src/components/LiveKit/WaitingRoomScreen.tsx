import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import logoEllo from '@/assets/logoellosuit.png';

interface WaitingRoomScreenProps {
  roomName: string;
  participantId: string;
  onApproved: () => void;
  onRejected: () => void;
}

const WaitingRoomScreen: React.FC<WaitingRoomScreenProps> = ({
  roomName,
  participantId,
  onApproved,
  onRejected,
}) => {
  const [waitTime, setWaitTime] = useState(0);

  useEffect(() => {
    // Start timer
    const timer = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    // Listen for approval status changes
    const checkApprovalStatus = async () => {
      const { data, error } = await supabase
        .from('room_participants')
        .select('waiting_approval, connection_status, left_at')
        .eq('id', participantId)
        .single();

      if (error) {
        console.error('Erro ao verificar status de aprovação:', error);
        return;
      }

      if (!data.waiting_approval && data.connection_status === 'connected') {
        onApproved();
      } else if (data.left_at || data.connection_status === 'rejected') {
        onRejected();
      }
    };

    // Initial check
    checkApprovalStatus();

    // Setup realtime subscription
    const channel = supabase
      .channel(`participant_${participantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_participants',
          filter: `id=eq.${participantId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (!newData.waiting_approval && newData.connection_status === 'connected') {
            onApproved();
          } else if (newData.left_at || newData.connection_status === 'rejected') {
            onRejected();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [participantId, onApproved, onRejected]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05) 0%, hsl(var(--background)) 50%, hsl(var(--accent) / 0.05) 100%)' }}>
      <Card className="max-w-lg w-full shadow-2xl border-0" style={{ background: 'hsl(var(--card))' }}>
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex justify-center mb-6">
            <img src={logoEllo} alt="ElloSuit" className="h-14 w-auto" />
          </div>
          
          {/* Animated Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'hsl(var(--primary) / 0.2)' }} />
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))' }}>
                <Clock className="h-12 w-12 animate-pulse" style={{ color: 'hsl(var(--primary))' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
              Aguardando Aprovação
            </h2>
            
            <p className="text-base leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
              O anfitrião da reunião{' '}
              <span className="font-bold px-2 py-1 rounded-md" style={{ 
                background: 'hsl(var(--primary) / 0.1)', 
                color: 'hsl(var(--primary))' 
              }}>
                {roomName}
              </span>
              {' '}foi notificado da sua presença e aprovará sua entrada em breve.
            </p>
          </div>
          
          {/* Timer */}
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl" style={{ 
            background: 'hsl(var(--muted) / 0.5)',
            border: '1px solid hsl(var(--border))'
          }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
            <span className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {formatTime(waitTime)}
            </span>
          </div>

          {/* Info Footer */}
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'hsl(var(--accent) / 0.3)' }}>
            <UserCheck className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'hsl(var(--primary))' }} />
            <div className="text-sm leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Por segurança, apenas participantes aprovados pelo anfitrião podem entrar nesta reunião.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WaitingRoomScreen;