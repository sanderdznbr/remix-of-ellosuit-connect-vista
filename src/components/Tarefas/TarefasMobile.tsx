
import React, { useState } from 'react';
import { Share, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';
import { useTarefas } from '@/hooks/useTarefas';

type FilterType = 'hoje' | 'semana' | 'mes';

const TarefasMobile = () => {
  const [showNovoLembrete, setShowNovoLembrete] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('hoje');
  const { tarefas, loading, createTarefa, updateTarefa, deleteTarefa } = useTarefas();

  const handleCreateTarefa = async (tarefaData: any) => {
    await createTarefa(tarefaData);
    setShowNovoLembrete(false);
  };

  const filterOptions = [
    { id: 'hoje' as FilterType, label: 'Hoje' },
    { id: 'semana' as FilterType, label: 'Semana' },
    { id: 'mes' as FilterType, label: 'Mês' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with safe area */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 pt-16 pb-4">
          <div className="w-16"></div>
          
          <h1 className="text-2xl font-bold text-blue-500">Lembretes</h1>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-500 hover:bg-gray-100 p-2"
            >
              <Share className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-500 hover:bg-gray-100 p-2"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex px-4 pb-4">
          {filterOptions.map((option) => (
            <Button
              key={option.id}
              variant={activeFilter === option.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter(option.id)}
              className={`mr-2 rounded-full px-4 py-2 ${
                activeFilter === option.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tarefas List */}
      <div className="flex-1 bg-gray-50">
        <TarefasList
          tarefas={tarefas}
          onUpdate={updateTarefa}
          onDelete={deleteTarefa}
          filter={activeFilter}
        />
      </div>

      {/* Add Button */}
      <div className="fixed bottom-8 left-4 right-4 pb-safe-area-inset-bottom">
        <Button
          onClick={() => setShowNovoLembrete(true)}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-4 flex items-center justify-center space-x-2 shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span className="text-base font-medium">Novo Lembrete</span>
        </Button>
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
