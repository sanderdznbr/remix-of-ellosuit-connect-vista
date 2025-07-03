
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, MapPin, User, FileText, X, Edit, Save, CheckCircle, XCircle, Video, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [eventStatus, setEventStatus] = useState(event?.extendedProps?.status || 'scheduled');
  const [videoUrl, setVideoUrl] = useState(event?.extendedProps?.video_url || '');

  if (!event) return null;

  const formatEventDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return dateStr;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'Reunião Online';
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
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'appointment':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reminder':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'postponed':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'postponed':
        return 'Adiado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Agendado';
    }
  };

  const handleSaveNotes = () => {
    setIsEditingNotes(false);
    // Aqui você pode implementar a lógica para salvar as observações
    console.log('Salvando observações:', notes);
  };

  const handleStatusChange = (newStatus: string) => {
    setEventStatus(newStatus);
    // Aqui você pode implementar a lógica para atualizar o status do evento
    console.log('Alterando status para:', newStatus);
  };

  const handleVideoUpload = () => {
    // Aqui você pode implementar a integração com Google Drive
    console.log('Abrindo seleção de arquivo do Google Drive');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white rounded-2xl shadow-2xl border-0 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="relative">
          {/* Header colorido baseado no tipo do evento */}
          <div className={`h-2 w-full ${
            event.extendedProps?.event_type === 'meeting' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
            event.extendedProps?.event_type === 'appointment' ? 'bg-gradient-to-r from-green-400 to-green-500' :
            event.extendedProps?.event_type === 'reminder' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
            'bg-gradient-to-r from-gray-400 to-gray-500'
          }`} />
          
          <div className="p-6">
            <DialogHeader className="pb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold text-gray-900 mb-3">
                    {event.title}
                  </DialogTitle>
                  <div className="flex items-center space-x-3">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEventTypeColor(event.extendedProps?.event_type)}`}>
                      {getEventTypeLabel(event.extendedProps?.event_type)}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(eventStatus)}`}>
                      {getStatusLabel(eventStatus)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Data e Horário */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Data e Horário</h3>
                  <p className="text-gray-600">
                    {formatEventDate(event.start)}
                    {event.end && event.start !== event.end && (
                      <span> até {formatEventDate(event.end)}</span>
                    )}
                  </p>
                  {event.allDay && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Dia inteiro
                    </span>
                  )}
                </div>
              </div>

              {/* Descrição */}
              {event.extendedProps?.description && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Descrição</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {event.extendedProps.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Link da Reunião */}
              {event.extendedProps?.meeting_link && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Link da Reunião</h3>
                    <a
                      href={event.extendedProps.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {event.extendedProps.meeting_link}
                    </a>
                  </div>
                </div>
              )}

              {/* Observações da Reunião */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Edit className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Observações da Reunião</h3>
                    {!isEditingNotes ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingNotes(true)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveNotes}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                    )}
                  </div>
                  {isEditingNotes ? (
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Adicione suas observações sobre a reunião..."
                      className="min-h-[100px] rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg min-h-[100px]">
                      {notes || 'Nenhuma observação adicionada ainda.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Gravação de Vídeo */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Video className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Gravação da Reunião</h3>
                  {videoUrl ? (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Gravação disponível:</p>
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-800 underline break-all"
                      >
                        {videoUrl}
                      </a>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleVideoUpload}
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Adicionar Gravação do Google Drive
                    </Button>
                  )}
                </div>
              </div>

              {/* Ações de Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Ações da Reunião</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={eventStatus === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange('completed')}
                    className={`${
                      eventStatus === 'completed' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Marcar como Concluída
                  </Button>
                  
                  <Button
                    variant={eventStatus === 'postponed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange('postponed')}
                    className={`${
                      eventStatus === 'postponed' 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'border-orange-200 text-orange-600 hover:bg-orange-50'
                    }`}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Marcar como Adiada
                  </Button>
                  
                  <Button
                    variant={eventStatus === 'cancelled' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange('cancelled')}
                    className={`${
                      eventStatus === 'cancelled' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'border-red-200 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Marcar como Cancelada
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
              <Button 
                onClick={onClose}
                className="bg-[#3600FF] hover:bg-[#3600FF]/90 text-white px-6 rounded-xl"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsModal;
