
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, User, FileText, X } from 'lucide-react';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl shadow-2xl border-0 p-0 overflow-hidden">
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
                  <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {event.title}
                  </DialogTitle>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEventTypeColor(event.extendedProps?.event_type)}`}>
                    {getEventTypeLabel(event.extendedProps?.event_type)}
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

              {/* Informações do Tipo de Evento */}
              {event.extendedProps?.event_type === 'appointment' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Compromisso Agendado</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Este é um compromisso presencial ou evento específico agendado.
                  </p>
                </div>
              )}

              {event.extendedProps?.event_type === 'reminder' && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Lembrete</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Este é um lembrete para não esquecer de algo importante.
                  </p>
                </div>
              )}
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
