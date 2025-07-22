
import React, { useState } from 'react';
import { Trash2, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/use-mobile-gestures';
import { formatDateMobile, formatTimeMobile, vibrate } from '@/utils/mobile-helpers';
import TarefaDetailsModal from './TarefaDetailsModal';
import MobileCard from '@/components/ui/mobile-card';

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
        return 'bg-blue-500';
      case 'appointment':
        return 'bg-green-500';
      case 'reminder':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <>
      <div className="relative mb-3 overflow-hidden rounded-xl">
        {/* Delete Button Background */}
        <div 
          className={cn(
            "absolute right-0 top-0 h-full w-20 bg-red-500 flex items-center justify-center transition-all duration-200",
            swipeDistance < -20 ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            onClick={handleDeleteClick}
            className="text-white p-3 rounded-full hover:bg-red-600 transition-colors mobile-touch-feedback"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <MobileCard
          className={cn(
            "transition-transform duration-200 ease-out",
            isCompleted && "opacity-75"
          )}
          style={{ transform: `translateX(${swipeDistance}px)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={handleItemClick}
          pressable
        >
          <div className="flex items-start space-x-4 p-4">
            {/* Checkbox */}
            <button
              onClick={handleToggleComplete}
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all flex-shrink-0 mobile-touch-feedback",
                isCompleted
                  ? "bg-blue-500 border-blue-500"
                  : "border-gray-300 hover:border-gray-400"
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
                    "text-gray-900 text-base font-semibold leading-snug",
                    isCompleted && "line-through text-gray-500"
                  )}>
                    {tarefa.title}
                  </h3>
                  
                  {tarefa.description && (
                    <p className={cn(
                      "text-sm text-gray-600 mt-1 line-clamp-2",
                      isCompleted && "line-through text-gray-400"
                    )}>
                      {tarefa.description}
                    </p>
                  )}
                </div>

                {/* Event Type Indicator */}
                <div className={cn(
                  "w-3 h-3 rounded-full flex-shrink-0 ml-3 mt-1",
                  getEventTypeColor(tarefa.event_type)
                )} />
              </div>

              {/* Meta Information */}
              <div className="flex items-center space-x-4 mt-3">
                {formatTimeMobile(tarefa.start_date) && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 font-medium">
                      {formatTimeMobile(tarefa.start_date)}
                    </span>
                  </div>
                )}
                
                {formatDateMobile(tarefa.start_date) !== 'Hoje' && (
                  <span className="text-sm text-red-500 font-medium">
                    {formatDateMobile(tarefa.start_date)}
                  </span>
                )}
                
                {tarefa.attendees && tarefa.attendees.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {tarefa.attendees.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </MobileCard>
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
