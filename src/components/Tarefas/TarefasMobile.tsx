
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Calendar, Clock, Filter, ArrowLeft } from 'lucide-react';
import { useTarefas } from '@/hooks/useTarefas';
import { useAuth } from '@/hooks/useAuth';
import TarefaItem from './TarefaItem';
import NovoLembreteModal from './NovoLembreteModal';
import TarefaDetailsModal from './TarefaDetailsModal';
import { useNavigate } from 'react-router-dom';
import NotificationSettingsButton from './NotificationSettingsButton';

const TarefasMobile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const {
    tarefas,
    loading,
    createTarefa,
    updateTarefa,
    deleteTarefa,
    markAsCompleted
  } = useTarefas();

  // Filtrar tarefas baseado no termo de busca e status
  const filteredTarefas = tarefas.filter(tarefa => {
    const matchesSearch = tarefa.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tarefa.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'completed' && tarefa.completed) ||
                         (filterStatus === 'pending' && !tarefa.completed);
    
    return matchesSearch && matchesStatus;
  });

  const pendingCount = tarefas.filter(t => !t.completed).length;
  const completedCount = tarefas.filter(t => t.completed).length;

  const handleCreateTask = async (taskData: any) => {
    await createTarefa(taskData);
    setIsNewTaskModalOpen(false);
  };

  const handleTaskClick = (tarefa: any) => {
    setSelectedTask(tarefa);
  };

  const handleUpdateTask = async (taskData: any) => {
    if (selectedTask) {
      await updateTarefa(selectedTask.id, taskData);
      setSelectedTask(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTarefa(taskId);
    setSelectedTask(null);
  };

  const handleMarkCompleted = async (taskId: string) => {
    await markAsCompleted(taskId);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-gray-600 mb-4">Você precisa estar logado para acessar suas tarefas.</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Tarefas</h1>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationSettingsButton />
              <Button
                onClick={() => setIsNewTaskModalOpen(true)}
                size="sm"
                className="rounded-full"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-lg border-gray-200 focus:border-blue-500"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex space-x-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
              className="rounded-full text-xs"
            >
              Todas ({tarefas.length})
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
              className="rounded-full text-xs"
            >
              Pendentes ({pendingCount})
            </Button>
            <Button
              variant={filterStatus === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('completed')}
              className="rounded-full text-xs"
            >
              Concluídas ({completedCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredTarefas.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Nenhuma tarefa encontrada' 
                  : 'Nenhuma tarefa ainda'
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all'
                  ? 'Tente ajustar os filtros ou termo de busca'
                  : 'Comece criando sua primeira tarefa'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Button
                  onClick={() => setIsNewTaskModalOpen(true)}
                  className="rounded-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Tarefa
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTarefas.map((tarefa) => (
              <TarefaItem
                key={tarefa.id}
                tarefa={tarefa}
                onClick={() => handleTaskClick(tarefa)}
                onMarkCompleted={handleMarkCompleted}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NovoLembreteModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onSave={handleCreateTask}
      />

      {selectedTask && (
        <TarefaDetailsModal
          tarefa={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

export default TarefasMobile;
