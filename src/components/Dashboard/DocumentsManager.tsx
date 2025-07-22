
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  Search, 
  FolderPlus, 
  FileText, 
  Image as ImageIcon, 
  FileVideo,
  Download,
  Eye,
  MoreVertical,
  Grid3X3,
  List,
  Filter,
  Folder,
  ArrowLeft,
  X
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url?: string;
  tags: string[];
  description?: string;
  created_at: string;
  folder_id?: string;
}

interface Folder {
  id: string;
  name: string;
  created_at: string;
  parent_folder_id?: string;
}

const DocumentsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Form states
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');

  useEffect(() => {
    if (user) {
      loadCompanyAndData();
    }
  }, [user]);

  useEffect(() => {
    if (companyId) {
      loadFolderData();
    }
  }, [currentFolderId, companyId]);

  const loadCompanyAndData = async () => {
    try {
      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!companyUser) {
        toast({
          title: "Erro",
          description: "Usuário não está associado a nenhuma empresa",
          variant: "destructive"
        });
        return;
      }

      setCompanyId(companyUser.company_id);
    } catch (error) {
      console.error('Error loading company:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da empresa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFolderData = async () => {
    if (!companyId) return;

    try {
      // Load current folder info
      if (currentFolderId) {
        const { data: folderData } = await supabase
          .from('document_folders')
          .select('*')
          .eq('id', currentFolderId)
          .single();
        
        setCurrentFolder(folderData);
        await buildFolderPath(folderData);
      } else {
        setCurrentFolder(null);
        setFolderPath([]);
      }

      // Load folders in current directory
      const { data: foldersData } = await supabase
        .from('document_folders')
        .select('*')
        .eq('company_id', companyId)
        .is('parent_folder_id', currentFolderId)
        .order('name');

      setFolders(foldersData || []);

      // Load documents in current directory
      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .is('folder_id', currentFolderId)
        .order('created_at', { ascending: false });

      setDocuments(documentsData || []);
    } catch (error) {
      console.error('Error loading folder data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da pasta",
        variant: "destructive"
      });
    }
  };

  const buildFolderPath = async (folder: Folder) => {
    const path: Folder[] = [folder];
    let current = folder;

    while (current.parent_folder_id) {
      const { data: parentFolder } = await supabase
        .from('document_folders')
        .select('*')
        .eq('id', current.parent_folder_id)
        .single();
      
      if (parentFolder) {
        path.unshift(parentFolder);
        current = parentFolder;
      } else {
        break;
      }
    }

    setFolderPath(path);
  };

  const handleCreateFolder = async () => {
    if (!companyId || !user?.id || !newFolderName.trim()) return;

    try {
      const { error } = await supabase
        .from('document_folders')
        .insert([{
          name: newFolderName.trim(),
          company_id: companyId,
          created_by: user.id,
          parent_folder_id: currentFolderId
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pasta criada com sucesso!"
      });

      setIsFolderModalOpen(false);
      setNewFolderName('');
      await loadFolderData();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar pasta",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async () => {
    if (!companyId || !user?.id || !uploadFiles || uploadFiles.length === 0) return;

    try {
      const fileUploads = Array.from(uploadFiles).map(async (file) => {
        return {
          name: file.name,
          file_type: file.type,
          file_size: file.size,
          company_id: companyId,
          created_by: user.id,
          folder_id: currentFolderId,
          description: uploadDescription || null,
          tags: uploadTags ? uploadTags.split(',').map(tag => tag.trim()) : []
        };
      });

      const documentsToInsert = await Promise.all(fileUploads);

      const { error } = await supabase
        .from('documents')
        .insert(documentsToInsert);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${uploadFiles.length} arquivo(s) enviado(s) com sucesso!`
      });

      setIsUploadModalOpen(false);
      setUploadFiles(null);
      setUploadDescription('');
      setUploadTags('');
      await loadFolderData();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar arquivos",
        variant: "destructive"
      });
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploadFiles(files);
      setIsUploadModalOpen(true);
    }
  }, []);

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (type.includes('video')) return <FileVideo className="h-8 w-8 text-purple-500" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      className={`p-6 space-y-6 min-h-screen transition-colors ${
        isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="fixed inset-0 bg-blue-50/80 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-dashed border-blue-300">
            <Upload className="h-16 w-16 mx-auto text-blue-500 mb-4" />
            <p className="text-xl font-medium text-gray-900">Solte os arquivos aqui</p>
            <p className="text-gray-600">para fazer upload</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus arquivos e documentos</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Pasta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="folder-name">Nome da Pasta</Label>
                  <Input 
                    id="folder-name" 
                    placeholder="Digite o nome da pasta..."
                    className="rounded-xl mt-1"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => {
                    setIsFolderModalOpen(false);
                    setNewFolderName('');
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                    Criar Pasta
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle>Upload de Arquivo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setUploadFiles(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Selecionar Arquivos
                  </Button>
                </div>

                {uploadFiles && uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Arquivos selecionados:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {Array.from(uploadFiles).map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <span className="truncate">{file.name}</span>
                          <span className="text-gray-500">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Descreva os arquivos..."
                    className="rounded-xl mt-1"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input 
                    id="tags" 
                    placeholder="Separar por vírgula..."
                    className="rounded-xl mt-1"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadFiles(null);
                    setUploadDescription('');
                    setUploadTags('');
                  }}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleFileUpload} 
                    disabled={!uploadFiles || uploadFiles.length === 0}
                  >
                    Upload
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {folderPath.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCurrentFolderId(null)}
            className="h-8 px-2"
          >
            Início
          </Button>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span>/</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCurrentFolderId(folder.id)}
                className="h-8 px-2"
                disabled={index === folderPath.length - 1}
              >
                {folder.name}
              </Button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos e pastas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        
        <div className="flex gap-2">
          {currentFolderId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentFolderId(null)}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          
          <div className="flex rounded-xl border overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Folders */}
          {filteredFolders.map((folder) => (
            <Card 
              key={folder.id} 
              className="rounded-2xl hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setCurrentFolderId(folder.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Folder className="h-12 w-12 text-blue-500" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Abrir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="font-medium text-sm mb-2 truncate" title={folder.name}>
                  {folder.name}
                </h3>
                
                <div className="text-xs text-muted-foreground">
                  Criada em {new Date(folder.created_at).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Documents */}
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="rounded-2xl hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  {getFileIcon(doc.file_type)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="font-medium text-sm mb-2 truncate" title={doc.name}>
                  {doc.name}
                </h3>
                
                <div className="space-y-2">
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {filteredFolders.length === 0 && filteredDocuments.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Upload className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Pasta vazia'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Tente ajustar os termos de busca' 
                  : 'Faça upload de arquivos ou crie uma nova pasta'
                }
              </p>
              {!searchTerm && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setIsUploadModalOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload de Arquivos
                  </Button>
                  <Button variant="outline" onClick={() => setIsFolderModalOpen(true)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Nova Pasta
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            {filteredFolders.length === 0 && filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Nenhum resultado encontrado' : 'Pasta vazia'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca' 
                    : 'Faça upload de arquivos ou crie uma nova pasta'
                  }
                </p>
                {!searchTerm && (
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setIsUploadModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload de Arquivos
                    </Button>
                    <Button variant="outline" onClick={() => setIsFolderModalOpen(true)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Nova Pasta
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {/* Folders */}
                {filteredFolders.map((folder) => (
                  <div 
                    key={folder.id} 
                    className="p-4 flex items-center gap-4 hover:bg-accent/50 cursor-pointer"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <Folder className="h-10 w-10 text-blue-500" />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{folder.name}</h3>
                      <div className="text-sm text-muted-foreground">
                        Pasta • Criada em {new Date(folder.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Abrir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {/* Documents */}
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center gap-4 hover:bg-accent/50">
                    {getFileIcon(doc.file_type)}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{doc.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{doc.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentsManager;
