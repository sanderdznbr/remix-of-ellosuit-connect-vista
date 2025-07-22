
import React, { useState } from 'react';
import { Clock, Calendar, Users, LinkIcon, Edit3, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatDateMobile, formatTimeMobile, vibrate } from '@/utils/mobile-helpers';
import MobileModal from '@/components/ui/mobile-modal';
import MobileButton from '@/components/ui/mobile-button';

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

  const handleSave = async () => {
    if (!tarefa) return;
    
    await onUpdate(tarefa.id, {
      title: title.trim(),
      description: description.trim()
    });
    
    setIsEditing(false);
    vibrate(30);
  };

  const handleDelete = async () => {
    if (!tarefa) return;
    
    await onDelete(tarefa.id);
    onClose();
    vibrate([50, 100, 50]);
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
        return 'bg-blue-500';
      case 'appointment':
        return 'bg-green-500';
      case 'reminder':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!tarefa) return null;

  return (
    <MobileModal 
      isOpen={isOpen} 
      onClose={onClose}
      size="lg"
      showCloseButton={false}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <MobileButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-600"
        >
          Fechar
        </MobileButton>
        
        <div className="flex items-center space-x-2">
          <MobileButton
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-500"
          >
            <Edit3 className="h-4 w-4 mr-1" />
            {isEditing ? 'Cancelar' : 'Editar'}
          </MobileButton>
          
          {isEditing && (
            <MobileButton
              variant="primary"
              size="sm"
              onClick={handleSave}
            >
              Salvar
            </MobileButton>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Title */}
        <div>
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mobile-input text-xl font-semibold"
              placeholder="Título da tarefa"
            />
          ) : (
            <h2 className="text-2xl font-bold text-gray-900">{tarefa.title}</h2>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Descrição</label>
          {isEditing ? (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mobile-input min-h-[100px] resize-none"
              placeholder="Adicione uma descrição..."
            />
          ) : (
            <p className="text-gray-700 text-base leading-relaxed">
              {tarefa.description || 'Nenhuma descrição adicionada'}
            </p>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          {/* Event Type */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <div className={cn("w-5 h-5 rounded-full", getEventTypeColor(tarefa.event_type))} />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{getEventTypeLabel(tarefa.event_type)}</p>
              <p className="text-sm text-gray-500">Tipo do evento</p>
            </div>
          </div>

          {/* Date and Time */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{formatDateTime(tarefa.start_date)}</p>
              <p className="text-sm text-gray-500">Data e horário</p>
            </div>
          </div>

          {/* Attendees */}
          {tarefa.attendees && tarefa.attendees.length > 0 && (
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold">{tarefa.attendees.join(', ')}</p>
                <p className="text-sm text-gray-500">Participantes</p>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {tarefa.meeting_link && (
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <a
                  href={tarefa.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 font-semibold hover:underline"
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
        <MobileButton
          variant="danger"
          fullWidth
          onClick={handleDelete}
          className="flex items-center justify-center space-x-2"
        >
          <Trash2 className="h-5 w-5" />
          <span>Excluir Lembrete</span>
        </MobileButton>
      </div>
    </MobileModal>
  );
};

export default TarefaDetailsModal;
