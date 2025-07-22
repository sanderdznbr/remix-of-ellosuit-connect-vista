
import { useState, useEffect } from 'react';
import { useCalendarData } from './useCalendarData';
import { useToast } from './use-toast';

interface TarefaItem {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  event_type: 'meeting' | 'appointment' | 'reminder';
  meeting_link?: string;
  location?: string;
  attendees?: any[];
  status: 'pending' | 'completed' | 'deleted';
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export const useTarefas = () => {
  const { events, loading, createEvent, refreshEvents } = useCalendarData();
  const { toast } = useToast();
  const [tarefas, setTarefas] = useState<TarefaItem[]>([]);
  const [deletedTarefas, setDeletedTarefas] = useState<TarefaItem[]>([]);

  useEffect(() => {
    // Converter eventos do calendário para o formato de tarefas
    const tarefasFormatted: TarefaItem[] = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start_date: event.start,
      end_date: event.end,
      event_type: event.event_type as 'meeting' | 'appointment' | 'reminder',
      meeting_link: event.meeting_link,
      location: event.location,
      attendees: event.attendees,
      status: 'pending', // Default status since events don't have status
      color: event.color,
      created_at: event.created_at,
      updated_at: event.updated_at
    }));
    
    // Separar tarefas ativas das excluídas
    const activeTarefas = tarefasFormatted.filter(t => t.status !== 'deleted');
    const deletedItems = tarefasFormatted.filter(t => t.status === 'deleted');
    
    setTarefas(activeTarefas);
    setDeletedTarefas(deletedItems);
  }, [events]);

  const createTarefa = async (tarefaData: any) => {
    try {
      await createEvent(tarefaData);
      await refreshEvents();
      
      toast({
        title: "Lembrete criado",
        description: "Seu lembrete foi adicionado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o lembrete",
        variant: "destructive"
      });
    }
  };

  const updateTarefa = async (id: string, updates: any) => {
    try {
      // Atualizar localmente primeiro para feedback imediato
      setTarefas(prev => 
        prev.map(tarefa => 
          tarefa.id === id ? { ...tarefa, ...updates } : tarefa
        )
      );

      // Aqui você implementaria a atualização no banco
      // Por enquanto, vamos apenas atualizar o estado local
      
      if (updates.status === 'completed') {
        toast({
          title: "✅ Concluído",
          description: "Tarefa marcada como concluída!",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a tarefa",
        variant: "destructive"
      });
    }
  };

  const deleteTarefa = async (id: string) => {
    try {
      // Mover para lista de excluídos em vez de remover completamente
      const tarefaToDelete = tarefas.find(t => t.id === id);
      if (tarefaToDelete) {
        const deletedTarefa = {
          ...tarefaToDelete,
          status: 'deleted' as const
        };
        
        setTarefas(prev => prev.filter(tarefa => tarefa.id !== id));
        setDeletedTarefas(prev => [...prev, deletedTarefa]);
      }
      
      toast({
        title: "Lembrete removido",
        description: "O lembrete foi movido para excluídos",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o lembrete",
        variant: "destructive"
      });
    }
  };

  const restoreTarefa = async (id: string) => {
    try {
      const tarefaToRestore = deletedTarefas.find(t => t.id === id);
      if (tarefaToRestore) {
        const restoredTarefa = {
          ...tarefaToRestore,
          status: 'pending' as const
        };
        
        setDeletedTarefas(prev => prev.filter(tarefa => tarefa.id !== id));
        setTarefas(prev => [...prev, restoredTarefa]);
      }
      
      toast({
        title: "Lembrete restaurado",
        description: "O lembrete foi restaurado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível restaurar o lembrete",
        variant: "destructive"
      });
    }
  };

  return {
    tarefas,
    deletedTarefas,
    loading,
    createTarefa,
    updateTarefa,
    deleteTarefa,
    restoreTarefa
  };
};
