
import React from 'react';
import { Sun, Sunset, Moon } from 'lucide-react';
import TarefaItem from './TarefaItem';

interface TarefasByTimeProps {
  tarefas: any[];
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TarefasByTime: React.FC<TarefasByTimeProps> = ({ tarefas, onUpdate, onDelete }) => {
  const categorizeByTime = (eventos: any[]) => {
    const morning = eventos.filter(evento => {
      const hour = new Date(evento.start_date).getHours();
      return hour >= 0 && hour < 12;
    });

    const afternoon = eventos.filter(evento => {
      const hour = new Date(evento.start_date).getHours();
      return hour >= 12 && hour < 18;
    });

    const evening = eventos.filter(evento => {
      const hour = new Date(evento.start_date).getHours();
      return hour >= 18 && hour < 24;
    });

    return { morning, afternoon, evening };
  };

  const { morning, afternoon, evening } = categorizeByTime(tarefas);

  const TimeSection = ({ title, events, icon: Icon, color }: {
    title: string;
    events: any[];
    icon: React.ElementType;
    color: string;
  }) => {
    if (events.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4 px-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{ backgroundColor: color }}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{events.length} evento{events.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="space-y-0">
          {events.map((evento) => (
            <TarefaItem
              key={evento.id}
              tarefa={evento}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <TimeSection 
        title="Manhã" 
        events={morning} 
        icon={Sun} 
        color="#FF9500"
      />
      <TimeSection 
        title="Tarde" 
        events={afternoon} 
        icon={Sunset} 
        color="#007AFF"
      />
      <TimeSection 
        title="Noite" 
        events={evening} 
        icon={Moon} 
        color="#5856D6"
      />
      
      {morning.length === 0 && afternoon.length === 0 && evening.length === 0 && (
        <div className="mobile-empty-state">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">📝</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nenhuma tarefa para hoje</h3>
          <p className="text-gray-500 dark:text-gray-400">Adicione um novo lembrete para começar</p>
        </div>
      )}
    </div>
  );
};

export default TarefasByTime;
