
import React from 'react';
import TarefaItem from './TarefaItem';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { getServerDate, isToday, isTomorrow } from '@/utils/date-server';

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
  const serverDate = getServerDate();

  const getFilteredTarefas = () => {
    try {
      console.log('TarefasList: Filtering tarefas...', { 
        filter, 
        totalTarefas: tarefas?.length || 0,
        serverDate: serverDate.toISOString()
      });
      
      if (!Array.isArray(tarefas)) {
        console.warn('TarefasList: tarefas is not an array:', tarefas);
        return [];
      }
      
      // Filter only active tasks (not deleted)
      const activeTarefas = tarefas.filter(tarefa => {
        if (!tarefa || !tarefa.start_date) {
          console.warn('TarefasList: Invalid tarefa skipped:', tarefa);
          return false;
        }
        return tarefa.status !== 'deleted';
      });
      
      console.log('TarefasList: Active tarefas:', activeTarefas.length);
      
      let filteredResults = [];
      
      switch (filter) {
        case 'hoje':
          filteredResults = activeTarefas.filter(tarefa => {
            const result = isToday(tarefa.start_date);
            console.log(`TarefasList: isToday check for "${tarefa.title}":`, {
              result,
              start_date: tarefa.start_date,
              id: tarefa.id
            });
            return result;
          });
          break;
        
        case 'amanha':
          filteredResults = activeTarefas.filter(tarefa => {
            const result = isTomorrow(tarefa.start_date);
            console.log(`TarefasList: isTomorrow check for "${tarefa.title}":`, {
              result,
              start_date: tarefa.start_date,
              id: tarefa.id
            });
            return result;
          });
          break;
        
        case 'semana':
          const weekStart = startOfWeek(serverDate, { weekStartsOn: 0 }); // Sunday
          const weekEnd = endOfWeek(serverDate, { weekStartsOn: 0 });
          console.log('TarefasList: Week filter range:', {
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString()
          });
          
          filteredResults = activeTarefas.filter(tarefa => {
            try {
              const tarefaDate = parseISO(tarefa.start_date);
              const isInWeek = isWithinInterval(tarefaDate, { start: weekStart, end: weekEnd });
              console.log(`TarefasList: Week check for "${tarefa.title}":`, {
                isInWeek,
                tarefaDate: tarefaDate.toISOString(),
                start_date: tarefa.start_date
              });
              return isInWeek;
            } catch (error) {
              console.error('TarefasList: Error parsing date for week filter:', tarefa.start_date, error);
              return false;
            }
          });
          break;
        
        case 'mes':
          const monthStart = startOfMonth(serverDate);
          const monthEnd = endOfMonth(serverDate);
          console.log('TarefasList: Month filter range:', {
            monthStart: monthStart.toISOString(),
            monthEnd: monthEnd.toISOString()
          });
          
          filteredResults = activeTarefas.filter(tarefa => {
            try {
              const tarefaDate = parseISO(tarefa.start_date);
              const isInMonth = isWithinInterval(tarefaDate, { start: monthStart, end: monthEnd });
              console.log(`TarefasList: Month check for "${tarefa.title}":`, {
                isInMonth,
                tarefaDate: tarefaDate.toISOString(),
                start_date: tarefa.start_date
              });
              return isInMonth;
            } catch (error) {
              console.error('TarefasList: Error parsing date for month filter:', tarefa.start_date, error);
              return false;
            }
          });
          break;
        
        default:
          filteredResults = activeTarefas;
      }
      
      console.log(`TarefasList: Filter "${filter}" results:`, {
        count: filteredResults.length,
        titles: filteredResults.map(t => t.title)
      });
      
      return filteredResults;
    } catch (error) {
      console.error('TarefasList: Error in getFilteredTarefas:', error);
      return [];
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

  // Always filter tasks regardless of showPeriodDivision
  const filteredTarefas = React.useMemo(() => {
    try {
      const result = getFilteredTarefas();
      console.log('TarefasList: Final filtered result:', {
        count: result?.length || 0,
        filter
      });
      return result || [];
    } catch (error) {
      console.error('TarefasList: Error in useMemo filtering:', error);
      return [];
    }
  }, [tarefas, filter, serverDate]);

  if (!Array.isArray(filteredTarefas)) {
    console.error('TarefasList: filteredTarefas is not an array:', filteredTarefas);
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
          <span className="text-4xl">⚠️</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar tarefas</h3>
        <p className="text-gray-500">Tente atualizar a página</p>
      </div>
    );
  }

  if (filteredTarefas.length === 0) {
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
    <div className="divide-y divide-gray-100">
      {filteredTarefas.map((tarefa, index) => {
        if (!tarefa || !tarefa.id) {
          console.warn('TarefasList: Invalid tarefa in render:', tarefa);
          return null;
        }
        
        return (
          <div key={tarefa.id} className={index === 0 ? '' : ''}>
            <TarefaItem
              tarefa={tarefa}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        );
      })}
    </div>
  );
};

export default TarefasList;
