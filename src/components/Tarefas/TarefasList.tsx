
import React from 'react';
import TarefaItem from './TarefaItem';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface TarefasListProps {
  tarefas: any[];
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  filter: 'hoje' | 'semana' | 'mes';
}

const TarefasList: React.FC<TarefasListProps> = ({ tarefas, onUpdate, onDelete, filter }) => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  const getFilteredTarefas = () => {
    switch (filter) {
      case 'hoje':
        return tarefas.filter(tarefa => 
          tarefa.start_date.startsWith(todayString)
        );
      
      case 'semana':
        const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Domingo
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
        return tarefas.filter(tarefa => {
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
        return tarefas.filter(tarefa => {
          try {
            const tarefaDate = parseISO(tarefa.start_date);
            return isWithinInterval(tarefaDate, { start: monthStart, end: monthEnd });
          } catch {
            return false;
          }
        });
      
      default:
        return tarefas;
    }
  };

  const filteredTarefas = getFilteredTarefas();

  const getEmptyMessage = () => {
    switch (filter) {
      case 'hoje':
        return 'Nenhuma tarefa para hoje';
      case 'semana':
        return 'Nenhuma tarefa para esta semana';
      case 'mes':
        return 'Nenhuma tarefa para este mês';
      default:
        return 'Nenhuma tarefa encontrada';
    }
  };

  return (
    <div className="space-y-0">
      {filteredTarefas.map((tarefa) => (
        <TarefaItem
          key={tarefa.id}
          tarefa={tarefa}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
      
      {filteredTarefas.length === 0 && (
        <div className="mobile-empty-state">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
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
