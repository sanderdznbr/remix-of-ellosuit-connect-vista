import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useTarefas } from '@/hooks/useTarefas';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';

const TarefasWeb: React.FC = () => {
  const { tarefas, createTarefa, updateTarefa, deleteTarefa } = useTarefas();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'hoje' | 'amanha' | 'semana' | 'mes'>('hoje');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <Button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-2" />Nova Task</Button>
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {(['hoje','amanha','semana','mes'] as const).map((id) => (
                <Button key={id} variant={filter===id? 'default':'outline'} onClick={() => setFilter(id)}>
                  {id === 'hoje' ? 'Hoje' : id === 'amanha' ? 'Amanhã' : id === 'semana' ? 'Semana' : 'Mês'}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent>
            <TarefasList
              tarefas={tarefas}
              onUpdate={updateTarefa}
              onDelete={deleteTarefa}
              filter={filter}
              showPeriodDivision
            />
          </CardContent>
        </Card>
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
