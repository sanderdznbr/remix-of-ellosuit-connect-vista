import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTarefas } from '@/hooks/useTarefas';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';

const FLOW_COLOR = "#007DE3";

const TarefasWeb: React.FC = () => {
  const { tarefas, createTarefa, updateTarefa, deleteTarefa } = useTarefas();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'hoje' | 'amanha' | 'semana' | 'mes'>('hoje');

  const filters = [
    { id: 'hoje' as const, label: 'Hoje' },
    { id: 'amanha' as const, label: 'Amanhã' },
    { id: 'semana' as const, label: 'Semana' },
    { id: 'mes' as const, label: 'Mês' },
  ];

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Clean Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
            <p className="text-sm text-gray-500">Organize suas atividades e lembretes</p>
          </div>
          <Button 
            onClick={() => setShowCreate(true)} 
            className="rounded-xl"
            style={{ backgroundColor: FLOW_COLOR }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1.5 inline-flex gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f.id 
                  ? 'text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              style={filter === f.id ? { backgroundColor: FLOW_COLOR } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6">
            <TarefasList
              tarefas={tarefas}
              onUpdate={updateTarefa}
              onDelete={deleteTarefa}
              filter={filter}
              showPeriodDivision
            />
          </div>
        </div>
      </div>

      {showCreate && (
        <NovoLembreteModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSave={async (data) => {
            await createTarefa(data);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
};

export default TarefasWeb;
