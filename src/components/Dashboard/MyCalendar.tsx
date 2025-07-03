
import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Video, Calendar, Bell } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MyCalendar = () => {
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDateActions, setShowDateActions] = useState(false);

  // Eventos de exemplo
  const events = [
    {
      id: '1',
      title: 'Reunião com Cliente',
      start: '2024-01-15T10:00:00',
      end: '2024-01-15T11:00:00',
      backgroundColor: '#2563EB',
      borderColor: '#2563EB',
    },
    {
      id: '2',
      title: 'Apresentação de Projeto',
      start: '2024-01-16T14:00:00',
      end: '2024-01-16T15:30:00',
      backgroundColor: '#1D4ED8',
      borderColor: '#1D4ED8',
    },
    {
      id: '3',
      title: 'Call de Alinhamento',
      start: '2024-01-17T09:00:00',
      end: '2024-01-17T10:00:00',
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
    },
  ];

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setShowDateActions(true);
    console.log('Data clicada:', arg.dateStr);
  };

  const handleEventClick = (arg: any) => {
    console.log('Evento clicado:', arg.event.title);
  };

  const handleActionSelect = (action: string) => {
    console.log('Ação selecionada:', action, 'para a data:', selectedDate);
    setShowDateActions(false);
    // Aqui você pode implementar a lógica para cada tipo de ação
  };

  const upcomingEvents = events
    .filter(event => new Date(event.start) >= new Date())
    .slice(0, 3)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

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
      <Popover open={showDateActions} onOpenChange={setShowDateActions}>
        <PopoverTrigger asChild>
          <div className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-80">
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
        </PopoverContent>
      </Popover>

      {/* Stats Cards e Próximos Eventos - Parte inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Hoje</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">2</div>
            <p className="text-xs text-muted-foreground">
              +1 em relação a ontem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">12</div>
            <p className="text-xs text-muted-foreground">
              8 reuniões confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Mês</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">28</div>
            <p className="text-xs text-muted-foreground">
              5 eventos importantes
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
                      Agendado
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
