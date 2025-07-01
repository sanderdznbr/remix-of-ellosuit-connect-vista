
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Eye, Clock } from 'lucide-react';

interface Email {
  id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  sent_at: string;
  status: string;
  email_events: Array<{
    event_type: string;
    timestamp: string;
  }>;
}

const EmailList = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          status,
          email_events (
            event_type,
            timestamp
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(20);

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

    // Configurar atualização em tempo real
    const channel = supabase
      .channel('email-list')
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

  const getEmailStatus = (email: Email) => {
    const hasOpened = email.email_events.some(event => event.event_type === 'opened');
    const hasClicked = email.email_events.some(event => event.event_type === 'clicked');
    
    if (hasClicked) return { label: 'Clicado', color: 'bg-green-500' };
    if (hasOpened) return { label: 'Aberto', color: 'bg-blue-500' };
    return { label: 'Enviado', color: 'bg-gray-500' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emails Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded mb-2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Emails Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum email enviado ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => {
              const status = getEmailStatus(email);
              const openEvent = email.email_events.find(e => e.event_type === 'opened');
              
              return (
                <div key={email.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{email.subject}</h4>
                      <p className="text-sm text-gray-600">
                        Para: {email.recipient_name || email.recipient_email}
                      </p>
                    </div>
                    <Badge className={`${status.color} text-white`}>
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(email.sent_at), { 
                        addSuffix: true,
                        locale: ptBR 
                      })}
                    </div>
                    
                    {openEvent && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Aberto {formatDistanceToNow(new Date(openEvent.timestamp), { 
                          addSuffix: true,
                          locale: ptBR 
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailList;
