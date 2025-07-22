
import React, { useState } from 'react';
import { Plus, ArrowDown, Trash2, RotateCcw } from 'lucide-react';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';
import { useTarefas } from '@/hooks/useTarefas';
import { usePullToRefresh } from '@/hooks/use-mobile-gestures';
import MobileButton from '@/components/ui/mobile-button';
import MobileCard from '@/components/ui/mobile-card';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

type FilterType = 'hoje' | 'semana' | 'mes';

const TarefasMobile = () => {
  const [showNovoLembrete, setShowNovoLembrete] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('hoje');
  const [showDeleted, setShowDeleted] = useState(false);
  const { tarefas, loading, createTarefa, updateTarefa, deleteTarefa, deletedTarefas, restoreTarefa } = useTarefas();

  const {
    isPulling,
    isRefreshing,
    pullDistance,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  } = usePullToRefresh({
    onRefresh: async () => {
      // Simular refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  const handleCreateTarefa = async (tarefaData: any) => {
    await createTarefa(tarefaData);
    setShowNovoLembrete(false);
  };

  const getFilteredTarefas = (tarefasList: any[]) => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    switch (activeFilter) {
      case 'hoje':
        return tarefasList.filter(tarefa => 
          tarefa.start_date.startsWith(todayString)
        );
      
      case 'semana':
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
        return tarefasList.filter(tarefa => {
          try {
            const tarefaDate = parseISO(tarefa.start_date);
            return isWithinInterval(tarefaDate, { start: weekStart, end: weekEnd });
          } catch {
            return false;
          }
        });
      
      case 'mes':
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        return tarefasList.filter(tarefa => {
          try {
            const tarefaDate = parseISO(tarefa.start_date);
            return isWithinInterval(tarefaDate, { start: monthStart, end: monthEnd });
          } catch {
            return false;
          }
        });
      
      default:
        return tarefasList;
    }
  };

  const getFilterOptions = () => {
    const hoje = getFilteredTarefas(tarefas.filter(t => t.status !== 'deleted'));
    const semana = getFilteredTarefas(tarefas.filter(t => t.status !== 'deleted'));
    const mes = getFilteredTarefas(tarefas.filter(t => t.status !== 'deleted'));
    
    return [
      { 
        id: 'hoje' as FilterType, 
        label: 'Hoje', 
        count: activeFilter === 'hoje' ? hoje.length : getFilteredTarefas(tarefas.filter(t => t.status !== 'deleted')).length
      },
      { 
        id: 'semana' as FilterType, 
        label: 'Semana', 
        count: activeFilter === 'semana' ? semana.length : getFilteredTarefas(tarefas.filter(t => t.status !== 'deleted')).length
      },
      { 
        id: 'mes' as FilterType, 
        label: 'Mês', 
        count: activeFilter === 'mes' ? mes.length : getFilteredTarefas(tarefas.filter(t => t.status !== 'deleted')).length
      }
    ];
  };

  const filterOptions = getFilterOptions();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mobile-header-blur mobile-safe-top px-4 py-6">
          <div className="mobile-skeleton h-8 w-48 mb-2"></div>
          <div className="mobile-skeleton h-4 w-32"></div>
        </div>
        <div className="px-4 pt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="mobile-card p-4">
              <div className="mobile-skeleton h-4 w-full mb-2"></div>
              <div className="mobile-skeleton h-3 w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Pull-to-Refresh */}
      <div 
        className="mobile-header-blur mobile-safe-top relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull-to-Refresh Indicator */}
        <div 
          className={cn(
            "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300",
            isPulling ? "opacity-100" : "opacity-0"
          )}
          style={{ transform: `translateY(${Math.min(pullDistance - 60, 20)}px)` }}
        >
          <div className="flex items-center space-x-2 text-blue-500">
            <ArrowDown className={cn("h-5 w-5 transition-transform", isRefreshing && "animate-spin")} />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Atualizando...' : 'Puxe para atualizar'}
            </span>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lembretes</h1>
              <p className="text-gray-500 text-sm mt-1">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
            
            {/* Deleted Items Button */}
            {deletedTarefas.length > 0 && (
              <MobileButton
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleted(!showDeleted)}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>{deletedTarefas.length}</span>
              </MobileButton>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex space-x-2 mb-4">
            {filterOptions.map((option) => (
              <MobileButton
                key={option.id}
                variant={activeFilter === option.id ? "primary" : "secondary"}
                size="sm"
                onClick={() => setActiveFilter(option.id)}
                className="rounded-full px-4 py-2 flex items-center space-x-2"
              >
                <span>{option.label}</span>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  activeFilter === option.id 
                    ? "bg-white/20 text-white" 
                    : "bg-gray-200 text-gray-600"
                )}>
                  {option.count}
                </span>
              </MobileButton>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32"> {/* Increased bottom padding to avoid FAB overlap */}
        {showDeleted ? (
          <DeletedTarefasList 
            deletedTarefas={deletedTarefas}
            onRestore={restoreTarefa}
            onClose={() => setShowDeleted(false)}
          />
        ) : (
          <TarefasList
            tarefas={tarefas.filter(t => t.status !== 'deleted')}
            onUpdate={updateTarefa}
            onDelete={deleteTarefa}
            filter={activeFilter}
          />
        )}
      </div>

      {/* Floating Action Button - Fixed positioning */}
      <div className="fixed bottom-6 right-6 z-50">
        <MobileButton
          variant="primary"
          onClick={() => setShowNovoLembrete(true)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        >
          <Plus className="h-6 w-6" />
        </MobileButton>
      </div>

      {/* Modal */}
      <NovoLembreteModal
        isOpen={showNovoLembrete}
        onClose={() => setShowNovoLembrete(false)}
        onSave={handleCreateTarefa}
      />
    </div>
  );
};

// Componente para mostrar tarefas excluídas
const DeletedTarefasList: React.FC<{
  deletedTarefas: any[];
  onRestore: (id: string) => void;
  onClose: () => void;
}> = ({ deletedTarefas, onRestore, onClose }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Itens Excluídos</h2>
        <MobileButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-500"
        >
          Fechar
        </MobileButton>
      </div>

      <div className="space-y-3">
        {deletedTarefas.map((tarefa) => (
          <MobileCard key={tarefa.id} className="p-4 bg-red-50 border-red-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 line-through opacity-60">
                  {tarefa.title}
                </h3>
                {tarefa.description && (
                  <p className="text-sm text-gray-600 mt-1 opacity-60">
                    {tarefa.description}
                  </p>
                )}
              </div>
              <MobileButton
                variant="ghost"
                size="sm"
                onClick={() => onRestore(tarefa.id)}
                className="text-green-600 hover:text-green-700 flex items-center space-x-1"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restaurar</span>
              </MobileButton>
            </div>
          </MobileCard>
        ))}
      </div>

      {deletedTarefas.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhum item excluído</p>
        </div>
      )}
    </div>
  );
};

export default TarefasMobile;
