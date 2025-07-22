
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, MoreHorizontal, Settings, FileText, Eye } from 'lucide-react';

interface EmailTracking {
  id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  sent_at: string;
  campaign_id: string | null;
  email_events: Array<{
    event_type: string;
    timestamp: string;
  }>;
}

const MailTracking = () => {
  const [emails, setEmails] = useState<EmailTracking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailTracking | null>(null);
  const { toast } = useToast();

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select(`
          id,
          recipient_email,
          recipient_name,
          subject,
          sent_at,
          campaign_id,
          email_events (
            event_type,
            timestamp
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();

    const channel = supabase
      .channel('email-tracking')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emails'
      }, () => {
        fetchEmails();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'email_events'
      }, () => {
        fetchEmails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getOpenCount = (events: Array<{event_type: string}>) => {
    return events.filter(event => event.event_type === 'opened').length;
  };

  const getListBadge = (campaignId: string | null) => {
    if (!campaignId) return { label: 'List 1', color: 'bg-blue-500' };
    
    // Simple hash to assign consistent colors
    const hash = campaignId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      'bg-blue-500',
      'bg-orange-500', 
      'bg-red-500',
      'bg-green-500',
      'bg-purple-500'
    ];
    
    const listNumber = Math.abs(hash % 3) + 1;
    const colorIndex = Math.abs(hash % colors.length);
    
    return {
      label: `List ${listNumber}`,
      color: colors[colorIndex]
    };
  };

  const filteredEmails = emails.filter(email =>
    email.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (email.recipient_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (email: EmailTracking) => {
    setSelectedEmail(email);
  };

  const handleExportReport = () => {
    const csvContent = [
      ['Recipient', 'Subject', 'Sent At', 'Opens', 'Status'],
      ...filteredEmails.map(email => [
        email.recipient_email,
        email.subject,
        new Date(email.sent_at).toLocaleDateString(),
        getOpenCount(email.email_events).toString(),
        getOpenCount(email.email_events) > 0 ? 'Opened' : 'Sent'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-tracking-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Relatório exportado",
      description: "O relatório foi baixado com sucesso.",
    });
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('emails')
        .delete()
        .eq('id', emailId);

      if (error) throw error;

      toast({
        title: "Email excluído",
        description: "O email foi excluído com sucesso.",
      });
      
      fetchEmails();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir email.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mail Tracking</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search Contacts"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => toast({ title: "Configurações", description: "Funcionalidade em desenvolvimento" })}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleExportReport}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="text-gray-500 font-medium">RECIPIENTS</TableHead>
                <TableHead className="text-gray-500 font-medium">EMAIL</TableHead>
                <TableHead className="text-gray-500 font-medium">ACTIVITY</TableHead>
                <TableHead className="text-gray-500 font-medium">LIST</TableHead>
                <TableHead className="text-gray-500 font-medium">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <div className="animate-pulse h-12 bg-gray-100 rounded"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Nenhum email encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((email) => {
                  const openCount = getOpenCount(email.email_events);
                  const listBadge = getListBadge(email.campaign_id);
                  
                  return (
                    <TableRow key={email.id} className="hover:bg-gray-50">
                      <TableCell className="py-4">
                        <div className="text-sm text-gray-600">
                          {email.recipient_email}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div>
                          <div className="font-medium text-sm">{email.subject}</div>
                          <div className="text-xs text-gray-500">
                            Sent on {new Date(email.sent_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })} at {new Date(email.sent_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-sm font-medium">
                          {openCount} Opens
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`${listBadge.color} text-white text-xs px-2 py-1`}>
                          {listBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(email)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast({ title: "Reenviar", description: "Funcionalidade em desenvolvimento" })}>
                              Reenviar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600" 
                              onClick={() => handleDeleteEmail(email.id)}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Email Details Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Email</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Destinatário</label>
                  <p className="text-sm">{selectedEmail.recipient_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-sm">{selectedEmail.recipient_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Assunto</label>
                  <p className="text-sm">{selectedEmail.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Enviado em</label>
                  <p className="text-sm">
                    {new Date(selectedEmail.sent_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Eventos</label>
                <div className="mt-2 space-y-2">
                  {selectedEmail.email_events.length > 0 ? (
                    selectedEmail.email_events.map((event, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">
                          {event.event_type === 'opened' ? 'Aberto' : 
                           event.event_type === 'clicked' ? 'Clicado' : 
                           event.event_type}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum evento registrado</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MailTracking;
