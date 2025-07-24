import React, { useState } from 'react';
import { Plus, Settings, Bell, Calendar, Users } from 'lucide-react';
import { useTarefas } from '@/hooks/useTarefas';
import { formatBrazilDate, isToday, isTomorrow } from '@/utils/date-server';
import TarefasList from './TarefasList';
import NovoLembreteModal from './NovoLembreteModal';
import TarefaDetailsModal from './TarefaDetailsModal';
import NotificationSettingsModal from './NotificationSettingsModal';

interface TarefaItem {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  event_type: 'meeting' | 'appointment' | 'reminder';
  meeting_link?: string;
  meeting_provider?: string;
  attendees?: string[];
  is_all_day?: boolean;
  color?: string;
  status?: 'pending' | 'completed' | 'deleted';
  google_event_id?: string;
  source?: string;
  location?: string;
  notes?: string;
}

const TarefasMobile: React.FC = () => {
  const [showNovoLembreteModal, setShowNovoLembreteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'week'>('today');

  const { tarefas, loading, createTarefa, updateTarefa, deleteTarefa } = useTarefas();

  const filterTodayTasks = (tarefas: TarefaItem[]) => {
    return tarefas.filter(tarefa => isToday(new Date(tarefa.start_date)));
  };

  const filterTomorrowTasks = (tarefas: TarefaItem[]) => {
    return tarefas.filter(tarefa => isTomorrow(new Date(tarefa.start_date)));
  };

  const filterWeekTasks = (tarefas: TarefaItem[]) => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return tarefas.filter(tarefa => {
      const taskDate = new Date(tarefa.start_date);
      return taskDate >= now && taskDate <= weekFromNow;
    });
  };

  const todayTasks = tarefas.filter(tarefa => isToday(new Date(tarefa.start_date)));
  const tomorrowTasks = tarefas.filter(tarefa => isTomorrow(new Date(tarefa.start_date)));
  const weekTasks = tarefas.filter(tarefa => {
    const taskDate = new Date(tarefa.start_date);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return taskDate >= now && taskDate <= weekFromNow;
  });

  const handleTarefaClick = (tarefa: any) => {
    setSelectedTarefa(tarefa);
    setShowDetailsModal(true);
  };

  const getTabContent = () => {
    const tasks = activeTab === 'today' ? todayTasks : 
                 activeTab === 'tomorrow' ? tomorrowTasks : weekTasks;
    
    return (
      <TarefasList
        tarefas={tasks}
        onComplete={updateTarefa}
        onDelete={deleteTarefa}
        onTarefaClick={handleTarefaClick}
        loading={loading}
      />
    );
  };

  const getTabCount = (tab: 'today' | 'tomorrow' | 'week') => {
    const tasks = tab === 'today' ? todayTasks : 
                 tab === 'tomorrow' ? tomorrowTasks : weekTasks;
    return tasks.length;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Lembretes
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatBrazilDate(new Date())}
              </p>
            </div>
            <button
              onClick={() => setShowNotificationModal(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'today'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Hoje
            {getTabCount('today') > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                {getTabCount('today')}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tomorrow')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'tomorrow'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Amanhã
            {getTabCount('tomorrow') > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                {getTabCount('tomorrow')}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('week')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'week'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Semana
            {getTabCount('week') > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                {getTabCount('week')}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {getTabContent()}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNovoLembreteModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Modals */}
      <NovoLembreteModal
        isOpen={showNovoLembreteModal}
        onClose={() => setShowNovoLembreteModal(false)}
        onCreateTarefa={createTarefa}
      />

      <TarefaDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTarefa(null);
        }}
        tarefa={selectedTarefa}
        onUpdate={updateTarefa}
        onDelete={deleteTarefa}
      />

      <NotificationSettingsModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </div>
  );
};

export default TarefasMobile;
