import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, MapPin, Users, Video, ChevronRight, Bell, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MobileHomeProps {
  onNavigate: (page: string) => void;
}

const MobileHome: React.FC<MobileHomeProps> = ({ onNavigate }) => {
  const { events, loading } = useCalendarData();
  const { isConnected } = useGoogleCalendar();
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Filtrar eventos de hoje
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start_date).toISOString().split('T')[0];
    return eventDate === today;
  });

  // Próximos eventos (próximos 7 dias)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate > today && eventDate <= nextWeek;
  }).slice(0, 3);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'meeting':
        return <Video className="h-4 w-4" />;
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'reminder':
        return <Bell className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
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

  const formatEventTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm', { locale: ptBR });
  };

  const formatEventDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM', { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá! 👋
          </h1>
          <p className="text-gray-600">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <Button
          onClick={() => onNavigate('calendar')}
          className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo
        </Button>
      </div>

      {/* Google Calendar Status */}
      {!isConnected && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-orange-900">Google Calendar</p>
                  <p className="text-sm text-orange-700">Conecte para sincronizar</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('settings')}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Conectar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eventos de Hoje */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Hoje</h2>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {todayEvents.length}
          </Badge>
        </div>

        {todayEvents.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Nenhum evento hoje</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((event) => (
              <Card key={event.id} className="border-l-4 border-l-[#3600FF]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={cn("w-2 h-2 rounded-full", getEventColor(event.event_type))} />
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                        {event.source === 'google' && (
                          <Badge variant="secondary" className="text-xs">Google</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatEventTime(event.start_date)}</span>
                          {event.end_date && (
                            <>
                              <span>-</span>
                              <span>{formatEventTime(event.end_date)}</span>
                            </>
                          )}
                        </div>
                        
                        {event.meeting_link && (
                          <div className="flex items-center space-x-1">
                            <Video className="h-3 w-3" />
                            <span className="text-blue-600 truncate">Link da reunião</span>
                          </div>
                        )}
                        
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{event.attendees.length} participante(s)</span>
                          </div>
                        )}
                        
                        {event.description && (
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getEventIcon(event.event_type)}
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Próximos Eventos */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Próximos</h2>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className={cn("w-2 h-2 rounded-full", getEventColor(event.event_type))} />
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatEventDate(event.start_date)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatEventTime(event.start_date)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {getEventIcon(event.event_type)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => onNavigate('calendar')}
          className="h-14 bg-[#3600FF] hover:bg-[#3600FF]/90 flex-col rounded-xl"
        >
          <Calendar className="h-5 w-5 mb-1" />
          <span className="text-sm">Calendário</span>
        </Button>
        
        <Button
          onClick={() => onNavigate('tarefas')}
          className="h-14 bg-green-600 hover:bg-green-700 flex-col rounded-xl"
        >
          <Bell className="h-5 w-5 mb-1" />
          <span className="text-sm">Lembretes</span>
        </Button>
      </div>
    </div>
  );
};

export default MobileHome;
