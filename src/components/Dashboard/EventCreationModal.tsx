
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Video } from 'lucide-react';

interface EventCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onCreateEvent: (eventData: {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    event_type: 'meeting' | 'appointment' | 'reminder';
    meeting_provider?: 'google_meet' | 'zoom' | 'teams';
    meeting_link?: string;
    attendees?: any[];
    is_all_day?: boolean;
  }) => Promise<void>;
}

const EventCreationModal: React.FC<EventCreationModalProps> = ({
  isOpen,
  onClose,
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

  const getMeetingProviderLogo = (provider: string) => {
    const logoStyle = "w-8 h-8 rounded-lg";
    switch (provider) {
      case 'google_meet':
        return (
          <div className={`${logoStyle} bg-green-500 flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">GM</span>
          </div>
        );
      case 'zoom':
        return (
          <div className={`${logoStyle} bg-blue-500 flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">Z</span>
          </div>
        );
      case 'teams':
        return (
          <div className={`${logoStyle} bg-purple-600 flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">T</span>
          </div>
        );
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading) {
      console.log('Form validation failed or already loading');
      return;
    }

    console.log('Iniciando criação de evento de reunião...');
    setIsLoading(true);
    
    try {
      const startDateTime = isAllDay 
        ? selectedDate 
        : `${selectedDate}T${startTime}:00`;
      
      const endDateTime = isAllDay 
        ? selectedDate 
        : `${selectedDate}T${endTime}:00`;

      const eventData = {
        title,
        description,
        start_date: startDateTime,
        end_date: endDateTime,
        event_type: 'meeting' as const,
        meeting_provider: meetingProvider,
        is_all_day: isAllDay
      };

      console.log('Dados do evento de reunião:', eventData);
      
      await onCreateEvent(eventData);
      console.log('Evento de reunião criado com sucesso');
      
      handleClose();
    } catch (error) {
      console.error('Erro ao criar evento de reunião:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) {
      console.log('Não é possível fechar durante o carregamento');
      return;
    }
    
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setEndTime('10:00');
    setIsAllDay(false);
    setMeetingProvider('google_meet');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isLoading ? handleClose : undefined}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
            <Video className="h-5 w-5 text-[#3600FF]" />
            Agendar Reunião Online
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Título *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da reunião"
              required
              disabled={isLoading}
              className="rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Descrição
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional da reunião"
              rows={3}
              disabled={isLoading}
              className="rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Data</Label>
            <Input
              type="date"
              value={selectedDate}
              disabled
              className="rounded-xl bg-gray-50 border-gray-200 text-gray-600"
            />
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="allDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 text-[#3600FF] border-gray-300 rounded focus:ring-[#3600FF]"
            />
            <Label htmlFor="allDay" className="text-sm font-medium text-gray-700">
              Reunião de dia inteiro
            </Label>
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-sm font-medium text-gray-700">
                  Horário de Início
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isLoading}
                  className="rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-sm font-medium text-gray-700">
                  Horário de Término
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isLoading}
                  className="rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Plataforma de Reunião
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {['google_meet', 'zoom', 'teams'].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setMeetingProvider(provider as 'google_meet' | 'zoom' | 'teams')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-3 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    meetingProvider === provider
                      ? 'border-[#3600FF] bg-[#3600FF]/5 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {getMeetingProviderLogo(provider)}
                  <span className="text-xs font-medium text-gray-700">
                    {provider === 'google_meet' ? 'Google Meet' : 
                     provider === 'zoom' ? 'Zoom' : 'Teams'}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Link da reunião será gerado automaticamente após configurar as integrações
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="rounded-xl bg-[#3600FF] hover:bg-[#3600FF]/90 text-white px-6 disabled:opacity-50"
            >
              {isLoading ? 'Criando...' : 'Criar Reunião'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventCreationModal;
