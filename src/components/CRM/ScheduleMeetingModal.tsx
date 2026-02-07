import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, Clock, Link, Copy, Check } from 'lucide-react';
import APP_CONFIG from '@/config/app';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
  contactPhone?: string;
  onMeetingScheduled?: (meetingLink: string, scheduledTime: string) => void;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  contactName,
  contactPhone,
  onMeetingScheduled
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [meetingTitle, setMeetingTitle] = useState(`Reunião com ${contactName || 'Contato'}`);
  const [duration, setDuration] = useState('30');
  const [loading, setLoading] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<{ link: string; dateTime: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate time slots
  const timeSlots = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  const handleSchedule = async () => {
    if (!selectedDate || !user) return;
    
    setLoading(true);
    try {
      // Get company ID
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (!companyUser) {
        throw new Error('Empresa não encontrada');
      }

      // Create meeting room
      const roomCode = Math.random().toString(36).substring(2, 12).toUpperCase();
      
      const { data: room, error: roomError } = await supabase
        .from('meeting_rooms')
        .insert({
          title: meetingTitle,
          room_code: roomCode,
          max_participants: 50,
          recording_enabled: false,
          chat_enabled: true,
          screen_sharing_enabled: true,
          company_id: companyUser.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Create calendar event
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + parseInt(duration));

      const meetingLink = APP_CONFIG.getMeetingUrl(roomCode);

      const { error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          title: meetingTitle,
          description: `Reunião agendada via WhatsApp CRM\nContato: ${contactName || 'N/A'}\nTelefone: ${contactPhone || 'N/A'}\n\nLink: ${meetingLink}`,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          event_type: 'meeting' as const,
          meeting_link: meetingLink,
          company_id: companyUser.company_id,
          created_by: user.id,
          color: '#FF4500'
        });

      if (eventError) throw eventError;

      const formattedDateTime = startDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });

      setCreatedMeeting({
        link: meetingLink,
        dateTime: formattedDateTime
      });

      toast({
        title: 'Reunião agendada!',
        description: `${meetingTitle} - ${formattedDateTime}`
      });

      if (onMeetingScheduled) {
        onMeetingScheduled(meetingLink, formattedDateTime);
      }

    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível agendar a reunião',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copiado!' });
  };

  const handleClose = () => {
    setCreatedMeeting(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#FF4500]" />
            Agendar Reunião
          </DialogTitle>
        </DialogHeader>

        {createdMeeting ? (
          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                <Check className="h-5 w-5" />
                <span className="font-medium">Reunião agendada com sucesso!</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-300">
                {createdMeeting.dateTime}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Link da reunião</Label>
              <div className="flex gap-2">
                <Input 
                  value={createdMeeting.link} 
                  readOnly 
                  className="flex-1 text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(createdMeeting.link)}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 Cole este link no chat para enviar ao contato
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="bg-[#FF4500] hover:bg-[#FF4500]/90">
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título da reunião</Label>
              <Input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Ex: Reunião de alinhamento"
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horário
                </Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duração</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSchedule} 
                disabled={loading || !selectedDate}
                className="bg-[#FF4500] hover:bg-[#FF4500]/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Agendar e Gerar Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleMeetingModal;
