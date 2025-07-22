
import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  FileText, 
  Folder, 
  MoreHorizontal, 
  Search,
  Grid3X3,
  List,
  Plus,
  Download,
  Share,
  Trash2,
  Star,
  Clock,
  Tag,
  FolderPlus,
  File
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  lastModified: string;
  starred: boolean;
  tags: string[];
  mimeType?: string;
}

const DocumentsManager = () => {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Contrato Cliente A',
      type: 'file',
      size: '2.4 MB',
      lastModified: '2 dias atrás',
      starred: true,
      tags: ['Contrato', 'Importante'],
      mimeType: 'application/pdf'
    },
    {
      id: '2',
      name: 'Apresentação Q4',
      type: 'file',
      size: '15.2 MB',
      lastModified: '1 semana atrás',
      starred: false,
      tags: ['Apresentação'],
      mimeType: 'application/vnd.ms-powerpoint'
    },
    {
      id: '3',
      name: 'Pasta de Projetos',
      type: 'folder',
      lastModified: '3 dias atrás',
      starred: false,
      tags: ['Projetos']
    }
  ]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      const newDoc: Document = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: 'file',
        size: formatFileSize(file.size),
        lastModified: 'Agora',
        starred: false,
        tags: [],
        mimeType: file.type
      };
      
      setDocuments(prev => [...prev, newDoc]);
    });
    
    toast({
      title: "Arquivos enviados",
      description: `${files.length} arquivo(s) foram adicionados com sucesso.`,
    });
  }, [toast]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const newDoc: Document = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: 'file',
        size: formatFileSize(file.size),
        lastModified: 'Agora',
        starred: false,
        tags: [],
        mimeType: file.type
      };
      
      setDocuments(prev => [...prev, newDoc]);
    });
    
    toast({
      title: "Arquivos enviados",
      description: `${files.length} arquivo(s) foram adicionados com sucesso.`,
    });
  };

  const createNewFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: Document = {
        id: Date.now().toString(),
        name: newFolderName,
        type: 'folder',
        lastModified: 'Agora',
        starred: false,
        tags: []
      };
      
      setDocuments(prev => [...prev, newFolder]);
      setNewFolderName('');
      setShowNewFolderDialog(false);
      
      toast({
        title: "Pasta criada",
        description: `A pasta "${newFolderName}" foi criada com sucesso.`,
      });
    }
  };

  const toggleStar = (id: string) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === id ? { ...doc, starred: !doc.starred } : doc
      )
    );
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: "Item excluído",
      description: "O item foi excluído com sucesso.",
    });
  };

  const getFileIcon = (mimeType?: string, type?: string) => {
    if (type === 'folder') return <Folder className="h-8 w-8 text-blue-500" />;
    
    if (mimeType?.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (mimeType?.includes('image')) return <File className="h-8 w-8 text-green-500" />;
    if (mimeType?.includes('presentation')) return <File className="h-8 w-8 text-orange-500" />;
    
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documentos</h1>
          <p className="text-base text-gray-600 mt-2">Gerencie seus arquivos e pastas</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 rounded-xl"
            />
          </div>
          
          <div className="flex items-center gap-2">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={handleFileUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Upload de Arquivo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNewFolderDialog(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Pasta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-900 mb-2">
          Arraste arquivos aqui ou clique para enviar
        </p>
        <p className="text-base text-gray-600 mb-4">
          Suporta PDFs, imagens, documentos e apresentações
        </p>
        <Button onClick={handleFileUpload} className="rounded-xl">
          Selecionar Arquivos
        </Button>
      </div>

      {/* Documents Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  {getFileIcon(doc.mimeType, doc.type)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => toggleStar(doc.id)}>
                        <Star className={`h-4 w-4 mr-2 ${doc.starred ? 'fill-yellow-400' : ''}`} />
                        {doc.starred ? 'Remover favorito' : 'Adicionar aos favoritos'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share className="h-4 w-4 mr-2" />
                        Compartilhar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteDocument(doc.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{doc.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-3 w-3" />
                    {doc.lastModified}
                  </div>
                  {doc.size && (
                    <p className="text-sm text-gray-500">{doc.size}</p>
                  )}
                  
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-gray-100 text-gray-700 rounded-full">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-none shadow-lg rounded-2xl bg-white">
          <CardContent className="p-0">
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {getFileIcon(doc.mimeType, doc.type)}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{doc.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{doc.lastModified}</span>
                        {doc.size && <span>{doc.size}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {doc.tags.length > 0 && (
                      <div className="flex gap-1">
                        {doc.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-gray-100 text-gray-700 rounded-full">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleStar(doc.id)}
                      className="rounded-xl"
                    >
                      <Star className={`h-4 w-4 ${doc.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share className="h-4 w-4 mr-2" />
                          Compartilhar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteDocument(doc.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Criar Nova Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name" className="text-base font-medium">Nome da Pasta</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Digite o nome da pasta..."
                className="mt-2 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewFolderDialog(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button onClick={createNewFolder} className="rounded-xl">
                Criar Pasta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default DocumentsManager;
