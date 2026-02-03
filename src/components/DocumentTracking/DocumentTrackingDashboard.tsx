import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Eye, Clock, Users, BarChart, ExternalLink, Trash2, RefreshCw, Calendar, Timer, MousePointer, Smartphone, Monitor, Globe } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { extractAndUploadPdfPages } from '@/utils/pdf-extractor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TrackableDocument {
  id: string;
  title: string;
  original_filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  tracking_enabled: boolean;
  public_link_id: string;
  created_at: string;
  updated_at: string;
}

interface DocumentStats {
  totalSessions: number;
  uniqueVisitors: number;
  totalEvents: number;
  pageStats: Array<{
    page: number;
    views: number;
    uniqueVisitors: number;
    timeSpent: number;
  }>;
  sessions: Array<{
    sessionId: string;
    visitorId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    pageSequence: Array<{
      page: number;
      timestamp: string;
      duration?: number;
    }>;
    totalPagesVisited: number;
    totalEvents: number;
  }>;
  recentEvents: Array<{
    event_type: string;
    page_number: number;
    timestamp: string;
    data: any;
  }>;
}

const DocumentTrackingDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile, uploading } = useFileUpload();
  const [documents, setDocuments] = useState<TrackableDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<TrackableDocument | null>(null);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trackable_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar documentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (only PDFs for now)
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Tipo de arquivo não suportado',
        description: 'Por favor, selecione um arquivo PDF',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Get company ID first
      const { data: companyUser, error: companyError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (companyError || !companyUser) {
        throw new Error('Usuário não associado a empresa');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${companyUser.company_id}/${fileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trackable-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trackable-documents')
        .getPublicUrl(uploadData.path);

      // Save document metadata
      const { data, error } = await supabase
        .from('trackable_documents')
        .insert({
          user_id: user?.id,
          company_id: companyUser.company_id,
          title: file.name.replace('.pdf', ''),
          original_filename: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          tracking_enabled: true
        })
        .select()
        .single();

      if (error) throw error;

toast({
        title: 'Sucesso',
        description: 'Documento enviado e preparado para rastreamento',
      });

      // Extract pages to images and upload to storage
      try {
        toast({ title: 'Extraindo páginas', description: 'Convertendo PDF em imagens...' });
        const pages = await extractAndUploadPdfPages(publicUrl, data.id);
        toast({ title: 'Páginas extraídas', description: `${pages} páginas processadas com sucesso.` });
      } catch (extractionError) {
        console.error('Erro na extração de páginas:', extractionError);
        // Non-blocking warning
        toast({
          title: 'Aviso',
          description: 'Não foi possível extrair as páginas agora. A visualização direta continuará funcionando.',
        });
      }

      // Show the shareable link
      const shareableUrl = `${window.location.origin}/document/${data.public_link_id}`;
      toast({
        title: 'Link Compartilhável Gerado',
        description: `Link copiado: ${shareableUrl}`,
      });

      // Copy to clipboard
      navigator.clipboard.writeText(shareableUrl);

      fetchDocuments();
      
      // Clear input
      event.target.value = '';

    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar documento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentStats = async (document: TrackableDocument) => {
    try {
      setStatsLoading(true);
      
      // Create URL with documentId parameter
      const functionUrl = `https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/document-tracking?documentId=${document.id}`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZGRpeXVlenFycHVha2F6dmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDIzNTgsImV4cCI6MjA2NjkxODM1OH0.CrUu3HGCfWh6cPfGsbDXGQNG5AWOsi9X2GGix1-7izg`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDocumentStats(data);
    } catch (error) {
      console.error('Error fetching document stats:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar estatísticas do documento',
        variant: 'destructive',
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const handleViewDocument = (document: TrackableDocument) => {
    setSelectedDocument(document);
    fetchDocumentStats(document);
  };

  const handleDeleteDocument = async (document: TrackableDocument) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      const { error } = await supabase
        .from('trackable_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Documento excluído',
      });

      fetchDocuments();
      if (selectedDocument?.id === document.id) {
        setSelectedDocument(null);
        setDocumentStats(null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir documento',
        variant: 'destructive',
      });
    }
  };

  const getPublicViewUrl = (document: TrackableDocument) => {
    return `${window.location.origin}/document/${document.public_link_id}`;
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copiado!',
      description: 'Link copiado para a área de transferência',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="page-content p-6 space-y-8 bg-muted/30 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Rastreamento de Documento</h1>
        <p className="text-base mt-2">Carregue documentos e acompanhe como os usuários interagem com eles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg rounded-2xl bg-card">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Carregar Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Atualmente suportamos apenas arquivos PDF. O documento será público e rastreável através de um link único.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label>Selecionar Arquivo PDF</Label>
                <Input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploading || loading}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card className="border-none shadow-lg rounded-2xl bg-card">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Rastreáveis ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum documento encontrado. Carregue seu primeiro documento!
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(getPublicViewUrl(doc))}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <BarChart className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteDocument(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="space-y-6">
          {selectedDocument ? (
            <>
              <Card className="border-none shadow-lg rounded-2xl bg-card">
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Estatísticas
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fetchDocumentStats(selectedDocument)}
                      disabled={statsLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${statsLoading ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{selectedDocument.title}</p>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  {statsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                      <p>Carregando estatísticas...</p>
                    </div>
                  ) : documentStats ? (
                    <div className="space-y-6">
                      {/* Overview Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-4 bg-primary/10 rounded-xl">
                          <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                          <div className="text-2xl font-bold text-primary">{documentStats.totalSessions}</div>
                          <div className="text-xs text-muted-foreground">Aberturas</div>
                        </div>
                        <div className="text-center p-4 bg-green-500/10 rounded-xl">
                          <Globe className="h-5 w-5 mx-auto mb-2 text-green-600" />
                          <div className="text-2xl font-bold text-green-600">{documentStats.uniqueVisitors}</div>
                          <div className="text-xs text-muted-foreground">Visitantes</div>
                        </div>
                        <div className="text-center p-4 bg-purple-500/10 rounded-xl">
                          <MousePointer className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                          <div className="text-2xl font-bold text-purple-600">{documentStats.totalEvents}</div>
                          <div className="text-xs text-muted-foreground">Interações</div>
                        </div>
                      </div>

                      <Tabs defaultValue="sessions" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="sessions">Sessões</TabsTrigger>
                          <TabsTrigger value="pages">Páginas</TabsTrigger>
                          <TabsTrigger value="events">Eventos</TabsTrigger>
                        </TabsList>
                        
                        {/* Sessions Tab */}
                        <TabsContent value="sessions" className="mt-4">
                          {documentStats.sessions && documentStats.sessions.length > 0 ? (
                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-3">
                                {documentStats.sessions.map((session, index) => {
                                  const sessionDuration = session.duration ? Math.round(session.duration / 1000) : 0;
                                  const sessionStartDate = session.startTime ? new Date(session.startTime) : null;
                                  
                                  return (
                                    <Card key={session.sessionId} className="p-4 border">
                                      <div className="flex justify-between items-start mb-3">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">
                                              Sessão #{index + 1}
                                            </Badge>
                                            {sessionDuration > 60 && (
                                              <Badge className="bg-green-500/10 text-green-600 text-xs">
                                                Engajado
                                              </Badge>
                                            )}
                                          </div>
                                          {sessionStartDate && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {format(sessionStartDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </p>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                                            <Timer className="h-4 w-4" />
                                            {sessionDuration > 0 ? (
                                              <>
                                                {Math.floor(sessionDuration / 60)}m {sessionDuration % 60}s
                                              </>
                                            ) : (
                                              'Em andamento'
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {session.totalPagesVisited} página{session.totalPagesVisited !== 1 ? 's' : ''}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Page Timeline */}
                                      {session.pageSequence && session.pageSequence.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">Páginas visitadas:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {session.pageSequence.slice(0, 10).map((pageInfo, pageIndex) => (
                                              <Badge 
                                                key={`${pageInfo.page}-${pageIndex}`} 
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                Pág. {pageInfo.page}
                                                {pageInfo.duration ? ` (${pageInfo.duration}s)` : ''}
                                              </Badge>
                                            ))}
                                            {session.pageSequence.length > 10 && (
                                              <Badge variant="outline" className="text-xs">
                                                +{session.pageSequence.length - 10}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </Card>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                              <p>Nenhuma sessão registrada ainda</p>
                              <p className="text-xs mt-1">Compartilhe o link para começar a rastrear</p>
                            </div>
                          )}
                        </TabsContent>

                        {/* Pages Tab */}
                        <TabsContent value="pages" className="mt-4">
                          {documentStats.pageStats && documentStats.pageStats.length > 0 ? (
                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-2">
                                {documentStats.pageStats.map((page) => (
                                  <div key={page.page} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <span className="font-bold text-primary">{page.page}</span>
                                      </div>
                                      <div>
                                        <p className="font-medium">Página {page.page}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {page.views} visualização{page.views !== 1 ? 'ões' : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="flex items-center gap-1 font-medium text-sm">
                                        <Clock className="h-3 w-3" />
                                        {page.timeSpent > 0 ? (
                                          <>{Math.floor(page.timeSpent / 60)}m {page.timeSpent % 60}s</>
                                        ) : (
                                          '--'
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {page.uniqueVisitors} visitante{page.uniqueVisitors !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                              <p>Nenhuma página visualizada ainda</p>
                            </div>
                          )}
                        </TabsContent>

                        {/* Events Tab */}
                        <TabsContent value="events" className="mt-4">
                          {documentStats.recentEvents && documentStats.recentEvents.length > 0 ? (
                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-2">
                                {documentStats.recentEvents.slice(0, 30).map((event, index) => {
                                  const eventDate = new Date(event.timestamp);
                                  const eventLabels: Record<string, { label: string, color: string }> = {
                                    'document_open': { label: 'Abriu documento', color: 'bg-green-500' },
                                    'page_view': { label: `Visualizou página ${event.page_number}`, color: 'bg-blue-500' },
                                    'page_navigation': { label: `Navegou para página ${event.page_number}`, color: 'bg-purple-500' },
                                    'time_spent': { label: `Tempo na página ${event.page_number}`, color: 'bg-orange-500' },
                                    'session_end': { label: 'Encerrou sessão', color: 'bg-red-500' },
                                    'page_leave': { label: `Saiu da página ${event.page_number}`, color: 'bg-gray-500' },
                                  };
                                  
                                  const eventInfo = eventLabels[event.event_type] || { label: event.event_type, color: 'bg-gray-500' };
                                  
                                  return (
                                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                                      <div className={`w-2 h-2 rounded-full ${eventInfo.color}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{eventInfo.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(eventDate, "dd/MM HH:mm:ss", { locale: ptBR })}
                                        </p>
                                      </div>
                                      {event.data?.duration && (
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {Math.round(event.data.duration / 1000)}s
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <BarChart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                              <p>Nenhum evento registrado ainda</p>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>

                      {/* Public Link */}
                      <div className="pt-4 border-t">
                        <Label className="text-xs text-muted-foreground">Link Público do Documento</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            value={getPublicViewUrl(selectedDocument)}
                            readOnly
                            className="bg-muted text-xs"
                          />
                          <Button 
                            onClick={() => copyToClipboard(getPublicViewUrl(selectedDocument))}
                            size="sm"
                          >
                            Copiar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma estatística disponível</p>
                      <p className="text-xs mt-1">Compartilhe o link para começar a rastrear</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-none shadow-lg rounded-2xl bg-card">
              <CardContent className="p-6 text-center py-12">
                <BarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">
                  Selecione um documento para ver estatísticas
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique no ícone de estatísticas ao lado do documento
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentTrackingDashboard;