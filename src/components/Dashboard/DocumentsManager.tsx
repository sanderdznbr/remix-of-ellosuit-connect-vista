import React, { useState } from 'react';
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
  Filter
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url?: string;
  tags: string[];
  description?: string;
  created_at: string;
  folder_name?: string;
}

const DocumentsManager = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  
  // Mock data
  const folders = [
    { id: '1', name: 'Contratos', count: 12 },
    { id: '2', name: 'Propostas', count: 8 },
    { id: '3', name: 'Relatórios', count: 15 },
    { id: '4', name: 'Apresentações', count: 6 }
  ];

  const documents: Document[] = [
    {
      id: '1',
      name: 'Contrato_Cliente_ABC.pdf',
      file_type: 'pdf',
      file_size: 2048000,
      tags: ['contrato', 'cliente'],
      description: 'Contrato de prestação de serviços',
      created_at: '2024-01-15',
      folder_name: 'Contratos'
    },
    {
      id: '2',
      name: 'Proposta_Comercial_2024.docx',
      file_type: 'docx',
      file_size: 1024000,
      tags: ['proposta', 'comercial'],
      created_at: '2024-01-20',
      folder_name: 'Propostas'
    },
    {
      id: '3',
      name: 'Apresentacao_Projeto.pptx',
      file_type: 'pptx',
      file_size: 5120000,
      tags: ['apresentação', 'projeto'],
      created_at: '2024-01-25',
      folder_name: 'Apresentações'
    }
  ];

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
    doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
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
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsFolderModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsFolderModalOpen(false)}>
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
                  <Button variant="outline" size="sm">
                    Selecionar Arquivos
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Descreva o arquivo..."
                    className="rounded-xl mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input 
                    id="tags" 
                    placeholder="Separar por vírgula..."
                    className="rounded-xl mt-1"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsUploadModalOpen(false)}>
                    Upload
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Folders */}
        <div className="lg:col-span-1">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Pastas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={selectedFolder === null ? 'default' : 'ghost'}
                className="w-full justify-start rounded-xl"
                onClick={() => setSelectedFolder(null)}
              >
                Todos os arquivos
              </Button>
              {folders.map((folder) => (
                <Button
                  key={folder.id}
                  variant={selectedFolder === folder.id ? 'default' : 'ghost'}
                  className="w-full justify-between rounded-xl"
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  <span>{folder.name}</span>
                  <Badge variant="secondary">{folder.count}</Badge>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredDocuments.map((doc) => (
                    <div key={doc.id} className="p-4 flex items-center gap-4 hover:bg-accent/50">
                      {getFileIcon(doc.file_type)}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doc.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                          {doc.folder_name && (
                            <>
                              <span>•</span>
                              <span>{doc.folder_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsManager;