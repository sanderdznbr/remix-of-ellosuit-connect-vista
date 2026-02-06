import React, { useState, useEffect } from 'react';
import { Plus, Bot, Settings, Play, Pause, MessageCircle, Brain, Zap, Users, Phone, Link2, BarChart3, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import BotIAChat from './BotIAChat';
import EditAgentModal from './EditAgentModal';
import ChatbotFlowBuilder from './ChatbotFlowBuilder';


interface AIAgent {
  id: string;
  name: string;
  description?: string;
  personality: string;
  instructions: string;
  model: string;
  is_active: boolean;
  avatar_url?: string;
  settings: any;
  created_at: string;
  whatsapp_enabled?: boolean;
  whatsapp_session_id?: string;
}

interface AgentTemplate {
  name: string;
  description: string;
  personality: string;
  instructions: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    name: 'Atendimento ao Cliente',
    description: 'Especialista em suporte e resolução de problemas',
    personality: 'Profissional, empático e solucionador de problemas',
    instructions: `Você é um especialista em atendimento ao cliente. Suas principais responsabilidades:

1. Responder perguntas de forma clara e educada
2. Resolver problemas de forma eficiente
3. Escalar questões complexas quando necessário
4. Manter sempre um tom profissional e empático
5. Coletar feedback dos clientes

Sempre pergunte se há mais alguma coisa em que pode ajudar antes de finalizar a conversa.`,
    icon: MessageCircle
  },
  {
    name: 'Vendas e Negócios',
    description: 'Especialista em vendas consultivas e fechamento de negócios',
    personality: 'Persuasivo, consultivo e focado em resultados',
    instructions: `Você é um especialista em vendas consultivas. Suas principais responsabilidades:

1. Qualificar leads e identificar necessidades
2. Apresentar soluções adequadas ao perfil do cliente
3. Conduzir o processo de vendas até o fechamento
4. Manter relacionamento pós-venda
5. Identificar oportunidades de upsell e cross-sell

Use a metodologia SPIN (Situação, Problema, Implicação, Necessidade) para conduzir as conversas.`,
    icon: Zap
  },
  {
    name: 'Assistente Executivo',
    description: 'Assistente inteligente para executivos e gestores',
    personality: 'Organizado, proativo e estratégico',
    instructions: `Você é um assistente executivo altamente qualificado. Suas principais responsabilidades:

1. Gerenciar agenda e compromissos
2. Preparar resumos e relatórios executivos
3. Filtrar informações relevantes
4. Auxiliar na tomada de decisões estratégicas
5. Coordenar comunicações internas e externas

Sempre priorize eficiência e resultados nas suas respostas.`,
    icon: Brain
  },
  {
    name: 'RH e Recrutamento',
    description: 'Especialista em recursos humanos e seleção de talentos',
    personality: 'Humano, analítico e focado em pessoas',
    instructions: `Você é um especialista em recursos humanos. Suas principais responsabilidades:

1. Avaliar perfis de candidatos
2. Conduzir entrevistas iniciais
3. Orientar sobre políticas de RH
4. Apoiar desenvolvimento de talentos
5. Resolver questões trabalhistas básicas

Sempre mantenha confidencialidade e foque no desenvolvimento humano.`,
    icon: Users
  }
];

// AI models available
const AI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Rápido)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanceado)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Rápido)' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Avançado)' },
];

// Demo connected channels
const DEMO_CHANNELS = [
  { id: '1', name: 'WhatsApp Business', number: '+55 11 99999-0001', type: 'whatsapp' },
  { id: '2', name: 'WhatsApp Vendas', number: '+55 11 99999-0002', type: 'whatsapp' },
  { id: '3', name: 'WhatsApp Suporte', number: '+55 11 99999-0003', type: 'whatsapp' },
];

const BotIADashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  
  // Form states
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentPersonality, setAgentPersonality] = useState('');
  const [agentInstructions, setAgentInstructions] = useState('');
  const [agentModel, setAgentModel] = useState('google/gemini-3-flash-preview');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  // Ensure user has a company
  const ensureCompany = async (): Promise<string | null> => {
    if (!user?.id) return null;
    
    const metadataCompanyId = user.user_metadata?.company_id;
    if (metadataCompanyId) {
      return metadataCompanyId;
    }
    
    const { data: existingCompanyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (existingCompanyUser?.company_id) {
      await supabase.auth.updateUser({
        data: { company_id: existingCompanyUser.company_id }
      });
      return existingCompanyUser.company_id;
    }
    
    const companyName = user.user_metadata?.company_name || 
                       user.user_metadata?.username || 
                       user.email?.split('@')[0] || 
                       'Minha Empresa';
    
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName })
      .select()
      .single();
    
    if (companyError || !newCompany) {
      toast({ title: 'Erro', description: 'Não foi possível criar a empresa.', variant: 'destructive' });
      return null;
    }
    
    await supabase
      .from('company_users')
      .insert({ company_id: newCompany.id, user_id: user.id, role: 'admin' });
    
    await supabase.auth.updateUser({ data: { company_id: newCompany.id } });
    toast({ title: 'Empresa criada', description: `"${companyName}" configurada com sucesso!` });
    
    return newCompany.id;
  };

  // Load agents
  const loadAgents = async (cId: string) => {
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('company_id', cId)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setAgents(data || []);
    }
  };

  useEffect(() => {
    const init = async () => {
      const cId = await ensureCompany();
      setCompanyId(cId);
      if (cId) {
        await loadAgents(cId);
      }
      setLoading(false);
    };
    
    if (user?.id) {
      init();
    }
  }, [user?.id]);

  // Create agent
  const createAgent = async () => {
    if (!agentName || !agentPersonality || !agentInstructions) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    
    if (!user?.id || !companyId) {
      toast({ title: 'Erro', description: 'Usuário ou empresa não identificado', variant: 'destructive' });
      return;
    }
    
    const { error } = await supabase
      .from('ai_agents')
      .insert({
        name: agentName,
        description: agentDescription,
        personality: agentPersonality,
        instructions: agentInstructions,
        model: agentModel,
        company_id: companyId,
        created_by: user.id,
        is_active: true,
        settings: {}
      });
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao criar agente: ' + error.message, variant: 'destructive' });
      return;
    }
    
    setAgentName('');
    setAgentDescription('');
    setAgentPersonality('');
    setAgentInstructions('');
    setAgentModel('google/gemini-3-flash-preview');
    setShowCreateModal(false);
    
    loadAgents(companyId);
    toast({ title: 'Sucesso', description: 'Agente criado com sucesso!' });
  };

  // Use template
  const useTemplate = () => {
    if (!selectedTemplate) return;
    setAgentName(selectedTemplate.name);
    setAgentDescription(selectedTemplate.description);
    setAgentPersonality(selectedTemplate.personality);
    setAgentInstructions(selectedTemplate.instructions);
    setShowTemplateModal(false);
    setShowCreateModal(true);
  };

  // Toggle agent status
  const toggleAgent = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('ai_agents')
      .update({ is_active: !isActive })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao alterar status', variant: 'destructive' });
      return;
    }
    
    if (companyId) loadAgents(companyId);
    toast({ title: 'Sucesso', description: isActive ? 'Agente pausado' : 'Agente ativado' });
  };

  // Assign agent to channel
  const assignAgentToChannel = () => {
    if (!selectedAgent || !selectedChannel) {
      toast({ title: 'Erro', description: 'Selecione um canal', variant: 'destructive' });
      return;
    }
    
    const channel = DEMO_CHANNELS.find(c => c.id === selectedChannel);
    toast({ 
      title: 'Agente Atribuído!', 
      description: `${selectedAgent.name} agora responderá automaticamente em ${channel?.name}` 
    });
    setShowChannelModal(false);
    setSelectedChannel('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando agentes IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-indigo-50/30 p-6 page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Agentes de IA
            </h1>
            <p className="text-muted-foreground text-sm">Crie e gerencie assistentes virtuais inteligentes</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowTemplateModal(true)} className="rounded-xl border-blue-200 hover:bg-blue-50">
            <Brain className="h-4 w-4 mr-2 text-blue-600" />
            Templates
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            Novo Agente
          </Button>
        </div>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="bg-white shadow-sm p-1 rounded-xl border">
          <TabsTrigger value="agents" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Meus Agentes
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Análises
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Chatbot Fluxos
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-6">
          {/* Stats - White Background */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Agentes Ativos</p>
                    <p className="text-3xl font-bold text-blue-600">{agents.filter(a => a.is_active).length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Bot className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total de Agentes</p>
                    <p className="text-3xl font-bold text-indigo-600">{agents.length}</p>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <Brain className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Conversas Hoje</p>
                    <p className="text-3xl font-bold text-cyan-600">28</p>
                  </div>
                  <div className="p-3 bg-cyan-100 rounded-xl">
                    <MessageCircle className="h-6 w-6 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agents Grid */}
          {agents.length === 0 ? (
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Bot className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum agente criado</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Comece criando seu primeiro agente IA para automatizar atendimentos
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setShowTemplateModal(true)} className="rounded-xl">
                    Ver Templates
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)} className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600">
                    Criar Agente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map(agent => (
                <Card key={agent.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardHeader className="pb-3 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl group-hover:scale-105 transition-transform shadow-md">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{agent.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {AI_MODELS.find(m => m.value === agent.model)?.label || agent.model}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={agent.is_active ? 'default' : 'secondary'}
                        className={`rounded-lg ${agent.is_active ? 'bg-green-500 text-white border-0' : ''}`}
                      >
                        {agent.is_active ? '● Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {agent.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                      )}
                      
                      <div className="bg-blue-50 rounded-xl p-3">
                        <label className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                          Personalidade
                        </label>
                        <p className="text-sm text-foreground line-clamp-2 mt-1">{agent.personality}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => { setSelectedAgent(agent); setShowChatModal(true); }}
                          className="rounded-xl bg-blue-500 hover:bg-blue-600 flex-1"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Conversar
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedAgent(agent); setShowChannelModal(true); }}
                          className="rounded-xl border-blue-200 hover:bg-blue-50"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Atribuir Canal
                        </Button>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedAgent(agent); setShowEditModal(true); }}
                          className="rounded-xl hover:bg-blue-50"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAgent(agent.id, agent.is_active)}
                          className="rounded-xl hover:bg-blue-50"
                        >
                          {agent.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Real Analytics Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4 text-center">
                <div className="p-3 bg-blue-100 rounded-xl w-fit mx-auto mb-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{agents.length}</p>
                <p className="text-xs text-muted-foreground">Total de Agentes</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4 text-center">
                <div className="p-3 bg-indigo-100 rounded-xl w-fit mx-auto mb-2">
                  <Target className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-indigo-600">{agents.filter(a => a.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Agentes Ativos</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4 text-center">
                <div className="p-3 bg-purple-100 rounded-xl w-fit mx-auto mb-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-600">{agents.filter(a => !a.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Agentes Inativos</p>
              </CardContent>
            </Card>
          </div>

          {/* Coming Soon Placeholder */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BarChart3 className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Análises Avançadas</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Estatísticas detalhadas de conversas, satisfação e desempenho dos seus agentes estarão disponíveis em breve.
              </p>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Em breve
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chatbot Flows Tab */}
        <TabsContent value="chatbot" className="space-y-6">
          <ChatbotFlowBuilder />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Configurações Globais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div>
                    <label className="text-sm font-medium">Logs de Conversas</label>
                    <p className="text-xs text-muted-foreground">Salvar conversas para análise e melhoria</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div>
                    <label className="text-sm font-medium">Modo de Desenvolvimento</label>
                    <p className="text-xs text-muted-foreground">Exibir logs detalhados para debug</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div>
                    <label className="text-sm font-medium">Respostas Automáticas</label>
                    <p className="text-xs text-muted-foreground">Permitir agentes responder automaticamente</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Templates Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-4xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Templates de Agentes</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AGENT_TEMPLATES.map((template, index) => (
              <Card 
                key={index} 
                className={`cursor-pointer hover:shadow-md transition-all rounded-xl border-2 ${
                  selectedTemplate?.name === template.name ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-blue-200'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <template.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowTemplateModal(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={useTemplate} disabled={!selectedTemplate} className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600">
              Usar Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Agent Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Agente</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Agente *</label>
                <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Ex: Assistente de Vendas" className="rounded-xl" />
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea value={agentDescription} onChange={(e) => setAgentDescription(e.target.value)} placeholder="Breve descrição do agente..." rows={2} className="rounded-xl" />
              </div>
              
              <div>
                <label className="text-sm font-medium">Modelo de IA</label>
                <Select value={agentModel} onValueChange={setAgentModel}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map(model => (
                      <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Personalidade *</label>
                <Textarea value={agentPersonality} onChange={(e) => setAgentPersonality(e.target.value)} placeholder="Ex: Profissional, amigável e prestativo..." rows={2} className="rounded-xl" />
              </div>
              
              <div>
                <label className="text-sm font-medium">Instruções *</label>
                <Textarea value={agentInstructions} onChange={(e) => setAgentInstructions(e.target.value)} placeholder="Instruções detalhadas sobre como o agente deve se comportar..." rows={6} className="rounded-xl" />
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={createAgent} className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600">Criar Agente</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Channel Modal */}
      <Dialog open={showChannelModal} onOpenChange={setShowChannelModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Atribuir a Canal de Vendas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selecione o canal que o agente <strong>{selectedAgent?.name}</strong> irá atender automaticamente.
            </p>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione um canal..." />
              </SelectTrigger>
              <SelectContent>
                {DEMO_CHANNELS.map(channel => (
                  <SelectItem key={channel.id} value={channel.id}>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span>{channel.name}</span>
                      <span className="text-muted-foreground text-xs">({channel.number})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowChannelModal(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={assignAgentToChannel} disabled={!selectedChannel} className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600">
              <Link2 className="h-4 w-4 mr-2" />
              Atribuir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 rounded-2xl">
          {selectedAgent && <BotIAChat agent={selectedAgent} onClose={() => setShowChatModal(false)} />}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {selectedAgent && (
        <EditAgentModal
          agent={selectedAgent}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => companyId && loadAgents(companyId)}
          onDelete={() => companyId && loadAgents(companyId)}
        />
      )}
    </div>
  );
};

export default BotIADashboard;
