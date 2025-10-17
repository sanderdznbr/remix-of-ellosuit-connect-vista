import React, { useEffect, useState } from 'react';
import { Download, Trash2, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SavedMeetingDownloadModal from './SavedMeetingDownloadModal';

interface Meeting {
  id: string;
  title: string;
  transcript: string;
  created_at: string;
  duration_seconds: number;
  file_url: string;
  speaker_mapping?: Record<string, string> | any;
  transcript_with_timestamps?: Array<{
    timestamp_seconds: number;
    speaker: string;
    text: string;
  }> | any;
  type?: 'presencial' | 'online';
}

const SavedMeetings = () => {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar reuniões presenciais
      const { data: inPersonData, error: inPersonError } = await supabase
        .from('in_person_meetings')
        .select('id, title, transcript, created_at, duration_seconds, file_url, speaker_mapping, transcript_with_timestamps')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (inPersonError) throw inPersonError;

      // Buscar gravações online
      const { data: recordingsData, error: recordingsError } = await supabase
        .from('meeting_recordings')
        .select('id, title, transcript, created_at, duration_seconds, file_url, speaker_mapping, transcript_with_timestamps')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (recordingsError) throw recordingsError;

      // Combinar e ordenar por data
      const combined = [
        ...(inPersonData || []).map(m => ({ ...m, type: 'presencial' as const })),
        ...(recordingsData || []).map(m => ({ ...m, type: 'online' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setMeetings(combined as Meeting[]);
    } catch (error) {
      console.error('Erro ao carregar reuniões:', error);
      toast({
        title: "Erro ao Carregar",
        description: "Não foi possível carregar as reuniões salvas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openDownloadModal = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowDownloadModal(true);
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta reunião?')) return;

    try {
      const { error } = await supabase
        .from('in_person_meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMeetings(meetings.filter(m => m.id !== id));
      toast({
        title: "Reunião Excluída",
        description: "A reunião foi removida com sucesso",
      });
    } catch (error) {
      console.error('Erro ao excluir reunião:', error);
      toast({
        title: "Erro ao Excluir",
        description: "Não foi possível excluir a reunião",
        variant: "destructive"
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card className="bg-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Carregando reuniões...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="p-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Reuniões Salvas</CardTitle>
            <CardDescription>Nenhuma reunião gravada ainda</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              Suas reuniões gravadas aparecerão aqui
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Reuniões Salvas</CardTitle>
          <CardDescription>
            {meetings.length} reuniõe(s) gravada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {meetings.map((meeting) => (
              <Card key={meeting.id} className="border-2 bg-card">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate text-foreground">
                          {meeting.title}
                        </h3>
                        {meeting.type && (
                          <span 
                            className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                            style={{
                              backgroundColor: meeting.type === 'online' ? '#3600FF20' : '#10B98120',
                              color: meeting.type === 'online' ? '#3600FF' : '#10B981'
                            }}
                          >
                            {meeting.type === 'online' ? '🎥 Online' : '🎙️ Presencial'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(meeting.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(meeting.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {meeting.duration_seconds > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(meeting.duration_seconds)}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {meeting.transcript 
                          ? meeting.transcript.substring(0, 150) + '...' 
                          : 'Transcrição em processamento...'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDownloadModal(meeting)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMeeting(meeting.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedMeeting && (
        <SavedMeetingDownloadModal
          isOpen={showDownloadModal}
          onClose={() => {
            setShowDownloadModal(false);
            setSelectedMeeting(null);
          }}
          meeting={selectedMeeting}
        />
      )}
    </div>
  );
};

export default SavedMeetings;
