
import React, { useState } from 'react';
import { Share, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';
import { useTarefas } from '@/hooks/useTarefas';

const TarefasMobile = () => {
  const [showNovoLembrete, setShowNovoLembrete] = useState(false);
  const { tarefas, loading, createTarefa, updateTarefa, deleteTarefa } = useTarefas();

  const handleCreateTarefa = async (tarefaData: any) => {
    await createTarefa(tarefaData);
    setShowNovoLembrete(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with safe area */}
      <div className="flex items-center justify-between p-4 pt-16 bg-white border-b border-gray-100">
        <div className="w-16"></div> {/* Spacer for centering */}
        
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

      {/* Tarefas List */}
      <div className="flex-1 bg-white">
        <TarefasList
          tarefas={tarefas}
          onUpdate={updateTarefa}
          onDelete={deleteTarefa}
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
