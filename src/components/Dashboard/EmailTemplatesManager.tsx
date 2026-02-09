import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Eye, Edit, Copy, Trash2, Palette, 
  Mail, Loader2, MoreVertical,
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
import { useEmailDesigns } from '@/hooks/useEmailDesigns';

const OMNI_COLOR = '#FF4500';

const EmailTemplatesManager: React.FC = () => {
  const navigate = useNavigate();
  const { designs, loading, deleteDesign } = useEmailDesigns();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDesigns = designs.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF4500]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#FF4500]/10">
            <Palette className="h-6 w-6 text-[#FF4500]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Designs de Email</h1>
            <p className="text-muted-foreground text-sm">Gerencie seus designs visuais de email</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/email-builder')}
          className="gap-2 bg-[#FF4500] hover:bg-[#FF4500]/90"
        >
          <Plus className="h-4 w-4" />
          Criar Design
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#FF4500]/5 to-[#FF4500]/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#FF4500]/10">
                <LayoutTemplate className="h-5 w-5 text-[#FF4500]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#FF4500]">{designs.length}</p>
                <p className="text-xs text-muted-foreground">Total de Designs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {designs.filter(d => d.is_published).length}
                </p>
                <p className="text-xs text-muted-foreground">Publicados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {designs.filter(d => !d.is_published).length}
                </p>
                <p className="text-xs text-muted-foreground">Rascunhos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500/5 to-violet-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Mail className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-600">
                  {designs.length > 0 ? designs.length : '0'}
                </p>
                <p className="text-xs text-muted-foreground">Prontos p/ Uso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#FF4500]/10">
            <LayoutTemplate className="h-4 w-4 text-[#FF4500]" />
          </div>
          <span className="font-medium text-foreground">Designs Visuais</span>
          <Badge className="bg-[#FF4500]/10 text-[#FF4500] border-0">{designs.length}</Badge>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar designs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {filteredDesigns.length === 0 ? (
        <Card className="border-dashed border-2 border-[#FF4500]/20 shadow-sm bg-[#FF4500]/5">
          <CardContent className="p-12 text-center">
            <div className="p-4 rounded-full bg-[#FF4500]/10 w-fit mx-auto mb-4">
              <Palette className="h-10 w-10 text-[#FF4500]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum design encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie templates visualmente com nosso editor drag-and-drop
            </p>
            <Button 
              onClick={() => navigate('/dashboard/email-builder')}
              className="bg-[#FF4500] hover:bg-[#FF4500]/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Design
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDesigns.map(design => (
            <Card key={design.id} className="group hover:shadow-lg transition-all border-0 shadow-sm hover:border-[#FF4500]/20">
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
                      className="bg-[#FF4500] hover:bg-[#FF4500]/90"
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
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 text-xs">Publicado</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Rascunho</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesManager;