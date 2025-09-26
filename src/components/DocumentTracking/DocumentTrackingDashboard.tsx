import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Eye, Clock, Users, BarChart, ExternalLink, Trash2 } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Estatísticas: {selectedDocument.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  {statsLoading ? (
                    <div className="text-center py-8">Carregando estatísticas...</div>
                  ) : documentStats ? (
                    <div className="space-y-6">
                                      {/* Overview Stats */}
                                      <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                          <div className="text-3xl font-bold text-blue-600">{documentStats.totalSessions}</div>
                                          <div className="text-sm text-blue-600 font-medium">Sessões Total</div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                          <div className="text-3xl font-bold text-green-600">{documentStats.uniqueVisitors}</div>
                                          <div className="text-sm text-green-600 font-medium">Visitantes Únicos</div>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                                          <div className="text-3xl font-bold text-purple-600">{documentStats.totalEvents}</div>
                                          <div className="text-sm text-purple-600 font-medium">Total de Interações</div>
                                        </div>
                                      </div>

                      {/* Page Stats */}
                      {documentStats.pageStats.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">📊 Análise Detalhada por Página</h4>
                          <div className="space-y-3">
                            {documentStats.pageStats
                              .slice(0, 10) // Show top 10 pages
                              .map((page) => (
                                <div key={page.page} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-primary">{page.page}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Página {page.page}</span>
                                      <p className="text-sm text-muted-foreground">{page.uniqueVisitors} visitante{page.uniqueVisitors !== 1 ? 's' : ''}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium">{Math.round(page.timeSpent / 60)}m {page.timeSpent % 60}s</div>
                                    <div className="text-sm text-muted-foreground">{page.views} visualizações</div>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}

                      {/* Public Link */}
                      <div>
                        <Label>Link Público do Documento</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            value={getPublicViewUrl(selectedDocument)}
                            readOnly
                            className="bg-muted"
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
                      Nenhuma estatística disponível ainda
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-none shadow-lg rounded-2xl bg-card">
              <CardContent className="p-6 text-center py-12">
                <BarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Selecione um documento para ver suas estatísticas de visualização
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