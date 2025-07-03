
import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';
import EventTypeSelector from './EventTypeSelector';
import EventCreationModal from './EventCreationModal';
import AppointmentModal from './AppointmentModal';
import ReminderModal from './ReminderModal';
import { Input } from '@/components/ui/input';

const MyCalendar = () => {
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventTypeSelector, setShowEventTypeSelector] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<'meeting' | 'appointment' | 'reminder'>('meeting');
  
  const { events, loading, hasCompany, createEvent } = useCalendarData();
  const calendarRef = useRef<FullCalendar>(null);

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setShowEventTypeSelector(true);
  };

  const handleEventClick = (arg: any) => {
    console.log('Evento clicado:', arg.event.title);
  };

  const handleCreateEvent = async (eventData: any) => {
    console.log('Criando evento:', eventData);
    await createEvent(eventData);
  };

  const handleAddEvent = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setShowEventTypeSelector(true);
  };

  const handleEventTypeSelect = (type: 'meeting' | 'appointment' | 'reminder') => {
    setSelectedEventType(type);
    setShowEventTypeSelector(false);
    
    if (type === 'meeting') {
      setShowEventModal(true);
    } else if (type === 'appointment') {
      setShowAppointmentModal(true);
    } else if (type === 'reminder') {
      setShowReminderModal(true);
    }
  };

  const closeAllModals = () => {
    setShowEventTypeSelector(false);
    setShowEventModal(false);
    setShowAppointmentModal(false);
    setShowReminderModal(false);
    setSelectedDate(null);
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-gray-600">Carregando calendário...</div>
        </div>
      </div>
    );
  }

  if (!hasCompany) {
    return (
      <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center shadow-lg rounded-2xl border-0">
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
    <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendário</h1>
            <p className="text-gray-500 mt-1">Gerencie seus eventos e compromissos</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Buscar eventos..." 
                className="pl-10 w-80 rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
              />
            </div>
            
            <Button 
              onClick={handleAddEvent}
              className="bg-[#3600FF] hover:bg-[#3600FF]/90 text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Evento</span>
            </Button>
          </div>
        </div>

        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="calendar-container">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                  left: 'prev,next hoje',
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
                  today: 'Hoje',
                  month: 'Mês',
                  week: 'Semana',
                  day: 'Dia'
                }}
                dayHeaderFormat={{ weekday: 'short' }}
                eventDisplay="block"
                eventBackgroundColor="transparent"
                eventBorderColor="transparent"
                eventTextColor="#374151"
                dayCellClassNames="hover:bg-blue-50/50 transition-colors duration-200"
                eventClassNames="rounded-lg text-sm font-medium px-3 py-2 cursor-pointer hover:opacity-80 transition-all duration-200 shadow-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Seletor de Tipo de Evento */}
        <EventTypeSelector
          isOpen={showEventTypeSelector}
          onClose={closeAllModals}
          onSelectType={handleEventTypeSelect}
          selectedDate={selectedDate || ''}
        />

        {/* Modal de Reunião Online */}
        <EventCreationModal
          isOpen={showEventModal}
          onClose={closeAllModals}
          selectedDate={selectedDate || ''}
          onCreateEvent={handleCreateEvent}
        />

        {/* Modal de Compromisso */}
        <AppointmentModal
          isOpen={showAppointmentModal}
          onClose={closeAllModals}
          selectedDate={selectedDate || ''}
          onCreateEvent={handleCreateEvent}
        />

        {/* Modal de Lembrete */}
        <ReminderModal
          isOpen={showReminderModal}
          onClose={closeAllModals}
          selectedDate={selectedDate || ''}
          onCreateEvent={handleCreateEvent}
        />
      </div>
    </div>
  );
};

export default MyCalendar;
