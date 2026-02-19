import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, GitBranch, Search, Pencil, BarChart3, Copy, Trash2, MoreVertical, Loader2, Power, X, MessageSquare, Users, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const OMNI_COLOR = '#FF4500';

interface ChatbotFlow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  nodes: any[];
  edges: any[];
  execution_count: number;
  trigger_config: any;
  created_at: string;
  updated_at: string;
}

interface WhatsAppSession {
  id: string;
  instance_name: string;
  phone_number: string | null;
  status: string;
}

const ChatbotManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlows, setSelectedFlows] = useState<string[]>([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsFlow, setStatsFlow] = useState<ChatbotFlow | null>(null);
  const [statsData, setStatsData] = useState<{
    executions: any[];
    loading: boolean;
  }>({ executions: [], loading: false });
  const [newFlow, setNewFlow] = useState({
    name: '',
    description: '',
    triggerType: 'keyword',
    triggerValue: '',
    sessionId: ''
  });

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
      if (data?.company_id) setCompanyId(data.company_id);
    };
    getCompanyId();
  }, [user?.id]);

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return;
      setLoading(true);

      const { data: flowsData } = await supabase
        .from('chatbot_flows')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (flowsData) {
        const typedFlows: ChatbotFlow[] = flowsData.map(f => ({
          ...f,
          description: f.description || null,
          nodes: f.nodes as any[] || [],
          edges: f.edges as any[] || [],
          trigger_config: f.trigger_config as any,
          execution_count: f.execution_count || 0
        }));
        setFlows(typedFlows);
      }

      const { data: sessionsData } = await supabase
        .from('whatsapp_sessions')
        .select('id, instance_name, phone_number, status')
        .eq('company_id', companyId)
        .eq('status', 'connected');
      if (sessionsData) setSessions(sessionsData);

      setLoading(false);
    };
    loadData();
  }, [companyId]);

  const handleCreateFlow = async () => {
    if (!newFlow.name.trim() || !companyId || !user?.id) {
      toast({ title: 'Erro', description: 'Preencha o nome do chatbot', variant: 'destructive' });
      return;
    }

    const triggerConfig = {
      type: newFlow.triggerType,
      value: newFlow.triggerValue,
      sessionId: newFlow.sessionId || null
    };

    const { data, error } = await supabase
      .from('chatbot_flows')
      .insert({
        name: newFlow.name,
        description: newFlow.description || null,
        company_id: companyId,
        created_by: user.id,
        is_active: false,
        nodes: [{
          id: 'trigger-1',
          type: 'trigger',
          subType: newFlow.triggerType === 'whatsapp_channel' ? 'whatsapp_channel' : 'keyword',
          position: { x: 100, y: 100 },
          data: { label: 'Gatilho', config: triggerConfig }
        }],
        edges: [],
        trigger_config: triggerConfig
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    setShowCreateModal(false);
    setNewFlow({ name: '', description: '', triggerType: 'keyword', triggerValue: '', sessionId: '' });
    toast({ title: 'Sucesso!', description: 'Chatbot criado.' });
    navigate(`/dashboard/chatbot-builder?flowId=${data.id}`);
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Tem certeza que deseja excluir este chatbot?')) return;
    await supabase.from('chatbot_flows').delete().eq('id', flowId);
    setFlows(prev => prev.filter(f => f.id !== flowId));
    toast({ title: 'Excluído', description: 'Chatbot removido' });
  };

  const handleToggleActive = async (flow: ChatbotFlow) => {
    const newState = !flow.is_active;
    const { error } = await supabase
      .from('chatbot_flows')
      .update({ is_active: newState })
      .eq('id', flow.id);
    if (!error) {
      setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, is_active: newState } : f));
      toast({ title: newState ? 'Ativado' : 'Desativado', description: `Chatbot "${flow.name}" ${newState ? 'ativado' : 'desativado'}` });
    }
  };

  const handleDuplicateFlow = async (flow: ChatbotFlow) => {
    if (!companyId || !user?.id) return;
    const { data, error } = await supabase
      .from('chatbot_flows')
      .insert({
        name: `${flow.name} (cópia)`,
        description: flow.description,
        company_id: companyId,
        created_by: user.id,
        is_active: false,
        nodes: flow.nodes as any,
        edges: flow.edges as any,
        trigger_config: flow.trigger_config,
      })
      .select()
      .single();
    if (!error && data) {
      setFlows(prev => [{ ...data, nodes: data.nodes as any[] || [], edges: data.edges as any[] || [], execution_count: 0, trigger_config: data.trigger_config } as ChatbotFlow, ...prev]);
      toast({ title: 'Duplicado!', description: `Chatbot "${flow.name}" duplicado com sucesso` });
    }
  };

  const handleOpenStats = async (flow: ChatbotFlow) => {
    setStatsFlow(flow);
    setShowStatsModal(true);
    setStatsData({ executions: [], loading: true });

    const { data } = await supabase
      .from('chatbot_executions')
      .select('*')
      .eq('flow_id', flow.id)
      .order('started_at', { ascending: false })
      .limit(50);

    setStatsData({ executions: data || [], loading: false });
  };

  const filteredFlows = flows.filter(flow =>
    flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    return `${Math.floor(diffDays / 30)} meses atrás`;
  };

  const toggleSelectFlow = (id: string) => {
    setSelectedFlows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedFlows.length === filteredFlows.length) {
      setSelectedFlows([]);
    } else {
      setSelectedFlows(filteredFlows.map(f => f.id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: OMNI_COLOR }} />
      </div>
    );
  }

   return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Chatbots</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Aqui você consegue criar e gerenciar os chatbots da sua organização.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Search + Actions */}
          <div className="p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-gray-200 bg-gray-50 rounded-xl focus:bg-white"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[110px] sm:w-[140px] rounded-xl border-gray-200">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl gap-2 text-white ml-auto"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo chatbot</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>

          {/* Desktop Table Header - hidden on mobile */}
          <div className="hidden lg:grid grid-cols-[40px_40px_1fr_180px_140px_140px_120px_120px] gap-4 px-4 py-3 border-t border-b border-gray-100 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <Checkbox 
                checked={selectedFlows.length === filteredFlows.length && filteredFlows.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <div />
            <div>Nome</div>
            <div>Canais</div>
            <div>Criado em</div>
            <div>Atualizado em</div>
            <div className="flex items-center gap-1">
              Execuções hoje
              <span className="text-gray-400">ⓘ</span>
            </div>
            <div className="text-right">Ações</div>
          </div>

          {/* List */}
          {filteredFlows.length === 0 ? (
            <div className="text-center py-16">
              <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum chatbot encontrado</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Tente uma busca diferente' : 'Crie seu primeiro chatbot para começar'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  style={{ backgroundColor: OMNI_COLOR }}
                  className="text-white rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Chatbot
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredFlows.map(flow => (
                <React.Fragment key={flow.id}>
                  {/* Desktop Row */}
                  <div className="hidden lg:grid grid-cols-[40px_40px_1fr_180px_140px_140px_120px_120px] gap-4 px-4 py-4 items-center hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-center">
                      <Checkbox 
                        checked={selectedFlows.includes(flow.id)}
                        onCheckedChange={() => toggleSelectFlow(flow.id)}
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="cursor-grab">
                        <svg className="h-4 w-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="4" cy="4" r="1.5" /><circle cx="4" cy="8" r="1.5" /><circle cx="4" cy="12" r="1.5" />
                          <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="8" r="1.5" /><circle cx="10" cy="12" r="1.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="font-medium text-gray-900 truncate">{flow.name}</div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {sessions.length > 0 ? sessions.slice(0, 2).map(s => (
                        <div key={s.id} className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="text-green-500">●</span>
                          <span className="truncate max-w-[80px]">{s.instance_name}</span>
                        </div>
                      )) : <span className="text-gray-400">-</span>}
                    </div>
                    <div className="text-sm text-gray-500">{formatRelativeDate(flow.created_at)}</div>
                    <div className="text-sm text-gray-500">{formatRelativeDate(flow.updated_at)}</div>
                    <div className="text-sm text-gray-900 font-medium">{flow.execution_count || 0}</div>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700" title="Estatísticas" onClick={() => handleOpenStats(flow)}><BarChart3 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700" title="Editar" onClick={() => navigate(`/dashboard/chatbot-builder?flowId=${flow.id}`)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${flow.is_active ? 'text-green-600 hover:text-red-600' : 'text-gray-500 hover:text-green-600'}`} title={flow.is_active ? 'Desativar' : 'Ativar'} onClick={() => handleToggleActive(flow)}><Power className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700" title="Duplicar" onClick={() => handleDuplicateFlow(flow)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-red-600" title="Excluir" onClick={() => handleDeleteFlow(flow.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  {/* Mobile Card */}
                  <div className="lg:hidden p-3 sm:p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedFlows.includes(flow.id)}
                        onCheckedChange={() => toggleSelectFlow(flow.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">{flow.name}</span>
                          <Badge 
                            className={`text-[10px] px-1.5 py-0 rounded-full shrink-0 ${flow.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                          >
                            {flow.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                          {sessions.length > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="text-green-500">●</span>
                              {sessions[0]?.instance_name}
                            </span>
                          )}
                          <span>{formatRelativeDate(flow.updated_at)}</span>
                          <span>{flow.execution_count || 0} exec.</span>
                        </div>
                        {/* Mobile Action Buttons */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            size="sm"
                            className="h-8 rounded-lg gap-1.5 text-white text-xs"
                            style={{ backgroundColor: OMNI_COLOR }}
                            onClick={() => navigate(`/dashboard/chatbot-builder?flowId=${flow.id}`)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 rounded-lg gap-1.5 text-xs ${flow.is_active ? 'text-red-600 border-red-200' : 'text-green-600 border-green-200'}`}
                            onClick={() => handleToggleActive(flow)}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {flow.is_active ? 'Desativar' : 'Ativar'}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={() => handleOpenStats(flow)}>
                                <BarChart3 className="h-4 w-4 mr-2" />Estatísticas
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateFlow(flow)}>
                                <Copy className="h-4 w-4 mr-2" />Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteFlow(flow.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Chatbot</DialogTitle>
            <DialogDescription>Configure as informações básicas do seu chatbot</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Chatbot *</Label>
              <Input 
                placeholder="Ex: Atendimento Inicial"
                value={newFlow.name}
                onChange={e => setNewFlow(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                placeholder="Descreva o objetivo deste chatbot..."
                value={newFlow.description}
                onChange={e => setNewFlow(prev => ({ ...prev, description: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <Select 
                value={newFlow.triggerType} 
                onValueChange={v => setNewFlow(prev => ({ ...prev, triggerType: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="whatsapp_channel">Canal WhatsApp</SelectItem>
                  <SelectItem value="start">Início da conversa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newFlow.triggerType === 'whatsapp_channel' && sessions.length > 0 && (
              <div className="space-y-2">
                <Label>Canal WhatsApp</Label>
                <Select 
                  value={newFlow.sessionId} 
                  onValueChange={v => setNewFlow(prev => ({ ...prev, sessionId: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione um canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.instance_name} ({s.phone_number || 'Sem número'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateFlow}
              className="rounded-xl text-white"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              Criar e Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Modal */}
      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: OMNI_COLOR }} />
              Estatísticas: {statsFlow?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: OMNI_COLOR }}>{statsData.executions.length}</p>
              <p className="text-xs text-gray-600">Execuções</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {new Set(statsData.executions.map(e => e.conversation_id).filter(Boolean)).size}
              </p>
              <p className="text-xs text-gray-600">Conversas</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {statsData.executions.filter(e => e.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-600">Concluídas</p>
            </div>
          </div>

          {/* Executions Log */}
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-gray-700 mb-2">Log de Execuções</p>
            <ScrollArea className="h-[340px]">
              {statsData.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: OMNI_COLOR }} />
                </div>
              ) : statsData.executions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma execução registrada</p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {statsData.executions.map((exec: any) => {
                    const startedAt = new Date(exec.started_at);
                    const completedAt = exec.completed_at ? new Date(exec.completed_at) : null;
                    const duration = completedAt ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000) : null;
                    const pathLength = Array.isArray(exec.execution_path) ? exec.execution_path.length : 0;
                    const variables = exec.variables || {};

                    return (
                      <div key={exec.id} className="border rounded-xl p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={exec.status === 'completed' ? 'default' : exec.status === 'running' ? 'secondary' : 'outline'}
                              className={
                                exec.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                                exec.status === 'running' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                exec.status === 'stopped' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-600'
                              }
                            >
                              {exec.status === 'completed' ? '✓ Concluído' : 
                               exec.status === 'running' ? '● Em execução' : 
                               exec.status === 'stopped' ? '■ Parado' : exec.status}
                            </Badge>
                            {exec.contact_phone && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {exec.contact_phone}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400">
                            {startedAt.toLocaleDateString('pt-BR')} {startedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {duration !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`}
                            </span>
                          )}
                          {pathLength > 0 && (
                            <span className="flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              {pathLength} nós percorridos
                            </span>
                          )}
                          {Object.keys(variables).length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {variables.nome || 'Sem nome'}
                            </span>
                          )}
                        </div>

                        {/* Variables detail */}
                        {Object.keys(variables).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(variables).map(([k, v]) => (
                              <Badge key={k} variant="secondary" className="text-[10px] rounded-md">
                                {k}: {String(v).substring(0, 30)}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Execution path */}
                        {pathLength > 0 && (
                          <div className="mt-2 flex items-center gap-1 overflow-x-auto">
                            {(exec.execution_path as string[]).slice(0, 8).map((nodeId: string, i: number) => (
                              <React.Fragment key={i}>
                                {i > 0 && <ArrowRight className="h-3 w-3 text-gray-300 flex-shrink-0" />}
                                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                  {nodeId.substring(0, 12)}
                                </span>
                              </React.Fragment>
                            ))}
                            {pathLength > 8 && <span className="text-[10px] text-gray-400">+{pathLength - 8}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatbotManagement;
