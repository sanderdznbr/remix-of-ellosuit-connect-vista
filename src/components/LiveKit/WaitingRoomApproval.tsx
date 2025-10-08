import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WaitingParticipant {
  id: string;
  display_name: string;
  joined_at: string;
}

interface WaitingRoomApprovalProps {
  roomId: string;
  isHost: boolean;
}

const WaitingRoomApproval: React.FC<WaitingRoomApprovalProps> = ({ roomId, isHost }) => {
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!isHost) return;

    fetchWaitingParticipants();

    // Realtime subscription for waiting participants
    const channel = supabase
      .channel(`waiting_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchWaitingParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isHost]);

  const fetchWaitingParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select('id, display_name, joined_at')
        .eq('room_id', roomId)
        .eq('waiting_approval', true)
        .is('left_at', null)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setWaitingParticipants(data || []);
    } catch (error) {
      console.error('Erro ao buscar participantes aguardando:', error);
    }
  };

  const approveParticipant = async (participantId: string, participantName: string) => {
    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ waiting_approval: false })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: "Participante aprovado",
        description: `${participantName} entrou na reunião`,
      });
    } catch (error) {
      console.error('Erro ao aprovar participante:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o participante",
        variant: "destructive",
      });
    }
  };

  const rejectParticipant = async (participantId: string, participantName: string) => {
    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ 
          left_at: new Date().toISOString(),
          connection_status: 'rejected'
        })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: "Participante rejeitado",
        description: `${participantName} não foi admitido na reunião`,
        variant: "destructive",
      });
    } catch (error) {
      console.error('Erro ao rejeitar participante:', error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar o participante",
        variant: "destructive",
      });
    }
  };

  if (!isHost || waitingParticipants.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 w-80 z-50 animate-in slide-in-from-right duration-300">
      <Card className="bg-background border-primary shadow-xl">
        <div className="p-4 border-b border-border bg-primary/10">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Sala de Espera</h3>
            <Badge variant="secondary" className="ml-auto">
              {waitingParticipants.length}
            </Badge>
          </div>
        </div>
        
        <ScrollArea className="max-h-96">
          <div className="p-2 space-y-2">
            {waitingParticipants.map((participant) => (
              <Card key={participant.id} className="p-3 border-border">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {participant.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aguardando aprovação
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => approveParticipant(participant.id, participant.display_name)}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectParticipant(participant.id, participant.display_name)}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default WaitingRoomApproval;