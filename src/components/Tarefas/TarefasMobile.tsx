
import React, { useState, useEffect } from 'react';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTarefas } from '@/hooks/useTarefas';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';
import NotificationSettingsModal from './NotificationSettingsModal';

type FilterType = 'hoje' | 'amanha' | 'semana' | 'mes';

const TarefasMobile = () => {
  const { user, logout } = useAuth();
  const { tarefas, loading, criarTarefa, atualizarTarefa, excluirTarefa, refreshTarefas } = useTarefas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState<FilterType>('hoje');

  // Hook de swipe navigation
  const { swipeHandlers } = useSwipeNavigation({
    onSwipeLeft: () => {
      const filters: FilterType[] = ['hoje', 'amanha', 'semana', 'mes'];
      const currentIndex = filters.indexOf(filtroAtivo);
      if (currentIndex < filters.length - 1) {
        setFiltroAtivo(filters[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      const filters: FilterType[] = ['hoje', 'amanha', 'semana', 'mes'];
      const currentIndex = filters.indexOf(filtroAtivo);
      if (currentIndex > 0) {
        setFiltroAtivo(filters[currentIndex - 1]);
      }
    }
  });

  const handleCriarTarefa = async (novaTarefa: any) => {
    try {
      await criarTarefa(novaTarefa);
      setIsModalOpen(false);
      await refreshTarefas();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const handleExcluirTarefa = async (id: string) => {
    try {
      await excluirTarefa(id);
      await refreshTarefas();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
    }
  };

  const filtrarTarefas = (tarefas: any[], filtro: FilterType) => {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    
    return tarefas.filter(tarefa => {
      const dataTarefa = new Date(tarefa.data_hora);
      
      switch (filtro) {
        case 'hoje':
          return dataTarefa >= hoje && dataTarefa < amanha;
        case 'amanha':
          const depoisAmanha = new Date(amanha);
          depoisAmanha.setDate(depoisAmanha.getDate() + 1);
          return dataTarefa >= amanha && dataTarefa < depoisAmanha;
        case 'semana':
          const fimSemana = new Date(hoje);
          fimSemana.setDate(fimSemana.getDate() + 7);
          return dataTarefa >= hoje && dataTarefa < fimSemana;
        case 'mes':
          const fimMes = new Date(hoje);
          fimMes.setMonth(fimMes.getMonth() + 1);
          return dataTarefa >= hoje && dataTarefa < fimMes;
        default:
          return true;
      }
    });
  };

  const tarefasFiltradas = filtrarTarefas(tarefas, filtroAtivo);

  const getTituloFiltro = (filtro: FilterType) => {
    switch (filtro) {
      case 'hoje': return 'Hoje';
      case 'amanha': return 'Amanhã';
      case 'semana': return 'Semana';
      case 'mes': return 'Mês';
      default: return 'Hoje';
    }
  };

  const getContadorFiltro = (filtro: FilterType) => {
    return filtrarTarefas(tarefas, filtro).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Carregando tarefas...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" {...swipeHandlers}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">T</span>
          </div>
          <h1 className="text-xl font-bold">Tarefas</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsNotificationModalOpen(true)}
            className="text-gray-400 hover:text-white p-2"
          >
            <Settings size={20} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Sair
          </Button>
        </div>
      </div>

      {/* Filtros com swipe */}
      <div className="flex justify-center py-4 border-b border-gray-800">
        <div className="flex space-x-4">
          {(['hoje', 'amanha', 'semana', 'mes'] as FilterType[]).map((filtro) => (
            <button
              key={filtro}
              onClick={() => setFiltroAtivo(filtro)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filtroAtivo === filtro
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {getTituloFiltro(filtro)} ({getContadorFiltro(filtro)})
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="flex-1 p-4">
        <TarefasList
          tarefas={tarefasFiltradas}
          onExcluirTarefa={handleExcluirTarefa}
          onAtualizarTarefa={atualizarTarefa}
        />
      </div>

      {/* Botão Adicionar */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 rounded-full w-14 h-14 p-0 shadow-lg"
        >
          <Plus size={24} />
        </Button>
      </div>

      {/* Modais */}
      <NovoLembreteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCriarTarefa}
      />

      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </div>
  );
};

export default TarefasMobile;
