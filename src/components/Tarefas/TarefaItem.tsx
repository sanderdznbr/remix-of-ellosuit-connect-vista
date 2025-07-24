
import React from 'react';
import { Clock, Calendar, MapPin, Video, Bell, Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBrazilDate } from '@/utils/date-server';

interface TarefaItemProps {
  tarefa: {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    event_type: 'meeting' | 'appointment' | 'reminder';
    meeting_link?: string;
    meeting_provider?: string;
    attendees?: string[];
    location?: string;
    status?: string;
    color?: string;
  };
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (tarefa: any) => void;
}

const TarefaItem: React.FC<TarefaItemProps> = ({
  tarefa,
  onComplete,
  onDelete,
  onClick
}) => {
  const isCompleted = tarefa.status === 'completed';
  const startDate = new Date(tarefa.start_date);
  const timeString = startDate.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const getEventTypeInfo = () => {
    switch (tarefa.event_type) {
      case 'meeting':
        return {
          icon: Video,
          label: 'Reunião',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'appointment':
        return {
          icon: MapPin,
          label: 'Compromisso',
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'reminder':
      default:
        return {
          icon: Bell,
          label: 'Lembrete',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50'
        };
    }
  };

  const eventInfo = getEventTypeInfo();
  const Icon = eventInfo.icon;

  // Extrair localização da descrição
  const extractLocation = (description: string) => {
    if (!description) return '';
    const locationMatch = description.match(/📍 Local: (.+)/);
    return locationMatch ? locationMatch[1].split('\n')[0] : '';
  };

  // Extrair participantes da descrição
  const extractAttendees = (description: string) => {
    if (!description) return [];
    const attendeesMatch = description.match(/👥 Participantes: (.+)/);
    return attendeesMatch ? attendeesMatch[1].split('\n')[0].split(', ') : [];
  };

  // Extrair link da reunião da descrição
  const extractMeetingLink = (description: string) => {
    if (!description) return '';
    const linkMatch = description.match(/💻 Link da reunião: (.+)/);
    return linkMatch ? linkMatch[1].split('\n')[0] : '';
  };

  const location = extractLocation(tarefa.description || '');
  const attendees = extractAttendees(tarefa.description || '');
  const meetingLink = tarefa.meeting_link || extractMeetingLink(tarefa.description || '');

  return (
    <div 
      className={cn(
        "p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md active:scale-98",
        isCompleted && "opacity-60"
      )}
      onClick={() => onClick?.(tarefa)}
    >
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.(tarefa.id);
          }}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-1",
            isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 dark:border-gray-600 hover:border-green-400"
          )}
        >
          {isCompleted && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={cn(
                "font-medium text-gray-900 dark:text-white",
                isCompleted && "line-through text-gray-500"
              )}>
                {tarefa.title}
              </h3>
              
              {/* Horário */}
              <div className="flex items-center space-x-1 mt-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {timeString}
                </span>
              </div>
            </div>

            {/* Tipo de evento */}
            <div className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
              eventInfo.bgColor,
              eventInfo.color
            )}>
              <Icon className="h-3 w-3" />
              <span>{eventInfo.label}</span>
            </div>
          </div>

          {/* Informações específicas do tipo */}
          <div className="mt-2 space-y-1">
            {/* Localização para compromissos */}
            {tarefa.event_type === 'appointment' && location && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 text-green-500" />
                <span>{location}</span>
              </div>
            )}

            {/* Link da reunião */}
            {tarefa.event_type === 'meeting' && meetingLink && (
              <div className="flex items-center space-x-2">
                <Video className="h-4 w-4 text-blue-500" />
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <span>Entrar na reunião</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Participantes */}
            {attendees.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4 text-gray-500" />
                <span>{attendees.slice(0, 2).join(', ')}</span>
                {attendees.length > 2 && (
                  <span className="text-gray-400">+{attendees.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TarefaItem;
