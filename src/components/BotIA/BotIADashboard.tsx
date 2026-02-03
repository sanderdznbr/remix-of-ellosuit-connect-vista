import React, { useState, useEffect } from 'react';
import { Plus, Bot, Settings, Play, Pause, MessageCircle, Brain, Zap, Users, Pencil } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import BotIAChat from './BotIAChat';
import EditAgentModal from './EditAgentModal';

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
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  
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
    
    // Check user metadata first
    const metadataCompanyId = user.user_metadata?.company_id;
    if (metadataCompanyId) {
      console.log('✅ Company found in metadata:', metadataCompanyId);
      return metadataCompanyId;
    }
    
    // Check company_users table
    const { data: existingCompanyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (existingCompanyUser?.company_id) {
      console.log('✅ Company found in company_users:', existingCompanyUser.company_id);
      // Update user metadata
      await supabase.auth.updateUser({
        data: { company_id: existingCompanyUser.company_id }
      });
      return existingCompanyUser.company_id;
    }
    
    // Create new company
    console.log('🏢 Creating new company for user...');
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
      console.error('❌ Error creating company:', companyError);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível criar a empresa. Tente novamente.', 
        variant: 'destructive' 
      });
      return null;
    }
    
    // Link user to company
    const { error: linkError } = await supabase
      .from('company_users')
      .insert({
        company_id: newCompany.id,
        user_id: user.id,
        role: 'admin'
      });
    
    if (linkError) {
      console.error('❌ Error linking user to company:', linkError);
    }
    
    // Update user metadata
    await supabase.auth.updateUser({
      data: { company_id: newCompany.id }
    });
    
    console.log('✅ Company created:', newCompany.id);
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
    
    if (error) {
      console.error('Error loading agents:', error);
      return;
    }
    
    setAgents(data || []);
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
      console.error('Error creating agent:', error);
      toast({ title: 'Erro', description: 'Erro ao criar agente: ' + error.message, variant: 'destructive' });
      return;
    }
    
    // Reset form
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
    toast({ 
      title: 'Sucesso', 
      description: isActive ? 'Agente pausado' : 'Agente ativado' 
    });
  };

  // Chat with agent
  const chatWithAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setShowChatModal(true);
  };

  // Edit agent
  const editAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando agentes IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agentes de IA</h1>
            <p className="text-muted-foreground text-sm">Crie e gerencie assistentes virtuais inteligentes</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowTemplateModal(true)} className="rounded-xl">
            <Brain className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-xl bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Agente
          </Button>
        </div>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="agents" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Meus Agentes</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Análises</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Agentes Ativos</p>
                    <p className="text-3xl font-bold text-foreground">
                      {agents.filter(a => a.is_active).length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Bot className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total de Agentes</p>
                    <p className="text-3xl font-bold text-foreground">{agents.length}</p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Conversas Hoje</p>
                    <p className="text-3xl font-bold text-foreground">0</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agents Grid */}
          {agents.length === 0 ? (
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Nenhum agente criado
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Comece criando seu primeiro agente IA inteligente para automatizar atendimentos
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setShowTemplateModal(true)} className="rounded-xl">
                    Ver Templates
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)} className="rounded-xl">
                    Criar Agente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map(agent => (
                <Card key={agent.id} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardHeader className="pb-3 bg-gradient-to-br from-muted/30 to-transparent">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl group-hover:scale-105 transition-transform">
                          <Bot className="h-5 w-5 text-primary" />
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
                        className={`rounded-lg ${agent.is_active ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-0' : ''}`}
                      >
                        {agent.is_active ? '● Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2">
                    <div className="space-y-4">
                      {agent.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                      
                      <div className="bg-muted/30 rounded-xl p-3">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Personalidade
                        </label>
                        <p className="text-sm text-foreground line-clamp-2 mt-1">
                          {agent.personality}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => chatWithAgent(agent)}
                          className="rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Conversar
                        </Button>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editAgent(agent)}
                            title="Configurar"
                            className="rounded-xl hover:bg-muted"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAgent(agent.id, agent.is_active)}
                            className="rounded-xl hover:bg-muted"
                          >
                            {agent.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Análises de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Análises em desenvolvimento
                </h3>
                <p className="text-muted-foreground text-sm">
                  Em breve você poderá ver métricas de performance dos seus agentes
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Configurações Globais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div>
                    <label className="text-sm font-medium">Logs de Conversas</label>
                    <p className="text-xs text-muted-foreground">
                      Salvar conversas para análise e melhoria
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div>
                    <label className="text-sm font-medium">Modo de Desenvolvimento</label>
                    <p className="text-xs text-muted-foreground">
                      Exibir logs detalhados para debug
                    </p>
                  </div>
                  <Switch />
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
                  selectedTemplate?.name === template.name ? 'border-primary bg-primary/5' : 'border-transparent'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <template.icon className="h-5 w-5 text-primary" />
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
            <Button variant="outline" onClick={() => setShowTemplateModal(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={useTemplate} disabled={!selectedTemplate} className="rounded-xl">
              Usar Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Agent Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Criar Novo Agente</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Agente *</label>
                <Input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Ex: Assistente de Vendas"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={agentDescription}
                  onChange={(e) => setAgentDescription(e.target.value)}
                  placeholder="Breve descrição do agente..."
                  rows={2}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Modelo de IA</label>
                <Select value={agentModel} onValueChange={setAgentModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Personalidade *</label>
                <Textarea
                  value={agentPersonality}
                  onChange={(e) => setAgentPersonality(e.target.value)}
                  placeholder="Ex: Profissional, amigável e prestativo..."
                  rows={2}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Instruções *</label>
                <Textarea
                  value={agentInstructions}
                  onChange={(e) => setAgentInstructions(e.target.value)}
                  placeholder="Instruções detalhadas sobre como o agente deve se comportar..."
                  rows={6}
                />
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={createAgent}>
              Criar Agente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
          {selectedAgent && (
            <BotIAChat 
              agent={selectedAgent} 
              onClose={() => setShowChatModal(false)} 
            />
          )}
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
