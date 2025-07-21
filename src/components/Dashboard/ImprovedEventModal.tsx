
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useZoomIntegration } from '@/hooks/useZoomIntegration';
import { supabase } from '@/integrations/supabase/client';
import { Video, Calendar, Users, Clock, Settings, Palette } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ColorPicker from './ColorPicker';

interface ImprovedEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  selectedRange?: { start: string; end: string } | null;
  onCreateEvent: (eventData: any) => Promise<void>;
  onNavigateToSettings?: () => void;
}

const ImprovedEventModal = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  selectedRange,
  onCreateEvent,
  onNavigateToSettings 
}: ImprovedEventModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [attendees, setAttendees] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedMeetingProvider, setSelectedMeetingProvider] = useState<'google_meet' | 'zoom' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3600FF');

  const { toast } = useToast();
  const { isConnected: isGoogleConnected, createGoogleMeetEvent } = useGoogleCalendar();
  const { isConnected: isZoomConnected, getValidAccessToken } = useZoomIntegration();

  useEffect(() => {
    if (selectedDate) {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }

    // Se há um range selecionado (arrastar), usar essas datas
    if (selectedRange) {
      const startDateTime = new Date(selectedRange.start);
      const endDateTime = new Date(selectedRange.end);
      
      setStartDate(startDateTime.toISOString().split('T')[0]);
      setStartTime(startDateTime.toTimeString().slice(0, 5));
      setEndDate(endDateTime.toISOString().split('T')[0]);
      setEndTime(endDateTime.toTimeString().slice(0, 5));
      setIsAllDay(false);
    } else if (selectedDate && !startTime) {
      // Se não há range, definir horários padrão
      setStartTime('09:00');
      setEndTime('10:00');
    }
  }, [selectedDate, selectedRange]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setAttendees('');
    setIsAllDay(false);
    setSelectedMeetingProvider(null);
    setSelectedColor('#3600FF');
  };

  const createZoomMeeting = async (eventData: any) => {
    try {
      const accessToken = await getValidAccessToken();
      
      const { data, error } = await supabase.functions.invoke('zoom-integration', {
        body: {
          action: 'create_meeting',
          accessToken: accessToken,
          eventData: eventData
        }
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        meetingLink: data.meetingLink,
        meetingId: data.meetingId
      };
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      throw error;
    }
  };

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

    setIsLoading(true);

    try {
      let finalStartDate, finalEndDate;

      if (isAllDay) {
        finalStartDate = new Date(startDate + 'T00:00:00').toISOString();
        finalEndDate = new Date(endDate + 'T23:59:59').toISOString();
      } else {
        finalStartDate = new Date(startDate + 'T' + startTime).toISOString();
        finalEndDate = new Date(endDate + 'T' + endTime).toISOString();
      }

      const attendeesList = attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      let meetingLink = '';
      let googleEventId = '';
      let finalMeetingProvider = '';

      // Criar reunião conforme o provedor selecionado
      if (selectedMeetingProvider === 'google_meet' && isGoogleConnected) {
        try {
          const googleResult = await createGoogleMeetEvent({
            title,
            description,
            start_date: finalStartDate,
            end_date: finalEndDate,
            attendees: attendeesList
          });

          if (googleResult.success) {
            meetingLink = googleResult.meetLink;
            googleEventId = googleResult.googleEventId;
            finalMeetingProvider = 'google_meet';
          }
        } catch (error) {
          console.error('Error creating Google Meet event:', error);
          toast({
            title: "Aviso",
            description: "Evento criado, mas falha ao gerar link do Google Meet",
            variant: "destructive"
          });
        }
      } else if (selectedMeetingProvider === 'zoom' && isZoomConnected) {
        try {
          const zoomResult = await createZoomMeeting({
            title,
            description,
            start_date: finalStartDate,
            end_date: finalEndDate,
            attendees: attendeesList
          });

          if (zoomResult.success) {
            meetingLink = zoomResult.meetingLink;
            finalMeetingProvider = 'zoom';
          }
        } catch (error) {
          console.error('Error creating Zoom meeting:', error);
          toast({
            title: "Aviso",
            description: "Evento criado, mas falha ao gerar link do Zoom",
            variant: "destructive"
          });
        }
      }

      const eventData = {
        title,
        description,
        start_date: finalStartDate,
        end_date: finalEndDate,
        event_type: 'meeting' as const,
        attendees: attendeesList,
        is_all_day: isAllDay,
        meeting_link: meetingLink,
        meeting_provider: finalMeetingProvider,
        google_event_id: googleEventId || undefined,
        color: selectedColor
      };

      await onCreateEvent(eventData);
      
      toast({
        title: "Sucesso",
        description: "Reunião criada com sucesso!"
      });
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar reunião",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Video className="h-5 w-5 text-[#3600FF]" />
            Nova Reunião
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Reunião *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Digite o título da reunião"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Adicione uma descrição (opcional)"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allDay"
                  checked={isAllDay}
                  onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
                />
                <Label htmlFor="allDay" className="text-sm">Evento de dia inteiro</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                
                {!isAllDay && (
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Hora de Início</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Término</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
                
                {!isAllDay && (
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Hora de Término</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="attendees">Participantes</Label>
                <Input
                  id="attendees"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  placeholder="email1@exemplo.com, email2@exemplo.com"
                />
                <p className="text-xs text-gray-500">Separe múltiplos emails com vírgula</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Cor do Evento
                </Label>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-gray-300 cursor-pointer"
                    style={{ backgroundColor: selectedColor }}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  >
                    Escolher Cor
                  </Button>
                </div>
                {showColorPicker && (
                  <ColorPicker
                    selectedColor={selectedColor}
                    onColorChange={setSelectedColor}
                    onClose={() => setShowColorPicker(false)}
                  />
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de Reunião</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  {isGoogleConnected && (
                    <Button
                      type="button"
                      variant={selectedMeetingProvider === 'google_meet' ? 'default' : 'outline'}
                      onClick={() => setSelectedMeetingProvider(selectedMeetingProvider === 'google_meet' ? null : 'google_meet')}
                      className="h-20 p-4 flex items-center justify-center"
                    >
                      <svg 
                        width="60" 
                        height="40" 
                        viewBox="0 0 80 66" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="object-contain"
                      >
                        <path d="M61 45.9759V43.6468V40.4303V25.2907V22.0742L63.4783 16.9167L75.8696 7.10092C77.5217 5.71452 80 6.87912 80 9.04192V55.9581C80 58.1209 77.4667 59.2855 75.8145 57.8991L61 45.9759Z" fill="#00AC47"/>
                        <path d="M20 0L0 20H20V0Z" fill="#EA4335"/>
                        <path d="M20 20H0V46H20V20Z" fill="#2684FC"/>
                        <path d="M0 46V59.3333C0 63 3 66 6.6667 66H20V46H0Z" fill="#0066DA"/>
                        <path d="M63.5 6.5902C63.5 2.9656 60.5638 0 56.975 0H43.925H20V20H44.5V33L63.5 32.4016V6.5902Z" fill="#FFBA00"/>
                        <path d="M44.5 46H20V66H43.925H56.975C60.5638 66 63.5 63.0387 63.5 59.4194V33H44.5V46Z" fill="#00AC47"/>
                        <path d="M63.5 17V48L44.5 33L63.5 17Z" fill="#00832D"/>
                      </svg>
                    </Button>
                  )}
                  
                  {isZoomConnected && (
                    <Button
                      type="button"
                      variant={selectedMeetingProvider === 'zoom' ? 'default' : 'outline'}
                      onClick={() => setSelectedMeetingProvider(selectedMeetingProvider === 'zoom' ? null : 'zoom')}
                      className="h-20 p-4 flex items-center justify-center"
                    >
                      <img 
                        src="https://freelogopng.com/images/all_img/1685422532zoom-logo-png.png" 
                        alt="Zoom"
                        className="w-12 h-8 object-contain"
                      />
                    </Button>
                  )}
                </div>

                {(!isGoogleConnected && !isZoomConnected) && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700 mb-2">
                      Conecte Google Meet ou Zoom para criar links de reunião automaticamente
                    </p>
                    {onNavigateToSettings && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onNavigateToSettings();
                          onClose();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Configurar Integrações
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-[#3600FF] to-[#4F46E5]"
            >
              {isLoading ? 'Criando...' : 'Criar Reunião'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovedEventModal;
