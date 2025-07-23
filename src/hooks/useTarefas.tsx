
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
  meeting_provider?: string;
  attendees?: string[];
  is_all_day?: boolean;
  color?: string;
  status?: 'pending' | 'completed' | 'deleted';
  google_event_id?: string;
  source?: string;
  location?: string;
  notes?: string;
}

export const useTarefas = () => {
  const { events, loading, createEvent, updateEvent, deleteEvent, refreshEvents } = useCalendarData();
  const { toast } = useToast();
  const [tarefas, setTarefas] = useState<TarefaItem[]>([]);
  const [deletedTarefas, setDeletedTarefas] = useState<TarefaItem[]>([]);

  useEffect(() => {
    // Converter eventos do calendário para o formato de tarefas
    const tarefasFormatted: TarefaItem[] = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
      event_type: event.event_type,
      meeting_link: event.meeting_link,
      meeting_provider: event.meeting_provider,
      attendees: event.attendees,
      is_all_day: event.is_all_day,
      color: event.color,
      status: event.status || 'pending',
      google_event_id: event.google_event_id,
      source: event.source,
      location: event.description?.includes('Local:') ? 
        event.description.split('Local:')[1]?.split('\n')[0]?.trim() : '',
      notes: event.description
    }));
    
    // Manter apenas as tarefas ativas (não mostrar excluídas)
    const activeTarefas = tarefasFormatted.filter(t => t.status !== 'deleted');
    
    setTarefas(activeTarefas);
    setDeletedTarefas([]); // Limpar array de deletados já que não vamos mais usar
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
      // Atualizar no banco de dados
      await updateEvent(id, updates);
      
      // Atualizar localmente para feedback imediato
      setTarefas(prev => 
        prev.map(tarefa => 
          tarefa.id === id ? { ...tarefa, ...updates } : tarefa
        )
      );
      
      if (updates.status === 'completed') {
        toast({
          title: "✅ Concluído",
          description: "Tarefa marcada como concluída!",
        });
      }
      
      // Refresh para sincronizar com o banco
      await refreshEvents();
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
      // Deletar permanentemente do banco de dados
      await deleteEvent(id);
      
      // Remover localmente para feedback imediato
      setTarefas(prev => prev.filter(tarefa => tarefa.id !== id));
      
      toast({
        title: "Lembrete excluído",
        description: "O lembrete foi excluído permanentemente",
      });
      
      // Refresh para sincronizar com o banco
      await refreshEvents();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lembrete",
        variant: "destructive"
      });
    }
  };

  // Função de restaurar removida pois não há mais tarefas "deletadas"
  const restoreTarefa = async (id: string) => {
    // Esta função não é mais necessária pois deletamos permanentemente
    toast({
      title: "Erro",
      description: "Não é possível restaurar lembretes excluídos",
      variant: "destructive"
    });
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
