
import React from 'react';
import TarefaItem from './TarefaItem';
import { Separator } from '@/components/ui/separator';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface TarefasListProps {
  tarefas: any[];
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  filter: 'hoje' | 'amanha' | 'semana' | 'mes';
  showPeriodDivision?: boolean;
}

const TarefasList: React.FC<TarefasListProps> = ({ 
  tarefas, 
  onUpdate, 
  onDelete, 
  filter, 
  showPeriodDivision = true 
}) => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  const getFilteredTarefas = () => {
    // Filtrar apenas tarefas ativas (não excluídas)
    const activeTarefas = tarefas.filter(tarefa => tarefa.status !== 'deleted');
    
    switch (filter) {
      case 'hoje':
        return activeTarefas.filter(tarefa => 
          tarefa.start_date.startsWith(todayString)
        );
      
      case 'amanha':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = tomorrow.toISOString().split('T')[0];
        return activeTarefas.filter(tarefa => 
          tarefa.start_date.startsWith(tomorrowString)
        );
      
      case 'semana':
        const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Domingo
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

  const getPeriodoFromHour = (dateTime: string) => {
    const hour = new Date(dateTime).getHours();
    if (hour >= 5 && hour < 12) return 'manha';
    if (hour >= 12 && hour < 18) return 'tarde';
    return 'noite';
  };

  const groupTarefasByPeriod = (tarefas: any[]) => {
    const grouped = {
      manha: [] as any[],
      tarde: [] as any[],
      noite: [] as any[]
    };

    tarefas.forEach(tarefa => {
      const periodo = getPeriodoFromHour(tarefa.start_date);
      grouped[periodo].push(tarefa);
    });

    // Ordenar dentro de cada período por horário
    Object.keys(grouped).forEach(key => {
      grouped[key as keyof typeof grouped].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
    });

    return grouped;
  };

  const getPeriodTitle = (period: string) => {
    switch (period) {
      case 'manha': return 'Manhã';
      case 'tarde': return 'Tarde';
      case 'noite': return 'Noite';
      default: return '';
    }
  };

  const getEmptyMessage = () => {
    switch (filter) {
      case 'hoje':
        return 'Nenhuma tarefa para hoje';
      case 'amanha':
        return 'Nenhuma tarefa para amanhã';
      case 'semana':
        return 'Nenhuma tarefa para esta semana';
      case 'mes':
        return 'Nenhuma tarefa para este mês';
      default:
        return 'Nenhuma tarefa encontrada';
    }
  };

  const filteredTarefas = showPeriodDivision ? getFilteredTarefas() : tarefas;

  // Se não há divisão por período ou é uma visualização de semana/mês, mostrar lista simples
  if (!showPeriodDivision || filter === 'semana' || filter === 'mes') {
    return (
      <div className="divide-y divide-gray-100">
        {filteredTarefas.map((tarefa, index) => (
          <div key={tarefa.id} className={index === 0 ? '' : ''}>
            <TarefaItem
              tarefa={tarefa}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        ))}
        
        {filteredTarefas.length === 0 && showPeriodDivision && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-4xl">📝</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{getEmptyMessage()}</h3>
            <p className="text-gray-500">Adicione um novo lembrete para começar</p>
          </div>
        )}
      </div>
    );
  }

  // Para hoje e amanhã, agrupar por período
  const groupedTarefas = groupTarefasByPeriod(filteredTarefas);
  const hasAnyTarefas = Object.values(groupedTarefas).some(arr => arr.length > 0);

  if (!hasAnyTarefas) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
          <span className="text-4xl">📝</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{getEmptyMessage()}</h3>
        <p className="text-gray-500">Adicione um novo lembrete para começar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(['manha', 'tarde', 'noite'] as const).map(periodo => {
        const tarefasDoPeriodo = groupedTarefas[periodo];
        
        if (tarefasDoPeriodo.length === 0) return null;

        return (
          <div key={periodo} className="space-y-3">
            {/* Header do período */}
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {getPeriodTitle(periodo)}
              </h3>
              <Separator className="flex-1" />
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {tarefasDoPeriodo.length}
              </span>
            </div>

            {/* Tarefas do período */}
            <div className="divide-y divide-gray-100 bg-white rounded-lg shadow-sm border border-gray-100">
              {tarefasDoPeriodo.map((tarefa) => (
                <TarefaItem
                  key={tarefa.id}
                  tarefa={tarefa}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TarefasList;
