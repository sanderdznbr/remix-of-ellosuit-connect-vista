import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import ImprovedEventModal from './ImprovedEventModal';
import EventDetailsModal from './EventDetailsModal';
import EventTypeSelector from './EventTypeSelector';
import { useCalendarData } from '@/hooks/useCalendarData';

interface MyCalendarProps {
  onNavigate?: (page: string) => void;
}

const MyCalendar = ({ onNavigate }: MyCalendarProps) => {
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedEventType, setSelectedEventType] = useState<'meeting' | 'appointment' | 'reminder' | null>(null);
  const [currentView, setCurrentView] = useState('dayGridMonth');

  const { events, loading, createEvent, refreshEvents } = useCalendarData();

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setShowTypeSelector(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const eventData = clickInfo.event;
    setSelectedEvent({
      id: eventData.id,
      title: eventData.title,
      start: eventData.start,
      end: eventData.end,
      extendedProps: eventData.extendedProps
    });
    setShowDetailsModal(true);
  };

  const handleTypeSelect = (type: 'meeting' | 'appointment' | 'reminder') => {
    setSelectedEventType(type);
    setShowTypeSelector(false);
    setShowEventModal(true);
  };

  const formatEventsForCalendar = (events: any[]) => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start_date,
      end: event.end_date,
      backgroundColor: getEventColor(event.event_type),
      borderColor: getEventColor(event.event_type),
      extendedProps: {
        description: event.description,
        eventType: event.event_type,
        meetingLink: event.meeting_link,
        meetingProvider: event.meeting_provider,
        attendees: event.attendees,
        isAllDay: event.is_all_day
      }
    }));
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'meeting':
        return '#3600FF';
      case 'appointment':
        return '#10B981';
      case 'reminder':
        return '#F59E0B';
      case 'task':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const calendarEvents = formatEventsForCalendar(events);

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Calendário</h1>
          <p className="text-gray-600">Gerencie seus eventos, reuniões e compromissos</p>
        </div>
        <Button 
          onClick={() => setShowTypeSelector(true)}
          className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      <Card className="shadow-lg border-0 rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#3600FF] to-[#4F46E5] text-white rounded-t-3xl">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-6 w-6" />
            <span>Calendário</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="calendar-container">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              height="auto"
              events={calendarEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              locale="pt-br"
              eventDisplay="block"
              eventTextColor="#ffffff"
              viewDidMount={(view) => {
                setCurrentView(view.view.type);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <EventTypeSelector
        isOpen={showTypeSelector}
        onClose={() => {
          setShowTypeSelector(false);
          setSelectedDate(null);
        }}
        onSelectType={handleTypeSelect}
        selectedDate={selectedDate || ''}
      />

      <ImprovedEventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedDate(null);
          setSelectedEventType(null);
        }}
        selectedDate={selectedDate}
        onCreateEvent={createEvent}
        onNavigateToSettings={onNavigate ? () => onNavigate('settings') : undefined}
      />

      <EventDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />
    </div>
  );
};

export default MyCalendar;
