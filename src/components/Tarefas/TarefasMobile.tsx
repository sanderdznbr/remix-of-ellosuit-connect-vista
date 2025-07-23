
import React, { useState, useEffect } from 'react';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTarefas } from '@/hooks/useTarefas';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useIOSPushNotifications } from '@/hooks/useIOSPushNotifications';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';
import NotificationSettingsModal from './NotificationSettingsModal';

type FilterType = 'hoje' | 'amanha' | 'semana' | 'mes';

const TarefasMobile = () => {
  const { user, signOut } = useAuth();
  const { tarefas, loading, createTarefa, updateTarefa, deleteTarefa, refreshEvents } = useTarefas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState<FilterType>('hoje');

  const {
    isRegistered,
    isRegistering,
    permissionStatus,
    isIOSWebView,
    requestPermissions,
    sendTestNotification
  } = useIOSPushNotifications();

  // Hook de swipe navigation
  const {
    isSwipeGesturing,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  } = useSwipeNavigation({
    filters: ['hoje', 'amanha', 'semana', 'mes'],
    activeFilter: filtroAtivo,
    onFilterChange: setFiltroAtivo
  });

  const handleCriarTarefa = async (novaTarefa: any) => {
    try {
      await createTarefa(novaTarefa);
      setIsModalOpen(false);
      await refreshEvents();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const handleExcluirTarefa = async (id: string) => {
    try {
      await deleteTarefa(id);
      await refreshEvents();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
    }
  };

  const handleActivateNotifications = async () => {
    if (isRegistered) {
      await sendTestNotification();
    } else {
      await requestPermissions();
    }
  };

  const filtrarTarefas = (tarefas: any[], filtro: FilterType) => {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    
    return tarefas.filter(tarefa => {
      const dataTarefa = new Date(tarefa.start_date);
      
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

  const getCurrentDate = () => {
    const agora = new Date();
    return agora.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-lg">Carregando tarefas...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-white text-gray-900"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Lembretes</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsNotificationModalOpen(true)}
            className="text-gray-600 hover:text-gray-900 p-2"
          >
            <Settings size={20} />
          </Button>
        </div>
        <p className="text-gray-500 text-sm">{getCurrentDate()}</p>
      </div>

      {/* Filtros com swipe */}
      <div className="px-6 pb-6">
        <div className="flex space-x-2 overflow-x-auto">
          {(['hoje', 'amanha', 'semana', 'mes'] as FilterType[]).map((filtro) => (
            <button
              key={filtro}
              onClick={() => setFiltroAtivo(filtro)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filtroAtivo === filtro
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getTituloFiltro(filtro)} {getContadorFiltro(filtro)}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="flex-1 px-6">
        <TarefasList
          tarefas={tarefasFiltradas}
          onUpdate={updateTarefa}
          onDelete={handleExcluirTarefa}
          filter={filtroAtivo}
        />
      </div>

      {/* Botão Adicionar */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 rounded-full w-14 h-14 p-0 shadow-lg"
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
        onActivateNotifications={handleActivateNotifications}
        isRegistered={isRegistered}
        isRegistering={isRegistering}
        permissionStatus={permissionStatus}
        isIOSWebView={isIOSWebView}
      />
    </div>
  );
};

export default TarefasMobile;
