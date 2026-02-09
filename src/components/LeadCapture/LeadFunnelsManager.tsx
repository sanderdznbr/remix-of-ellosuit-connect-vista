import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Target, BarChart3, Users, Eye, 
  Trash2, Play, Pause, Loader2, Copy, ExternalLink,
  LayoutGrid, List, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const FLOW_COLOR = "#007DE3";

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
    name: '', description: '',
    thankYouTitle: 'Obrigado!', thankYouMessage: 'Sua resposta foi enviada com sucesso.',
    buttonColor: '#FF4500', backgroundColor: '#FFFFFF'
  });
  const [stats, setStats] = useState({ total: 0, active: 0, submissions: 0, conversions: 0 });

  useEffect(() => {
    const getCompanyId = async () => {
      if (!user?.id) return;
      const metadataCompanyId = user.user_metadata?.company_id;
      if (metadataCompanyId) { setCompanyId(metadataCompanyId); return; }
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      if (data?.company_id) setCompanyId(data.company_id);
    };
    getCompanyId();
  }, [user?.id]);

  useEffect(() => {
    const loadFunnels = async () => {
      if (!companyId) return;
      setLoading(true);
      const { data, error } = await supabase.from('lead_funnels').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      if (!error && data) {
        setFunnels(data);
        const statsMap: FunnelStats = {};
        for (const funnel of data) {
          const { count: viewCount } = await supabase.from('lead_submissions').select('*', { count: 'exact', head: true }).eq('funnel_id', funnel.id);
          const { count: completionCount } = await supabase.from('lead_submissions').select('*', { count: 'exact', head: true }).eq('funnel_id', funnel.id).eq('status', 'completed');
          statsMap[funnel.id] = { views: viewCount || 0, completions: completionCount || 0 };
        }
        setFunnelStats(statsMap);
        const active = data.filter(f => f.is_active).length;
        const totalViews = Object.values(statsMap).reduce((sum, s) => sum + s.views, 0);
        const totalConversions = Object.values(statsMap).reduce((sum, s) => sum + s.completions, 0);
        setStats({ total: data.length, active, submissions: totalViews, conversions: totalConversions });
      }
      setLoading(false);
    };
    loadFunnels();
  }, [companyId]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 6);
  };

  const handleCreateFunnel = async () => {
    if (!newFunnel.name.trim() || !companyId || !user?.id) {
      toast({ title: 'Erro', description: 'Preencha o nome do funil', variant: 'destructive' });
      return;
    }
    const slug = generateSlug(newFunnel.name);
    const { data, error } = await supabase.from('lead_funnels').insert({
      name: newFunnel.name, description: newFunnel.description || null, slug, company_id: companyId, created_by: user.id, is_active: false,
      settings: { buttonColor: newFunnel.buttonColor, backgroundColor: newFunnel.backgroundColor, thankYouTitle: newFunnel.thankYouTitle, thankYouMessage: newFunnel.thankYouMessage }
    }).select().single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setFunnels(prev => [data, ...prev]);
    setShowCreateModal(false);
    setNewFunnel({ name: '', description: '', thankYouTitle: 'Obrigado!', thankYouMessage: 'Sua resposta foi enviada com sucesso.', buttonColor: '#FF4500', backgroundColor: '#FFFFFF' });
    navigate(`/dashboard/leads/builder?id=${data.id}`);
  };

  const handleToggleFunnel = async (funnelId: string, currentActive: boolean) => {
    const { error } = await supabase.from('lead_funnels').update({ is_active: !currentActive }).eq('id', funnelId);
    if (!error) { setFunnels(prev => prev.map(f => f.id === funnelId ? { ...f, is_active: !currentActive } : f)); toast({ title: !currentActive ? 'Ativado' : 'Pausado' }); }
  };

  const handleDeleteFunnel = async (funnelId: string) => {
    if (!confirm('Tem certeza que deseja excluir este funil?')) return;
    const { error } = await supabase.from('lead_funnels').delete().eq('id', funnelId);
    if (!error) { setFunnels(prev => prev.filter(f => f.id !== funnelId)); toast({ title: 'Excluído' }); }
  };

  const copyFunnelLink = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`);
    toast({ title: 'Link copiado!' });
  };

  const filteredFunnels = funnels.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: FLOW_COLOR }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Captura de Leads</h1>
            <p className="text-sm text-gray-500">Crie funis interativos para capturar e qualificar leads</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard/track/leads')} className="gap-2 rounded-xl">
              <BarChart3 className="h-4 w-4" />Gerenciar
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
              <Plus className="h-4 w-4" />Novo Funil
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Target, label: 'Funis', value: stats.total, color: FLOW_COLOR },
            { icon: Play, label: 'Ativos', value: stats.active, color: '#10B981' },
            { icon: Users, label: 'Acessos', value: stats.submissions, color: '#3B82F6' },
            { icon: TrendingUp, label: 'Conversão', value: stats.submissions > 0 ? `${Math.round((stats.conversions / stats.submissions) * 100)}%` : '0%', color: '#8B5CF6' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${stat.color}12` }}>
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar funis..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-xl" />
          </div>
          <div className="flex items-center border border-gray-100 rounded-xl p-1 bg-gray-50">
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 px-2 rounded-lg" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-7 px-2 rounded-lg" onClick={() => setViewMode('grid')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {filteredFunnels.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
            <div className="p-4 rounded-2xl w-fit mx-auto mb-4" style={{ backgroundColor: `${FLOW_COLOR}10` }}>
              <Target className="h-10 w-10" style={{ color: FLOW_COLOR }} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum funil encontrado</h3>
            <p className="text-gray-500 mb-4">{searchQuery ? 'Tente uma busca diferente' : 'Crie seu primeiro funil para capturar leads'}</p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)} className="rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                <Plus className="h-4 w-4 mr-2" />Criar Funil
              </Button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredFunnels.map(funnel => {
              const fStats = funnelStats[funnel.id] || { views: 0, completions: 0 };
              const convRate = fStats.views > 0 ? Math.round((fStats.completions / fStats.views) * 100) : 0;
              return (
                <div
                  key={funnel.id}
                  className={cn(
                    "bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer",
                    funnel.is_active && "border-l-4"
                  )}
                  style={funnel.is_active ? { borderLeftColor: FLOW_COLOR } : {}}
                  onClick={() => navigate(`/dashboard/leads/builder?id=${funnel.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0")}
                      style={{ backgroundColor: funnel.is_active ? `${FLOW_COLOR}12` : '#f3f4f6' }}>
                      <Target className="h-5 w-5" style={{ color: funnel.is_active ? FLOW_COLOR : '#9ca3af' }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{funnel.name}</h3>
                        <Badge variant={funnel.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0"
                          style={funnel.is_active ? { backgroundColor: '#10B981' } : {}}>
                          {funnel.is_active ? 'Ativo' : 'Pausado'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono truncate">/f/{funnel.slug}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => copyFunnelLink(funnel.slug, e)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-gray-500"><Eye className="h-3 w-3" />{fStats.views} acessos</span>
                        <span className="flex items-center gap-1 text-green-600"><Users className="h-3 w-3" />{fStats.completions} conversões</span>
                        <span className="flex items-center gap-1" style={{ color: FLOW_COLOR }}><TrendingUp className="h-3 w-3" />{convRate}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch checked={funnel.is_active} onCheckedChange={() => handleToggleFunnel(funnel.id, funnel.is_active)} />
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/dashboard/leads/analytics/${funnel.id}`)}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteFunnel(funnel.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFunnels.map(funnel => {
              const fStats = funnelStats[funnel.id] || { views: 0, completions: 0 };
              const convRate = fStats.views > 0 ? Math.round((fStats.completions / fStats.views) * 100) : 0;
              return (
                <div
                  key={funnel.id}
                  className={cn("bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all cursor-pointer overflow-hidden")}
                  onClick={() => navigate(`/dashboard/leads/builder?id=${funnel.id}`)}
                >
                  <div className={cn("h-20 flex items-center justify-center")}
                    style={{ backgroundColor: funnel.is_active ? `${FLOW_COLOR}10` : '#f9fafb' }}>
                    <Target className="h-8 w-8" style={{ color: funnel.is_active ? FLOW_COLOR : '#d1d5db' }} />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">{funnel.name}</h3>
                        <p className="text-xs text-gray-500 font-mono truncate">/f/{funnel.slug}</p>
                      </div>
                      <Badge variant={funnel.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0 ml-2"
                        style={funnel.is_active ? { backgroundColor: '#10B981' } : {}}>
                        {funnel.is_active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs mb-4">
                      <span className="flex items-center gap-1 text-gray-500"><Eye className="h-3 w-3" />{fStats.views}</span>
                      <span className="flex items-center gap-1 text-green-600"><Users className="h-3 w-3" />{fStats.completions}</span>
                      <span className="font-medium" style={{ color: FLOW_COLOR }}>{convRate}%</span>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch checked={funnel.is_active} onCheckedChange={() => handleToggleFunnel(funnel.id, funnel.is_active)} />
                      <div className="flex-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => copyFunnelLink(funnel.slug, e)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteFunnel(funnel.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Funil</DialogTitle>
              <DialogDescription>Configure as informações básicas do seu funil</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Nome do Funil *</Label>
                <Input placeholder="Ex: Captação de Leads 2024" value={newFunnel.name} onChange={(e) => setNewFunnel(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea placeholder="Descreva o objetivo..." value={newFunnel.description} onChange={(e) => setNewFunnel(prev => ({ ...prev, description: e.target.value }))} rows={2} className="rounded-xl" />
              </div>
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Personalização</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor dos Botões</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={newFunnel.buttonColor} onChange={(e) => setNewFunnel(prev => ({ ...prev, buttonColor: e.target.value }))} className="w-10 h-10 rounded-lg border cursor-pointer" />
                      <Input value={newFunnel.buttonColor} onChange={(e) => setNewFunnel(prev => ({ ...prev, buttonColor: e.target.value }))} className="flex-1 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={newFunnel.backgroundColor} onChange={(e) => setNewFunnel(prev => ({ ...prev, backgroundColor: e.target.value }))} className="w-10 h-10 rounded-lg border cursor-pointer" />
                      <Input value={newFunnel.backgroundColor} onChange={(e) => setNewFunnel(prev => ({ ...prev, backgroundColor: e.target.value }))} className="flex-1 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleCreateFunnel} className="rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>Criar Funil</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LeadFunnelsManager;
