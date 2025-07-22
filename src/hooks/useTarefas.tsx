
import { useState, useEffect } from 'react';
import { useCalendarData } from './useCalendarData';
import { useToast } from './use-toast';

export const useTarefas = () => {
  const { events, loading, createEvent, refreshEvents } = useCalendarData();
  const { toast } = useToast();
  const [tarefas, setTarefas] = useState<any[]>([]);

  useEffect(() => {
    // Converter eventos do calendário para o formato de tarefas
    const tarefasFormatted = events.map(event => ({
      ...event,
      status: event.status || 'pending'
    }));
    setTarefas(tarefasFormatted);
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
      setTarefas(prev => prev.filter(tarefa => tarefa.id !== id));
      
      toast({
        title: "Lembrete removido",
        description: "O lembrete foi removido com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o lembrete",
        variant: "destructive"
      });
    }
  };

  return {
    tarefas,
    loading,
    createTarefa,
    updateTarefa,
    deleteTarefa
  };
};
