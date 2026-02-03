import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, Eye, MousePointer, Clock, Search, Filter,
  CheckCircle, AlertCircle, TrendingUp, Users, RefreshCw,
  ArrowUpRight, ChevronRight, MailOpen, ExternalLink
} from 'lucide-react';
import { format, subDays, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Demo data for sent emails
const demoEmails = [
  {
    id: '1',
    recipient: 'carlos.silva@empresa.com',
    recipientName: 'Carlos Silva',
    subject: 'Proposta Comercial - Serviços de Marketing Digital',
    sentAt: subHours(new Date(), 2),
    status: 'opened',
    opens: 5,
    lastOpened: subHours(new Date(), 1),
    clicks: 3,
    links: ['https://proposta.com/ver', 'https://calendario.com/agendar'],
    device: 'Desktop',
    location: 'São Paulo, BR'
  },
  {
    id: '2',
    recipient: 'maria.santos@techcorp.com',
    recipientName: 'Maria Santos',
    subject: 'Follow-up: Reunião de Ontem',
    sentAt: subHours(new Date(), 5),
    status: 'opened',
    opens: 2,
    lastOpened: subHours(new Date(), 3),
    clicks: 1,
    links: ['https://docs.google.com/presentation'],
    device: 'Mobile',
    location: 'Rio de Janeiro, BR'
  },
  {
    id: '3',
    recipient: 'joao.oliveira@startup.io',
    recipientName: 'João Oliveira',
    subject: 'Novo Catálogo de Produtos 2026',
    sentAt: subDays(new Date(), 1),
    status: 'delivered',
    opens: 0,
    lastOpened: null,
    clicks: 0,
    links: ['https://catalogo.com/download'],
    device: null,
    location: null
  },
  {
    id: '4',
    recipient: 'ana.costa@financeira.com.br',
    recipientName: 'Ana Costa',
    subject: 'Relatório Mensal - Janeiro 2026',
    sentAt: subDays(new Date(), 1),
    status: 'opened',
    opens: 8,
    lastOpened: subHours(new Date(), 12),
    clicks: 4,
    links: ['https://relatorio.com/janeiro', 'https://dashboard.com'],
    device: 'Desktop',
    location: 'Brasília, BR'
  },
  {
    id: '5',
    recipient: 'pedro.lima@agencia.com',
    recipientName: 'Pedro Lima',
    subject: 'Orçamento Aprovado - Projeto X',
    sentAt: subDays(new Date(), 2),
    status: 'clicked',
    opens: 12,
    lastOpened: subHours(new Date(), 6),
    clicks: 7,
    links: ['https://contrato.com/assinar', 'https://pagamento.com/link'],
    device: 'Tablet',
    location: 'Curitiba, BR'
  },
  {
    id: '6',
    recipient: 'fernanda.rocha@consultoria.com',
    recipientName: 'Fernanda Rocha',
    subject: 'Convite: Workshop de Inovação',
    sentAt: subDays(new Date(), 3),
    status: 'bounced',
    opens: 0,
    lastOpened: null,
    clicks: 0,
    links: [],
    device: null,
    location: null,
    bounceReason: 'Caixa de entrada cheia'
  },
  {
    id: '7',
    recipient: 'lucas.mendes@ecommerce.com',
    recipientName: 'Lucas Mendes',
    subject: 'Integração API - Documentação Técnica',
    sentAt: subDays(new Date(), 4),
    status: 'opened',
    opens: 3,
    lastOpened: subDays(new Date(), 2),
    clicks: 2,
    links: ['https://docs.api.com', 'https://github.com/repo'],
    device: 'Desktop',
    location: 'Belo Horizonte, BR'
  },
  {
    id: '8',
    recipient: 'patricia.alves@hospital.org',
    recipientName: 'Patrícia Alves',
    subject: 'Confirmação de Agendamento',
    sentAt: subDays(new Date(), 5),
    status: 'delivered',
    opens: 0,
    lastOpened: null,
    clicks: 0,
    links: ['https://agenda.com/confirmar'],
    device: null,
    location: null
  },
];

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  delivered: { label: 'Entregue', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Mail },
  opened: { label: 'Aberto', color: 'text-green-600', bgColor: 'bg-green-100', icon: MailOpen },
  clicked: { label: 'Clicado', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: MousePointer },
  bounced: { label: 'Falhou', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle },
};

