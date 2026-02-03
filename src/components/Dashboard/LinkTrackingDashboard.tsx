import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Copy, ExternalLink, BarChart3, Globe, Clock, MousePointer, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrackedLink {
  id: string;
  originalUrl: string;
  shortCode: string;
  title: string;
  clicks: number;
  uniqueVisitors: number;
  createdAt: string;
}

const LinkTrackingDashboard = () => {
  const { toast } = useToast();
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [links, setLinks] = useState<TrackedLink[]>([
    {
      id: '1',
      originalUrl: 'https://exemplo.com/pagina-importante',
      shortCode: 'abc123',
      title: 'Página de Vendas',
      clicks: 245,
      uniqueVisitors: 189,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      originalUrl: 'https://exemplo.com/produto',
      shortCode: 'xyz789',
      title: 'Landing Page Produto',
      clicks: 1024,
      uniqueVisitors: 756,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);
  const [selectedLink, setSelectedLink] = useState<TrackedLink | null>(null);

  const handleCreateLink = () => {
    if (!newUrl) {
      toast({
        title: 'URL obrigatória',
        description: 'Digite uma URL para rastrear',
        variant: 'destructive',
      });
      return;
    }

    const newLink: TrackedLink = {
      id: Math.random().toString(36).substring(7),
      originalUrl: newUrl,
      shortCode: Math.random().toString(36).substring(2, 8),
      title: newTitle || 'Link sem título',
      clicks: 0,
      uniqueVisitors: 0,
      createdAt: new Date().toISOString(),
    };

    setLinks([newLink, ...links]);
    setNewUrl('');
    setNewTitle('');
    
    toast({
      title: 'Link criado!',
      description: 'Seu link rastreável foi gerado com sucesso.',
    });
  };

  const copyToClipboard = (code: string) => {
    const trackableUrl = `${window.location.origin}/l/${code}`;
    navigator.clipboard.writeText(trackableUrl);
    toast({
      title: 'Copiado!',
      description: 'Link copiado para a área de transferência',
    });
  };

  const deleteLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
    if (selectedLink?.id === id) setSelectedLink(null);
    toast({ title: 'Link removido' });
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
                <p className="text-2xl font-bold text-foreground">{links.reduce((a, b) => a + b.clicks, 0)}</p>
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
                <p className="text-2xl font-bold text-foreground">{links.reduce((a, b) => a + b.uniqueVisitors, 0)}</p>
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
                <p className="text-2xl font-bold text-foreground">Hoje</p>
                <p className="text-xs text-muted-foreground">Último Clique</p>
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
                placeholder="https://exemplo.com/pagina"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="h-11"
              />
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
            <Button onClick={handleCreateLink} className="w-full h-11">
              <Plus className="h-4 w-4 mr-2" />
              Criar Link
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
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {links.map((link) => (
                <div 
                  key={link.id} 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedLink?.id === link.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectedLink(link)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{link.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.originalUrl}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); copyToClipboard(link.shortCode); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteLink(link.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MousePointer className="h-3 w-3" />
                      {link.clicks} cliques
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {link.uniqueVisitors} únicos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Link Details */}
      {selectedLink && (
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg">Detalhes: {selectedLink.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-primary">{selectedLink.clicks}</p>
                <p className="text-sm text-muted-foreground">Cliques Totais</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{selectedLink.uniqueVisitors}</p>
                <p className="text-sm text-muted-foreground">Visitantes Únicos</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-purple-600">{((selectedLink.uniqueVisitors / selectedLink.clicks) * 100 || 0).toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
              <code className="text-sm">{window.location.origin}/l/{selectedLink.shortCode}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(selectedLink.shortCode)}>
                <Copy className="h-4 w-4 mr-1" /> Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LinkTrackingDashboard;
