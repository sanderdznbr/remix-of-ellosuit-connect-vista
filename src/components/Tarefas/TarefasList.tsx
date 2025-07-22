
import React from 'react';
import TarefaItem from './TarefaItem';

interface TarefasListProps {
  tarefas: any[];
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TarefasList: React.FC<TarefasListProps> = ({ tarefas, onUpdate, onDelete }) => {
  const today = new Date().toISOString().split('T')[0];
  const todayTarefas = tarefas.filter(tarefa => 
    tarefa.start_date.startsWith(today)
  );

  return (
    <div className="space-y-2">
      {todayTarefas.map((tarefa) => (
        <TarefaItem
          key={tarefa.id}
          tarefa={tarefa}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
      
      {todayTarefas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Nenhuma tarefa para hoje</p>
          <p className="text-gray-500 text-sm mt-2">Adicione um novo lembrete para começar</p>
        </div>
      )}
    </div>
  );
};

export default TarefasList;
