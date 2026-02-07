import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Settings, Trash2, GitBranch, BarChart3, Clock, MessageSquare, Users, Eye, ArrowRight, Loader2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<ChatbotFlow | null>(null);
  const [newFlow, setNewFlow] = useState({
    name: '',
    description: '',
    triggerType: 'keyword',
    triggerValue: '',
    sessionId: ''
  });
  const [togglingFlow, setTogglingFlow] = useState<string | null>(null);

  // Get company ID
  useEffect(() => {
    const getCompanyId = async () => {
      if (!user?.id) return;
      const metadataCompanyId = user.user_metadata?.company_id;
      if (metadataCompanyId) {
        setCompanyId(metadataCompanyId);
        return;
      }
      const {
        data
      } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };
    getCompanyId();
  }, [user?.id]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return;
      setLoading(true);

      // Load chatbot flows
      const {
        data: flowsData,
        error: flowsError
      } = await supabase.from('chatbot_flows').select('*').eq('company_id', companyId).order('created_at', {
        ascending: false
      });
      if (!flowsError && flowsData) {
        // Cast the JSON types properly
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

      // Load WhatsApp sessions for trigger config
      const {
        data: sessionsData
      } = await supabase.from('whatsapp_sessions').select('id, instance_name, phone_number, status').eq('company_id', companyId).eq('status', 'connected');
      if (sessionsData) {
        setSessions(sessionsData);
      }
      setLoading(false);
    };
    loadData();
  }, [companyId]);
  const handleCreateFlow = async () => {
    if (!newFlow.name.trim() || !companyId || !user?.id) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome do chatbot',
        variant: 'destructive'
      });
      return;
    }
    const triggerConfig = {
      type: newFlow.triggerType,
      value: newFlow.triggerValue,
      sessionId: newFlow.sessionId || null
    };
    const {
      data,
      error
    } = await supabase.from('chatbot_flows').insert({
      name: newFlow.name,
      description: newFlow.description || null,
      company_id: companyId,
      created_by: user.id,
      is_active: false,
      nodes: [{
        id: 'trigger-1',
        type: 'trigger',
        subType: newFlow.triggerType === 'whatsapp_channel' ? 'whatsapp_channel' : 'keyword',
        position: {
          x: 100,
          y: 100
        },
        data: {
          label: 'Gatilho',
          config: triggerConfig
        }
      }],
      edges: [],
      trigger_config: triggerConfig
    }).select().single();
    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }
    const newFlowData: ChatbotFlow = {
      ...data,
      description: data.description || null,
      nodes: data.nodes as any[] || [],
      edges: data.edges as any[] || [],
      trigger_config: data.trigger_config as any,
      execution_count: data.execution_count || 0
    };
    setFlows(prev => [newFlowData, ...prev]);
    setShowCreateModal(false);
    setNewFlow({
      name: '',
      description: '',
      triggerType: 'keyword',
      triggerValue: '',
      sessionId: ''
    });
    toast({
      title: 'Sucesso!',
      description: 'Chatbot criado. Clique em "Editar" para construir o fluxo.'
    });

    // Navigate to builder
    navigate(`/dashboard/chatbot-builder?flowId=${data.id}`);
  };
  const handleToggleFlow = async (flowId: string, currentActive: boolean) => {
    setTogglingFlow(flowId);
    const {
      error
    } = await supabase.from('chatbot_flows').update({
      is_active: !currentActive
    }).eq('id', flowId);
    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setFlows(prev => prev.map(f => f.id === flowId ? {
        ...f,
        is_active: !currentActive
      } : f));
      toast({
        title: !currentActive ? 'Ativado' : 'Pausado',
        description: `Chatbot ${!currentActive ? 'ativado' : 'pausado'} com sucesso!`
      });
    }
    setTogglingFlow(null);
  };
  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Tem certeza que deseja excluir este chatbot?')) return;
    const {
      error
    } = await supabase.from('chatbot_flows').delete().eq('id', flowId);
    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setFlows(prev => prev.filter(f => f.id !== flowId));
      toast({
        title: 'Excluído',
        description: 'Chatbot excluído com sucesso!'
      });
    }
  };
  const openDetails = (flow: ChatbotFlow) => {
    setSelectedFlow(flow);
    setShowDetailsModal(true);
  };
  const filteredFlows = flows.filter(flow => flow.name.toLowerCase().includes(searchQuery.toLowerCase()) || flow.description?.toLowerCase().includes(searchQuery.toLowerCase()));
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const getTriggerLabel = (config: any) => {
    if (!config) return 'Não configurado';
    switch (config.type) {
      case 'keyword':
        return `Palavra-chave: ${config.value || '...'}`;
      case 'whatsapp_channel':
        return 'Canal WhatsApp';
      case 'start':
        return 'Início da conversa';
      case 'schedule':
        return 'Horário específico';
      default:
        return config.type;
    }
  };
  if (loading) {
    return <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chatbots</h1>
            <p className="text-muted-foreground text-sm">Crie e gerencie fluxos automatizados</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Chatbot
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{flows.length}</p>
                <p className="text-xs text-muted-foreground">Total de Chatbots</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {flows.filter(f => f.is_active).length}
                </p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Pause className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {flows.filter(f => !f.is_active).length}
                </p>
                <p className="text-xs text-muted-foreground">Pausados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500/5 to-violet-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-600">
                  {flows.reduce((sum, f) => sum + (f.execution_count || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Execuções Totais</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar chatbots..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {/* Chatbots Grid */}
      {filteredFlows.length === 0 ? <Card className="border-dashed border-0 shadow-sm bg-muted/30">
          <CardContent className="p-12 text-center">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <GitBranch className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum chatbot encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Tente uma busca diferente' : 'Crie seu primeiro chatbot para começar'}
            </p>
            {!searchQuery && <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Chatbot
              </Button>}
          </CardContent>
        </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlows.map(flow => <Card key={flow.id} className={`transition-all hover:shadow-lg border-0 shadow-sm ${flow.is_active ? 'ring-1 ring-primary/20 bg-gradient-to-br from-primary/5 to-transparent' : ''}`}>
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${flow.is_active ? 'bg-primary' : 'bg-muted'}`}>
                      <GitBranch className={`h-5 w-5 ${flow.is_active ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{flow.name}</h3>
                      <Badge variant={flow.is_active ? 'default' : 'secondary'} className="text-xs mt-1">
                        {flow.is_active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                  </div>
                  <Switch checked={flow.is_active} onCheckedChange={() => handleToggleFlow(flow.id, flow.is_active)} disabled={togglingFlow === flow.id} />
                </div>

                {/* Description */}
                {flow.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {flow.description}
                  </p>}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{flow.nodes?.length || 0} nós</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{flow.execution_count || 0} exec.</span>
                  </div>
                </div>

                {/* Trigger */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 p-2 bg-muted/50 rounded-lg">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{getTriggerLabel(flow.trigger_config)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/dashboard/chatbot-builder?flowId=${flow.id}`)}>
                    <Settings className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openDetails(flow)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDeleteFlow(flow.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>)}
        </div>}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Chatbot</DialogTitle>
            <DialogDescription>
              Configure as informações básicas do seu chatbot
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Chatbot *</Label>
              <Input id="name" placeholder="Ex: Atendimento Inicial" value={newFlow.name} onChange={e => setNewFlow(prev => ({
              ...prev,
              name: e.target.value
            }))} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" placeholder="Descreva o objetivo deste chatbot..." value={newFlow.description} onChange={e => setNewFlow(prev => ({
              ...prev,
              description: e.target.value
            }))} />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <Select value={newFlow.triggerType} onValueChange={v => setNewFlow(prev => ({
              ...prev,
              triggerType: v
            }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="whatsapp_channel">Canal WhatsApp</SelectItem>
                  <SelectItem value="start">Início da Conversa</SelectItem>
                  <SelectItem value="schedule">Horário Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newFlow.triggerType === 'keyword' && <div className="space-y-2">
                <Label>Palavras-chave (separadas por vírgula)</Label>
                <Input placeholder="Ex: preço, valor, orçamento" value={newFlow.triggerValue} onChange={e => setNewFlow(prev => ({
              ...prev,
              triggerValue: e.target.value
            }))} />
              </div>}
            
            {newFlow.triggerType === 'whatsapp_channel' && sessions.length > 0 && <div className="space-y-2">
                <Label>Canal WhatsApp</Label>
                <Select value={newFlow.sessionId} onValueChange={v => setNewFlow(prev => ({
              ...prev,
              sessionId: v
            }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => <SelectItem key={s.id} value={s.id}>
                        {s.phone_number || s.instance_name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFlow}>
              Criar e Editar Fluxo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              {selectedFlow?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFlow && <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={selectedFlow.is_active ? 'default' : 'secondary'}>
                    {selectedFlow.is_active ? 'Ativo' : 'Pausado'}
                  </Badge>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Execuções</p>
                  <p className="text-lg font-bold">{selectedFlow.execution_count || 0}</p>
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{selectedFlow.description || 'Sem descrição'}</p>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Gatilho</p>
                <p className="text-sm">{getTriggerLabel(selectedFlow.trigger_config)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Nós no Fluxo</p>
                  <p className="text-lg font-bold">{selectedFlow.nodes?.length || 0}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Conexões</p>
                  <p className="text-lg font-bold">{selectedFlow.edges?.length || 0}</p>
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Criado em</p>
                <p className="text-sm">{formatDate(selectedFlow.created_at)}</p>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Última atualização</p>
                <p className="text-sm">{formatDate(selectedFlow.updated_at)}</p>
              </div>
            </div>}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
            setShowDetailsModal(false);
            navigate(`/dashboard/chatbot-builder?flowId=${selectedFlow?.id}`);
          }}>
              Editar Fluxo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default ChatbotManagement;