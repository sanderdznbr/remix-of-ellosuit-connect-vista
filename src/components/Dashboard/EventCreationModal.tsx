
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Video, Calendar, Bell } from 'lucide-react';

interface EventCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventType: 'meeting' | 'appointment' | 'reminder';
  selectedDate: string;
  onCreateEvent: (eventData: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    eventType: 'meeting' | 'appointment' | 'reminder';
    meetingProvider?: 'google_meet' | 'zoom' | 'teams';
    meetingLink?: string;
    attendees?: any[];
    isAllDay?: boolean;
  }) => Promise<void>;
}

const EventCreationModal: React.FC<EventCreationModalProps> = ({
  isOpen,
  onClose,
  eventType,
  selectedDate,
  onCreateEvent
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [meetingProvider, setMeetingProvider] = useState<'google_meet' | 'zoom' | 'teams'>('google_meet');
  const [isLoading, setIsLoading] = useState(false);

  const getEventIcon = () => {
    switch (eventType) {
      case 'meeting': return <Video className="h-5 w-5" />;
      case 'appointment': return <Calendar className="h-5 w-5" />;
      case 'reminder': return <Bell className="h-5 w-5" />;
    }
  };

  const getEventTitle = () => {
    switch (eventType) {
      case 'meeting': return 'Agendar Reunião Online';
      case 'appointment': return 'Agendar Compromisso';
      case 'reminder': return 'Agendar Lembrete';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    
    const startDateTime = isAllDay 
      ? selectedDate 
      : `${selectedDate}T${startTime}:00`;
    
    const endDateTime = isAllDay 
      ? selectedDate 
      : `${selectedDate}T${endTime}:00`;

    await onCreateEvent({
      title,
      description,
      startDate: startDateTime,
      endDate: endDateTime,
      eventType,
      meetingProvider: eventType === 'meeting' ? meetingProvider : undefined,
      isAllDay
    });

    setIsLoading(false);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setEndTime('10:00');
    setIsAllDay(false);
    setMeetingProvider('google_meet');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getEventIcon()}
            {getEventTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do evento"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
              rows={3}
            />
          </div>

          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={selectedDate}
              disabled
              className="bg-gray-50"
            />
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Horário de Início</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endTime">Horário de Fim</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="allDay">Dia inteiro</Label>
          </div>

          {eventType === 'meeting' && (
            <div>
              <Label htmlFor="provider">Provedor de Reunião</Label>
              <select
                id="provider"
                value={meetingProvider}
                onChange={(e) => setMeetingProvider(e.target.value as 'google_meet' | 'zoom' | 'teams')}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="google_meet">Google Meet</option>
                <option value="zoom">Zoom</option>
                <option value="teams">Microsoft Teams</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventCreationModal;
