import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Share2, 
  Copy, 
  ExternalLink,
  Settings,
  Users,
  Link as LinkIcon,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  X,
  Save
} from 'lucide-react';
import { useAgendaAberta } from '@/hooks/useAgendaAberta';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const weekDays = [
  { id: 0, name: 'Domingo', short: 'Dom' },
  { id: 1, name: 'Segunda-feira', short: 'Seg' },
  { id: 2, name: 'Terça-feira', short: 'Ter' },
  { id: 3, name: 'Quarta-feira', short: 'Qua' },
  { id: 4, name: 'Quinta-feira', short: 'Qui' },
  { id: 5, name: 'Sexta-feira', short: 'Sex' },
  { id: 6, name: 'Sábado', short: 'Sáb' }
];

const ImprovedAgendaAberta = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    bookingLinks, 
    availability, 
    bookings, 
    loading, 
    createBookingLink, 
    updateAvailability, 
    toggleLinkStatus 
  } = useAgendaAberta();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    buffer_minutes: 0
  });

  const [availabilityData, setAvailabilityData] = useState<{[key: number]: {enabled: boolean, start: string, end: string}}>({});

  // Initialize availability data
  useEffect(() => {
    const initialData: {[key: number]: {enabled: boolean, start: string, end: string}} = {};
    
    weekDays.forEach(day => {
      const existingAvailability = availability.find(av => av.day_of_week === day.id);
      initialData[day.id] = {
        enabled: !!existingAvailability?.is_active,
        start: existingAvailability?.start_time || '09:00',
        end: existingAvailability?.end_time || '17:00'
      };
    });
    
    setAvailabilityData(initialData);
  }, [availability]);

  const handleCreateLink = async () => {
    const success = await createBookingLink(formData);
    if (success) {
      setFormData({ title: '', description: '', duration_minutes: 30, buffer_minutes: 0 });
      setShowCreateDialog(false);
    }
  };

  const handleSaveAvailability = async () => {
    for (const dayId of Object.keys(availabilityData)) {
      const dayData = availabilityData[parseInt(dayId)];
      if (dayData.enabled) {
        await updateAvailability({
          day_of_week: parseInt(dayId),
          start_time: dayData.start,
          end_time: dayData.end,
          is_active: true
        });
      }
    }
    
    toast({
      title: 'Sucesso',
      description: 'Horários de disponibilidade salvos!'
    });
    
    setShowAvailabilityDialog(false);
  };

  const copyLinkToClipboard = (linkSlug: string, companyName?: string) => {
    const fullUrl = `https://www.ellosuit.online/${companyName || 'agendamentos'}/${linkSlug}`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência'
    });
  };

  const getPublicUrl = (linkSlug: string, companyName?: string) => {
    return `https://www.ellosuit.online/${companyName || 'agendamentos'}/${linkSlug}`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📅 Agenda Aberta
          </h1>
          <p className="text-lg text-gray-700 mt-2">
            Crie links públicos estilo <span className="font-semibold text-blue-600">Calendly</span> para agendamentos
          </p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl border-blue-200 hover:bg-blue-50">
                <Clock className="h-4 w-4 mr-2" />
                Configurar Horários
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Settings className="h-6 w-6 text-blue-600" />
                  Horários de Atendimento
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-blue-800 text-sm">
                    💡 Configure os dias e horários em que você está disponível para receber agendamentos. 
                    Seus clientes só poderão agendar nos horários definidos aqui.
                  </p>
                </div>
                
                <div className="grid gap-4">
                  {weekDays.map((day) => (
                    <Card key={day.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={availabilityData[day.id]?.enabled || false}
                              onCheckedChange={(enabled) => 
                                setAvailabilityData(prev => ({
                                  ...prev,
                                  [day.id]: { ...prev[day.id], enabled }
                                }))
                              }
                            />
                            <div>
                              <p className="font-semibold text-gray-900">{day.name}</p>
                              <p className="text-sm text-gray-500">{day.short}</p>
                            </div>
                          </div>
                          
                          {availabilityData[day.id]?.enabled && (
                            <div className="flex items-center gap-3">
                              <div>
                                <Label className="text-xs text-gray-500">Início</Label>
                                <Input
                                  type="time"
                                  value={availabilityData[day.id]?.start || '09:00'}
                                  onChange={(e) => 
                                    setAvailabilityData(prev => ({
                                      ...prev,
                                      [day.id]: { ...prev[day.id], start: e.target.value }
                                    }))
                                  }
                                  className="w-24 text-center"
                                />
                              </div>
                              <span className="text-gray-400 mt-4">até</span>
                              <div>
                                <Label className="text-xs text-gray-500">Fim</Label>
                                <Input
                                  type="time"
                                  value={availabilityData[day.id]?.end || '17:00'}
                                  onChange={(e) => 
                                    setAvailabilityData(prev => ({
                                      ...prev,
                                      [day.id]: { ...prev[day.id], end: e.target.value }
                                    }))
                                  }
                                  className="w-24 text-center"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowAvailabilityDialog(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveAvailability} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Horários
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Link de Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl">Criar Link de Agendamento</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Título do Serviço *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Consulta estratégica de 30 minutos"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva o que será feito neste agendamento..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Duração</Label>
                    <Select 
                      value={formData.duration_minutes.toString()} 
                      onValueChange={(value) => setFormData({...formData, duration_minutes: parseInt(value)})}
                    >
                      <SelectTrigger className="mt-1">
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
                  
                  <div>
                    <Label className="text-sm font-medium">Intervalo</Label>
                    <Select 
                      value={formData.buffer_minutes.toString()} 
                      onValueChange={(value) => setFormData({...formData, buffer_minutes: parseInt(value)})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sem intervalo</SelectItem>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateLink} disabled={!formData.title} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Criar Link
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="links" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm">
          <TabsTrigger value="links" className="data-[state=active]:bg-white">Meus Links</TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:bg-white">Agendamentos</TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-white">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-6">
          {bookingLinks.length === 0 ? (
            <Card className="border-0 shadow-xl rounded-3xl bg-white/80 backdrop-blur-sm">
              <CardContent className="text-center py-16">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <CalendarIcon className="h-16 w-16 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Crie seu primeiro link de agendamento
                </h3>
                <p className="text-gray-600 mb-8 text-lg">
                  Permita que seus clientes agendem horários com você de forma automática e profissional
                </p>
                <Button onClick={() => setShowCreateDialog(true)} size="lg" className="rounded-xl">
                  <Plus className="h-5 w-5 mr-2" />
                  Criar Primeiro Link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {bookingLinks.map((link) => (
                <Card key={link.id} className="border-0 shadow-xl rounded-3xl bg-white/80 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-2xl">{link.title}</CardTitle>
                          <Badge variant={link.is_active ? "secondary" : "outline"} className="bg-white/20">
                            {link.is_active ? '🟢 Ativo' : '🔴 Inativo'}
                          </Badge>
                        </div>
                        {link.description && (
                          <p className="text-blue-100 text-base">{link.description}</p>
                        )}
                      </div>
                      
                      <Switch
                        checked={link.is_active}
                        onCheckedChange={() => toggleLinkStatus(link.id, link.is_active)}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-6 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">{link.duration_minutes} minutos</span>
                        </div>
                        {link.buffer_minutes > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-purple-500">+{link.buffer_minutes}min intervalo</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyLinkToClipboard(link.link_slug)}
                          className="rounded-xl hover:bg-blue-50"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(getPublicUrl(link.link_slug), '_blank')}
                          className="rounded-xl hover:bg-green-50"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 p4 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">🔗 Link público:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLinkToClipboard(link.link_slug)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Copiar Link
                        </Button>
                      </div>
                      <code className="text-sm text-gray-600 break-all bg-white p-2 rounded-lg block">
                        {getPublicUrl(link.link_slug)}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <Card className="border-0 shadow-xl rounded-3xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                Próximos Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <CalendarIcon className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">Nenhum agendamento ainda</p>
                  <p className="text-gray-400 text-sm mt-2">Os agendamentos aparecerão aqui quando os clientes agendarem</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-6 border border-gray-200 rounded-2xl bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-lg">{booking.client_name}</h4>
                          <p className="text-gray-600">{booking.client_email}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>📅 {new Date(booking.booking_date).toLocaleDateString('pt-BR')}</span>
                            <span>⏰ {booking.booking_time}</span>
                          </div>
                          {booking.notes && (
                            <p className="text-sm text-gray-600 italic">💬 {booking.notes}</p>
                          )}
                        </div>
                        <Badge 
                          variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {booking.status === 'confirmed' ? '✅ Confirmado' : booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card className="border-0 shadow-xl rounded-3xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">📅 Visualização do Calendário</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Em breve: visualização completa do calendário com todos os seus agendamentos
              </p>
              <div className="bg-gray-50 p-8 rounded-2xl text-center">
                <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Funcionalidade em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedAgendaAberta;