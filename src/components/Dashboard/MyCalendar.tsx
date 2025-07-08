import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';
import EventDropdown from './EventDropdown';
import ImprovedEventModal from './ImprovedEventModal';
import AppointmentModal from './AppointmentModal';
import ReminderModal from './ReminderModal';
import EventDetailsModal from './EventDetailsModal';
import { Input } from '@/components/ui/input';

const MyCalendar = () => {
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<'meeting' | 'appointment' | 'reminder'>('meeting');
  const [selectedEventDetails, setSelectedEventDetails] = useState<any>(null);
  
  const { events, loading, hasCompany, createEvent } = useCalendarData();
  const calendarRef = useRef<FullCalendar>(null);

  // Função para gerar cores pastéis aleatórias
  const getPastelColor = (str: string) => {
    const colors = [
      'rgba(255, 182, 193, 0.8)', // Light Pink
      'rgba(173, 216, 230, 0.8)', // Light Blue
      'rgba(144, 238, 144, 0.8)', // Light Green
      'rgba(255, 218, 185, 0.8)', // Peach
      'rgba(221, 160, 221, 0.8)', // Plum
      'rgba(255, 239, 213, 0.8)', // Papaya Whip
      'rgba(176, 224, 230, 0.8)', // Powder Blue
      'rgba(255, 192, 203, 0.8)', // Pink
      'rgba(152, 251, 152, 0.8)', // Pale Green
      'rgba(255, 228, 196, 0.8)', // Bisque
    ];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Processar eventos com cores pastéis
  const processedEvents = events.map(event => ({
    ...event,
    backgroundColor: getPastelColor(event.title + event.id),
    borderColor: 'transparent',
    textColor: '#374151',
    classNames: ['custom-event']
  }));

  // Função para extrair data e hora do clique/seleção
  const extractDateTimeFromEvent = (eventInfo: any) => {
    console.log('📅 Evento do calendário:', eventInfo);
    
    let dateStr = '';
    let timeStr = null;
    
    if (eventInfo.dateStr) {
      // Clique simples - pode ser data ou datetime
      dateStr = eventInfo.dateStr.split('T')[0]; // Extrai apenas a parte da data
      if (eventInfo.dateStr.includes('T')) {
        // Se tem horário, extrai ele também
        timeStr = eventInfo.dateStr.split('T')[1].substring(0, 5); // HH:MM
      }
    } else if (eventInfo.start) {
      // Seleção de intervalo - usa o início
      const startDate = new Date(eventInfo.start);
      dateStr = startDate.toISOString().split('T')[0];
      timeStr = startDate.toTimeString().substring(0, 5); // HH:MM
    }
    
    console.log('📅 Data extraída:', dateStr, 'Hora extraída:', timeStr);
    return { dateStr, timeStr };
  };

  const handleDateClick = (arg: any) => {
    console.log('📅 Data clicada:', arg);
    const { dateStr, timeStr } = extractDateTimeFromEvent(arg);
    
    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
    setSelectedEventType('meeting');
    setShowEventModal(true);
  };

  const handleSelect = (arg: any) => {
    console.log('📅 Seleção de horário:', arg);
    const { dateStr, timeStr } = extractDateTimeFromEvent(arg);
    
    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
    setSelectedEventType('meeting');
    setShowEventModal(true);
  };

  const handleEventClick = (arg: any) => {
    console.log('Evento clicado:', arg.event);
    setSelectedEventDetails(arg.event);
    setShowEventDetailsModal(true);
  };

  const handleCreateEvent = async (eventData: any) => {
    console.log('Criando evento:', eventData);
    await createEvent(eventData);
  };

  const handleEventTypeSelect = (type: 'meeting' | 'appointment' | 'reminder') => {
    console.log('📝 Tipo de evento selecionado:', type);
    
    // Se não há data selecionada, usar hoje
    if (!selectedDate) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
    
    setSelectedEventType(type);
    
    if (type === 'meeting') {
      setShowEventModal(true);
    } else if (type === 'appointment') {
      setShowAppointmentModal(true);
    } else if (type === 'reminder') {
      setShowReminderModal(true);
    }
  };

  const closeAllModals = () => {
    setShowEventModal(false);
    setShowAppointmentModal(false);
    setShowReminderModal(false);
    setShowEventDetailsModal(false);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedEventDetails(null);
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
            
            <EventDropdown onSelectType={handleEventTypeSelect} />
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
                events={processedEvents}
                dateClick={handleDateClick}
                select={handleSelect}
                eventClick={handleEventClick}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={3}
                moreLinkClick="popover"
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
                eventTextColor="#374151"
                dayCellClassNames="hover:bg-blue-50/50 transition-colors duration-200"
                eventClassNames="custom-event cursor-pointer"
                moreLinkClassNames="more-link-custom"
              />
            </div>
          </CardContent>
        </Card>

        {/* Modal de Reunião Online */}
        <ImprovedEventModal
          isOpen={showEventModal}
          onClose={closeAllModals}
          selectedDate={selectedDate || ''}
          selectedTime={selectedTime}
          onCreateEvent={handleCreateEvent}
        />

        {/* Modal de Compromisso */}
        <AppointmentModal
          isOpen={showAppointmentModal}
          onClose={closeAllModals}
          selectedDate={selectedDate || ''}
          selectedTime={selectedTime}
          onCreateEvent={handleCreateEvent}
        />

        {/* Modal de Lembrete */}
        <ReminderModal
          isOpen={showReminderModal}
          onClose={closeAllModals}
          selectedDate={selectedDate || ''}
          selectedTime={selectedTime}
          onCreateEvent={handleCreateEvent}
        />

        {/* Modal de Detalhes do Evento */}
        <EventDetailsModal
          isOpen={showEventDetailsModal}
          onClose={closeAllModals}
          event={selectedEventDetails}
        />
      </div>
    </div>
  );
};

export default MyCalendar;
