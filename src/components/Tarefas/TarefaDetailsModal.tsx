
import React, { useState } from 'react';
import { X, Clock, Calendar, Users, LinkIcon } from 'lucide-react';
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
        return 'text-blue-400';
      case 'appointment':
        return 'text-green-400';
      case 'reminder':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!isOpen || !tarefa) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-gray-900 w-full h-[85vh] rounded-t-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-400 hover:bg-gray-800"
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </Button>
            
            {isEditing && (
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Salvar
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Title */}
          <div>
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white text-lg font-medium"
                placeholder="Título da tarefa"
              />
            ) : (
              <h2 className="text-xl font-semibold text-white">{tarefa.title}</h2>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Descrição</label>
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white min-h-[100px] resize-none"
                placeholder="Adicione uma descrição..."
              />
            ) : (
              <p className="text-gray-300">
                {tarefa.description || 'Nenhuma descrição adicionada'}
              </p>
            )}
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            {/* Event Type */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                <div className={cn("w-3 h-3 rounded-full", getEventTypeColor(tarefa.event_type))} />
              </div>
              <div>
                <p className="text-white font-medium">{getEventTypeLabel(tarefa.event_type)}</p>
                <p className="text-sm text-gray-400">Tipo do evento</p>
              </div>
            </div>

            {/* Date and Time */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-white font-medium">{formatDateTime(tarefa.start_date)}</p>
                <p className="text-sm text-gray-400">Data e horário</p>
              </div>
            </div>

            {/* Attendees */}
            {tarefa.attendees && tarefa.attendees.length > 0 && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <Users className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{tarefa.attendees.join(', ')}</p>
                  <p className="text-sm text-gray-400">Participantes</p>
                </div>
              </div>
            )}

            {/* Meeting Link */}
            {tarefa.meeting_link && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <a
                    href={tarefa.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-medium hover:underline"
                  >
                    Link da reunião
                  </a>
                  <p className="text-sm text-gray-400">Clique para acessar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Excluir Lembrete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TarefaDetailsModal;
