
import React, { useState } from 'react';
import { ArrowLeft, Share, MoreHorizontal, Plus } from 'lucide-react';
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header with safe area */}
      <div className="flex items-center justify-between p-4 pt-safe-area-inset-top pt-12">
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-400 hover:bg-gray-800 p-2 cursor-default"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span className="text-blue-400 text-base">Listas</span>
        </Button>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-400 hover:bg-gray-800 p-2"
          >
            <Share className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-400 hover:bg-gray-800 p-2"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 mb-8">
        <h1 className="text-3xl font-bold text-blue-400">Lembretes</h1>
      </div>

      {/* Tarefas List */}
      <div className="flex-1 px-4">
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-4 flex items-center justify-center space-x-2"
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
