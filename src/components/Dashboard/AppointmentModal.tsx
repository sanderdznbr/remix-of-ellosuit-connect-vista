
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, User, ExternalLink, AlertCircle } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { supabase } from '@/integrations/supabase/client';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedTime?: string | null;
  onCreateEvent: (eventData: any) => Promise<void>;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  onCreateEvent
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(selectedTime || '09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [locationPreset, setLocationPreset] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isConnected: googleConnected, loading: googleLoading, connectGoogle, getValidAccessToken: getGoogleToken } = useGoogleCalendar();

  const locationPresets = [
    { value: 'casa', label: 'Casa' },
    { value: 'escritorio', label: 'Escritório' },
    { value: 'custom', label: 'Outro local...' }
  ];

  // Atualizar horário quando selectedTime mudar
  useEffect(() => {
    if (selectedTime) {
      setStartTime(selectedTime);
      // Calcular horário de término automaticamente (1 hora depois)
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const endHour = hours + 1;
      setEndTime(`${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }
  }, [selectedTime]);

  const formatDateTimeToLocal = (date: string, time: string) => {
    // Criar datetime com timezone brasileiro explícito
    const dateTimeStr = `${date}T${time}:00-03:00`;
    return dateTimeStr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const finalLocation = locationPreset === 'custom' ? location : 
                          locationPreset === 'casa' ? 'Casa' :
                          locationPreset === 'escritorio' ? 'Escritório' : location;

      const startDateTime = formatDateTimeToLocal(selectedDate, startTime);
      const endDateTime = formatDateTimeToLocal(selectedDate, endTime);

      let meetingLink = '';
      
      // Criar evento no Google Calendar se conectado (mas oculto)
      if (googleConnected) {
        try {
          console.log('🔄 Criando compromisso no Google Calendar...');
          const accessToken = await getGoogleToken();
          
          const { data, error } = await supabase.functions.invoke('google-calendar', {
            body: {
              action: 'create_event',
              eventData: {
                title,
                description: `${description}${contactPerson ? `\n\nContato: ${contactPerson}` : ''}${finalLocation ? `\nLocal: ${finalLocation}` : ''}`,
                start_date: startDateTime,
                end_date: endDateTime,
                attendees: contactPerson ? [{ email: contactPerson }] : []
              },
              accessToken: accessToken
            }
          });

          if (error) console.error('Erro ao criar no Google Calendar:', error);
          if (data?.success && data?.meetLink) {
            meetingLink = data.meetLink;
          }
        } catch (error) {
          console.error('💥 Erro ao criar compromisso no Google Calendar:', error);
          // Não falha se o Google Calendar der erro
        }
      }

      await onCreateEvent({
        title,
        description: `${description}${contactPerson ? `\n\nContato: ${contactPerson}` : ''}${finalLocation ? `\nLocal: ${finalLocation}` : ''}`,
        start_date: startDateTime,
        end_date: endDateTime,
        event_type: 'appointment',
        meeting_link: meetingLink,
        meeting_provider: meetingLink ? 'google_meet' : null,
        is_all_day: false
      });

      handleClose();
    } catch (error: any) {
      console.error('Erro ao criar compromisso:', error);
      setError(error.message || 'Erro inesperado ao criar compromisso');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setStartTime(selectedTime || '09:00');
    setEndTime('10:00');
    setLocation('');
    setLocationPreset('');
    setContactPerson('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
            <Calendar className="h-5 w-5 text-[#3600FF]" />
            Agendar Compromisso
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
              placeholder="Digite o título do compromisso"
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
              placeholder="Descrição opcional do compromisso"
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
                className="rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Local do Compromisso
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {locationPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setLocationPreset(preset.value)}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
                    locationPreset === preset.value
                      ? 'border-[#3600FF] bg-[#3600FF]/5 text-[#3600FF]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {locationPreset === 'custom' && (
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Digite o endereço do compromisso"
                className="rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4" />
              Com quem
            </Label>
            <Input
              id="contact"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Nome ou email da pessoa"
              className="rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
            />
          </div>

          {!googleConnected && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm font-medium">Google Calendar desconectado</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={connectGoogle}
                  disabled={googleLoading || isLoading}
                  className="h-8 px-3 text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {googleLoading ? 'Conectando...' : 'Conectar'}
                </Button>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Conecte para sincronizar automaticamente com seu Google Calendar
              </p>
            </div>
          )}

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
              {isLoading ? 'Criando...' : 'Criar Compromisso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentModal;
