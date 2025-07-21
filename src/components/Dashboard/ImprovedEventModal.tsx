import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, ExternalLink, AlertCircle, User, Clock } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useZoomIntegration } from '@/hooks/useZoomIntegration';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ImprovedEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  selectedTime?: string | null;
  onCreateEvent: (eventData: {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    event_type: 'meeting' | 'appointment' | 'reminder';
    meeting_provider?: 'google_meet' | 'zoom';
    meeting_link?: string;
    attendees?: any[];
    is_all_day?: boolean;
  }) => Promise<void>;
  onNavigateToSettings?: () => void;
}

const ImprovedEventModal: React.FC<ImprovedEventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  onCreateEvent,
  onNavigateToSettings
}) => {
  console.log('🎯 ImprovedEventModal renderizando com isOpen:', isOpen);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(selectedTime || '09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [meetingProvider, setMeetingProvider] = useState<'google_meet' | 'zoom'>('google_meet');
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('none');
  const [manualEmail, setManualEmail] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isConnected: googleConnected, loading: googleLoading, connectGoogle, getValidAccessToken: getGoogleToken } = useGoogleCalendar();
  const { isConnected: zoomConnected, loading: zoomLoading, connectZoom, getValidAccessToken: getZoomToken } = useZoomIntegration();
  const { user } = useAuth();

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

  const loadClients = async () => {
    if (!user) return;
    
    setClientsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email')
        .not('email', 'is', null)
        .order('name');

      if (error) {
        console.error('Erro ao carregar clientes:', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setClientsLoading(false);
    }
  };

  const formatDateTimeToLocal = (date: string, time: string) => {
    // Criar data no timezone local do Brasil
    const localDate = new Date(`${date}T${time}:00`);
    console.log('🕒 Formatando datetime local:', { date, time, localDate });
    return localDate.toISOString();
  };

  const getMeetingProviderLogo = (provider: string) => {
    const logoStyle = "w-6 h-6 rounded-md";
    switch (provider) {
      case 'google_meet':
        return (
          <div className={`${logoStyle} bg-green-500 flex items-center justify-center`}>
            <span className="text-white font-bold text-xs">GM</span>
          </div>
        );
      case 'zoom':
        return (
          <div className={`${logoStyle} bg-blue-500 flex items-center justify-center`}>
            <span className="text-white font-bold text-xs">Z</span>
          </div>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadClients();
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading || !selectedDate) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const startDateTime = isAllDay 
        ? selectedDate 
        : formatDateTimeToLocal(selectedDate, startTime);
      
      const endDateTime = isAllDay 
        ? selectedDate 
        : formatDateTimeToLocal(selectedDate, endTime);

      let meetingLink = '';
      let attendees: any[] = [];

      // Preparar lista de participantes
      if (selectedClient && selectedClient !== 'none') {
        const client = clients.find(c => c.id === selectedClient);
        if (client) {
          attendees.push({ email: client.email, displayName: client.name });
        }
      } else if (manualEmail) {
        attendees.push({ email: manualEmail });
      }

      // Criar meeting baseado no provider selecionado
      if (meetingProvider === 'google_meet' && googleConnected) {
        try {
          console.log('🔄 Criando evento no Google Calendar...');
          const accessToken = await getGoogleToken();
          
          const { data, error } = await supabase.functions.invoke('google-calendar', {
            body: {
              action: 'create_event',
              eventData: {
                title,
                description,
                start_date: startDateTime,
                end_date: endDateTime,
                attendees
              },
              accessToken: accessToken
            }
          });

          if (error) throw new Error(`Erro da edge function: ${error.message}`);
          if (data?.success && data?.meetLink) {
            meetingLink = data.meetLink;
          }
        } catch (error) {
          console.error('💥 Erro ao criar evento no Google Calendar:', error);
          throw error;
        }
      } else if (meetingProvider === 'zoom' && zoomConnected) {
        try {
          console.log('🔄 Criando reunião no Zoom...');
          const accessToken = await getZoomToken();
          
          const { data, error } = await supabase.functions.invoke('zoom-integration', {
            body: {
              action: 'create_meeting',
              eventData: {
                title,
                description,
                start_date: startDateTime,
                end_date: endDateTime
              },
              accessToken: accessToken
            }
          });

          if (error) throw new Error(`Erro ao criar reunião Zoom: ${error.message}`);
          if (data?.success && data?.meetingLink) {
            meetingLink = data.meetingLink;
          }
        } catch (error) {
          console.error('💥 Erro ao criar reunião no Zoom:', error);
          throw error;
        }
      }

      const eventData = {
        title,
        description,
        start_date: startDateTime,
        end_date: endDateTime,
        event_type: 'meeting' as const,
        meeting_provider: meetingProvider,
        meeting_link: meetingLink,
        attendees,
        is_all_day: isAllDay
      };

      await onCreateEvent(eventData);
      handleClose();
    } catch (error: any) {
      console.error('💥 Erro ao criar evento de reunião:', error);
      setError(error.message || 'Erro inesperado ao criar reunião');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    
    setTitle('');
    setDescription('');
    setStartTime(selectedTime || '09:00');
    setEndTime('10:00');
    setIsAllDay(false);
    setMeetingProvider('google_meet');
    setSelectedClient('none');
    setManualEmail('');
    setError(null);
    onClose();
  };

  const getConnectionStatus = () => {
    switch (meetingProvider) {
      case 'google_meet':
        return { connected: googleConnected, loading: googleLoading, connect: connectGoogle };
      case 'zoom':
        return { connected: zoomConnected, loading: zoomLoading, connect: connectZoom };
      default:
        return { connected: false, loading: false, connect: () => {} };
    }
  };

  if (!isOpen) return null;

  const { connected, loading, connect } = getConnectionStatus();

  return (
    <Dialog open={isOpen} onOpenChange={!isLoading ? handleClose : undefined}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="p-8 pb-6 border-b border-gray-100">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
              <Video className="h-6 w-6 text-primary" />
              Agendar Reunião Online
            </DialogTitle>
          </DialogHeader>
        
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Coluna Esquerda */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">
                        Título *
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Digite o título da reunião"
                        required
                        disabled={isLoading}
                        className="rounded-xl h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descrição opcional da reunião"
                        rows={3}
                        disabled={isLoading}
                        className="rounded-xl resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Data</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        disabled
                        className="rounded-xl bg-muted h-12"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-xl">
                        <input
                          type="checkbox"
                          id="allDay"
                          checked={isAllDay}
                          onChange={(e) => setIsAllDay(e.target.checked)}
                          disabled={isLoading}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <Label htmlFor="allDay" className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Reunião de dia inteiro
                        </Label>
                      </div>

                      {!isAllDay && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startTime" className="text-sm font-medium">
                              Início
                            </Label>
                            <Input
                              id="startTime"
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              disabled={isLoading}
                              className="rounded-xl h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endTime" className="text-sm font-medium">
                              Término
                            </Label>
                            <Input
                              id="endTime"
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              disabled={isLoading}
                              className="rounded-xl h-12"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coluna Direita */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Participantes
                      </Label>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Selecionar Cliente
                          </Label>
                          <Select value={selectedClient} onValueChange={setSelectedClient} disabled={isLoading || clientsLoading}>
                            <SelectTrigger className="rounded-xl h-12">
                              <SelectValue placeholder={clientsLoading ? "Carregando..." : "Escolha um cliente"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum cliente</SelectItem>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name} ({client.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="text-center text-xs text-muted-foreground">ou</div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Email Manual
                          </Label>
                          <Input
                            type="email"
                            value={manualEmail}
                            onChange={(e) => setManualEmail(e.target.value)}
                            placeholder="email@exemplo.com"
                            disabled={isLoading || (selectedClient !== '' && selectedClient !== 'none')}
                            className="rounded-xl h-12"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-sm font-medium">
                        Plataforma de Reunião
                      </Label>
                      
                      <div className={`p-4 rounded-xl border-2 ${
                        connected 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              connected ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></div>
                            <span className="text-sm font-medium">
                              {connected ? 'Conectado' : 'Desconectado'}
                            </span>
                          </div>
                          {!connected && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={connect}
                              disabled={loading || isLoading}
                              className="h-8 px-3 text-xs"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {loading ? 'Conectando...' : 'Conectar'}
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {connected ? '✅ Links de reunião serão criados automaticamente' : 
                           '⚠️ Conecte para gerar links automaticamente'}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {['google_meet', 'zoom'].map((provider) => (
                          <button
                            key={provider}
                            type="button"
                            disabled={isLoading}
                            onClick={() => setMeetingProvider(provider as 'google_meet' | 'zoom')}
                            className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-3 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                              meetingProvider === provider
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-muted-foreground'
                            }`}
                          >
                            {getMeetingProviderLogo(provider)}
                            <span className="text-sm font-medium">
                              {provider === 'google_meet' ? 'Meet' : 'Zoom'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-8 pt-6 border-t border-gray-100 bg-gray-50/50">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-xl px-6 h-12"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              onClick={handleSubmit}
              className="rounded-xl px-8 h-12"
            >
              {isLoading ? 'Criando...' : 'Criar Reunião'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovedEventModal;
