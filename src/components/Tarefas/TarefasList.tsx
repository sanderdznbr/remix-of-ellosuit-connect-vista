import React from 'react';
import TarefaItem from './TarefaItem';

interface TarefasListProps {
  tarefas: any[];
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  onTarefaClick?: (tarefa: any) => void;
  filter?: string;
  showPeriodDivision?: boolean;
}

const TarefasList: React.FC<TarefasListProps> = ({
  tarefas,
  onUpdate,
  onDelete,
  onTarefaClick,
  filter = 'hoje',
  showPeriodDivision = true
}) => {
  const groupTarefasByPeriod = (tarefas: any[]) => {
    const morning = tarefas.filter(t => {
      const hour = new Date(t.start_date).getHours();
      return hour >= 6 && hour < 12;
    });
    
    const afternoon = tarefas.filter(t => {
      const hour = new Date(t.start_date).getHours();
      return hour >= 12 && hour < 18;
    });
    
    const evening = tarefas.filter(t => {
      const hour = new Date(t.start_date).getHours();
      return hour >= 18 || hour < 6;
    });

    return { morning, afternoon, evening };
  };

  const renderTarefaItem = (tarefa: any, index: number, isLast: boolean) => (
    <TarefaItem
      key={tarefa.id}
      tarefa={tarefa}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onClick={onTarefaClick}
      filter={filter}
      isLast={isLast}
    />
  );

  if (tarefas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma tarefa</h3>
        <p className="text-gray-500">Suas tarefas aparecerão aqui</p>
      </div>
    );
  }

  if (filter === 'hoje' && showPeriodDivision) {
    const { morning, afternoon, evening } = groupTarefasByPeriod(tarefas);
    
    return (
      <div>
        {morning.length > 0 && (
          <div>
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
              <h3 className="text-sm font-medium text-yellow-800 flex items-center">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                Manhã
              </h3>
            </div>
            <div>
              {morning.map((tarefa, index) => 
                renderTarefaItem(tarefa, index, index === morning.length - 1)
              )}
            </div>
          </div>
        )}

        {afternoon.length > 0 && (
          <div>
            <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
              <h3 className="text-sm font-medium text-orange-800 flex items-center">
                <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                Tarde
              </h3>
            </div>
            <div>
              {afternoon.map((tarefa, index) => 
                renderTarefaItem(tarefa, index, index === afternoon.length - 1)
              )}
            </div>
          </div>
        )}

        {evening.length > 0 && (
          <div>
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
              <h3 className="text-sm font-medium text-purple-800 flex items-center">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Noite
              </h3>
            </div>
            <div>
              {evening.map((tarefa, index) => 
                renderTarefaItem(tarefa, index, index === evening.length - 1)
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {tarefas.map((tarefa, index) => 
        renderTarefaItem(tarefa, index, index === tarefas.length - 1)
      )}
    </div>
  );
};

export default TarefasList;
