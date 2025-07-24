
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
      console.log('TarefasList: Filtering tarefas...', { filter, totalTarefas: tarefas.length });
      
      if (!Array.isArray(tarefas)) {
        console.warn('TarefasList: tarefas is not an array:', tarefas);
        return [];
      }
      
      // Filtrar apenas tarefas ativas (não excluídas)
      const activeTarefas = tarefas.filter(tarefa => {
        if (!tarefa || !tarefa.start_date) {
          console.warn('TarefasList: Invalid tarefa skipped:', tarefa);
          return false;
        }
        return tarefa.status !== 'deleted';
      });
      
      console.log('TarefasList: Active tarefas:', activeTarefas.length);
      
      switch (filter) {
        case 'hoje':
          const todayTarefas = activeTarefas.filter(tarefa => {
            const result = isToday(tarefa.start_date);
            console.log('TarefasList: isToday check for', tarefa.title, ':', result);
            return result;
          });
          console.log('TarefasList: Today tarefas found:', todayTarefas.length);
          return todayTarefas;
        
        case 'amanha':
          const tomorrowTarefas = activeTarefas.filter(tarefa => {
            const result = isTomorrow(tarefa.start_date);
            console.log('TarefasList: isTomorrow check for', tarefa.title, ':', result);
            return result;
          });
          console.log('TarefasList: Tomorrow tarefas found:', tomorrowTarefas.length);
          return tomorrowTarefas;
        
        case 'semana':
          const weekStart = startOfWeek(serverDate, { weekStartsOn: 0 }); // Domingo
          const weekEnd = endOfWeek(serverDate, { weekStartsOn: 0 });
          const weekTarefas = activeTarefas.filter(tarefa => {
            try {
              const tarefaDate = parseISO(tarefa.start_date);
              return isWithinInterval(tarefaDate, { start: weekStart, end: weekEnd });
            } catch (error) {
              console.error('TarefasList: Error parsing date for week filter:', tarefa.start_date, error);
              return false;
            }
          });
          console.log('TarefasList: Week tarefas found:', weekTarefas.length);
          return weekTarefas;
        
        case 'mes':
          const monthStart = startOfMonth(serverDate);
          const monthEnd = endOfMonth(serverDate);
          const monthTarefas = activeTarefas.filter(tarefa => {
            try {
              const tarefaDate = parseISO(tarefa.start_date);
              return isWithinInterval(tarefaDate, { start: monthStart, end: monthEnd });
            } catch (error) {
              console.error('TarefasList: Error parsing date for month filter:', tarefa.start_date, error);
              return false;
            }
          });
          console.log('TarefasList: Month tarefas found:', monthTarefas.length);
          return monthTarefas;
        
        default:
          return activeTarefas;
      }
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

  // Sempre filtrar as tarefas independentemente do showPeriodDivision
  const filteredTarefas = getFilteredTarefas();

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
      
      {filteredTarefas.length === 0 && (
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
};

export default TarefasList;
