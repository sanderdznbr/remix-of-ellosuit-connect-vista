
import React, { useState } from 'react';
import { Trash2, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/use-mobile-gestures';
import { formatDateMobile, formatTimeMobile, vibrate } from '@/utils/mobile-helpers';
import TarefaDetailsModal from './TarefaDetailsModal';

interface TarefaItemProps {
  tarefa: any;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TarefaItem: React.FC<TarefaItemProps> = ({ tarefa, onUpdate, onDelete }) => {
  const [isCompleted, setIsCompleted] = useState(tarefa.status === 'completed');
  const [showModal, setShowModal] = useState(false);
  const [swipeDistance, setSwipeDistance] = useState(0);

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    onSwipeLeft: () => {
      setSwipeDistance(-80);
      vibrate(50);
    },
    onSwipeRight: () => {
      setSwipeDistance(0);
    },
    threshold: 50
  });

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = isCompleted ? 'pending' : 'completed';
    setIsCompleted(!isCompleted);
    await onUpdate(tarefa.id, { status: newStatus });
    vibrate(30);
  };

  const handleItemClick = () => {
    if (swipeDistance === 0) {
      setShowModal(true);
      vibrate(30);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(tarefa.id);
    vibrate([50, 100, 50]);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return '#007AFF';
      case 'appointment':
        return '#34C759';
      case 'reminder':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  return (
    <>
      <div className="relative mb-1 overflow-hidden rounded-xl">
        {/* Delete Button Background */}
        <div 
          className={cn(
            "absolute right-0 top-0 h-full w-20 flex items-center justify-center transition-all duration-200 bg-red-500",
            swipeDistance < -20 ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            onClick={handleDeleteClick}
            className="p-3 rounded-full hover:bg-red-600 transition-colors ios-haptic-feedback text-white"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div
          className={cn(
            "ios-list-item transition-all duration-200 ease-out cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
            isCompleted && "opacity-75"
          )}
          style={{ transform: `translateX(${swipeDistance}px)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={handleItemClick}
        >
          <div className="flex items-start space-x-4">
            {/* iOS-style Checkbox */}
            <button
              onClick={handleToggleComplete}
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all flex-shrink-0 ios-haptic-feedback",
                isCompleted
                  ? "bg-blue-500 border-blue-500"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={cn(
                    "ios-headline leading-snug mb-1 text-gray-900 dark:text-white",
                    isCompleted && "line-through opacity-60"
                  )}>
                    {tarefa.title}
                  </h3>
                  
                  {tarefa.description && (
                    <p className={cn(
                      "ios-subheadline line-clamp-2 mb-2 text-gray-600 dark:text-gray-400",
                      isCompleted && "line-through opacity-60"
                    )}>
                      {tarefa.description}
                    </p>
                  )}
                </div>

                {/* Event Type Indicator */}
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 ml-3 mt-1"
                  style={{ backgroundColor: getEventTypeColor(tarefa.event_type) }}
                />
              </div>

              {/* Meta Information */}
              <div className="flex items-center space-x-4 mt-2">
                {formatTimeMobile(tarefa.start_date) && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="ios-footnote font-medium text-gray-600 dark:text-gray-400">
                      {formatTimeMobile(tarefa.start_date)}
                    </span>
                  </div>
                )}
                
                {formatDateMobile(tarefa.start_date) !== 'Hoje' && (
                  <span className="ios-footnote font-medium text-red-500 dark:text-red-400">
                    {formatDateMobile(tarefa.start_date)}
                  </span>
                )}
                
                {tarefa.attendees && tarefa.attendees.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="ios-footnote text-gray-600 dark:text-gray-400">
                      {tarefa.attendees.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <TarefaDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        tarefa={tarefa}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </>
  );
};

export default TarefaItem;
