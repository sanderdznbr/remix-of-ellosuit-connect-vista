import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Target, BarChart3, Users, Eye, 
  Settings, Trash2, Play, Pause, Loader2, Copy, ExternalLink
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

const LeadFunnelsManager: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [funnels, setFunnels] = useState<LeadFunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFunnel, setNewFunnel] = useState({ name: '', description: '' });
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
        
        // Calculate stats
        const active = data.filter(f => f.is_active).length;
        
        // Get submission stats
        const { count: submissionCount } = await supabase
          .from('lead_submissions')
          .select('*', { count: 'exact', head: true })
          .in('funnel_id', data.map(f => f.id));
        
        const { count: conversionCount } = await supabase
          .from('lead_submissions')
          .select('*', { count: 'exact', head: true })
          .in('funnel_id', data.map(f => f.id))
          .eq('status', 'completed');
        
        setStats({
          total: data.length,
          active,
          submissions: submissionCount || 0,
          conversions: conversionCount || 0
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
        settings: {}
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    setFunnels(prev => [data, ...prev]);
    setShowCreateModal(false);
    setNewFunnel({ name: '', description: '' });
    toast({ title: 'Sucesso!', description: 'Funil criado. Clique em "Editar" para configurar.' });
    
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

  const copyFunnelLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!', description: 'O link foi copiado para a área de transferência.' });
  };

  const filteredFunnels = funnels.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

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
      <div className="mb-8">
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
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Funil
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Funis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.submissions}</p>
                <p className="text-xs text-muted-foreground">Submissões</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-600">
                  {stats.submissions > 0 ? Math.round((stats.conversions / stats.submissions) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Taxa Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar funis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Funnels Grid */}
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFunnels.map(funnel => (
            <Card 
              key={funnel.id} 
              className={`transition-all hover:shadow-lg border-0 shadow-sm ${
                funnel.is_active 
                  ? 'ring-1 ring-primary/20 bg-gradient-to-br from-primary/5 to-transparent' 
                  : ''
              }`}
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      funnel.is_active ? 'bg-primary' : 'bg-muted'
                    }`}>
                      <Target className={`h-5 w-5 ${funnel.is_active ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{funnel.name}</h3>
                      <Badge variant={funnel.is_active ? 'default' : 'secondary'} className="text-xs mt-1">
                        {funnel.is_active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={funnel.is_active}
                    onCheckedChange={() => handleToggleFunnel(funnel.id, funnel.is_active)}
                  />
                </div>

                {/* Description */}
                {funnel.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {funnel.description}
                  </p>
                )}

                {/* Slug/Link */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 p-2 bg-muted/50 rounded-lg">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="truncate">/f/{funnel.slug}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-auto"
                    onClick={() => copyFunnelLink(funnel.slug)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Date */}
                <p className="text-xs text-muted-foreground mb-4">
                  Criado em {formatDate(funnel.created_at)}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/dashboard/leads/builder?id=${funnel.id}`)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/dashboard/leads/analytics/${funnel.id}`)}
                  >
                    <Eye className="h-4 w-4" />
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Funil</DialogTitle>
            <DialogDescription>
              Configure as informações básicas do seu funil de captura
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
                rows={3}
              />
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
