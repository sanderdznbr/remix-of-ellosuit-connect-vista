import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  FolderPlus, 
  Upload, 
  Search, 
  Folder,
  File,
  Download,
  Trash2,
  Grid3X3,
  List,
  Star,
  Clock,
  Eye,
  Home,
  Link,
  HardDrive,
  Image,
  FileText,
  Film,
  Music,
  Archive,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  const [allFiles, setAllFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Array<{id: string, name: string}>>([]);
  const [sidebarView, setSidebarView] = useState<'drive' | 'recent' | 'starred'>('drive');
  
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
      loadAllFiles();
    }
  }, [companyId, currentFolder]);

  const loadAllFiles = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', companyId);
    setAllFiles(data || []);
  };

  const loadFolders = async () => {
    if (!companyId) return;

    let query = supabase
      .from('document_folders')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (currentFolder === null) {
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
      .order('created_at', { ascending: false });

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

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

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
    loadAllFiles();
  };

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

  const deleteFile = async (fileId: string) => {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', fileId);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir arquivo', variant: 'destructive' });
      return;
    }

    toast({ title: 'Sucesso', description: 'Arquivo excluído' });
    loadFiles();
    loadAllFiles();
  };

  const deleteFolder = async (folderId: string) => {
    const { error } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir pasta', variant: 'destructive' });
      return;
    }

    toast({ title: 'Sucesso', description: 'Pasta excluída' });
    loadFolders();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return <Image className="h-6 w-6 text-pink-500" />;
    if (fileType.includes('video')) return <Film className="h-6 w-6 text-purple-500" />;
    if (fileType.includes('audio')) return <Music className="h-6 w-6 text-green-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-6 w-6 text-amber-500" />;
    return <File className="h-6 w-6 text-blue-500" />;
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular armazenamento usado
  const totalStorage = 10 * 1024 * 1024 * 1024; // 10 GB
  const usedStorage = allFiles.reduce((acc, file) => acc + (file.file_size || 0), 0);
  const storagePercentage = (usedStorage / totalStorage) * 100;

  // Arquivos recentes
  const recentFiles = [...allFiles]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card p-4 hidden lg:flex flex-col">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-primary" />
            Meu Drive
          </h2>
        </div>

        <nav className="space-y-1 flex-1">
          <Button
            variant={sidebarView === 'drive' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setSidebarView('drive');
              setCurrentFolder(null);
              setFolderPath([]);
            }}
          >
            <Home className="h-4 w-4 mr-3" />
            Meu Drive
          </Button>
          <Button
            variant={sidebarView === 'recent' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setSidebarView('recent')}
          >
            <Clock className="h-4 w-4 mr-3" />
            Recentes
          </Button>
          <Button
            variant={sidebarView === 'starred' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setSidebarView('starred')}
          >
            <Star className="h-4 w-4 mr-3" />
            Favoritos
          </Button>
        </nav>

        {/* Storage Info */}
        <div className="mt-auto pt-6 border-t">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Armazenamento</span>
              <span className="font-medium">{formatFileSize(usedStorage)} / 10 GB</span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {storagePercentage.toFixed(1)}% utilizado
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {sidebarView === 'drive' ? 'Meu Drive' : sidebarView === 'recent' ? 'Recentes' : 'Favoritos'}
            </h1>
            
            {/* Breadcrumb */}
            {sidebarView === 'drive' && folderPath.length > 0 && (
              <nav className="flex items-center gap-1 mt-2 text-sm">
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setCurrentFolder(null);
                    setFolderPath([]);
                  }}
                >
                  Meu Drive
                </Button>
                {folderPath.map((folder, index) => (
                  <React.Fragment key={folder.id}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setCurrentFolder(folder.id);
                        setFolderPath(folderPath.slice(0, index + 1));
                      }}
                    >
                      {folder.name}
                    </Button>
                  </React.Fragment>
                ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {sidebarView === 'drive' && (
              <>
                <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
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
                              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                                folderForm.color === color ? 'border-foreground scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowCreateFolder(false)} className="flex-1">
                          Cancelar
                        </Button>
                        <Button onClick={createFolder} disabled={!folderForm.name} className="flex-1">
                          Criar Pasta
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <div
                  {...getRootProps()}
                  className={`transition-colors ${isDragActive ? 'opacity-50' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Button className="bg-primary hover:bg-primary/90">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Drag and Drop Zone */}
        {sidebarView === 'drive' && (
          <div
            {...getRootProps()}
            className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/20 hover:border-muted-foreground/40'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-muted-foreground">
              {isDragActive 
                ? 'Solte os arquivos aqui...' 
                : 'Arraste arquivos para cá ou clique para fazer upload'
              }
            </p>
          </div>
        )}

        {/* Content based on view */}
        {sidebarView === 'recent' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Arquivos Recentes</h3>
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' 
              : 'space-y-2'
            }>
              {recentFiles.map((file) => (
                <FileCard 
                  key={file.id} 
                  file={file} 
                  viewMode={viewMode}
                  getFileIcon={getFileIcon}
                  formatFileSize={formatFileSize}
                  onShare={() => generateShareableLink(file, 'file')}
                  onDelete={() => deleteFile(file.id)}
                />
              ))}
            </div>
          </div>
        ) : sidebarView === 'starred' ? (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum arquivo favoritado ainda</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Folders */}
            {filteredFolders.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Pastas</h3>
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' 
                  : 'space-y-2'
                }>
                  {filteredFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      viewMode={viewMode}
                      onClick={() => {
                        setCurrentFolder(folder.id);
                        setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
                      }}
                      onShare={() => generateShareableLink(folder, 'folder')}
                      onDelete={() => deleteFolder(folder.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Files */}
            {filteredFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Arquivos</h3>
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' 
                  : 'space-y-2'
                }>
                  {filteredFiles.map((file) => (
                    <FileCard 
                      key={file.id} 
                      file={file} 
                      viewMode={viewMode}
                      getFileIcon={getFileIcon}
                      formatFileSize={formatFileSize}
                      onShare={() => generateShareableLink(file, 'file')}
                      onDelete={() => deleteFile(file.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredFiles.length === 0 && filteredFolders.length === 0 && !searchTerm && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-6 flex items-center justify-center">
                  <HardDrive className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium mb-2">Seu Drive está vazio</h3>
                <p className="text-muted-foreground mb-6">
                  Comece criando uma pasta ou fazendo upload de arquivos
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => setShowCreateFolder(true)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Criar Pasta
                  </Button>
                  <div {...getRootProps()}>
                    <input {...getInputProps()} />
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// Componente de Card de Pasta
const FolderCard = ({ folder, viewMode, onClick, onShare, onDelete }: {
  folder: DriveFolder;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onShare: () => void;
  onDelete: () => void;
}) => {
  if (viewMode === 'grid') {
    return (
      <Card className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/50" onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-gray-800 border"
            >
              <Folder className="h-6 w-6" style={{ color: folder.color }} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
                  <Link className="h-4 w-4 mr-2" /> Compartilhar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="font-medium text-sm truncate">{folder.name}</p>
          {folder.description && (
            <p className="text-xs text-muted-foreground truncate mt-1">{folder.description}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group cursor-pointer hover:shadow-sm transition-all" onClick={onClick}>
      <CardContent className="p-3 flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: folder.color + '20' }}
        >
          <Folder className="h-5 w-5" style={{ color: folder.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{folder.name}</p>
          {folder.description && (
            <p className="text-sm text-muted-foreground truncate">{folder.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
              <Link className="h-4 w-4 mr-2" /> Compartilhar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
};

// Componente de Card de Arquivo
const FileCard = ({ file, viewMode, getFileIcon, formatFileSize, onShare, onDelete }: {
  file: DriveFile;
  viewMode: 'grid' | 'list';
  getFileIcon: (type: string) => React.ReactNode;
  formatFileSize: (bytes?: number) => string;
  onShare: () => void;
  onDelete: () => void;
}) => {
  if (viewMode === 'grid') {
    return (
      <Card className="group hover:shadow-md transition-all hover:border-primary/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
              {getFileIcon(file.file_type)}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {file.file_url && (
                  <>
                    <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                      <Eye className="h-4 w-4 mr-2" /> Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const link = document.createElement('a');
                      link.href = file.file_url!;
                      link.download = file.name;
                      link.click();
                    }}>
                      <Download className="h-4 w-4 mr-2" /> Download
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={onShare}>
                  <Link className="h-4 w-4 mr-2" /> Compartilhar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="font-medium text-sm truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatFileSize(file.file_size)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-sm transition-all">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          {getFileIcon(file.file_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-sm text-muted-foreground">{formatFileSize(file.file_size)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {file.file_url && (
              <>
                <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                  <Eye className="h-4 w-4 mr-2" /> Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const link = document.createElement('a');
                  link.href = file.file_url!;
                  link.download = file.name;
                  link.click();
                }}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={onShare}>
              <Link className="h-4 w-4 mr-2" /> Compartilhar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
};

export default DriveManager;
