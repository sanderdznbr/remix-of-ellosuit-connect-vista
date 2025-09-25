import React, { useState, useEffect } from 'react';
import { Plus, Bot, Settings, Play, Pause, MessageCircle, Brain, Zap, Users } from 'lucide-react';
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

const BotIADashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingAgent, setTestingAgent] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  
  // Form states
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentPersonality, setAgentPersonality] = useState('');
  const [agentInstructions, setAgentInstructions] = useState('');
  const [agentModel, setAgentModel] = useState('gpt-4o-mini');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);


  const companyId = user?.user_metadata?.company_id;

  // Load agents
  const loadAgents = async () => {
    if (!companyId) return;
    
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading agents:', error);
      return;
    }
    
    setAgents(data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      await loadAgents();
      setLoading(false);
    };
    
    loadData();
  }, [companyId]);

  // Create agent
  const createAgent = async () => {
    if (!agentName || !agentPersonality || !agentInstructions || !user?.id || !companyId) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
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
      toast({ title: 'Erro', description: 'Erro ao criar agente', variant: 'destructive' });
      return;
    }
    
    // Reset form
    setAgentName('');
    setAgentDescription('');
    setAgentPersonality('');
    setAgentInstructions('');
    setAgentModel('gpt-4o-mini');
    setShowCreateModal(false);
    
    loadAgents();
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
    
    loadAgents();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando agentes IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-gray-900" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agentes de IA</h1>
            <p className="text-gray-600">Crie e gerencie agentes de IA inteligentes para automação</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
            <Brain className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agente
          </Button>
        </div>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agents">Meus Agentes</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Agentes Ativos
                  </CardTitle>
                  <Bot className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {agents.filter(a => a.is_active).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total de Agentes
                  </CardTitle>
                  <Brain className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agents.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Conversas Hoje
                  </CardTitle>
                  <MessageCircle className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>
          </div>

          {/* Agents Grid */}
          {agents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum agente criado
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece criando seu primeiro agente IA inteligente
                </p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
                    Ver Templates
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Criar Agente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map(agent => (
                <Card key={agent.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Bot className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            Modelo: {agent.model}
                          </p>
                        </div>
                      </div>
                      <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                        {agent.is_active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      {agent.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                      
                      <div>
                        <label className="text-xs font-medium text-gray-500">
                          PERSONALIDADE
                        </label>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {agent.personality}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => chatWithAgent(agent)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Conversar
                        </Button>
                        
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAgent(agent.id, agent.is_active)}
                          >
                            {agent.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
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
          <Card>
            <CardHeader>
              <CardTitle>Análises de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Análises em desenvolvimento
                </h3>
                <p className="text-gray-600">
                  Em breve você poderá ver métricas de performance dos seus agentes
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Globais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Logs de Conversas</label>
                    <p className="text-xs text-gray-600">
                      Salvar conversas para análise e melhoria
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Modo de Desenvolvimento</label>
                    <p className="text-xs text-gray-600">
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Templates de Agentes</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AGENT_TEMPLATES.map((template, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <template.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={useTemplate} disabled={!selectedTemplate}>
              Usar Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Agent Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Agente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nome do Agente *</label>
                <Input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Ex: Assistente de Vendas"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Modelo IA</label>
                <Select value={agentModel} onValueChange={setAgentModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                placeholder="Descreva brevemente o propósito do agente..."
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Personalidade *</label>
              <Textarea
                value={agentPersonality}
                onChange={(e) => setAgentPersonality(e.target.value)}
                placeholder="Ex: Profissional, empático, sempre disposto a ajudar..."
                rows={2}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Instruções do Sistema *</label>
              <Textarea
                value={agentInstructions}
                onChange={(e) => setAgentInstructions(e.target.value)}
                placeholder="Defina como o agente deve se comportar, suas responsabilidades e regras..."
                rows={6}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
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
        <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
          {selectedAgent && (
            <BotIAChat 
              agent={selectedAgent}
              onClose={() => setShowChatModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BotIADashboard;