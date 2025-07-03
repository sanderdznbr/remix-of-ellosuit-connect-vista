
import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Video, Calendar, Bell } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';
import EventCreationModal from './EventCreationModal';

const MyCalendar = () => {
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDateActions, setShowDateActions] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<'meeting' | 'appointment' | 'reminder'>('meeting');
  
  const { events, stats, upcomingEvents, loading, createEvent } = useCalendarData();
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleDateClick = (arg: any) => {
    const rect = arg.jsEvent.target.getBoundingClientRect();
    setMousePosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height
    });
    
    setSelectedDate(arg.dateStr);
    setShowDateActions(true);
  };

  const handleEventClick = (arg: any) => {
    console.log('Evento clicado:', arg.event.title);
  };

  const handleActionSelect = (action: 'meeting' | 'appointment' | 'reminder') => {
    setSelectedEventType(action);
    setShowDateActions(false);
    setShowEventModal(true);
  };

  const handleCreateEvent = async (eventData: any) => {
    await createEvent(eventData);
  };

  // Fechar popover quando clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowDateActions(false);
      }
    };

    if (showDateActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateActions]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg">Carregando calendário...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Calendar - Ocupa a maior parte da tela */}
      <div className="h-[70vh]">
        <Card className="h-full">
          <CardContent className="p-6 h-full">
            <div className="fullcalendar-container h-full">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                initialView={currentView}
                events={events}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                height="100%"
                locale="pt-br"
                buttonText={{
                  today: 'Hoje',
                  month: 'Mês',
                  week: 'Semana',
                  day: 'Dia'
                }}
                slotLabelFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popover para ações ao clicar em uma data */}
      {showDateActions && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
          style={{
            left: `${mousePosition.x - 160}px`,
            top: `${mousePosition.y + 10}px`,
          }}
        >
          <div className="space-y-4">
            <h3 className="font-medium">O que deseja fazer em {selectedDate}?</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleActionSelect('meeting')}
              >
                <Video className="h-4 w-4 mr-2" />
                Agendar Reunião Online
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleActionSelect('appointment')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Agendar Compromisso
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleActionSelect('reminder')}
              >
                <Bell className="h-4 w-4 mr-2" />
                Agendar Lembrete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de criação de evento */}
      <EventCreationModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        eventType={selectedEventType}
        selectedDate={selectedDate || ''}
        onCreateEvent={handleCreateEvent}
      />

      {/* Stats Cards e Próximos Eventos - Parte inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Hoje</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.todayEvents}</div>
            <p className="text-xs text-muted-foreground">
              Eventos agendados para hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.weekEvents}</div>
            <p className="text-xs text-muted-foreground">
              Próximos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Mês</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.monthEvents}</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 dias
            </p>
          </CardContent>
        </Card>

        {/* Próximos Eventos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <div key={event.id} className="flex flex-col space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      {event.extendedProps?.eventType === 'meeting' && 'Reunião'}
                      {event.extendedProps?.eventType === 'appointment' && 'Compromisso'}
                      {event.extendedProps?.eventType === 'reminder' && 'Lembrete'}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-blue-600">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(event.start).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(event.start).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum evento próximo
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyCalendar;
