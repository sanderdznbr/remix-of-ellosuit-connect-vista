import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Calendar, Clock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<MeetingRecording | null>(null);
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

  const handleDeleteClick = (recording: MeetingRecording) => {
    setRecordingToDelete(recording);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordingToDelete) return;
    
    setDeletingId(recordingToDelete.id);
    
    try {
      // Delete from database
      const { error } = await supabase
        .from('meeting_recordings')
        .delete()
        .eq('id', recordingToDelete.id);

      if (error) throw error;

      // Update local state
      setRecordings(prev => prev.filter(r => r.id !== recordingToDelete.id));

      toast({
        title: "Transcrição Excluída",
        description: "A transcrição foi excluída com sucesso",
      });
    } catch (error) {
      console.error('Erro ao excluir transcrição:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a transcrição",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
      setShowDeleteDialog(false);
      setRecordingToDelete(null);
    }
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
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Transcrições de Reuniões</h2>
          <p className="text-sm text-muted-foreground">
            {recordings.length} transcrição(ões) disponível(eis)
          </p>
        </div>

        {recordings.map((recording) => (
          <Card key={recording.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
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

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => downloadTranscript(recording)}
                  size="sm"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
                <Button
                  onClick={() => handleDeleteClick(recording)}
                  size="sm"
                  variant="destructive"
                  disabled={deletingId === recording.id}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a transcrição de "{recordingToDelete?.meeting_rooms.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MeetingTranscriptions;
