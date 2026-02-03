import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Copy, BarChart3, Globe, Clock, MousePointer, Plus, Trash2, Loader2, Power, PowerOff } from 'lucide-react';
import { useTrackedLinks, TrackedLink } from '@/hooks/useTrackedLinks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LinkTrackingDashboard = () => {
  const { 
    links, 
    loading, 
    createLink, 
    deleteLink, 
    toggleLinkStatus,
    totalClicks, 
    totalUniqueVisitors 
  } = useTrackedLinks();
  
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedLink, setSelectedLink] = useState<TrackedLink | null>(null);

  const handleCreateLink = async () => {
    if (!newUrl) {
      return;
    }

    setCreating(true);
    const result = await createLink(newUrl, newTitle || undefined);
    setCreating(false);

    if (result) {
      setNewUrl('');
      setNewTitle('');
    }
  };

  const copyToClipboard = (code: string) => {
    const trackableUrl = `${window.location.origin}/l/${code}`;
    navigator.clipboard.writeText(trackableUrl);
  };

  const handleDeleteLink = async (id: string) => {
    await deleteLink(id);
    if (selectedLink?.id === id) setSelectedLink(null);
  };

  const getBaseUrl = () => {
    return window.location.origin;
  };

  return (
    <div className="page-content p-4 md:p-6 space-y-6 bg-muted/30 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Rastreamento de Links</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Crie links rastreáveis e acompanhe cliques em tempo real</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-none shadow-md rounded-xl bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Link className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{links.length}</p>
                <p className="text-xs text-muted-foreground">Links Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md rounded-xl bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MousePointer className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalClicks}</p>
                <p className="text-xs text-muted-foreground">Total Cliques</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md rounded-xl bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Globe className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalUniqueVisitors}</p>
                <p className="text-xs text-muted-foreground">Visitantes Únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md rounded-xl bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {links.length > 0 ? 'Ativo' : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Link */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" />
              Criar Link Rastreável
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4">
            <div className="space-y-2">
              <Label>URL de Destino</Label>
              <Input
                placeholder="https://exemplo.com/pagina ou www.exemplo.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Pode incluir ou não o https://
              </p>
            </div>
            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input
                placeholder="Nome para identificar o link"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-11"
              />
            </div>
            <Button 
              onClick={handleCreateLink} 
              className="w-full h-11"
              disabled={creating || !newUrl}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Links List */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Seus Links ({links.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum link criado ainda</p>
                <p className="text-sm">Crie seu primeiro link rastreável</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {links.map((link) => (
                  <div 
                    key={link.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLink?.id === link.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    } ${!link.is_active ? 'opacity-60' : ''}`}
                    onClick={() => setSelectedLink(link)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {link.title || 'Link sem título'}
                          </p>
                          {!link.is_active && (
                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                              Desativado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{link.original_url}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            copyToClipboard(link.short_code); 
                          }}
                          title="Copiar link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            toggleLinkStatus(link.id, link.is_active); 
                          }}
                          title={link.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {link.is_active ? (
                            <PowerOff className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Power className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDeleteLink(link.id); 
                          }}
                          title="Remover link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MousePointer className="h-3 w-3" />
                        {link.clicks || 0} cliques
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {link.unique_visitors || 0} únicos
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(link.created_at), 'dd/MM/yy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Link Details */}
      {selectedLink && (
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg">
              Detalhes: {selectedLink.title || 'Link sem título'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-primary">{selectedLink.clicks || 0}</p>
                <p className="text-sm text-muted-foreground">Cliques Totais</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{selectedLink.unique_visitors || 0}</p>
                <p className="text-sm text-muted-foreground">Visitantes Únicos</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {selectedLink.clicks > 0 
                    ? ((selectedLink.unique_visitors / selectedLink.clicks) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Link Rastreável</Label>
              <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                <code className="text-sm break-all">{getBaseUrl()}/l/{selectedLink.short_code}</code>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyToClipboard(selectedLink.short_code)}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">URL de Destino</Label>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm break-all">{selectedLink.original_url}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LinkTrackingDashboard;