const SentEmailTracker: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<typeof demoEmails[0] | null>(null);

  // Calculate stats
  const totalEmails = demoEmails.length;
  const openedEmails = demoEmails.filter(e => e.opens > 0).length;
  const clickedEmails = demoEmails.filter(e => e.clicks > 0).length;
  const bouncedEmails = demoEmails.filter(e => e.status === 'bounced').length;
  const openRate = ((openedEmails / totalEmails) * 100).toFixed(1);
  const clickRate = ((clickedEmails / totalEmails) * 100).toFixed(1);

  // Filter emails
  const filteredEmails = demoEmails.filter(email => {
    const matchesSearch = 
      email.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.recipientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || email.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            Rastrear Emails Enviados
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe aberturas, cliques e engajamento dos seus emails
          </p>
        </div>
        <Button variant="outline" className="rounded-xl gap-2">
          <RefreshCw className="h-4 w-4" />
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
                <MousePointer className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clickRate}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Clique</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bouncedEmails}</p>
                <p className="text-sm text-muted-foreground">Falhas</p>
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
                      <SelectItem value="delivered" className="rounded-lg">Entregue</SelectItem>
                      <SelectItem value="opened" className="rounded-lg">Aberto</SelectItem>
                      <SelectItem value="clicked" className="rounded-lg">Clicado</SelectItem>
                      <SelectItem value="bounced" className="rounded-lg">Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredEmails.map((email) => {
                    const status = statusConfig[email.status];
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                          selectedEmail?.id === email.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{email.recipientName}</p>
                              <Badge className={`${status.bgColor} ${status.color} border-0 text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {email.subject}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(email.sentAt, "dd MMM 'às' HH:mm", { locale: ptBR })}
                              </span>
                              {email.opens > 0 && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Eye className="h-3 w-3" />
                                  {email.opens}x aberto
                                </span>
                              )}
                              {email.clicks > 0 && (
                                <span className="flex items-center gap-1 text-purple-600">
                                  <MousePointer className="h-3 w-3" />
                                  {email.clicks} cliques
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
                <div className="space-y-6">
                  {/* Recipient */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Destinatário</p>
                    <p className="font-medium">{selectedEmail.recipientName}</p>
                    <p className="text-sm text-muted-foreground">{selectedEmail.recipient}</p>
                  </div>

                  {/* Subject */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Assunto</p>
                    <p className="font-medium text-sm">{selectedEmail.subject}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">Aberturas</span>
                      </div>
                      <p className="text-xl font-bold">{selectedEmail.opens}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <MousePointer className="h-4 w-4 text-purple-600" />
                        <span className="text-xs text-muted-foreground">Cliques</span>
                      </div>
                      <p className="text-xl font-bold">{selectedEmail.clicks}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">Histórico</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                        <div>
                          <p className="text-sm font-medium">Enviado</p>
                          <p className="text-xs text-muted-foreground">
                            {format(selectedEmail.sentAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      {selectedEmail.opens > 0 && selectedEmail.lastOpened && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                          <div>
                            <p className="text-sm font-medium">Última abertura</p>
                            <p className="text-xs text-muted-foreground">
                              {format(selectedEmail.lastOpened, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                            {selectedEmail.device && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {selectedEmail.device} • {selectedEmail.location}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedEmail.status === 'bounced' && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                          <div>
                            <p className="text-sm font-medium text-red-600">Falha na entrega</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedEmail as any).bounceReason}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Links clicked */}
                  {selectedEmail.links.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Links no email</p>
                      <div className="space-y-2">
                        {selectedEmail.links.map((link, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-xs"
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate flex-1">{link}</span>
                            {selectedEmail.clicks > 0 && idx === 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                Clicado
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
    </div>
  );
};

export default SentEmailTracker;
