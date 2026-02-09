import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Edit, Copy, Trash2, Palette, 
  Mail, Loader2, MoreVertical, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: OMNI_COLOR }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-content">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${OMNI_COLOR}12` }}
            >
              <Palette className="h-5 w-5" style={{ color: OMNI_COLOR }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Designs de Email</h1>
              <p className="text-sm text-muted-foreground">
                {designs.length} design{designs.length !== 1 ? 's' : ''} · {designs.filter(d => d.is_published).length} publicado{designs.filter(d => d.is_published).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/dashboard/email-builder')}
            className="gap-2 rounded-xl"
            style={{ backgroundColor: OMNI_COLOR }}
          >
            <Plus className="h-4 w-4" />
            Criar Design
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar designs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border rounded-xl"
          />
        </div>

        {/* List */}
        {filteredDesigns.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
            <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="text-base font-semibold text-foreground mb-1">Nenhum design encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie templates visualmente com nosso editor drag-and-drop
            </p>
            <Button 
              onClick={() => navigate('/dashboard/email-builder')}
              className="rounded-xl"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Design
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {filteredDesigns.map(design => (
              <div 
                key={design.id} 
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                onClick={() => navigate(`/dashboard/email-builder?id=${design.id}`)}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {design.thumbnail_url ? (
                    <img 
                      src={design.thumbnail_url} 
                      alt={design.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Mail className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground text-sm truncate">{design.name}</h3>
                    {design.is_published ? (
                      <Badge className="bg-green-50 text-green-700 border-0 text-[10px] px-1.5 py-0 dark:bg-green-900/20 dark:text-green-400">
                        Publicado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Rascunho
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDate(design.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailTemplatesManager;
