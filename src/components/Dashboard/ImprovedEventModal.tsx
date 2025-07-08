import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, ExternalLink, AlertCircle, User, Clock } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
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

const ImprovedEventModal: React.FC<ImprovedEventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onCreateEvent
}) => {
  console.log('🎯 ImprovedEventModal renderizando com isOpen:', isOpen);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [meetingProvider, setMeetingProvider] = useState<'google_meet' | 'zoom' | 'teams'>('google_meet');
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('none');
  const [manualEmail, setManualEmail] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { isConnected, loading: googleLoading, connectGoogle, getValidAccessToken } = useGoogleCalendar();
  const { user } = useAuth();
  
  console.log('🔍 Estado dos hooks:', { isConnected, googleLoading, user: !!user });

  // Carregar clientes
  useEffect(() => {
    if (isOpen && user) {
      loadClients();
    }
  }, [isOpen, user]);

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
    // Criar datetime no formato correto para timezone brasileiro
    const dateTimeStr = `${date}T${time}:00`;
    console.log('🕒 Formatando datetime:', { date, time, dateTimeStr });
    
    // Retornar no formato que a edge function espera
    return dateTimeStr;
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
      case 'teams':
        return (
          <div className={`${logoStyle} bg-purple-600 flex items-center justify-center`}>
            <span className="text-white font-bold text-xs">T</span>
          </div>
        );
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Validações preventivas
      if (meetingProvider === 'google_meet' && isConnected && !user) {
        throw new Error('Usuário não autenticado');
      }
      // Usar formatação correta de data/hora
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

      // Se Google Meet está selecionado e usuário está conectado
      if (meetingProvider === 'google_meet' && isConnected) {
        try {
          console.log('🔄 Criando evento no Google Calendar...', {
            title,
            startDateTime,
            endDateTime,
            attendees
          });
          
          const accessToken = await getValidAccessToken();
          console.log('🔑 Token obtido:', accessToken ? 'SIM' : 'NÃO');
          
          if (!accessToken) {
            throw new Error('Não foi possível obter access token válido');
          }
          
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

          console.log('📡 Resposta da edge function:', { data, error });

          if (error) {
            console.error('❌ Erro ao criar evento Google:', error);
            throw new Error(`Erro da edge function: ${error.message}`);
          }
          
          if (data?.success && data?.meetLink) {
            meetingLink = data.meetLink;
            console.log('✅ Link do Meet criado:', meetingLink);
          } else if (data?.success) {
            console.warn('⚠️ Evento criado mas sem link do Meet na resposta');
          } else {
            throw new Error('Resposta inválida da edge function');
          }
        } catch (error) {
          console.error('💥 Erro ao criar evento no Google Calendar:', error);
          throw error; // Re-throw para o usuário ver o erro
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
      
      let errorMessage = 'Erro inesperado ao criar reunião';
      
      if (error.message?.includes('Não foi possível obter access token')) {
        errorMessage = 'Erro de autenticação. Reconecte o Google Calendar e tente novamente.';
      } else if (error.message?.includes('edge function')) {
        errorMessage = 'Erro no servidor. Tente novamente em alguns momentos.';
      } else if (error.message?.includes('Usuário não autenticado')) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setEndTime('10:00');
    setIsAllDay(false);
    setMeetingProvider('google_meet');
    setSelectedClient('none');
    setManualEmail('');
    setError(null);
    setRetryCount(0);
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  console.log('🔍 Verificando se deve renderizar modal:', { isOpen, title, showEventModal: isOpen });

  if (!isOpen) {
    console.log('❌ Modal não deve ser renderizado - isOpen é false');
    return null;
  }

  console.log('✅ Iniciando renderização do modal');

  // Fallback de emergência - se algo quebrar, sempre renderizar algo
  try {
    return (
      <Dialog open={isOpen} onOpenChange={!isLoading ? handleClose : undefined}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
              <Video className="h-5 w-5 text-primary" />
              Agendar Reunião Online
            </DialogTitle>
          </DialogHeader>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="h-7 px-3 text-xs"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
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
                  className="rounded-xl"
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
                  className="rounded-xl bg-muted"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-xl">
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
                  <div className="grid grid-cols-2 gap-3">
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
                        className="rounded-xl"
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
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Participantes
                </Label>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Selecionar Cliente
                    </Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient} disabled={isLoading || clientsLoading}>
                      <SelectTrigger className="rounded-xl">
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
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Plataforma de Reunião
                </Label>
                
                {meetingProvider === 'google_meet' && (
                  <div className={`p-3 rounded-xl border-2 ${
                    isConnected 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          isConnected ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className="text-xs font-medium">
                          {isConnected ? 'Conectado' : 'Desconectado'}
                        </span>
                      </div>
                      {!isConnected && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={connectGoogle}
                          disabled={googleLoading || isLoading}
                          className="h-7 px-3 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {googleLoading ? 'Conectando...' : 'Conectar'}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isConnected ? '✅ Links do Meet serão criados automaticamente' : 
                       '⚠️ Conecte para gerar links automaticamente'}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-2">
                  {['google_meet', 'zoom', 'teams'].map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setMeetingProvider(provider as 'google_meet' | 'zoom' | 'teams')}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        meetingProvider === provider
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      {getMeetingProviderLogo(provider)}
                      <span className="text-xs font-medium">
                        {provider === 'google_meet' ? 'Meet' : 
                         provider === 'zoom' ? 'Zoom' : 'Teams'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="rounded-xl px-6"
            >
              {isLoading ? 'Criando...' : 'Criar Reunião'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
  } catch (renderError) {
    console.error('💥 ERRO CRÍTICO na renderização do modal:', renderError);
    
    // Fallback de emergência - modal mínimo que sempre funciona
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Erro na Reunião Online</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700">Ocorreu um erro inesperado. Tente novamente ou recarregue a página.</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>Fechar</Button>
              <Button onClick={() => window.location.reload()}>Recarregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
};

export default ImprovedEventModal;