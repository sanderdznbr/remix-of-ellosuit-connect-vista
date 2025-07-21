
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bell, Mail, MessageCircle, AlertCircle } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { supabase } from '@/integrations/supabase/client';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedTime?: string | null;
  onCreateEvent: (eventData: any) => Promise<void>;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  onCreateEvent
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderTime, setReminderTime] = useState(selectedTime || '09:00');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isConnected: googleConnected, loading: googleLoading, getValidAccessToken: getGoogleToken } = useGoogleCalendar();

  // Atualizar horário quando selectedTime mudar
  useEffect(() => {
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  }, [selectedTime]);

  const formatDateTimeToLocal = (date: string, time: string) => {
    const localDate = new Date(`${date}T${time}:00`);
    return localDate.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const notifications = [];
      if (notifyEmail) notifications.push('email');
      if (notifyWhatsApp) notifications.push('whatsapp');

      const notificationText = notifications.length > 0 
        ? `\n\nNotificações: ${notifications.join(', ')}`
        : '';

      const startDateTime = formatDateTimeToLocal(selectedDate, reminderTime);
      const endDateTime = formatDateTimeToLocal(selectedDate, reminderTime);

      let meetingLink = '';
      
      // Criar evento no Google Calendar se conectado (mas oculto)
      if (googleConnected) {
        try {
          console.log('🔄 Criando lembrete no Google Calendar...');
          const accessToken = await getGoogleToken();
          
          const { data, error } = await supabase.functions.invoke('google-calendar', {
            body: {
              action: 'create_event',
              eventData: {
                title,
                description: `${description}${notificationText}`,
                start_date: startDateTime,
                end_date: endDateTime,
                attendees: []
              },
              accessToken: accessToken
            }
          });

          if (error) console.error('Erro ao criar no Google Calendar:', error);
          if (data?.success && data?.meetLink) {
            meetingLink = data.meetLink;
          }
        } catch (error) {
          console.error('💥 Erro ao criar lembrete no Google Calendar:', error);
          // Não falha se o Google Calendar der erro
        }
      }

      await onCreateEvent({
        title,
        description: `${description}${notificationText}`,
        start_date: startDateTime,
        end_date: endDateTime,
        event_type: 'reminder',
        meeting_link: meetingLink,
        meeting_provider: meetingLink ? 'google_meet' : null,
        is_all_day: false
      });

      handleClose();
    } catch (error: any) {
      console.error('Erro ao criar lembrete:', error);
      setError(error.message || 'Erro inesperado ao criar lembrete');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setReminderTime(selectedTime || '09:00');
    setNotifyEmail(true);
    setNotifyWhatsApp(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
            <Bell className="h-5 w-5 text-[#3600FF]" />
            Criar Lembrete
            {googleConnected && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Sincronizado com Google
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Título *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do lembrete"
              required
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
              placeholder="Descrição opcional do lembrete"
              rows={3}
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

          <div className="space-y-2">
            <Label htmlFor="reminderTime" className="text-sm font-medium text-gray-700">
              Horário do Lembrete
            </Label>
            <Input
              id="reminderTime"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Opções de Notificação
            </Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="notifyEmail"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="w-4 h-4 text-[#3600FF] border-gray-300 rounded focus:ring-[#3600FF]"
                />
                <div className="flex items-center space-x-2 flex-1">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <Label htmlFor="notifyEmail" className="text-sm font-medium text-gray-700">
                    Notificar por Email
                  </Label>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="notifyWhatsApp"
                  checked={notifyWhatsApp}
                  onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                  className="w-4 h-4 text-[#3600FF] border-gray-300 rounded focus:ring-[#3600FF]"
                />
                <div className="flex items-center space-x-2 flex-1">
                  <MessageCircle className="h-4 w-4 text-gray-600" />
                  <Label htmlFor="notifyWhatsApp" className="text-sm font-medium text-gray-700">
                    Notificar por WhatsApp
                  </Label>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Notificações por WhatsApp requerem configuração adicional
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="rounded-xl bg-[#3600FF] hover:bg-[#3600FF]/90 text-white px-6"
            >
              {isLoading ? 'Criando...' : 'Criar Lembrete'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderModal;
