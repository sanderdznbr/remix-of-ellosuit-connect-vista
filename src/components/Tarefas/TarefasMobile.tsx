
import React, { useState } from 'react';
import { Plus, ArrowDown, Trash2, RotateCcw } from 'lucide-react';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';
import { useTarefas } from '@/hooks/useTarefas';
import { usePullToRefresh } from '@/hooks/use-mobile-gestures';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { vibrate } from '@/utils/mobile-helpers';
import '@/styles/ios-mobile-theme.css';

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
      vibrate(50);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  const handleCreateTarefa = async (tarefaData: any) => {
    await createTarefa(tarefaData);
    setShowNovoLembrete(false);
    vibrate(30);
  };

  const getFilteredTarefas = (tarefasList: any[], filter: FilterType) => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const activeTarefas = tarefasList.filter(tarefa => tarefa.status !== 'deleted');

    switch (filter) {
      case 'hoje':
        return activeTarefas.filter(tarefa => 
          tarefa.start_date.startsWith(todayString)
        );
      
      case 'semana':
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
        return activeTarefas.filter(tarefa => {
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
        return activeTarefas.filter(tarefa => {
          try {
            const tarefaDate = parseISO(tarefa.start_date);
            return isWithinInterval(tarefaDate, { start: monthStart, end: monthEnd });
          } catch {
            return false;
          }
        });
      
      default:
        return activeTarefas;
    }
  };

  const getFilterOptions = () => [
    { 
      id: 'hoje' as FilterType, 
      label: 'Hoje', 
      count: getFilteredTarefas(tarefas, 'hoje').length
    },
    { 
      id: 'semana' as FilterType, 
      label: 'Semana', 
      count: getFilteredTarefas(tarefas, 'semana').length
    },
    { 
      id: 'mes' as FilterType, 
      label: 'Mês', 
      count: getFilteredTarefas(tarefas, 'mes').length
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="ios-header mobile-safe-top px-4 py-6">
          <div className="mobile-skeleton h-8 w-48 mb-2"></div>
          <div className="mobile-skeleton h-4 w-32"></div>
        </div>
        <div className="px-4 pt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="ios-card p-4 ios-fade-in">
              <div className="mobile-skeleton h-4 w-full mb-2"></div>
              <div className="mobile-skeleton h-3 w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ios-bg-grouped)' }}>
      {/* Enhanced iOS Header with Dynamic Island Effect */}
      <div 
        className="ios-header mobile-safe-top sticky top-0 z-40"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull-to-Refresh Indicator */}
        <div 
          className={cn(
            "ios-pull-indicator transition-all duration-300",
            isPulling ? "opacity-100" : "opacity-0"
          )}
          style={{ transform: `translateY(${Math.min(pullDistance - 60, 20)}px)` }}
        >
          <div className="flex items-center justify-center space-x-2">
            <ArrowDown className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="ios-footnote">
              {isRefreshing ? 'Atualizando...' : 'Puxe para atualizar'}
            </span>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="ios-large-title mb-1">Lembretes</h1>
              <p className="ios-subheadline">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
            
            {/* Deleted Items Button */}
            {deletedTarefas.length > 0 && (
              <button
                onClick={() => {
                  setShowDeleted(!showDeleted);
                  vibrate(30);
                }}
                className="ios-button ios-button-ghost p-2 w-12 h-12 rounded-full"
              >
                <Trash2 className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {deletedTarefas.length}
                </span>
              </button>
            )}
          </div>

          {/* Enhanced Filter Pills */}
          <div className="flex space-x-3 mb-4">
            {getFilterOptions().map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setActiveFilter(option.id);
                  vibrate(30);
                }}
                className={cn(
                  "ios-pill ios-haptic-feedback flex items-center space-x-2 transition-all duration-200",
                  activeFilter === option.id ? "ios-pill-active" : ""
                )}
              >
                <span className="ios-callout font-medium">{option.label}</span>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full min-w-[20px] text-center",
                  activeFilter === option.id 
                    ? "bg-white/20 text-white" 
                    : "bg-gray-200 text-gray-600"
                )}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content with iOS Section Styling */}
      <div className="px-4 pb-32 ios-scroll">
        {showDeleted ? (
          <div className="ios-card-section">
            <DeletedTarefasList 
              deletedTarefas={deletedTarefas}
              onRestore={restoreTarefa}
              onClose={() => setShowDeleted(false)}
            />
          </div>
        ) : (
          <div className="ios-card-section">
            <TarefasList
              tarefas={tarefas.filter(t => t.status !== 'deleted')}
              onUpdate={updateTarefa}
              onDelete={deleteTarefa}
              filter={activeFilter}
            />
          </div>
        )}
      </div>

      {/* iOS-style Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setShowNovoLembrete(true);
            vibrate(50);
          }}
          className="ios-floating-button ios-haptic-feedback shadow-2xl"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Enhanced Modal */}
      <NovoLembreteModal
        isOpen={showNovoLembrete}
        onClose={() => setShowNovoLembrete(false)}
        onSave={handleCreateTarefa}
      />
    </div>
  );
};

// Enhanced iOS-style Deleted Items Component
const DeletedTarefasList: React.FC<{
  deletedTarefas: any[];
  onRestore: (id: string) => void;
  onClose: () => void;
}> = ({ deletedTarefas, onRestore, onClose }) => {
  return (
    <div className="ios-fade-in">
      <div className="ios-section-header">
        <div className="flex items-center justify-between">
          <h2 className="ios-title-2">Itens Excluídos</h2>
          <button
            onClick={onClose}
            className="ios-button ios-button-ghost px-4 py-2"
          >
            <span className="ios-callout">Fechar</span>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {deletedTarefas.map((tarefa, index) => (
          <div 
            key={tarefa.id} 
            className="ios-list-item ios-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="ios-headline line-through opacity-60 mb-1">
                  {tarefa.title}
                </h3>
                {tarefa.description && (
                  <p className="ios-subheadline opacity-60">
                    {tarefa.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  onRestore(tarefa.id);
                  vibrate([50, 100, 50]);
                }}
                className="ios-button ios-button-ghost ml-4 p-2 rounded-full"
              >
                <RotateCcw className="h-4 w-4 text-green-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {deletedTarefas.length === 0 && (
        <div className="text-center py-12 ios-fade-in">
          <div className="text-6xl mb-4">🗑️</div>
          <h3 className="ios-title-3 mb-2">Nenhum item excluído</h3>
          <p className="ios-subheadline">Os itens excluídos aparecerão aqui</p>
        </div>
      )}
    </div>
  );
};

export default TarefasMobile;
