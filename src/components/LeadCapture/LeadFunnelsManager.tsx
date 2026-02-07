import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Target, BarChart3, Users, Eye, 
  Settings, Trash2, Play, Pause, Loader2, Copy, ExternalLink,
  LayoutGrid, List, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LeadFunnel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  settings: any;
  created_at: string;
  updated_at: string;
}

interface FunnelStats {
  [key: string]: { views: number; completions: number };
}

const LeadFunnelsManager: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [funnels, setFunnels] = useState<LeadFunnel[]>([]);
  const [funnelStats, setFunnelStats] = useState<FunnelStats>({});
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFunnel, setNewFunnel] = useState({ 
    name: '', 
    description: '',
    thankYouTitle: 'Obrigado!',
    thankYouMessage: 'Sua resposta foi enviada com sucesso.',
    buttonColor: '#FF4500',
    backgroundColor: '#FFFFFF'
  });
  const [stats, setStats] = useState({ total: 0, active: 0, submissions: 0, conversions: 0 });

  // Get company ID
  useEffect(() => {
    const getCompanyId = async () => {
      if (!user?.id) return;
      
      const metadataCompanyId = user.user_metadata?.company_id;
      if (metadataCompanyId) {
        setCompanyId(metadataCompanyId);
        return;
      }

      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };

    getCompanyId();
  }, [user?.id]);

  // Load funnels
  useEffect(() => {
    const loadFunnels = async () => {
      if (!companyId) return;
      
      setLoading(true);
      
      const { data, error } = await supabase
        .from('lead_funnels')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setFunnels(data);
        
        // Calculate stats per funnel
        const statsMap: FunnelStats = {};
        for (const funnel of data) {
          const { count: viewCount } = await supabase
            .from('lead_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('funnel_id', funnel.id);
          
          const { count: completionCount } = await supabase
            .from('lead_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('funnel_id', funnel.id)
            .eq('status', 'completed');
          
          statsMap[funnel.id] = {
            views: viewCount || 0,
            completions: completionCount || 0
          };
        }
        setFunnelStats(statsMap);
        
        // Calculate overall stats
        const active = data.filter(f => f.is_active).length;
        const totalViews = Object.values(statsMap).reduce((sum, s) => sum + s.views, 0);
        const totalConversions = Object.values(statsMap).reduce((sum, s) => sum + s.completions, 0);
        
        setStats({
          total: data.length,
          active,
          submissions: totalViews,
          conversions: totalConversions
        });
      }
      
      setLoading(false);
    };

    loadFunnels();
  }, [companyId]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Math.random().toString(36).substr(2, 6);
  };

  const handleCreateFunnel = async () => {
    if (!newFunnel.name.trim() || !companyId || !user?.id) {
      toast({ title: 'Erro', description: 'Preencha o nome do funil', variant: 'destructive' });
      return;
    }

    const slug = generateSlug(newFunnel.name);

    const { data, error } = await supabase
      .from('lead_funnels')
      .insert({
        name: newFunnel.name,
        description: newFunnel.description || null,
        slug,
        company_id: companyId,
        created_by: user.id,
        is_active: false,
        settings: {
          buttonColor: newFunnel.buttonColor,
          backgroundColor: newFunnel.backgroundColor,
          thankYouTitle: newFunnel.thankYouTitle,
          thankYouMessage: newFunnel.thankYouMessage
        }
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    setFunnels(prev => [data, ...prev]);
    setShowCreateModal(false);
    setNewFunnel({ 
      name: '', 
      description: '',
      thankYouTitle: 'Obrigado!',
      thankYouMessage: 'Sua resposta foi enviada com sucesso.',
      buttonColor: '#FF4500',
      backgroundColor: '#FFFFFF'
    });
    
    navigate(`/dashboard/leads/builder?id=${data.id}`);
  };

  const handleToggleFunnel = async (funnelId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('lead_funnels')
      .update({ is_active: !currentActive })
      .eq('id', funnelId);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setFunnels(prev => prev.map(f => 
        f.id === funnelId ? { ...f, is_active: !currentActive } : f
      ));
      toast({ 
        title: !currentActive ? 'Ativado' : 'Pausado', 
        description: `Funil ${!currentActive ? 'ativado' : 'pausado'} com sucesso!` 
      });
    }
  };

  const handleDeleteFunnel = async (funnelId: string) => {
    if (!confirm('Tem certeza que deseja excluir este funil?')) return;

    const { error } = await supabase
      .from('lead_funnels')
      .delete()
      .eq('id', funnelId);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setFunnels(prev => prev.filter(f => f.id !== funnelId));
      toast({ title: 'Excluído', description: 'Funil excluído com sucesso!' });
    }
  };

  const copyFunnelLink = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!', description: 'O link foi copiado para a área de transferência.' });
  };

  const filteredFunnels = funnels.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 page-content">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Captura de Leads</h1>
              <p className="text-muted-foreground text-sm">
                Crie funis interativos para capturar e qualificar leads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/track/leads')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Gerenciar
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Funil
            </Button>
          </div>
        </div>
      </div>

      {/* Stats - Compact */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Funis</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Play className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{stats.active}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ativos</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{stats.submissions}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Acessos</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <TrendingUp className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-violet-600">
                {stats.submissions > 0 ? Math.round((stats.conversions / stats.submissions) * 100) : 0}%
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Conversão</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar funis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center border rounded-lg p-1 bg-muted/50">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Funnels List */}
      {filteredFunnels.length === 0 ? (
        <Card className="border-dashed border-0 shadow-sm bg-muted/30">
          <CardContent className="p-12 text-center">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <Target className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum funil encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Tente uma busca diferente' : 'Crie seu primeiro funil para começar a capturar leads'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Funil
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filteredFunnels.map(funnel => {
            const fStats = funnelStats[funnel.id] || { views: 0, completions: 0 };
            const convRate = fStats.views > 0 ? Math.round((fStats.completions / fStats.views) * 100) : 0;
            
            return (
              <Card 
                key={funnel.id} 
                className={cn(
                  "transition-all hover:shadow-md border-0 shadow-sm cursor-pointer",
                  funnel.is_active && "ring-1 ring-primary/20"
                )}
                onClick={() => navigate(`/dashboard/leads/builder?id=${funnel.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail Preview */}
                    <div className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center shrink-0",
                      funnel.is_active 
                        ? "bg-gradient-to-br from-primary/20 to-primary/5" 
                        : "bg-muted"
                    )}>
                      <Target className={cn(
                        "h-6 w-6",
                        funnel.is_active ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{funnel.name}</h3>
                        <Badge 
                          variant={funnel.is_active ? 'default' : 'secondary'} 
                          className="text-[10px] shrink-0"
                        >
                          {funnel.is_active ? 'Ativo' : 'Pausado'}
                        </Badge>
                      </div>
                      
                      {/* Link - Clean */}
                      <div 
                        className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-mono truncate">/f/{funnel.slug}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={(e) => copyFunnelLink(funnel.slug, e)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/f/${funnel.slug}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Mini Stats */}
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {fStats.views} acessos
                        </span>
                        <span className="flex items-center gap-1 text-green-600">
                          <Users className="h-3 w-3" />
                          {fStats.completions} conversões
                        </span>
                        <span className="flex items-center gap-1 text-primary">
                          <TrendingUp className="h-3 w-3" />
                          {convRate}%
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={funnel.is_active}
                        onCheckedChange={() => handleToggleFunnel(funnel.id, funnel.is_active)}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/dashboard/leads/analytics/${funnel.id}`)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeleteFunnel(funnel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFunnels.map(funnel => {
            const fStats = funnelStats[funnel.id] || { views: 0, completions: 0 };
            const convRate = fStats.views > 0 ? Math.round((fStats.completions / fStats.views) * 100) : 0;
            
            return (
              <Card 
                key={funnel.id} 
                className={cn(
                  "transition-all hover:shadow-lg border-0 shadow-sm cursor-pointer overflow-hidden",
                  funnel.is_active && "ring-1 ring-primary/20"
                )}
                onClick={() => navigate(`/dashboard/leads/builder?id=${funnel.id}`)}
              >
                {/* Preview Header */}
                <div className={cn(
                  "h-24 flex items-center justify-center",
                  funnel.is_active 
                    ? "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" 
                    : "bg-muted"
                )}>
                  <Target className={cn(
                    "h-10 w-10",
                    funnel.is_active ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{funnel.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono truncate">/f/{funnel.slug}</p>
                    </div>
                    <Badge 
                      variant={funnel.is_active ? 'default' : 'secondary'} 
                      className="text-[10px] shrink-0 ml-2"
                    >
                      {funnel.is_active ? 'Ativo' : 'Pausado'}
                    </Badge>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-3 text-xs mb-4">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {fStats.views}
                    </span>
                    <span className="flex items-center gap-1 text-green-600">
                      <Users className="h-3 w-3" />
                      {fStats.completions}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-medium">
                      {convRate}%
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={funnel.is_active}
                      onCheckedChange={() => handleToggleFunnel(funnel.id, funnel.is_active)}
                    />
                    <div className="flex-1" />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => copyFunnelLink(funnel.slug, e)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteFunnel(funnel.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Novo Funil</DialogTitle>
            <DialogDescription>
              Configure as informações básicas do seu funil de captura
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Funil *</Label>
              <Input
                id="name"
                placeholder="Ex: Captação de Leads 2024"
                value={newFunnel.name}
                onChange={(e) => setNewFunnel(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo do funil..."
                value={newFunnel.description}
                onChange={(e) => setNewFunnel(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Customization Section */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Personalização</h4>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buttonColor">Cor dos Botões</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="buttonColor"
                        value={newFunnel.buttonColor}
                        onChange={(e) => setNewFunnel(prev => ({ ...prev, buttonColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={newFunnel.buttonColor}
                        onChange={(e) => setNewFunnel(prev => ({ ...prev, buttonColor: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="backgroundColor">Cor de Fundo</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="backgroundColor"
                        value={newFunnel.backgroundColor}
                        onChange={(e) => setNewFunnel(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={newFunnel.backgroundColor}
                        onChange={(e) => setNewFunnel(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFunnel}>
              Criar Funil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadFunnelsManager;
