import React, { useState } from 'react';
import { Check, Clock, MapPin, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateMobile, formatTimeMobile, vibrate } from '@/utils/mobile-helpers';

interface TarefaItemProps {
  tarefa: any;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  onClick?: (tarefa: any) => void;
  filter?: string;
  isLast?: boolean;
}

const TarefaItem: React.FC<TarefaItemProps> = ({
  tarefa,
  onUpdate,
  onDelete,
  onClick,
  filter = 'hoje',
  isLast = false
}) => {
  const [isCompleted, setIsCompleted] = useState(tarefa.status === 'completed');

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = isCompleted ? 'pending' : 'completed';
    setIsCompleted(!isCompleted);
    
    await onUpdate(tarefa.id, { status: newStatus });
    vibrate(30);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete(tarefa.id);
    vibrate([50, 100, 50]);
  };

  const handleClick = () => {
    if (onClick) {
      onClick(tarefa);
      vibrate(30);
    }
  };

  const getTimeDisplay = () => {
    const startTime = formatTimeMobile(tarefa.start_date);
    const endTime = tarefa.end_date ? formatTimeMobile(tarefa.end_date) : null;
    
    if (endTime && endTime !== startTime) {
      return `${startTime} - ${endTime}`;
    }
    return startTime;
  };

  const getDateDisplay = () => {
    if (filter === 'hoje') return null;
    return formatDateMobile(tarefa.start_date);
  };

  const extractLocation = (description: string) => {
    if (!description) return null;
    const locationMatch = description.match(/📍 Local: (.+)/);
    return locationMatch ? locationMatch[1].split('\n')[0] : null;
  };

  const location = extractLocation(tarefa.description);

  return (
    <div 
      className={cn(
        "flex items-center space-x-3 py-4 px-4 bg-white hover:bg-gray-50 transition-colors cursor-pointer",
        !isLast && "border-b border-gray-100",
        isCompleted && "opacity-60"
      )}
      onClick={handleClick}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggleComplete}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
          isCompleted
            ? "bg-blue-500 border-blue-500 text-white"
            : "border-gray-300 hover:border-blue-400"
        )}
      >
        {isCompleted && <Check className="h-3 w-3" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-medium text-gray-900 mb-1 truncate",
              isCompleted && "line-through text-gray-500"
            )}>
              {tarefa.title}
            </h3>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {/* Time */}
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{getTimeDisplay()}</span>
              </div>
              
              {/* Date (if not today) */}
              {getDateDisplay() && (
                <span className="text-gray-400">
                  {getDateDisplay()}
                </span>
              )}
              
              {/* Location */}
              {location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{location}</span>
                </div>
              )}
              
              {/* Source indicator */}
              {tarefa.source === 'google' && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={handleClick}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Info className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleDelete}
              className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TarefaItem;
