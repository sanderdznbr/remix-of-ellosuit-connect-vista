
import React, { useState, useRef } from 'react';
import { Clock, Calendar, Users, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface TarefaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarefa: any;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TarefaDetailsModal: React.FC<TarefaDetailsModalProps> = ({
  isOpen,
  onClose,
  tarefa,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(tarefa?.title || '');
  const [description, setDescription] = useState(tarefa?.description || '');
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleSave = async () => {
    if (!tarefa) return;
    
    await onUpdate(tarefa.id, {
      title: title.trim(),
      description: description.trim()
    });
    
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!tarefa) return;
    
    await onDelete(tarefa.id);
    onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) {
      setCurrentY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 150) {
      onClose();
    }
    setCurrentY(0);
    setIsDragging(false);
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'Reunião';
      case 'appointment':
        return 'Compromisso';
      case 'reminder':
        return 'Lembrete';
      default:
        return 'Evento';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'text-blue-500';
      case 'appointment':
        return 'text-green-500';
      case 'reminder':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!isOpen || !tarefa) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-end">
      <div 
        ref={modalRef}
        className="bg-white w-full max-h-[90vh] rounded-t-3xl flex flex-col shadow-2xl"
        style={{ 
          transform: `translateY(${currentY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
          <div className="w-16"></div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-500 hover:bg-gray-100 px-4 py-2"
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </Button>
            
            {isEditing && (
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2"
              >
                Salvar
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Title */}
          <div>
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 text-lg font-medium rounded-xl"
                placeholder="Título da tarefa"
              />
            ) : (
              <h2 className="text-2xl font-semibold text-gray-900">{tarefa.title}</h2>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-gray-500 mb-2 block">Descrição</label>
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 min-h-[100px] resize-none rounded-xl"
                placeholder="Adicione uma descrição..."
              />
            ) : (
              <p className="text-gray-700 text-base">
                {tarefa.description || 'Nenhuma descrição adicionada'}
              </p>
            )}
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            {/* Event Type */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <div className={cn("w-4 h-4 rounded-full", getEventTypeColor(tarefa.event_type))} />
              </div>
              <div>
                <p className="text-gray-900 font-medium">{getEventTypeLabel(tarefa.event_type)}</p>
                <p className="text-sm text-gray-500">Tipo do evento</p>
              </div>
            </div>

            {/* Date and Time */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-gray-900 font-medium">{formatDateTime(tarefa.start_date)}</p>
                <p className="text-sm text-gray-500">Data e horário</p>
              </div>
            </div>

            {/* Attendees */}
            {tarefa.attendees && tarefa.attendees.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium">{tarefa.attendees.join(', ')}</p>
                  <p className="text-sm text-gray-500">Participantes</p>
                </div>
              </div>
            )}

            {/* Meeting Link */}
            {tarefa.meeting_link && (
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <a
                    href={tarefa.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 font-medium hover:underline"
                  >
                    Link da reunião
                  </a>
                  <p className="text-sm text-gray-500">Clique para acessar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3"
          >
            Excluir Lembrete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TarefaDetailsModal;
