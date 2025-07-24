
import React, { useState } from 'react';
import { Calendar, Clock, User, MapPin, Video, FileText, Bell, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { vibrate } from '@/utils/mobile-helpers';
import MobileModal from '@/components/ui/mobile-modal';
import MobileButton from '@/components/ui/mobile-button';

interface NovoLembreteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const NovoLembreteModal: React.FC<NovoLembreteModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'reminder' | 'meeting' | 'appointment'>('reminder');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Criar data/hora no timezone local
      const dateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const startDateTime = dateTime.toISOString();
      const endDateTime = new Date(dateTime.getTime() + 60 * 60 * 1000).toISOString();
      
      let finalDescription = description.trim();
      let meetingLink = undefined;
      
      // Adicionar informações específicas do tipo de evento
      if (eventType === 'appointment' && location.trim()) {
        finalDescription += `\n\n📍 Local: ${location.trim()}`;
      }
      
      if (eventType === 'meeting') {
        if (attendees.trim()) {
          finalDescription += `\n\n👥 Participantes: ${attendees.trim()}`;
        }
        // Gerar link do Google Meet
        meetingLink = `https://meet.google.com/${Math.random().toString(36).substring(2, 12)}-${Math.random().toString(36).substring(2, 12)}-${Math.random().toString(36).substring(2, 12)}`;
        finalDescription += `\n\n💻 Link da reunião: ${meetingLink}`;
      }
      
      const tarefaData = {
        title: title.trim(),
        description: finalDescription,
        event_type: eventType,
        start_date: startDateTime,
        end_date: endDateTime,
        location: eventType === 'appointment' ? location.trim() : undefined,
        meeting_link: eventType === 'meeting' ? meetingLink : undefined,
        attendees: eventType === 'meeting' && attendees.trim() ? 
          attendees.split(',').map(email => email.trim()).filter(email => email.length > 0) : 
          undefined,
        is_all_day: false,
        status: 'pending',
        source: 'local'
      };
      
      console.log('Criando novo lembrete:', tarefaData);
      
      await onSubmit(tarefaData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setEventType('reminder');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedTime('09:00');
      setLocation('');
      setAttendees('');
      
      vibrate(30);
      onClose();
    } catch (error) {
      console.error('Erro ao criar lembrete:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClick = () => {
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent);
  };

  const eventTypes = [
    { value: 'reminder', label: 'Lembrete', icon: Bell, color: 'bg-orange-500' },
    { value: 'meeting', label: 'Reunião', icon: Video, color: 'bg-blue-500' },
    { value: 'appointment', label: 'Compromisso', icon: Calendar, color: 'bg-green-500' }
  ];

  return (
    <MobileModal 
      isOpen={isOpen} 
      onClose={onClose}
      size="lg"
      showCloseButton={false}
    >
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <MobileButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400"
          >
            Cancelar
          </MobileButton>
          
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Novo Lembrete
          </h2>
          
          <MobileButton
            variant="primary"
            size="sm"
            disabled={!title.trim() || isSubmitting}
            onClick={handleCreateClick}
          >
            {isSubmitting ? 'Criando...' : 'Criar'}
          </MobileButton>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 bg-white dark:bg-gray-900 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Título *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do lembrete"
              className="mobile-input mt-2 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          {/* Event Type */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
              Tipo de Evento
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setEventType(type.value as any)}
                    className={cn(
                      "p-3 rounded-lg border-2 flex flex-col items-center space-y-2 transition-all",
                      eventType === type.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      type.color
                    )}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Data
              </Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mobile-input mt-2 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="time" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Horário
              </Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="mobile-input mt-2 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Location (for appointments) */}
          {eventType === 'appointment' && (
            <div>
              <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Local
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Digite o local do compromisso"
                className="mobile-input mt-2 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          {/* Attendees (for meetings) */}
          {eventType === 'meeting' && (
            <div>
              <Label htmlFor="attendees" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Participantes
              </Label>
              <Input
                id="attendees"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="Digite os emails separados por vírgula"
                className="mobile-input mt-2 dark:bg-gray-800 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Separe os emails com vírgula (ex: user1@email.com, user2@email.com)
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Observações
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione observações sobre o lembrete"
              className="mobile-input mt-2 min-h-[80px] resize-none dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </form>
    </MobileModal>
  );
};

export default NovoLembreteModal;
