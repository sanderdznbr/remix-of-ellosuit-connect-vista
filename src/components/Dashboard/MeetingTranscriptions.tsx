import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MeetingRecording {
  id: string;
  title: string;
  transcript: string | null;
  created_at: string;
  duration_seconds: number | null;
  room_id: string;
  meeting_rooms: {
    title: string;
    room_code: string;
  };
}

const MeetingTranscriptions = () => {
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) return;

      // Fetch recordings with transcripts
      const { data, error } = await supabase
        .from('meeting_recordings')
        .select(`
          *,
          meeting_rooms (
            title,
            room_code
          )
        `)
        .eq('company_id', companyUser.company_id)
        .not('transcript', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRecordings(data || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as transcrições",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = (recording: MeetingRecording) => {
    if (!recording.transcript) return;

    const blob = new Blob([recording.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${recording.meeting_rooms.room_code}-${format(new Date(recording.created_at), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download iniciado",
      description: "A transcrição está sendo baixada"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Nenhuma transcrição disponível</h3>
        <p className="text-sm text-muted-foreground">
          As transcrições das reuniões aparecerão aqui após serem gravadas
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Transcrições de Reuniões</h2>
        <p className="text-sm text-muted-foreground">
          {recordings.length} transcrição(ões) disponível(eis)
        </p>
      </div>

      {recordings.map((recording) => (
        <Card key={recording.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">
                {recording.meeting_rooms.title}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(recording.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(new Date(recording.created_at), 'HH:mm')}
                </div>
                {recording.duration_seconds && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.floor(recording.duration_seconds / 60)}min {recording.duration_seconds % 60}s
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">
                  {recording.transcript}
                </p>
              </div>
            </div>

            <Button
              onClick={() => downloadTranscript(recording)}
              size="sm"
              variant="outline"
              className="ml-4"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MeetingTranscriptions;
