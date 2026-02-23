import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Video, Calendar, Users, Clock, Palette, Link2, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ColorPicker from './ColorPicker';
import RecurrenceSelector, { RecurrenceConfig } from './RecurrenceSelector';
import { APP_CONFIG } from '@/config/app';

interface ImprovedEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  selectedRange?: { start: string; end: string } | null;
  onCreateEvent: (eventData: any, recurrence?: RecurrenceConfig) => Promise<void>;
  onNavigateToSettings?: () => void;
}

const defaultRecurrence: RecurrenceConfig = {
  enabled: false,
  frequency: 'weekly',
  interval: 1,
  daysOfWeek: [],
  endType: 'after',
  occurrences: 10,
  endDate: ''
};

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
  const [createMeetingLink, setCreateMeetingLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3600FF');
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>(defaultRecurrence);

  const { toast } = useToast();

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
    setCreateMeetingLink(false);
    setSelectedColor('#3600FF');
    setRecurrence(defaultRecurrence);
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
      let finalMeetingProvider: 'google_meet' | 'zoom' | 'teams' | 'ellosuit' | null = null;

      // Create Ellomeeting room if requested
      if (createMeetingLink) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data: companyUser } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!companyUser) throw new Error('Empresa não encontrada');

        const roomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        const { error: roomError } = await supabase
          .from('meeting_rooms')
          .insert({
            title: title,
            room_code: roomCode,
            max_participants: 50,
            recording_enabled: false,
            chat_enabled: true,
            screen_sharing_enabled: true,
            company_id: companyUser.company_id,
            created_by: user.id,
          });

        if (roomError) {
          console.error('Error creating meeting room:', roomError);
          toast({
            title: "Erro",
            description: "Falha ao criar sala de reunião: " + roomError.message,
            variant: "destructive"
          });
        } else {
          meetingLink = APP_CONFIG.getMeetingUrl(roomCode);
          finalMeetingProvider = 'ellosuit';
          console.log('✅ Ellomeeting room created:', roomCode, meetingLink);
        }
      }

      const eventData = {
        title,
        description: createMeetingLink && meetingLink 
          ? `${description}\n\nLink da reunião: ${meetingLink}`.trim()
          : description,
        start_date: finalStartDate,
        end_date: finalEndDate,
        event_type: 'meeting' as const,
        attendees: attendeesList,
        is_all_day: isAllDay,
        meeting_link: meetingLink || undefined,
        meeting_provider: finalMeetingProvider || undefined,
        color: selectedColor
      };

      // Passar recorrência se estiver ativada
      await onCreateEvent(eventData, recurrence.enabled ? recurrence : undefined);
      
      toast({
        title: "Sucesso",
        description: recurrence.enabled 
          ? "Eventos recorrentes criados com sucesso!"
          : "Reunião criada com sucesso!"
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
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link de Reunião
                </Label>
                
                <Button
                  type="button"
                  variant={createMeetingLink ? 'default' : 'outline'}
                  onClick={() => setCreateMeetingLink(!createMeetingLink)}
                  className={`w-full h-12 flex items-center justify-center gap-2 ${createMeetingLink ? 'bg-gradient-to-r from-[#3600FF] to-[#4F46E5]' : ''}`}
                >
                  <Video className="h-4 w-4" />
                  {createMeetingLink ? 'Link Ellomeeting será criado ✓' : 'Criar link de reunião Ellomeeting'}
                </Button>
                {createMeetingLink && (
                  <p className="text-xs text-muted-foreground">
                    Um link Ellomeeting será gerado automaticamente ao criar o evento
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Seção de Recorrência */}
          <div className="col-span-2">
            <RecurrenceSelector
              config={recurrence}
              onChange={setRecurrence}
            />
          </div>

          <div className="col-span-2 flex gap-3 pt-4">
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
