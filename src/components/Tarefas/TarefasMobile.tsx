
import React, { useState } from 'react';
import { Plus, ArrowDown } from 'lucide-react';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';
import { useTarefas } from '@/hooks/useTarefas';
import { usePullToRefresh } from '@/hooks/use-mobile-gestures';
import MobileButton from '@/components/ui/mobile-button';
import MobileCard from '@/components/ui/mobile-card';
import { cn } from '@/lib/utils';

type FilterType = 'hoje' | 'semana' | 'mes';

const TarefasMobile = () => {
  const [showNovoLembrete, setShowNovoLembrete] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('hoje');
  const { tarefas, loading, createTarefa, updateTarefa, deleteTarefa } = useTarefas();

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

  const filterOptions = [
    { id: 'hoje' as FilterType, label: 'Hoje', count: tarefas.filter(t => t.start_date.startsWith(new Date().toISOString().split('T')[0])).length },
    { id: 'semana' as FilterType, label: 'Semana', count: tarefas.length },
    { id: 'mes' as FilterType, label: 'Mês', count: tarefas.length }
  ];

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
      <div className="px-4 pb-24">
        <TarefasList
          tarefas={tarefas}
          onUpdate={updateTarefa}
          onDelete={deleteTarefa}
          filter={activeFilter}
        />
      </div>

      {/* Floating Action Button */}
      <div className="mobile-floating-action mobile-safe-bottom">
        <MobileButton
          variant="primary"
          onClick={() => setShowNovoLembrete(true)}
          className="w-full h-full rounded-full shadow-lg"
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

export default TarefasMobile;
