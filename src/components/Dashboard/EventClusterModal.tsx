
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventClusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: any[];
  date: string;
  onEventClick: (event: any) => void;
}

const EventClusterModal: React.FC<EventClusterModalProps> = ({
  isOpen,
  onClose,
  events,
  date,
  onEventClick
}) => {
  const getEventColor = (eventType: string) => {
    const colors = {
      'meeting': 'bg-blue-500',
      'appointment': 'bg-green-500',
      'reminder': 'bg-yellow-500',
      'task': 'bg-red-500',
      'google_meet': 'bg-blue-600'
    };
    return colors[eventType] || 'bg-gray-500';
  };

  const getEventBgColor = (eventType: string) => {
    const colors = {
      'meeting': 'bg-blue-50 border-blue-200',
      'appointment': 'bg-green-50 border-green-200',
      'reminder': 'bg-yellow-50 border-yellow-200',
      'task': 'bg-red-50 border-red-200',
      'google_meet': 'bg-blue-50 border-blue-200'
    };
    return colors[eventType] || 'bg-gray-50 border-gray-200';
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-[#3600FF]" />
            <span>Eventos do dia</span>
          </DialogTitle>
          <p className="text-sm text-gray-600 capitalize">
            {date && formatDate(date)}
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {events.map((event) => (
            <div
              key={event.id}
              className={`rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${getEventBgColor(event.extendedProps?.event_type)}`}
              onClick={() => onEventClick(event)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`w-3 h-3 rounded-full ${getEventColor(event.extendedProps?.event_type)}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
                      {event.title}
                    </h3>
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {formatTime(event.start)} - {formatTime(event.end)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                {/* Event Type Badge */}
                <Badge variant="secondary" className="text-xs">
                  {event.extendedProps?.event_type === 'meeting' ? 'Reunião' :
                   event.extendedProps?.event_type === 'appointment' ? 'Compromisso' :
                   event.extendedProps?.event_type === 'reminder' ? 'Lembrete' : 'Evento'}
                </Badge>

                {/* Meeting Link */}
                {event.extendedProps?.meeting_link && (
                  <div className="flex items-center space-x-2">
                    <Video className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">Reunião online</span>
                  </div>
                )}

                {/* Attendees */}
                {event.extendedProps?.attendees && event.extendedProps.attendees.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {event.extendedProps.attendees.length} participante{event.extendedProps.attendees.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Source */}
                {event.extendedProps?.source === 'google' && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Google Calendar</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventClusterModal;
