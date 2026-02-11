import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Mail, Eye, MousePointer, Clock, Search, Filter,
  AlertCircle, RefreshCw, ChevronRight, MailOpen,
  Smartphone, Monitor, Tablet, Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
  sent: { label: 'Enviado', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Mail },
  delivered: { label: 'Entregue', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Mail },
  opened: { label: 'Aberto', color: 'text-[#3A9A1C]', bgColor: 'bg-[#3A9A1C]/10', icon: MailOpen },
  clicked: { label: 'Clicado', color: 'text-purple-600', bgColor: 'bg-purple-50', icon: MousePointer },
  bounced: { label: 'Falhou', color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertCircle },
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<TrackedEmail | null>(null);
  const [selectedEmailEvents, setSelectedEmailEvents] = useState<EmailEvent[]>([]);
  const [showEventsModal, setShowEventsModal] = useState(false);

  const loadEmails = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('emails').select('*').order('sent_at', { ascending: false }).limit(200);
    if (!error && data) setEmails(data as any);
    setLoading(false);
  };

  const loadEventsForEmail = async (emailId: string) => {
    const { data } = await supabase.from('email_events').select('*').eq('email_id', emailId).order('timestamp', { ascending: false });
    if (data) setSelectedEmailEvents(data as any);
  };

  useEffect(() => { loadEmails(); }, []);
  useEffect(() => { if (selectedEmail) loadEventsForEmail(selectedEmail.id); }, [selectedEmail?.id]);

  const getEmailStatus = (email: TrackedEmail) => {
    if ((email.open_count || 0) > 0) return 'opened';
    return email.status || 'sent';
  };

  const totalEmails = emails.length;
  const openedEmails = emails.filter(e => (e.open_count || 0) > 0).length;
  const totalOpens = emails.reduce((sum, e) => sum + (e.open_count || 0), 0);
  const openRate = totalEmails > 0 ? ((openedEmails / totalEmails) * 100).toFixed(1) : '0';

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.recipient_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailStatus = getEmailStatus(email);
    const matchesStatus = filterStatus === 'all' || emailStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: "Emails Enviados", value: totalEmails, icon: Mail, color: "#3B82F6" },
    { label: "Taxa de Abertura", value: `${openRate}%`, icon: MailOpen, color: "#10B981" },
    { label: "Total Aberturas", value: totalOpens, icon: Eye, color: "#8B5CF6" },
    { label: "Emails Abertos", value: openedEmails, icon: MailOpen, color: "#F59E0B" },
  ];

  const TRACK_COLOR = "#3A9A1C";

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: `${TRACK_COLOR}15` }}>
              <Eye className="h-6 w-6" style={{ color: TRACK_COLOR }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rastrear Emails</h1>
              <p className="text-sm text-gray-500">Acompanhe aberturas e engajamento em tempo real</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-xl gap-2" onClick={loadEmails} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${stat.color}12` }}>
                  <Icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <h3 className="text-base font-semibold text-gray-900">Emails Rastreados</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." className="pl-9 w-48 rounded-xl h-9" />
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

              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-gray-300" /></div>
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Nenhum email rastreado ainda</p>
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
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            selectedEmail?.id === email.id ? 'border-[#3A9A1C]/30 bg-[#3A9A1C]/5' : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm text-gray-900 truncate">{email.recipient_name || email.recipient_email}</p>
                                <Badge className={`${status.bgColor} ${status.color} border-0 text-[10px] px-1.5`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />{status.label}
                                </Badge>
                                {(email.open_count || 0) > 1 && (
                                  <Badge variant="outline" className="text-[10px] border-[#3A9A1C]/30 text-[#3A9A1C]">{email.open_count}x</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate mb-1.5">{email.subject}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(email.sent_at), "dd MMM 'às' HH:mm", { locale: ptBR })}</span>
                                {(email.open_count || 0) > 0 && <span className="flex items-center gap-1" style={{ color: TRACK_COLOR }}><Eye className="h-3 w-3" />{email.open_count}x</span>}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300 mt-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Email Details */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Detalhes</h3>
              {selectedEmail ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Destinatário</p>
                    <p className="font-medium text-sm text-gray-900">{selectedEmail.recipient_name || 'Sem nome'}</p>
                    <p className="text-xs text-gray-500">{selectedEmail.recipient_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Assunto</p>
                    <p className="font-medium text-sm text-gray-900">{selectedEmail.subject}</p>
                  </div>
                  {selectedEmail.metadata?.provider && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Enviado via</p>
                      <Badge variant="outline" className="capitalize rounded-lg text-xs">{selectedEmail.metadata.provider}</Badge>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1"><Eye className="h-3.5 w-3.5" style={{ color: TRACK_COLOR }} /><span className="text-xs text-gray-500">Aberturas</span></div>
                      <p className="text-lg font-bold text-gray-900">{selectedEmail.open_count || 0}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1"><Clock className="h-3.5 w-3.5 text-blue-600" /><span className="text-xs text-gray-500">1ª abertura</span></div>
                      <p className="text-sm font-medium text-gray-900">{selectedEmail.opened_at ? format(new Date(selectedEmail.opened_at), "dd/MM HH:mm") : '—'}</p>
                    </div>
                  </div>

                  {/* Events */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-400">Eventos</p>
                      {selectedEmailEvents.length > 3 && (
                        <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setShowEventsModal(true)}>
                          Ver todos ({selectedEmailEvents.length})
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Enviado</p>
                          <p className="text-xs text-gray-500">{format(new Date(selectedEmail.sent_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                        </div>
                      </div>
                      {selectedEmailEvents.slice(0, 3).map((event) => {
                        const DeviceIcon = getDeviceIcon(event.device_type);
                        return (
                          <div key={event.id} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: TRACK_COLOR }} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 capitalize">{event.event_type === 'open' ? 'Aberto' : event.event_type}</p>
                                <DeviceIcon className="h-3 w-3 text-gray-400" />
                              </div>
                              <p className="text-xs text-gray-500">{format(new Date(event.timestamp), "dd/MM 'às' HH:mm")}</p>
                              {event.browser && <p className="text-xs text-gray-400">{event.browser} • {event.os}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Selecione um email</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Events Modal */}
      <Dialog open={showEventsModal} onOpenChange={setShowEventsModal}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Todos os Eventos</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {selectedEmailEvents.map((event) => {
                const DeviceIcon = getDeviceIcon(event.device_type);
                return (
                  <div key={event.id} className="p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs rounded-lg capitalize">{event.event_type === 'open' ? 'Abertura' : event.event_type}</Badge>
                        <DeviceIcon className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <span className="text-xs text-gray-500">{format(new Date(event.timestamp), "dd/MM/yy HH:mm")}</span>
                    </div>
                    {(event.browser || event.city) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {[event.browser, event.os, event.city, event.country].filter(Boolean).join(' • ')}
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
