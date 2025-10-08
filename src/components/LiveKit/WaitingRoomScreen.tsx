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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-2xl">
        <div className="flex justify-center mb-4">
          <img src={logoEllo} alt="ElloSuit" className="h-12 w-auto" />
        </div>
        
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Clock className="h-10 w-10 text-primary animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground">
            Aguardando Aprovação
          </h2>
          
          <p className="text-muted-foreground">
            O anfitrião da reunião <span className="font-semibold text-foreground">{roomName}</span> foi notificado da sua presença e em breve aprovará sua entrada.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Tempo de espera: {formatTime(waitTime)}</span>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <UserCheck className="h-4 w-4" />
            <span>Apenas participantes aprovados podem entrar</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WaitingRoomScreen;