import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Mail, Eye, MousePointer, Clock, Search, Filter,
  AlertCircle, RefreshCw, ChevronRight, MailOpen, ExternalLink,
  Smartphone, Monitor, Tablet, Globe, MapPin, Chrome
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrackedEmail {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  sent_at: string;
  status: string;
  open_count: number;
  opened_at: string | null;
  last_opened_at: string | null;
  metadata: any;
  tracking_pixel_id: string;
}

interface EmailEvent {
  id: string;
  email_id: string;
  event_type: string;
  timestamp: string;
  user_agent: string | null;
  ip_address: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
  referrer: string | null;
  open_count: number | null;
  metadata: any;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  sent: { label: 'Enviado', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Mail },
  delivered: { label: 'Entregue', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Mail },
  opened: { label: 'Aberto', color: 'text-green-600', bgColor: 'bg-green-100', icon: MailOpen },
  clicked: { label: 'Clicado', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: MousePointer },
  bounced: { label: 'Falhou', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle },
};

const getDeviceIcon = (deviceType: string | null) => {
  switch (deviceType) {
    case 'mobile': return Smartphone;
    case 'tablet': return Tablet;
    case 'email_proxy': return Globe;
    default: return Monitor;
  }
};

const SentEmailTracker: React.FC = () => {
  const { toast } = useToast();
  const [emails, setEmails] = useState<TrackedEmail[]>([]);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<TrackedEmail | null>(null);
  const [selectedEmailEvents, setSelectedEmailEvents] = useState<EmailEvent[]>([]);
  const [showEventsModal, setShowEventsModal] = useState(false);

  const loadEmails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      setEmails(data as any);
    }
    setLoading(false);
  };

  const loadEventsForEmail = async (emailId: string) => {
    const { data } = await supabase
      .from('email_events')
      .select('*')
      .eq('email_id', emailId)
      .order('timestamp', { ascending: false });

    if (data) {
      setSelectedEmailEvents(data as any);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  useEffect(() => {
    if (selectedEmail) {
      loadEventsForEmail(selectedEmail.id);
    }
  }, [selectedEmail?.id]);

  const getEmailStatus = (email: TrackedEmail) => {
    if ((email.open_count || 0) > 0) return 'opened';
    return email.status || 'sent';
  };

  // Stats
  const totalEmails = emails.length;
  const openedEmails = emails.filter(e => (e.open_count || 0) > 0).length;
  const totalOpens = emails.reduce((sum, e) => sum + (e.open_count || 0), 0);
  const openRate = totalEmails > 0 ? ((openedEmails / totalEmails) * 100).toFixed(1) : '0';

  // Filter
  const filteredEmails = emails.filter(email => {
    const matchesSearch =
      email.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.recipient_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const emailStatus = getEmailStatus(email);
    const matchesStatus = filterStatus === 'all' || emailStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#FF450015' }}>
              <Eye className="h-6 w-6" style={{ color: '#FF4500' }} />
            </div>
            Rastrear Emails Enviados
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe aberturas e engajamento dos seus emails em tempo real
          </p>
        </div>
        <Button variant="outline" className="rounded-xl gap-2" onClick={loadEmails} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEmails}</p>
                <p className="text-sm text-muted-foreground">Emails Enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <MailOpen className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openRate}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Abertura</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOpens}</p>
                <p className="text-sm text-muted-foreground">Total de Aberturas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <MailOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openedEmails}</p>
                <p className="text-sm text-muted-foreground">Emails Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email List */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg">Emails Rastreados</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar..."
                      className="pl-9 w-48 rounded-xl h-9"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 rounded-xl h-9">
                      <Filter className="h-4 w-4 mr-1" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="rounded-lg">Todos</SelectItem>
                      <SelectItem value="sent" className="rounded-lg">Enviado</SelectItem>
                      <SelectItem value="opened" className="rounded-lg">Aberto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum email rastreado ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Envie emails pelo módulo de Email Marketing para rastreá-los</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEmails.map((email) => {
                      const emailStatus = getEmailStatus(email);
                      const status = statusConfig[emailStatus] || statusConfig.sent;
                      const StatusIcon = status.icon;

                      return (
                        <div
                          key={email.id}
                          onClick={() => setSelectedEmail(email)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                            selectedEmail?.id === email.id
                              ? 'border-[#FF4500] bg-[#FF4500]/5'
                              : 'border-border hover:border-[#FF4500]/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">
                                  {email.recipient_name || email.recipient_email}
                                </p>
                                <Badge className={`${status.bgColor} ${status.color} border-0 text-xs`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                                {(email.open_count || 0) > 1 && (
                                  <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">
                                    {email.open_count}x
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate mb-2">
                                {email.subject}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(email.sent_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                                </span>
                                {(email.open_count || 0) > 0 && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <Eye className="h-3 w-3" />
                                    {email.open_count}x aberto
                                  </span>
                                )}
                                {email.last_opened_at && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    Último: {format(new Date(email.last_opened_at), "dd/MM HH:mm")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Email Details */}
        <div>
          <Card className="rounded-2xl border-0 shadow-sm sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Detalhes do Email</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEmail ? (
                <div className="space-y-5">
                  {/* Recipient */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Destinatário</p>
                    <p className="font-medium">{selectedEmail.recipient_name || 'Sem nome'}</p>
                    <p className="text-sm text-muted-foreground">{selectedEmail.recipient_email}</p>
                  </div>

                  {/* Subject */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Assunto</p>
                    <p className="font-medium text-sm">{selectedEmail.subject}</p>
                  </div>

                  {/* Provider */}
                  {selectedEmail.metadata?.provider && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Enviado via</p>
                      <Badge variant="outline" className="capitalize">{selectedEmail.metadata.provider}</Badge>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">Aberturas</span>
                      </div>
                      <p className="text-xl font-bold">{selectedEmail.open_count || 0}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-muted-foreground">Primeira abertura</span>
                      </div>
                      <p className="text-sm font-medium">
                        {selectedEmail.opened_at
                          ? format(new Date(selectedEmail.opened_at), "dd/MM HH:mm")
                          : '—'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Events Timeline */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-muted-foreground">Histórico de Eventos</p>
                      {selectedEmailEvents.length > 3 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-6 px-2"
                          onClick={() => setShowEventsModal(true)}
                        >
                          Ver todos ({selectedEmailEvents.length})
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {/* Always show sent */}
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                        <div>
                          <p className="text-sm font-medium">Enviado</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(selectedEmail.sent_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      {/* Show recent events */}
                      {selectedEmailEvents.slice(0, 3).map((event) => {
                        const DeviceIcon = getDeviceIcon(event.device_type);
                        return (
                          <div key={event.id} className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                              event.event_type === 'opened' ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium capitalize">
                                {event.event_type === 'opened' ? 'Aberto' : event.event_type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(event.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {event.browser && (
                                  <Badge variant="outline" className="text-[10px] h-5 gap-1">
                                    <Chrome className="h-2.5 w-2.5" />
                                    {event.browser}
                                  </Badge>
                                )}
                                {event.os && (
                                  <Badge variant="outline" className="text-[10px] h-5 gap-1">
                                    <DeviceIcon className="h-2.5 w-2.5" />
                                    {event.os}
                                  </Badge>
                                )}
                                {event.city && event.country && (
                                  <Badge variant="outline" className="text-[10px] h-5 gap-1">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {event.city}, {event.country}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Selecione um email para ver os detalhes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Events Detail Modal */}
      <Dialog open={showEventsModal} onOpenChange={setShowEventsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" style={{ color: '#FF4500' }} />
              Todas as aberturas ({selectedEmailEvents.filter(e => e.event_type === 'opened').length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {selectedEmailEvents
                .filter(e => e.event_type === 'opened')
                .map((event, idx) => {
                  const DeviceIcon = getDeviceIcon(event.device_type);
                  return (
                    <div key={event.id} className="p-3 border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Abertura #{selectedEmailEvents.filter(e => e.event_type === 'opened').length - idx}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {event.browser && (
                          <Badge variant="outline" className="text-[10px] h-5 gap-1">
                            <Chrome className="h-2.5 w-2.5" />
                            {event.browser}
                          </Badge>
                        )}
                        {event.os && (
                          <Badge variant="outline" className="text-[10px] h-5 gap-1">
                            <DeviceIcon className="h-2.5 w-2.5" />
                            {event.os}
                          </Badge>
                        )}
                        {event.device_type && (
                          <Badge variant="outline" className="text-[10px] h-5 gap-1">
                            <DeviceIcon className="h-2.5 w-2.5" />
                            {event.device_type === 'mobile' ? 'Mobile' : event.device_type === 'tablet' ? 'Tablet' : event.device_type === 'email_proxy' ? 'Proxy' : 'Desktop'}
                          </Badge>
                        )}
                        {event.city && event.country && (
                          <Badge variant="outline" className="text-[10px] h-5 gap-1">
                            <MapPin className="h-2.5 w-2.5" />
                            {event.city}, {event.country}
                          </Badge>
                        )}
                      </div>
                      {event.ip_address && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          IP: {String(event.ip_address)}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SentEmailTracker;
