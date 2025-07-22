
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Edit
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
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOver, setDragOver] = useState(false);

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

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div>
          <h1 className="text-3xl font-bold mb-2">Documentos</h1>
          <p className="text-gray-600">Gerencie seus arquivos e documentos</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse border-none shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded-xl"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Documentos
          </h1>
          <p className="text-gray-600 text-lg">
            Gerencie seus arquivos e documentos de forma organizada
          </p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Pasta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="folderName">Nome da pasta</Label>
                  <Input
                    id="folderName"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Digite o nome da pasta"
                    className="rounded-xl"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowNewFolderDialog(false)} className="rounded-xl">
                    Cancelar
                  </Button>
                  <Button onClick={createFolder} className="rounded-xl">
                    Criar Pasta
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Enviar Arquivo
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

      {/* Search and Filters */}
      <Card className="border-none shadow-lg rounded-2xl bg-white">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar documentos e pastas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-gray-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className={`h-16 w-16 mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {dragOver ? 'Solte os arquivos aqui' : 'Arraste e solte seus arquivos'}
        </h3>
        <p className="text-gray-600 mb-4">
          Ou clique no botão "Enviar Arquivo" acima
        </p>
        <p className="text-sm text-gray-500">
          Suporta todos os tipos de arquivo
        </p>
      </div>

      {/* Folders and Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Back Button */}
        {currentFolder && (
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-none shadow-lg rounded-2xl bg-white transform hover:scale-105"
            onClick={() => setCurrentFolder(null)}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">⬅️</div>
              <p className="font-medium text-gray-700">Voltar</p>
            </CardContent>
          </Card>
        )}

        {/* Folders */}
        {filteredFolders.map((folder) => (
          <Card 
            key={folder.id}
            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-none shadow-lg rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 transform hover:scale-105"
            onClick={() => setCurrentFolder(folder.id)}
          >
            <CardContent className="p-6 text-center">
              <Folder className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
              <p className="font-medium text-gray-900 truncate">{folder.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(folder.created_at).toLocaleDateString('pt-BR')}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Documents */}
        {filteredDocuments.map((doc) => (
          <Card 
            key={doc.id}
            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-none shadow-lg rounded-2xl bg-white transform hover:scale-105"
          >
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">{getFileIcon(doc.file_type)}</div>
                <p className="font-medium text-gray-900 truncate mb-1">{doc.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(doc.file_size)}</p>
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => window.open(doc.file_url, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = doc.file_url;
                    link.download = doc.name;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>

              {doc.tags && doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 justify-center">
                  {doc.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs rounded-full">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredFolders.length === 0 && filteredDocuments.length === 0 && !loading && (
        <div className="text-center py-16">
          <File className="h-24 w-24 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum documento ainda'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {searchTerm 
              ? 'Tente ajustar sua busca ou remover filtros' 
              : 'Comece enviando seus primeiros arquivos ou criando pastas para organizá-los'
            }
          </p>
          {!searchTerm && (
            <Button 
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Enviar Primeiro Arquivo
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentsManager;
