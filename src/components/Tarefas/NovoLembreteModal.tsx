
import React, { useState } from 'react';
import { Clock, Calendar, MapPin, Video, Bell, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { cn } from '@/lib/utils';
import { formatBrazilDate } from '@/utils/date-server';
import MobileModal from '@/components/ui/mobile-modal';

interface NovoLembreteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTarefa: (tarefaData: any) => Promise<void>;
}

type EventType = 'reminder' | 'meeting' | 'appointment';

const NovoLembreteModal: React.FC<NovoLembreteModalProps> = ({
  isOpen,
  onClose,
  onCreateTarefa
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [eventType, setEventType] = useState<EventType>('reminder');
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { isConnected: isGoogleConnected, createGoogleMeetEvent } = useGoogleCalendar();

  const eventTypes = [
    {
      type: 'reminder' as const,
      label: 'Lembrete',
      icon: Bell,
      color: 'bg-orange-500',
      description: 'Lembrete simples com notificação'
    },
    {
      type: 'meeting' as const,
      label: 'Reunião',
      icon: Video,
      color: 'bg-blue-500',
      description: 'Reunião online com Google Meet'
    },
    {
      type: 'appointment' as const,
      label: 'Compromisso',
      icon: MapPin,
      color: 'bg-green-500',
      description: 'Compromisso presencial com endereço'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!date || !time) {
      toast({
        title: "Erro",
        description: "Data e horário são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (eventType === 'meeting' && !isGoogleConnected) {
      toast({
        title: "Erro",
        description: "Conecte-se ao Google Meet para criar reuniões",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const startDateTime = new Date(`${date}T${time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hora depois
      
      let finalDescription = description;
      let meetingLink = '';
      let googleEventId = '';

      // Adicionar localização à descrição para compromissos
      if (eventType === 'appointment' && location.trim()) {
        finalDescription = `${description}\n\n📍 Local: ${location.trim()}`;
      }

      // Adicionar participantes à descrição
      if (attendees.trim()) {
        const attendeesList = attendees.split(',').map(email => email.trim()).filter(email => email);
        finalDescription = `${finalDescription}\n\n👥 Participantes: ${attendeesList.join(', ')}`;
      }

      // Criar reunião no Google Meet se for do tipo meeting
      if (eventType === 'meeting' && isGoogleConnected) {
        try {
          const attendeesList = attendees
            .split(',')
            .map(email => email.trim())
            .filter(email => email && email.includes('@'));

          const googleResult = await createGoogleMeetEvent({
            title,
            description: finalDescription,
            start_date: startDateTime.toISOString(),
            end_date: endDateTime.toISOString(),
            attendees: attendeesList
          });

          if (googleResult.success) {
            meetingLink = googleResult.meetLink;
            googleEventId = googleResult.googleEventId;
            finalDescription = `${finalDescription}\n\n💻 Link da reunião: ${meetingLink}`;
          }
        } catch (error) {
          console.error('Erro ao criar Google Meet:', error);
          toast({
            title: "Aviso",
            description: "Evento criado, mas falha ao gerar link do Google Meet",
            variant: "destructive"
          });
        }
      }

      const tarefaData = {
        title,
        description: finalDescription,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        event_type: eventType,
        meeting_link: meetingLink || undefined,
        meeting_provider: meetingLink ? 'google_meet' : undefined,
        google_event_id: googleEventId || undefined,
        attendees: attendees ? attendees.split(',').map(email => email.trim()).filter(email => email) : [],
        is_all_day: false,
        color: eventType === 'meeting' ? '#3B82F6' : eventType === 'appointment' ? '#10B981' : '#F59E0B'
      };

      await onCreateTarefa(tarefaData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setLocation('');
      setAttendees('');
      setEventType('reminder');
      
      onClose();
    } catch (error) {
      console.error('Erro ao criar lembrete:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar lembrete",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Novo Lembrete
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Tipo de Evento */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo de Evento
          </Label>
          <div className="grid grid-cols-1 gap-3">
            {eventTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setEventType(type.type)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    eventType === type.type
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", type.color)}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {type.label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aviso para reunião sem Google Meet */}
        {eventType === 'meeting' && !isGoogleConnected && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Conecte-se ao Google Meet nas configurações para criar reuniões automaticamente
              </p>
            </div>
          </div>
        )}

        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Título *
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite o título do lembrete"
            className="mobile-input"
            required
          />
        </div>

        {/* Data e Horário */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Data *
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mobile-input"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Horário *
            </Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mobile-input"
              required
            />
          </div>
        </div>

        {/* Localização - apenas para compromissos */}
        {eventType === 'appointment' && (
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Endereço
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Digite o endereço do compromisso"
              className="mobile-input"
            />
          </div>
        )}

        {/* Participantes - para reuniões e compromissos */}
        {(eventType === 'meeting' || eventType === 'appointment') && (
          <div className="space-y-2">
            <Label htmlFor="attendees" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Participantes
            </Label>
            <Input
              id="attendees"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="email1@exemplo.com, email2@exemplo.com"
              className="mobile-input"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Separe múltiplos emails com vírgula
            </p>
          </div>
        )}

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Observações
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Adicione observações (opcional)"
            className="mobile-input min-h-[80px] resize-none"
            rows={3}
          />
        </div>

        {/* Botões */}
        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? 'Criando...' : 'Criar Lembrete'}
          </Button>
        </div>
      </form>
    </MobileModal>
  );
};

export default NovoLembreteModal;
