
import React, { useState } from 'react';
import { Trash2, Clock, Users, MapPin, Link, Play, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/use-mobile-gestures';
import { formatDateMobile, formatTimeMobile, vibrate } from '@/utils/mobile-helpers';
import TarefaDetailsModal from './TarefaDetailsModal';
import InProgressModal from './InProgressModal';

interface TarefaItemProps {
  tarefa: any;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TarefaItem: React.FC<TarefaItemProps> = ({ tarefa, onUpdate, onDelete }) => {
  const [isCompleted, setIsCompleted] = useState(tarefa.status === 'completed');
  const [isInProgress, setIsInProgress] = useState(tarefa.status === 'in_progress');
  const [showModal, setShowModal] = useState(false);
  const [showInProgressModal, setShowInProgressModal] = useState(false);
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
    
    // Se for compromisso e não estiver em progresso, vai para "em andamento"
    if (tarefa.event_type === 'appointment' && !isInProgress && !isCompleted) {
      setIsInProgress(true);
      await onUpdate(tarefa.id, { status: 'in_progress' });
      setShowInProgressModal(true);
      vibrate(30);
      return;
    }
    
    // Se estiver em progresso, vai para concluído
    if (isInProgress) {
      setIsInProgress(false);
      setIsCompleted(true);
      await onUpdate(tarefa.id, { status: 'completed' });
      vibrate(30);
      return;
    }
    
    // Comportamento normal para outros tipos
    const newStatus = isCompleted ? 'pending' : 'completed';
    setIsCompleted(!isCompleted);
    await onUpdate(tarefa.id, { status: newStatus });
    vibrate(30);
  };

  const handleItemClick = () => {
    if (swipeDistance === 0) {
      if (isInProgress && tarefa.event_type === 'appointment') {
        setShowInProgressModal(true);
      } else {
        setShowModal(true);
      }
      vibrate(30);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(tarefa.id);
    vibrate([50, 100, 50]);
  };

  const handleCompleteFromModal = async () => {
    setIsInProgress(false);
    setIsCompleted(true);
    await onUpdate(tarefa.id, { status: 'completed' });
    setShowInProgressModal(false);
    vibrate(30);
  };

  const handleAudioSaved = async (audioBlob: Blob) => {
    // Converter blob para base64 para armazenar no banco
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      await onUpdate(tarefa.id, { 
        audio_recording: base64Audio,
        has_audio: true
      });
    };
    reader.readAsDataURL(audioBlob);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-100 text-blue-800';
      case 'appointment':
        return 'bg-green-100 text-green-800';
      case 'reminder':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    if (isCompleted) {
      return (
        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (isInProgress) {
      return <Play className="w-3 h-3 text-white" />;
    }
    
    return null;
  };

  const getStatusColors = () => {
    if (isCompleted) {
      return "bg-blue-500 border-blue-500";
    }
    
    if (isInProgress) {
      return "bg-yellow-500 border-yellow-500";
    }
    
    return "border-gray-300 hover:border-gray-400";
  };

  return (
    <>
      <div className="relative overflow-hidden">
        {/* Delete Button Background */}
        <div 
          className={cn(
            "absolute right-0 top-0 h-full w-20 bg-red-500 flex items-center justify-center transition-all duration-200",
            swipeDistance < -20 ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            onClick={handleDeleteClick}
            className="p-3 rounded-full text-white hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div
          className={cn(
            "bg-white transition-all duration-200 ease-out cursor-pointer p-4 hover:bg-gray-50",
            isCompleted && "opacity-75",
            isInProgress && "bg-yellow-50 border-l-4 border-yellow-500"
          )}
          style={{ transform: `translateX(${swipeDistance}px)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={handleItemClick}
        >
          <div className="flex items-start space-x-3">
            {/* Checkbox */}
            <button
              onClick={handleToggleComplete}
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all flex-shrink-0",
                getStatusColors()
              )}
            >
              {getStatusIcon()}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={cn(
                    "text-base font-medium text-gray-900 leading-snug mb-1",
                    isCompleted && "line-through opacity-60"
                  )}>
                    {tarefa.title}
                  </h3>
                  
                  {isInProgress && (
                    <div className="flex items-center space-x-1 mb-2">
                      <Play className="w-3 h-3 text-yellow-600" />
                      <span className="text-xs text-yellow-600 font-medium">Em andamento</span>
                    </div>
                  )}
                  
                  {tarefa.description && (
                    <p className={cn(
                      "text-sm text-gray-600 line-clamp-2 mb-2",
                      isCompleted && "line-through opacity-60"
                    )}>
                      {tarefa.description}
                    </p>
                  )}
                </div>

                {/* Event Type Badge */}
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-3 flex-shrink-0",
                  getEventTypeColor(tarefa.event_type)
                )}>
                  {tarefa.event_type === 'meeting' && 'Reunião'}
                  {tarefa.event_type === 'appointment' && 'Compromisso'}
                  {tarefa.event_type === 'reminder' && 'Lembrete'}
                </span>
              </div>

              {/* Meta Information */}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                {formatTimeMobile(tarefa.start_date) && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTimeMobile(tarefa.start_date)}</span>
                  </div>
                )}
                
                {formatDateMobile(tarefa.start_date) !== 'Hoje' && (
                  <span className="text-red-500 font-medium">
                    {formatDateMobile(tarefa.start_date)}
                  </span>
                )}
                
                {tarefa.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-[120px]">{tarefa.location}</span>
                  </div>
                )}
                
                {tarefa.meeting_link && (
                  <div className="flex items-center space-x-1">
                    <Link className="h-4 w-4" />
                    <span>Link</span>
                  </div>
                )}
                
                {tarefa.attendees && tarefa.attendees.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{tarefa.attendees.length}</span>
                  </div>
                )}
                
                {tarefa.has_audio && (
                  <div className="flex items-center space-x-1">
                    <span className="text-blue-500 text-xs">🎵 Áudio</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TarefaDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        tarefa={tarefa}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      
      <InProgressModal
        isOpen={showInProgressModal}
        onClose={() => setShowInProgressModal(false)}
        tarefa={tarefa}
        onComplete={handleCompleteFromModal}
        onAudioSaved={handleAudioSaved}
      />
    </>
  );
};

export default TarefaItem;
