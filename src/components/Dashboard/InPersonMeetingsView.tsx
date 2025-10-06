import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InPersonMeeting {
  id: string;
  title: string;
  transcript: string | null;
  file_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  created_by: string;
}

const InPersonMeetingsView = () => {
  const [meetings, setMeetings] = useState<InPersonMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyData) return;

      const { data, error } = await supabase
        .from('in_person_meetings')
        .select('*')
        .eq('company_id', companyData.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMeetings(data || []);
    } catch (error) {
      console.error('Erro ao buscar reuniões:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as reuniões presenciais",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = (meeting: InPersonMeeting) => {
    if (!meeting.transcript) return;

    const blob = new Blob([meeting.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title}-${format(new Date(meeting.created_at), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Iniciado",
      description: "A transcrição está sendo baixada",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma reunião presencial</h3>
        <p className="text-sm text-muted-foreground">
          As reuniões presenciais gravadas aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Reuniões Presenciais</h2>
          <p className="text-sm text-muted-foreground">
            Histórico de reuniões presenciais gravadas e transcritas
          </p>
        </div>

        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{meeting.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(meeting.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(meeting.created_at), 'HH:mm', { locale: ptBR })}
                      </div>
                      {meeting.duration_seconds && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor(meeting.duration_seconds / 60)}min
                        </div>
                      )}
                    </div>
                  </div>
                  {meeting.transcript && (
                    <Button
                      onClick={() => downloadTranscript(meeting)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Download className="h-3 w-3" />
                      Baixar
                    </Button>
                  )}
                </div>
              </CardHeader>
              {meeting.transcript && (
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground font-semibold mb-2">
                      Prévia da Transcrição:
                    </p>
                    <p className="text-sm line-clamp-3">
                      {meeting.transcript}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

export default InPersonMeetingsView;
