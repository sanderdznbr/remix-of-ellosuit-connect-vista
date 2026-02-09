import React, { useEffect, useState } from 'react';
import { Download, Trash2, Clock, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const FLOW_COLOR = "#007DE3";

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

      const { data: inPersonData, error: inPersonError } = await supabase
        .from('in_person_meetings')
        .select('id, title, transcript, created_at, duration_seconds, file_url, speaker_mapping, transcript_with_timestamps')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (inPersonError) throw inPersonError;

      const { data: recordingsData, error: recordingsError } = await supabase
        .from('meeting_recordings')
        .select('id, title, transcript, created_at, duration_seconds, file_url, speaker_mapping, transcript_with_timestamps')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (recordingsError) throw recordingsError;

      const combined = [
        ...(inPersonData || []).map(m => ({ ...m, type: 'presencial' as const })),
        ...(recordingsData || []).map(m => ({ ...m, type: 'online' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setMeetings(combined as Meeting[]);
    } catch (error) {
      console.error('Erro ao carregar reuniões:', error);
      toast({ title: "Erro ao Carregar", description: "Não foi possível carregar as reuniões salvas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta reunião?')) return;

    try {
      const { error } = await supabase.from('in_person_meetings').delete().eq('id', id);
      if (error) throw error;

      setMeetings(meetings.filter(m => m.id !== id));
      toast({ title: "Reunião Excluída", description: "A reunião foi removida com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir reunião:', error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir a reunião", variant: "destructive" });
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
        <div className="text-center py-12 text-gray-500">Carregando reuniões...</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gravações</h1>
          <p className="text-sm text-gray-500">
            {meetings.length > 0 ? `${meetings.length} reunião(ões) salva(s)` : 'Nenhuma reunião gravada ainda'}
          </p>
        </div>

        {meetings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
            <div className="p-4 rounded-2xl w-fit mx-auto mb-4" style={{ backgroundColor: `${FLOW_COLOR}10` }}>
              <FileText className="h-10 w-10" style={{ color: FLOW_COLOR }} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma gravação</h3>
            <p className="text-gray-500">Suas reuniões gravadas aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <div 
                key={meeting.id} 
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{meeting.title}</h3>
                      {meeting.type && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs shrink-0"
                          style={{
                            backgroundColor: meeting.type === 'online' ? `${FLOW_COLOR}15` : '#10B98115',
                            color: meeting.type === 'online' ? FLOW_COLOR : '#10B981'
                          }}
                        >
                          {meeting.type === 'online' ? '🎥 Online' : '🎙️ Presencial'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(meeting.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(meeting.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {meeting.duration_seconds > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(meeting.duration_seconds)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {meeting.transcript ? meeting.transcript.substring(0, 150) + '...' : 'Transcrição em processamento...'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedMeeting(meeting); setShowDownloadModal(true); }}
                      className="gap-1.5 rounded-xl"
                    >
                      <Download className="h-4 w-4" />
                      Baixar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMeeting(meeting.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMeeting && (
        <SavedMeetingDownloadModal
          isOpen={showDownloadModal}
          onClose={() => { setShowDownloadModal(false); setSelectedMeeting(null); }}
          meeting={selectedMeeting}
        />
      )}
    </div>
  );
};

export default SavedMeetings;
