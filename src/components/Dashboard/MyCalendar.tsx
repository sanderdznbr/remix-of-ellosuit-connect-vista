
import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';
import EventCreationModal from './EventCreationModal';
import { Input } from '@/components/ui/input';

const MyCalendar = () => {
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<'meeting' | 'appointment' | 'reminder'>('meeting');
  
  const { events, loading, hasCompany, createEvent } = useCalendarData();
  const calendarRef = useRef<FullCalendar>(null);

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setShowEventModal(true);
  };

  const handleEventClick = (arg: any) => {
    console.log('Evento clicado:', arg.event.title);
  };

  const handleCreateEvent = async (eventData: any) => {
    await createEvent(eventData);
  };

  const handleAddEvent = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setShowEventModal(true);
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-gray-600">Carregando calendário...</div>
        </div>
      </div>
    );
  }

  if (!hasCompany) {
    return (
      <div className="p-8 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Bem-vindo ao Calendário
            </h2>
            <p className="text-gray-600 mb-6">
              Para usar o calendário, você precisa estar associado a uma empresa.
              Entre em contato com o administrador para ser adicionado a uma empresa.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-500 mt-1">Gerencie seus eventos e compromissos</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Search" 
                className="pl-10 w-80"
              />
            </div>
            
            {/* Add Event Button */}
            <Button 
              onClick={handleAddEvent}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add event</span>
            </Button>
          </div>
        </div>

        {/* Calendar */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-0">
            <div className="calendar-container">
              <FullCalendar
                ref={calendarRef}
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
                height="calc(100vh - 200px)"
                locale="pt-br"
                buttonText={{
                  today: 'Today',
                  month: 'Month view',
                  week: 'Week view',
                  day: 'Day view'
                }}
                dayHeaderFormat={{ weekday: 'short' }}
                eventDisplay="block"
                eventBackgroundColor="transparent"
                eventBorderColor="transparent"
                eventTextColor="#374151"
                dayCellClassNames="hover:bg-gray-50"
                eventClassNames="rounded-md text-sm font-medium px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity"
              />
            </div>
          </CardContent>
        </Card>

        {/* Event Creation Modal */}
        <EventCreationModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          eventType={selectedEventType}
          selectedDate={selectedDate || ''}
          onCreateEvent={handleCreateEvent}
        />
      </div>
    </div>
  );
};

export default MyCalendar;
