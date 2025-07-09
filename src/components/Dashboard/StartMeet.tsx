
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Users, Clock, Calendar, ExternalLink, AlertCircle } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useZoomIntegration } from '@/hooks/useZoomIntegration';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  email: string;
}

const StartMeet = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingProvider, setMeetingProvider] = useState<'google_meet' | 'zoom'>('google_meet');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState('');
  const [duration, setDuration] = useState('60');
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  
  const { isConnected: googleConnected, loading: googleLoading, connectGoogle, getValidAccessToken: getGoogleToken } = useGoogleCalendar();
  const { isConnected: zoomConnected, loading: zoomLoading, connectZoom, getValidAccessToken: getZoomToken } = useZoomIntegration();
  const { user } = useAuth();
  const { toast } = useToast();

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

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  const handleStartMeeting = async () => {
    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um título para a reunião",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + (parseInt(duration) * 60 * 1000));
      
      const startDateTime = now.toISOString();
      const endDateTime = endTime.toISOString();

      let meetingLink = '';
      let attendees: any[] = [];

      // Preparar lista de participantes
      selectedClients.forEach(clientId => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
          attendees.push({ email: client.email, displayName: client.name });
        }
      });

      // Adicionar emails manuais
      if (manualEmails.trim()) {
        const emails = manualEmails.split(',').map(email => email.trim()).filter(email => email);
        emails.forEach(email => {
          attendees.push({ email });
        });
      }

      // Criar meeting baseado no provider selecionado
      if (meetingProvider === 'google_meet' && googleConnected) {
        try {
          console.log('🔄 Criando reunião no Google Meet...');
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
          console.error('💥 Erro ao criar reunião no Google Meet:', error);
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

      // Salvar no calendário local
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user!.id)
        .single();

      if (companyUser) {
        await supabase
          .from('calendar_events')
          .insert({
            title,
            description,
            start_date: startDateTime,
            end_date: endDateTime,
            event_type: 'meeting',
            meeting_provider: meetingProvider,
            meeting_link: meetingLink,
            attendees,
            created_by: user!.id,
            company_id: companyUser.company_id,
            is_all_day: false
          });
      }

      toast({
        title: "Sucesso",
        description: meetingLink ? "Reunião criada! Link copiado para área de transferência." : "Reunião criada com sucesso!",
      });

      // Copiar link para área de transferência se disponível
      if (meetingLink) {
        navigator.clipboard.writeText(meetingLink);
        // Abrir link da reunião
        window.open(meetingLink, '_blank');
      }

      // Limpar formulário
      setTitle('');
      setDescription('');
      setSelectedClients([]);
      setManualEmails('');
      setDuration('60');

    } catch (error: any) {
      console.error('💥 Erro ao iniciar reunião:', error);
      toast({
        title: "Erro",
        description: error.message || 'Erro inesperado ao criar reunião',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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

  const { connected, loading, connect } = getConnectionStatus();

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Start Meet</h1>
            <p className="text-gray-500 mt-1">Inicie uma reunião rapidamente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário Principal */}
          <Card className="shadow-xl border-0 rounded-2xl">
            <CardHeader className="bg-gradient-to-r from-[#3600FF] to-[#4F46E5] text-white rounded-t-2xl">
              <CardTitle className="flex items-center space-x-2">
                <Video className="h-6 w-6" />
                <span>Configurar Reunião</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Título da Reunião *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Digite o título da reunião"
                  className="rounded-xl h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Descrição (Opcional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição da reunião"
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duração
                </Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h 30min</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
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
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                        provider === 'google_meet' ? 'bg-green-500' : 'bg-blue-500'
                      }`}>
                        <span className="text-white font-bold text-xs">
                          {provider === 'google_meet' ? 'GM' : 'Z'}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {provider === 'google_meet' ? 'Meet' : 'Zoom'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participantes */}
          <Card className="shadow-xl border-0 rounded-2xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-2xl">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-6 w-6" />
                <span>Participantes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Selecionar Clientes
                  </Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-xl p-3">
                    {clientsLoading ? (
                      <p className="text-sm text-gray-500">Carregando clientes...</p>
                    ) : clients.length > 0 ? (
                      clients.map((client) => (
                        <div key={client.id} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={`client-${client.id}`}
                            checked={selectedClients.includes(client.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClients([...selectedClients, client.id]);
                              } else {
                                setSelectedClients(selectedClients.filter(id => id !== client.id));
                              }
                            }}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <Label htmlFor={`client-${client.id}`} className="text-sm">
                            {client.name} ({client.email})
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Nenhum cliente encontrado</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualEmails" className="text-sm font-medium">
                    Emails Adicionais
                  </Label>
                  <Textarea
                    id="manualEmails"
                    value={manualEmails}
                    onChange={(e) => setManualEmails(e.target.value)}
                    placeholder="email1@exemplo.com, email2@exemplo.com"
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Separe múltiplos emails com vírgula
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t">
                <Button
                  onClick={handleStartMeeting}
                  disabled={isLoading || !connected}
                  className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-[#3600FF] to-[#4F46E5] hover:from-[#3600FF]/90 hover:to-[#4F46E5]/90"
                >
                  {isLoading ? (
                    <>
                      <Video className="h-5 w-5 mr-2 animate-spin" />
                      Iniciando Reunião...
                    </>
                  ) : (
                    <>
                      <Video className="h-5 w-5 mr-2" />
                      Iniciar Reunião Agora
                    </>
                  )}
                </Button>
                
                {!connected && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">
                        Conecte-se ao {meetingProvider === 'google_meet' ? 'Google Meet' : 'Zoom'} para criar reuniões
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StartMeet;
