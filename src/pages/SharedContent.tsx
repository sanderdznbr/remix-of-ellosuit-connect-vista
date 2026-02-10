import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, FileText, Folder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SharedFile {
  id: string;
  name: string;
  file_type: string;
  file_size?: number;
  file_url?: string;
  created_at: string;
}

interface SharedFolder {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  files: SharedFile[];
}

const SharedContent = () => {
  const { shareId } = useParams();
  const { toast } = useToast();
  const [content, setContent] = useState<SharedFile | SharedFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareId) {
      loadSharedContent();
    }
  }, [shareId]);

  const loadSharedContent = async () => {
    if (!shareId) return;

    try {
      setLoading(true);

      const { data: result, error } = await supabase.functions.invoke('get-shared-content', {
        body: { shareId }
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      if (result.type === 'folder') {
        setContent(result.data);
      } else {
        setContent(result.data);
      }
    } catch (error) {
      console.error('Error loading shared content:', error);
      setError('Conteúdo não encontrado ou não disponível para compartilhamento');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel')) return '📊';
    if (fileType.includes('powerpoint')) return '📈';
    return '📄';
  };

  const downloadFile = (file: SharedFile) => {
    if (file.file_url) {
      const link = document.createElement('a');
      link.href = file.file_url;
      link.download = file.name;
      link.click();
    }
  };

  const downloadFolderAsZip = async (folder: SharedFolder) => {
    try {
      const JSZip = (await import('jszip')).default;
      
      if (folder.files.length === 0) {
        toast({
          title: 'Pasta vazia',
          description: 'Esta pasta não contém arquivos para download',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Preparando download...',
        description: `Preparando ${folder.files.length} arquivos para download`,
      });

      const zip = new JSZip();

      for (const file of folder.files) {
        if (file.file_url) {
          try {
            const response = await fetch(file.file_url);
            const blob = await response.blob();
            zip.file(file.name, blob);
          } catch (error) {
            console.error(`Error adding file ${file.name} to ZIP:`, error);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${folder.name}.zip`;
      link.click();

      URL.revokeObjectURL(link.href);

      toast({
        title: 'Download concluído',
        description: `Pasta "${folder.name}" baixada como ZIP`,
      });
    } catch (error) {
      console.error('Error downloading folder as ZIP:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao baixar pasta como ZIP',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Conteúdo não encontrado</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if it's a folder or file
  const isFolder = 'files' in content;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {isFolder ? (
          // Render folder content
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: content.color + '20' }}
                    >
                      <Folder className="h-6 w-6" style={{ color: content.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{content.name}</CardTitle>
                      {content.description && (
                        <p className="text-gray-600 mt-1">{content.description}</p>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => downloadFolderAsZip(content as SharedFolder)}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Pasta (ZIP)
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  {content.files.length} arquivo{content.files.length !== 1 ? 's' : ''}
                </p>
                
                {content.files.length > 0 ? (
                  <div className="grid gap-4">
                    {content.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{getFileIcon(file.file_type)}</div>
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">{formatFileSize(file.file_size)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {file.file_url && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(file.file_url, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => downloadFile(file)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Baixar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Esta pasta está vazia</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Render single file content
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getFileIcon(content.file_type)}</div>
                  <div>
                    <CardTitle className="text-2xl">{content.name}</CardTitle>
                    <p className="text-gray-600 mt-1">{formatFileSize(content.file_size)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {content.file_url && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => window.open(content.file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </Button>
                      <Button onClick={() => downloadFile(content as SharedFile)}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Compartilhado em {new Date(content.created_at).toLocaleDateString('pt-BR')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SharedContent;