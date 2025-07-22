import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  Upload, 
  File, 
  Folder, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Plus,
  FolderPlus,
  MoreHorizontal,
  Eye,
  Edit,
  Grid3X3,
  List,
  Star,
  Clock,
  User,
  ArrowLeft,
  Tag,
  Move,
  Copy,
  Share
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  folder_id: string | null;
  tags: string[];
  description: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface DocumentFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  created_by: string;
}

const DocumentsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [selectedDocumentForTags, setSelectedDocumentForTags] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (user) {
      loadDocuments();
      loadFolders();
    }
  }, [user, currentFolder]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!companyUser) {
        setDocuments([]);
        return;
      }

      let query = supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });

      if (currentFolder) {
        query = query.eq('folder_id', currentFolder);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!companyUser) {
        setFolders([]);
        return;
      }

      let query = supabase
        .from('document_folders')
        .select('*')
        .eq('company_id', companyUser.company_id)
        .order('name', { ascending: true });

      if (currentFolder) {
        query = query.eq('parent_folder_id', currentFolder);
      } else {
        query = query.is('parent_folder_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error loading folders:', error);
      setFolders([]);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

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
          description: "Empresa não encontrada",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('document_folders')
        .insert({
          name: newFolderName,
          parent_folder_id: currentFolder,
          company_id: companyUser.company_id,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pasta criada com sucesso!"
      });

      setNewFolderName('');
      setShowNewFolderDialog(false);
      loadFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar pasta",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (files: FileList) => {
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
          description: "Empresa não encontrada",
          variant: "destructive"
        });
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `documents/${companyUser.company_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        // Save document record
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            name: file.name,
            file_type: fileExt || 'unknown',
            file_size: file.size,
            file_url: publicUrl,
            folder_id: currentFolder,
            company_id: companyUser.company_id,
            created_by: user?.id
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Sucesso",
        description: `${files.length} arquivo(s) enviado(s) com sucesso!`
      });

      loadDocuments();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar arquivos",
        variant: "destructive"
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const addTagToDocument = async () => {
    if (!selectedDocumentForTags || !newTag.trim()) return;

    try {
      const document = documents.find(doc => doc.id === selectedDocumentForTags);
      if (!document) return;

      const updatedTags = [...(document.tags || []), newTag.trim()];

      const { error } = await supabase
        .from('documents')
        .update({ tags: updatedTags })
        .eq('id', selectedDocumentForTags);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tag adicionada com sucesso!"
      });

      setNewTag('');
      setShowTagDialog(false);
      setSelectedDocumentForTags(null);
      loadDocuments();
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar tag",
        variant: "destructive"
      });
    }
  };

  const removeTag = async (documentId: string, tagToRemove: string) => {
    try {
      const document = documents.find(doc => doc.id === documentId);
      if (!document) return;

      const updatedTags = document.tags.filter(tag => tag !== tagToRemove);

      const { error } = await supabase
        .from('documents')
        .update({ tags: updatedTags })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tag removida com sucesso!"
      });

      loadDocuments();
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover tag",
        variant: "destructive"
      });
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📋';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎥';
      case 'mp3':
      case 'wav':
        return '🎵';
      case 'zip':
      case 'rar':
        return '📦';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen ml-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Google Drive Style Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="p-4 max-w-7xl mx-auto ml-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {currentFolder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFolder(null)}
                  className="hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}
              <h1 className="text-2xl font-normal text-gray-900">
                {currentFolder ? 'Pasta' : 'Meus Arquivos'}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="hover:bg-gray-100 rounded-lg"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              
              <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="hover:bg-gray-50 rounded-lg">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Nova Pasta
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-xl">
                  <DialogHeader>
                    <DialogTitle>Nova Pasta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="folderName">Nome da pasta</Label>
                      <Input
                        id="folderName"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Pasta sem título"
                        className="rounded-lg"
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setShowNewFolderDialog(false)} className="rounded-lg">
                        Cancelar
                      </Button>
                      <Button onClick={createFolder} className="rounded-lg bg-blue-600 hover:bg-blue-700">
                        Criar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                className="rounded-lg bg-blue-600 hover:bg-blue-700"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Enviar
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files);
                  }
                }}
              />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Pesquisar no Drive"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-gray-300 rounded-full bg-gray-50 hover:bg-white hover:shadow-sm focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 max-w-7xl mx-auto ml-6">
        {/* Drag and Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-2xl transition-all duration-300 ${
            dragOver 
              ? 'border-blue-500 bg-blue-50 p-8' 
              : 'border-transparent'
          } ${
            (filteredFolders.length === 0 && filteredDocuments.length === 0 && !searchTerm) 
              ? 'p-16 border-gray-300 bg-gray-50' 
              : dragOver ? 'p-8' : 'p-0'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {(filteredFolders.length === 0 && filteredDocuments.length === 0 && !searchTerm) || dragOver ? (
            <div className="text-center">
              <Upload className={`h-16 w-16 mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {dragOver ? 'Solte para fazer upload' : 'Arraste arquivos para cá'}
              </h3>
              <p className="text-gray-600 mb-6">
                Ou clique em "Enviar" para selecionar arquivos
              </p>
              <Button 
                onClick={() => document.getElementById('file-upload')?.click()}
                className="rounded-lg"
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivos
              </Button>
            </div>
          ) : (
            <>
              {/* Quick Access */}
              {!currentFolder && !searchTerm && (
                <div className="mb-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Acesso Rápido</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl border-gray-200">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Star className="h-8 w-8 text-yellow-500" />
                        <div>
                          <p className="font-medium text-gray-900">Com estrela</p>
                          <p className="text-sm text-gray-500">0 itens</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl border-gray-200">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Clock className="h-8 w-8 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">Recentes</p>
                          <p className="text-sm text-gray-500">{documents.length} itens</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl border-gray-200">
                      <CardContent className="p-4 flex items-center gap-3">
                        <User className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-900">Compartilhados</p>
                          <p className="text-sm text-gray-500">0 itens</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl border-gray-200">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Trash2 className="h-8 w-8 text-red-500" />
                        <div>
                          <p className="font-medium text-gray-900">Lixeira</p>
                          <p className="text-sm text-gray-500">0 itens</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Files and Folders */}
              {(filteredFolders.length > 0 || filteredDocuments.length > 0) && (
                <div className="space-y-4">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                      {/* Folders */}
                      {filteredFolders.map((folder) => (
                        <ContextMenu key={folder.id}>
                          <ContextMenuTrigger>
                            <div
                              className="group cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors"
                              onClick={() => setCurrentFolder(folder.id)}
                            >
                              <div className="text-center">
                                <Folder className="h-12 w-12 text-blue-500 mx-auto mb-2 group-hover:text-blue-600" />
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {folder.name}
                                </p>
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Abrir
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Renomear
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Move className="h-4 w-4 mr-2" />
                              Mover
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Share className="h-4 w-4 mr-2" />
                              Compartilhar
                            </ContextMenuItem>
                            <ContextMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}

                      {/* Documents */}
                      {filteredDocuments.map((doc) => (
                        <ContextMenu key={doc.id}>
                          <ContextMenuTrigger>
                            <div className="group cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="text-center">
                                <div className="text-4xl mb-2">{getFileIcon(doc.file_type)}</div>
                                <p className="text-sm font-medium text-gray-900 truncate mb-1">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-gray-500 mb-2">
                                  {formatFileSize(doc.file_size)}
                                </p>
                                {doc.tags && doc.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    {doc.tags.slice(0, 2).map((tag, index) => (
                                      <Badge 
                                        key={index} 
                                        variant="secondary" 
                                        className="text-xs px-1 py-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeTag(doc.id, tag);
                                        }}
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                    {doc.tags.length > 2 && (
                                      <Badge variant="outline" className="text-xs px-1 py-0">
                                        +{doc.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Baixar
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => {
                                setSelectedDocumentForTags(doc.id);
                                setShowTagDialog(true);
                              }}
                            >
                              <Tag className="h-4 w-4 mr-2" />
                              Adicionar Tag
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Renomear
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Move className="h-4 w-4 mr-2" />
                              Mover
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Share className="h-4 w-4 mr-2" />
                              Compartilhar
                            </ContextMenuItem>
                            <ContextMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* List Header */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200">
                        <div className="col-span-5">Nome</div>
                        <div className="col-span-2">Proprietário</div>
                        <div className="col-span-2">Modificado</div>
                        <div className="col-span-2">Tamanho</div>
                        <div className="col-span-1"></div>
                      </div>

                      {/* Folders */}
                      {filteredFolders.map((folder) => (
                        <ContextMenu key={folder.id}>
                          <ContextMenuTrigger>
                            <div
                              className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                              onClick={() => setCurrentFolder(folder.id)}
                            >
                              <div className="col-span-5 flex items-center gap-3">
                                <Folder className="h-5 w-5 text-blue-500" />
                                <span className="font-medium text-gray-900">{folder.name}</span>
                              </div>
                              <div className="col-span-2 text-sm text-gray-500">Você</div>
                              <div className="col-span-2 text-sm text-gray-500">
                                {new Date(folder.created_at).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="col-span-2 text-sm text-gray-500">—</div>
                              <div className="col-span-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200 rounded-full">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Abrir
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Renomear
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Move className="h-4 w-4 mr-2" />
                              Mover
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Share className="h-4 w-4 mr-2" />
                              Compartilhar
                            </ContextMenuItem>
                            <ContextMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}

                      {/* Documents */}
                      {filteredDocuments.map((doc) => (
                        <ContextMenu key={doc.id}>
                          <ContextMenuTrigger>
                            <div className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                              <div className="col-span-5 flex items-center gap-3">
                                <span className="text-xl">{getFileIcon(doc.file_type)}</span>
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-gray-900 block truncate">{doc.name}</span>
                                  {doc.tags && doc.tags.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                      {doc.tags.slice(0, 3).map((tag, index) => (
                                        <Badge 
                                          key={index} 
                                          variant="secondary" 
                                          className="text-xs px-1 py-0"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-2 text-sm text-gray-500">Você</div>
                              <div className="col-span-2 text-sm text-gray-500">
                                {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="col-span-2 text-sm text-gray-500">
                                {formatFileSize(doc.file_size)}
                              </div>
                              <div className="col-span-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200 rounded-full">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Baixar
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => {
                                setSelectedDocumentForTags(doc.id);
                                setShowTagDialog(true);
                              }}
                            >
                              <Tag className="h-4 w-4 mr-2" />
                              Adicionar Tag
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Renomear
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Move className="h-4 w-4 mr-2" />
                              Mover
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <Share className="h-4 w-4 mr-2" />
                              Compartilhar
                            </ContextMenuItem>
                            <ContextMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Empty Search Results */}
              {searchTerm && filteredFolders.length === 0 && filteredDocuments.length === 0 && (
                <div className="text-center py-16">
                  <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    Nenhum resultado encontrado
                  </h3>
                  <p className="text-gray-500">
                    Tente termos de pesquisa diferentes
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Adicionar Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newTag">Nova tag</Label>
              <Input
                id="newTag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Digite a tag"
                className="rounded-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addTagToDocument();
                  }
                }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTagDialog(false);
                  setNewTag('');
                  setSelectedDocumentForTags(null);
                }} 
                className="rounded-lg"
              >
                Cancelar
              </Button>
              <Button onClick={addTagToDocument} className="rounded-lg bg-blue-600 hover:bg-blue-700">
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsManager;
