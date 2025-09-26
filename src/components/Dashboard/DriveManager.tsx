import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FolderPlus, 
  Upload, 
  Search, 
  MoreHorizontal,
  Folder,
  File,
  Download,
  Trash2,
  Edit3,
  Share2,
  Grid3X3,
  List,
  SortAsc,
  Filter,
  Star,
  Clock,
  Eye,
  ArrowLeft,
  Home,
  Link,
  Archive
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';

interface DriveFile {
  id: string;
  name: string;
  file_type: string;
  file_size?: number;
  file_url?: string;
  created_at: string;
  created_by: string;
  folder_id?: string;
  tags?: string[];
  description?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  created_by: string;
  parent_folder_id?: string;
}

const DriveManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Array<{id: string, name: string}>>([]);
  
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

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
      }
    };
    
    fetchCompanyId();
  }, [user?.id]);

  // Load data
  useEffect(() => {
    if (companyId) {
      loadFolders();
      loadFiles();
    }
  }, [companyId, currentFolder]);

  const loadFolders = async () => {
    if (!companyId) return;

    let query = supabase
      .from('document_folders')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (currentFolder === null) {
      // Root level
      query = query.is('parent_folder_id', null);
    } else {
      query = query.eq('parent_folder_id', currentFolder);
    }

    const { data, error } = await query;
    
    if (!error) setFolders(data || []);
    setLoading(false);
  };

  const loadFiles = async () => {
    if (!companyId) return;

    let query = supabase
      .from('documents')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (currentFolder === null) {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', currentFolder);
    }

    const { data, error } = await query;
    
    if (!error) setFiles(data || []);
  };
  const createFolder = async () => {
    if (!user?.id || !companyId) return;

    const { error } = await supabase
      .from('document_folders')
      .insert({
        ...folderForm,
        parent_folder_id: currentFolder,
        company_id: companyId,
        created_by: user.id
      });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar pasta',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: 'Pasta criada com sucesso!'
    });

    setFolderForm({ name: '', description: '', color: '#3B82F6' });
    setShowCreateFolder(false);
    loadFolders();
  };

  // File upload with drag and drop
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      for (const file of acceptedFiles) {
        await uploadFile(file);
      }
    }
  });

  const uploadFile = async (file: File) => {
    if (!user?.id || !companyId) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${companyId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: 'Erro no upload',
        description: uploadError.message,
        variant: 'destructive'
      });
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Save to database
    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl,
        folder_id: currentFolder,
        company_id: companyId,
        created_by: user.id
      });

    if (dbError) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar arquivo no banco de dados',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: `${file.name} foi enviado com sucesso!`
    });

    loadFiles();
  };

  // Share folder or file
  const generateShareableLink = async (item: DriveFile | DriveFolder, type: 'file' | 'folder') => {
    const baseUrl = window.location.origin;
    const shareId = `${type}-${item.id}`;
    const shareUrl = `${baseUrl}/shared/${shareId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copiado!',
        description: `Link compartilhável copiado para a área de transferência`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o link',
        variant: 'destructive',
      });
    }
  };

  // Download folder as ZIP
  const downloadFolderAsZip = async (folder: DriveFolder) => {
    try {
      // Dynamic import JSZip
      const JSZip = (await import('jszip')).default;
      
      // Get all files in the folder
      const { data: folderFiles, error } = await supabase
        .from('documents')
        .select('*')
        .eq('folder_id', folder.id)
        .eq('company_id', companyId);

      if (error) throw error;

      if (!folderFiles || folderFiles.length === 0) {
        toast({
          title: 'Pasta vazia',
          description: 'Esta pasta não contém arquivos para download',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Preparando download...',
        description: `Preparando ${folderFiles.length} arquivos para download`,
      });

      const zip = new JSZip();

      // Add files to ZIP
      for (const file of folderFiles) {
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

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download ZIP file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${folder.name}.zip`;
      link.click();

      // Clean up
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

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            <File className="inline-block mr-2 h-8 w-8" />
            Arquivos
          </h1>
          <p className="text-base text-gray-600 mt-2">
            Organize seus arquivos e documentos de forma inteligente
          </p>
          
          {/* Breadcrumb Navigation */}
          {folderPath.length > 0 && (
            <nav className="flex items-center space-x-2 mt-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setCurrentFolder(null);
                  setFolderPath([]);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                <Home className="h-4 w-4 mr-1" />
                Início
              </Button>
              {folderPath.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  <span className="text-gray-400">/</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentFolder(folder.id);
                      setFolderPath(folderPath.slice(0, index + 1));
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {folder.name}
                  </Button>
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Pasta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome da pasta</Label>
                  <Input
                    value={folderForm.name}
                    onChange={(e) => setFolderForm({...folderForm, name: e.target.value})}
                    placeholder="Digite o nome da pasta"
                  />
                </div>
                
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={folderForm.description}
                    onChange={(e) => setFolderForm({...folderForm, description: e.target.value})}
                    placeholder="Descreva o conteúdo desta pasta"
                  />
                </div>
                
                <div>
                  <Label>Cor</Label>
                  <div className="flex gap-2 mt-2">
                    {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setFolderForm({...folderForm, color})}
                        className={`w-8 h-8 rounded-full border-2 ${
                          folderForm.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createFolder} disabled={!folderForm.name}>
                    Criar Pasta
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
              isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            <Button className="rounded-xl">
              <Upload className="h-4 w-4 mr-2" />
              {isDragActive ? 'Solte aqui' : 'Upload'}
            </Button>
          </div>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pesquisar arquivos e pastas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="rounded-xl"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            className="rounded-xl"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Folders */}
        {filteredFolders.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">📁 Pastas</h3>
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' : 'space-y-2'}>
              {filteredFolders.map((folder) => (
                 <Card 
                  key={folder.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow rounded-2xl"
                  onClick={() => {
                    setCurrentFolder(folder.id);
                    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
                  }}
                >
                  <CardContent className="p-4">
                    {viewMode === 'grid' ? (
                      <div className="text-center">
                        <div 
                          className="w-16 h-16 rounded-xl mx-auto mb-2 flex items-center justify-center"
                          style={{ backgroundColor: folder.color + '20' }}
                        >
                          <Folder className="h-8 w-8" style={{ color: folder.color }} />
                        </div>
                        <p className="font-medium text-sm truncate">{folder.name}</p>
                        {folder.description && (
                          <p className="text-xs text-gray-500 truncate">{folder.description}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: folder.color + '20' }}
                        >
                          <Folder className="h-5 w-5" style={{ color: folder.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{folder.name}</p>
                          {folder.description && (
                            <p className="text-sm text-gray-500">{folder.description}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {filteredFiles.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">📄 Arquivos</h3>
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' : 'space-y-2'}>
              {filteredFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-lg transition-shadow rounded-2xl group">
                  <CardContent className="p-4">
                    {viewMode === 'grid' ? (
                       <div className="text-center">
                         <div className="w-16 h-16 bg-gray-100 rounded-xl mx-auto mb-2 flex items-center justify-center text-2xl relative">
                           {getFileIcon(file.file_type)}
                           
                           {/* Share button overlay */}
                           <Button
                             size="icon"
                             variant="secondary"
                             className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                             onClick={() => generateShareableLink(file, 'file')}
                             title="Compartilhar arquivo"
                           >
                             <Link className="h-3 w-3" />
                           </Button>
                         </div>
                         <p className="font-medium text-sm truncate">{file.name}</p>
                         <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                         
                         <div className="flex justify-center gap-1 mt-2">
                           {file.file_url && (
                             <>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-6 w-6 text-blue-600 hover:text-blue-700"
                                 onClick={() => window.open(file.file_url, '_blank')}
                                 title="Visualizar"
                               >
                                 <Eye className="h-3 w-3" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-6 w-6 text-green-600 hover:text-green-700"
                                 onClick={() => {
                                   const link = document.createElement('a');
                                   link.href = file.file_url!;
                                   link.download = file.name;
                                   link.click();
                                 }}
                                 title="Baixar"
                               >
                                 <Download className="h-3 w-3" />
                               </Button>
                             </>
                           )}
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-6 w-6 text-red-600 hover:text-red-700"
                             onClick={() => {
                               if (confirm('Deseja excluir este arquivo?')) {
                                 console.log('Excluir arquivo:', file.id);
                               }
                             }}
                             title="Excluir"
                           >
                             <Trash2 className="h-3 w-3" />
                           </Button>
                         </div>
                       </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">{getFileIcon(file.file_type)}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(file.file_size)}</p>
                        </div>
                       <div className="flex gap-1">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                             onClick={() => generateShareableLink(file, 'file')}
                             title="Compartilhar"
                           >
                             <Link className="h-4 w-4" />
                           </Button>
                           {file.file_url && (
                             <>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8"
                                 onClick={() => window.open(file.file_url, '_blank')}
                                 title="Visualizar"
                               >
                                 <Eye className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8"
                                 onClick={() => {
                                   const link = document.createElement('a');
                                   link.href = file.file_url!;
                                   link.download = file.name;
                                   link.click();
                                 }}
                                 title="Baixar"
                               >
                                 <Download className="h-4 w-4" />
                               </Button>
                             </>
                           )}
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-red-600 hover:text-red-700"
                             onClick={() => {
                               if (confirm('Deseja excluir este arquivo?')) {
                                 console.log('Excluir arquivo:', file.id);
                               }
                             }}
                             title="Excluir"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredFiles.length === 0 && filteredFolders.length === 0 && !searchTerm && (
          <Card className="border-none shadow-lg rounded-2xl">
            <CardContent className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <File className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Seu DRIVE está vazio
              </h3>
              <p className="text-gray-500 mb-6">
                Comece criando uma pasta ou fazendo upload de seus primeiros arquivos
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setShowCreateFolder(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Criar Pasta
                </Button>
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Arquivo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DriveManager;