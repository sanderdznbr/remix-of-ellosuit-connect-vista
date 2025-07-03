
import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Plus } from 'lucide-react';

const MyCalendar = () => {
  const [currentView, setCurrentView] = useState('dayGridMonth');

  // Eventos de exemplo
  const events = [
    {
      id: '1',
      title: 'Reunião com Cliente',
      start: '2024-01-15T10:00:00',
      end: '2024-01-15T11:00:00',
      backgroundColor: '#6B46C1',
      borderColor: '#6B46C1',
    },
    {
      id: '2',
      title: 'Apresentação de Projeto',
      start: '2024-01-16T14:00:00',
      end: '2024-01-16T15:30:00',
      backgroundColor: '#059669',
      borderColor: '#059669',
    },
    {
      id: '3',
      title: 'Call de Alinhamento',
      start: '2024-01-17T09:00:00',
      end: '2024-01-17T10:00:00',
      backgroundColor: '#DC2626',
      borderColor: '#DC2626',
    },
  ];

  const handleDateClick = (arg: any) => {
    console.log('Data clicada:', arg.dateStr);
    // Aqui você pode adicionar lógica para criar um novo evento
  };

  const handleEventClick = (arg: any) => {
    console.log('Evento clicado:', arg.event.title);
    // Aqui você pode adicionar lógica para editar o evento
  };

  const upcomingEvents = events
    .filter(event => new Date(event.start) >= new Date())
    .slice(0, 3)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Calendar</h1>
          <p className="text-gray-600">
            Gerencie seus compromissos e reuniões
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Hoje</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              +1 em relação a ontem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              8 reuniões confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Mês</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">
              5 eventos importantes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Calendário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="fullcalendar-container">
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
                  height="auto"
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

        {/* Sidebar with upcoming events */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex flex-col space-y-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <Badge variant="outline" style={{ backgroundColor: event.backgroundColor + '20', color: event.backgroundColor }}>
                        Agendado
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Criar Evento
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="h-4 w-4 mr-2" />
                Ver Agenda
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Configurar Lembretes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyCalendar;
