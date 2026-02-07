import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Eye, Edit, Copy, Trash2, Palette, 
  FileText, Mail, Loader2, MoreVertical, Filter,
  LayoutTemplate, Sparkles, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useEmailDesigns } from '@/hooks/useEmailDesigns';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';

const EmailTemplatesManager: React.FC = () => {
  const navigate = useNavigate();
  const { designs, loading: designsLoading, deleteDesign } = useEmailDesigns();
  const { templates, loading: templatesLoading, deleteTemplate } = useEmailTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'designs' | 'templates'>('designs');
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  const loading = designsLoading || templatesLoading;

  const filteredDesigns = designs.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDeleteDesign = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este design?')) {
      await deleteDesign(id);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      await deleteTemplate(id);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#E3480010' }}>
            <Palette className="h-6 w-6" style={{ color: '#E34800' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Templates de Email</h1>
            <p className="text-muted-foreground text-sm">Gerencie seus designs e templates de email</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/email-builder')}
          className="gap-2"
          style={{ backgroundColor: '#E34800' }}
        >
          <Plus className="h-4 w-4" />
          Criar Design
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E3480020' }}>
                <LayoutTemplate className="h-5 w-5" style={{ color: '#E34800' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#E34800' }}>{designs.length}</p>
                <p className="text-xs text-orange-600/70">Designs Visuais</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{templates.length}</p>
                <p className="text-xs text-blue-600/70">Templates HTML</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {designs.filter(d => d.is_published).length}
                </p>
                <p className="text-xs text-green-600/70">Publicados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {designs.length + templates.length}
                </p>
                <p className="text-xs text-purple-600/70">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === 'designs' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('designs')}
            className="gap-2"
          >
            <LayoutTemplate className="h-4 w-4" />
            Designs Visuais
            <Badge variant="secondary" className="ml-1">{designs.length}</Badge>
          </Button>
          <Button
            variant={activeTab === 'templates' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('templates')}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Templates HTML
            <Badge variant="secondary" className="ml-1">{templates.length}</Badge>
          </Button>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'designs' ? (
        filteredDesigns.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum design encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie templates visualmente com nosso editor drag-and-drop
              </p>
              <Button onClick={() => navigate('/dashboard/email-builder')}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Design
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDesigns.map(design => (
              <Card key={design.id} className="group hover:shadow-lg transition-all">
                <CardContent className="p-0">
                  {/* Preview Area */}
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    {design.thumbnail_url ? (
                      <img 
                        src={design.thumbnail_url} 
                        alt={design.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Mail className="h-12 w-12 text-muted-foreground/30" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => navigate(`/dashboard/email-builder?id=${design.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold truncate">{design.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(design.created_at)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/email-builder?id=${design.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteDesign(design.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {design.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {design.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {design.is_published ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">Publicado</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Rascunho</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        filteredTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Templates HTML são criados na aba de Email Marketing
              </p>
              <Button onClick={() => navigate('/dashboard/email')}>
                <Mail className="h-4 w-4 mr-2" />
                Ir para Email
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="hover:shadow-lg transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold truncate">{template.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(template.created_at)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {template.description}
                    </p>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {template.category}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>Preview do template HTML</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              srcDoc={previewTemplate?.html_content}
              className="w-full h-[500px]"
              title="Email Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplatesManager;
