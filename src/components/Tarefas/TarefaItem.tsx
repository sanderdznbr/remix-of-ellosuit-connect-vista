
import React, { useState } from 'react';
import { Trash2, Clock, Users, MapPin, Link, Play, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/use-mobile-gestures';
import { formatDateMobile, formatTimeMobile, vibrate } from '@/utils/mobile-helpers';
import TarefaDetailsModal from './TarefaDetailsModal';
import MeetingRecordingModal from './MeetingRecordingModal';

interface TarefaItemProps {
  tarefa: any;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TarefaItem: React.FC<TarefaItemProps> = ({ tarefa, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
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

  const handleStatusChange = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (tarefa.event_type === 'appointment') {
      // Para compromissos: pending -> in_progress -> completed
      if (tarefa.status === 'pending') {
        await onUpdate(tarefa.id, { status: 'in_progress' });
        vibrate(30);
      } else if (tarefa.status === 'in_progress') {
        await onUpdate(tarefa.id, { status: 'completed' });
        vibrate(30);
      }
    } else {
      // Para outros tipos: pending -> completed
      const newStatus = tarefa.status === 'completed' ? 'pending' : 'completed';
      await onUpdate(tarefa.id, { status: newStatus });
      vibrate(30);
    }
  };

  const handleItemClick = () => {
    if (swipeDistance === 0) {
      // Se é compromisso em andamento, abrir modal de gravação
      if (tarefa.event_type === 'appointment' && tarefa.status === 'in_progress') {
        setShowRecordingModal(true);
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

  const handleRecordingSave = async (audioUrl: string, transcript: string) => {
    await onUpdate(tarefa.id, {
      audio_url: audioUrl,
      transcript: transcript,
      description: transcript
    });
    setShowRecordingModal(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'pending':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    if (tarefa.event_type === 'appointment') {
      switch (tarefa.status) {
        case 'pending':
          return <Play className="w-5 h-5" />;
        case 'in_progress':
          return <CheckCircle className="w-5 h-5" />;
        case 'completed':
          return (
            <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          );
        default:
          return <Play className="w-5 h-5" />;
      }
    } else {
      // Para outros tipos de evento
      return tarefa.status === 'completed' ? (
        <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
      );
    }
  };

  const getStatusText = () => {
    if (tarefa.event_type === 'appointment') {
      switch (tarefa.status) {
        case 'pending':
          return 'Iniciar';
        case 'in_progress':
          return 'Finalizar';
        case 'completed':
          return 'Concluído';
        default:
          return 'Iniciar';
      }
    }
    return '';
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
            tarefa.status === 'completed' && "opacity-75",
            tarefa.status === 'in_progress' && "border-l-4 border-blue-500"
          )}
          style={{ transform: `translateX(${swipeDistance}px)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={handleItemClick}
        >
          <div className="flex items-start space-x-3">
            {/* Status Button */}
            <button
              onClick={handleStatusChange}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center mt-1 transition-all flex-shrink-0",
                getStatusColor(tarefa.status),
                tarefa.status === 'completed' && "bg-green-100",
                tarefa.status === 'in_progress' && "bg-blue-100"
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
                    tarefa.status === 'completed' && "line-through opacity-60"
                  )}>
                    {tarefa.title}
                  </h3>
                  
                  {tarefa.description && (
                    <p className={cn(
                      "text-sm text-gray-600 line-clamp-2 mb-2",
                      tarefa.status === 'completed' && "line-through opacity-60"
                    )}>
                      {tarefa.description}
                    </p>
                  )}
                </div>

                {/* Event Type Badge */}
                <div className="flex flex-col items-end space-y-1">
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    getEventTypeColor(tarefa.event_type)
                  )}>
                    {tarefa.event_type === 'meeting' && 'Reunião'}
                    {tarefa.event_type === 'appointment' && 'Compromisso'}
                    {tarefa.event_type === 'reminder' && 'Lembrete'}
                  </span>
                  
                  {/* Status for appointments */}
                  {tarefa.event_type === 'appointment' && (
                    <span className={cn(
                      "text-xs font-medium",
                      getStatusColor(tarefa.status)
                    )}>
                      {getStatusText()}
                    </span>
                  )}
                </div>
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <TarefaDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        tarefa={tarefa}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />

      {/* Recording Modal */}
      <MeetingRecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        eventId={tarefa.id}
        eventTitle={tarefa.title}
        onSave={handleRecordingSave}
      />
    </>
  );
};

export default TarefaItem;
