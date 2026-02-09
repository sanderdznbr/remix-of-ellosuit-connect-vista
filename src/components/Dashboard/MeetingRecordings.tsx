import React, { useState, useEffect } from 'react';
import { Play, Download, Trash2, Search, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MeetingRecording {
  id: string;
  title: string;
  file_url: string;
  file_size: number;
  duration_seconds: number;
  transcript?: string;
  created_at: string;
  created_by: string;
  room_id: string;
  room?: {
    title: string;
    room_code: string;
  };
}

const MeetingRecordings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecording, setSelectedRecording] = useState<MeetingRecording | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<MeetingRecording | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data?.company_id) {
        setCompanyId(data.company_id);
      } else {
        setLoading(false);
      }
    };
    
    fetchCompanyId();
  }, [user?.id]);

  const loadRecordings = async () => {
    if (!companyId) return;
    
    try {
      console.log('🔍 [MeetingRecordings] Loading recordings for company:', companyId);
      
      const { data, error } = await supabase
        .from('meeting_recordings')
        .select(`
          *,
          room:meeting_rooms(title, room_code)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [MeetingRecordings] Error loading recordings:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar gravações',
          variant: 'destructive'
        });
        return;
      }
      
      console.log('✅ [MeetingRecordings] Loaded recordings:', data?.length || 0);
      console.log('📹 [MeetingRecordings] Recordings data:', data);
      
      setRecordings(data || []);
    } catch (error) {
      console.error('❌ [MeetingRecordings] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadRecordings();
    }
  }, [companyId]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  // Resolve a playable URL for a recording (handles private bucket)
  const resolveRecordingUrl = async (fileUrl: string): Promise<string> => {
    if (!fileUrl) {
      console.error('❌ No file URL provided');
      return '';
    }
    
    console.log('🔍 Original file URL:', fileUrl);
    
    // If it's already a full URL, return it
    if (fileUrl.startsWith('http')) {
      console.log('✅ Already a full URL, returning as-is');
      return fileUrl;
    }
    
    // Extract the path after the bucket name
    let pathOnly = fileUrl;
    
    // Handle various path formats
    if (fileUrl.includes('/meeting-recordings/')) {
      // Format: "https://...storage.../meeting-recordings/file.webm"
      pathOnly = fileUrl.split('/meeting-recordings/')[1];
    } else if (fileUrl.startsWith('meeting-recordings/')) {
      // Format: "meeting-recordings/file.webm"
      pathOnly = fileUrl.replace('meeting-recordings/', '');
    }
    // else: already just the file name/path
    
    console.log('🎯 Path to resolve:', pathOnly);
    
    const { data, error } = await supabase.storage
      .from('meeting-recordings')
      .createSignedUrl(pathOnly, 60 * 60); // 1 hour expiry
    
    if (error) {
      console.error('❌ Error creating signed URL:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível acessar a gravação',
        variant: 'destructive'
      });
      return '';
    }
    
    if (!data?.signedUrl) {
      console.error('❌ No signed URL returned');
      return '';
    }
    
    console.log('✅ Signed URL created successfully');
    
    return data.signedUrl;
  };

  const filteredRecordings = recordings.filter(recording =>
    recording.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recording.room?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recording.room?.room_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const playRecording = async (recording: MeetingRecording) => {
    setSelectedRecording(recording);
    const url = await resolveRecordingUrl(recording.file_url);
    if (!url) {
      toast({ title: 'Arquivo indisponível', description: 'Não foi possível abrir esta gravação.', variant: 'destructive' });
      return;
    }
    setPlaybackUrl(url);
    setShowPlayer(true);
  };

  const downloadRecording = async (recording: MeetingRecording) => {
    try {
      const url = await resolveRecordingUrl(recording.file_url);
      if (!url) throw new Error('URL inválida');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${recording.title}.webm`;
      link.click();
      toast({ title: 'Download iniciado', description: 'O download da gravação foi iniciado' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao baixar gravação', variant: 'destructive' });
    }
  };

  const handleDeleteClick = (recording: MeetingRecording) => {
    setRecordingToDelete(recording);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordingToDelete) return;
    
    setDeletingId(recordingToDelete.id);
    
    try {
      // Delete file from storage
      if (recordingToDelete.file_url) {
        const fileName = recordingToDelete.file_url.replace('meeting-recordings/', '').split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('meeting-recordings')
            .remove([fileName]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('meeting_recordings')
        .delete()
        .eq('id', recordingToDelete.id);

      if (error) throw error;

      // Update local state
      setRecordings(prev => prev.filter(r => r.id !== recordingToDelete.id));

      toast({
        title: "Gravação Excluída",
        description: "A gravação foi excluída com sucesso",
      });
    } catch (error) {
      console.error('Erro ao excluir gravação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a gravação",
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
      <div className="min-h-[400px] flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Carregando gravações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gravações das Reuniões</h1>
          <p className="text-gray-600">
            Acesse e gerencie o histórico de gravações das suas reuniões
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar gravações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Recordings Grid */}
      {filteredRecordings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhuma gravação encontrada' : 'Nenhuma gravação disponível'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Tente ajustar os termos de busca'
                : 'As gravações das reuniões aparecerão aqui quando habilitadas'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto">
          {filteredRecordings.map((recording) => (
            <Card key={recording.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {recording.title}
                    </CardTitle>
                    {recording.room && (
                      <p className="text-sm text-gray-600 mt-1">
                        Sala: {recording.room.title} ({recording.room.room_code})
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {formatFileSize(recording.file_size)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(recording.duration_seconds)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(recording.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                  
                  {recording.transcript && (
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {recording.transcript}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {recording.file_url ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => playRecording(recording)}
                          className="flex-1"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Reproduzir
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadRecording(recording)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                        <span className="text-sm font-medium">Processando...</span>
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteClick(recording)}
                      disabled={deletingId === recording.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedRecording?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedRecording && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={playbackUrl || selectedRecording.file_url}
                  controls
                  className="w-full h-full"
                  poster=""
                >
                  Seu navegador não suporta reprodução de vídeo.
                </video>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Duração:</span>
                  <div className="font-medium">{formatDuration(selectedRecording.duration_seconds)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Tamanho:</span>
                  <div className="font-medium">{formatFileSize(selectedRecording.file_size)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Data:</span>
                  <div className="font-medium">
                    {format(new Date(selectedRecording.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Sala:</span>
                  <div className="font-medium">{selectedRecording.room?.room_code}</div>
                </div>
              </div>
              
              {selectedRecording.transcript && (
                <div>
                  <h4 className="font-medium mb-2">Transcrição:</h4>
                  <ScrollArea className="max-h-40 bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-700">
                      {selectedRecording.transcript}
                    </p>
                  </ScrollArea>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => downloadRecording(selectedRecording)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
                <Button onClick={() => setShowPlayer(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a gravação "{recordingToDelete?.title}"? 
              Esta ação não pode ser desfeita e o arquivo será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MeetingRecordings;