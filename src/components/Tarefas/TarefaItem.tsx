
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TarefaItemProps {
  tarefa: any;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TarefaItem: React.FC<TarefaItemProps> = ({ tarefa, onUpdate, onDelete }) => {
  const [isCompleted, setIsCompleted] = useState(tarefa.status === 'completed');

  const handleToggleComplete = async () => {
    const newStatus = isCompleted ? 'pending' : 'completed';
    setIsCompleted(!isCompleted);
    await onUpdate(tarefa.id, { status: newStatus });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return '';
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'text-blue-400';
      case 'appointment':
        return 'text-green-400';
      case 'reminder':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-800">
      {/* Checkbox */}
      <button
        onClick={handleToggleComplete}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all",
          isCompleted
            ? "bg-blue-600 border-blue-600"
            : "border-gray-600 hover:border-gray-400"
        )}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-white text-base leading-snug",
            isCompleted && "line-through text-gray-500"
          )}
        >
          {tarefa.title}
        </div>
        
        {tarefa.description && (
          <div className={cn(
            "text-sm text-gray-400 mt-1",
            isCompleted && "line-through text-gray-600"
          )}>
            {tarefa.description}
          </div>
        )}

        <div className="flex items-center space-x-2 mt-2">
          {formatTime(tarefa.start_date) && (
            <span className={cn(
              "text-xs",
              getEventTypeColor(tarefa.event_type)
            )}>
              {formatTime(tarefa.start_date)}
            </span>
          )}
          
          {formatDate(tarefa.start_date) && (
            <span className="text-xs text-red-400">
              {formatDate(tarefa.start_date)}
            </span>
          )}
          
          {tarefa.attendees && tarefa.attendees.length > 0 && (
            <span className="text-xs text-gray-400">
              Com {tarefa.attendees[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TarefaItem;
