import React, { useState, useEffect } from 'react';
import { Plus, Bot, Settings, Play, Pause, MessageCircle, Brain, Zap, Users, Phone, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const AI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Rápido)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanceado)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Rápido)' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Avançado)' },
];

const DEMO_CHANNELS = [
  { id: '1', name: 'WhatsApp Business', number: '+55 11 99999-0001', type: 'whatsapp' },
  { id: '2', name: 'WhatsApp Vendas', number: '+55 11 99999-0002', type: 'whatsapp' },
  { id: '3', name: 'WhatsApp Suporte', number: '+55 11 99999-0003', type: 'whatsapp' },
];

const BotIADashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentPersonality, setAgentPersonality] = useState('');
  const [agentInstructions, setAgentInstructions] = useState('');
  const [agentModel, setAgentModel] = useState('google/gemini-3-flash-preview');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  const ensureCompany = async (): Promise<string | null> => {
    if (!user?.id) return null;
    
    const metadataCompanyId = user.user_metadata?.company_id;
    if (metadataCompanyId) return metadataCompanyId;
    
    const { data: existingCompanyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (existingCompanyUser?.company_id) {
      await supabase.auth.updateUser({ data: { company_id: existingCompanyUser.company_id } });
      return existingCompanyUser.company_id;
    }
    
    const companyName = user.user_metadata?.company_name || user.user_metadata?.username || user.email?.split('@')[0] || 'Minha Empresa';
    
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName })
      .select()
      .single();
    
    if (companyError || !newCompany) {
      toast({ title: 'Erro', description: 'Não foi possível criar a empresa.', variant: 'destructive' });
      return null;
    }
    
    await supabase.from('company_users').insert({ company_id: newCompany.id, user_id: user.id, role: 'admin' });
    await supabase.auth.updateUser({ data: { company_id: newCompany.id } });
    toast({ title: 'Empresa criada', description: `"${companyName}" configurada com sucesso!` });
    
    return newCompany.id;
  };

  const loadAgents = async (cId: string) => {
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('company_id', cId)
      .order('created_at', { ascending: false });
    
    if (!error) setAgents(data || []);
  };

  useEffect(() => {
    const init = async () => {
      const cId = await ensureCompany();
      setCompanyId(cId);
      if (cId) await loadAgents(cId);
      setLoading(false);
    };
    
    if (user?.id) init();
  }, [user?.id]);

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

  const useTemplate = () => {
    if (!selectedTemplate) return;
    setAgentName(selectedTemplate.name);
    setAgentDescription(selectedTemplate.description);
    setAgentPersonality(selectedTemplate.personality);
    setAgentInstructions(selectedTemplate.instructions);
    setShowTemplateModal(false);
    setShowCreateModal(true);
  };

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

  const assignAgentToChannel = () => {
    if (!selectedAgent || !selectedChannel) {
      toast({ title: 'Erro', description: 'Selecione um canal', variant: 'destructive' });
      return;
    }
    
    const channel = DEMO_CHANNELS.find(c => c.id === selectedChannel);
    toast({ title: 'Agente Atribuído!', description: `${selectedAgent.name} agora responderá automaticamente em ${channel?.name}` });
    setShowChannelModal(false);
    setSelectedChannel('');
  };

  const stats = [
    { label: 'Agentes Ativos', value: agents.filter(a => a.is_active).length, icon: Bot, color: 'text-[#FF4500] bg-[#FF4500]/10' },
    { label: 'Total de Agentes', value: agents.length, icon: Brain, color: 'text-[#FF4500] bg-[#FF4500]/10' },
    { label: 'Conversas Hoje', value: 28, icon: MessageCircle, color: 'text-green-600 bg-green-100' },
    { label: 'Taxa de Resposta', value: '94%', icon: Zap, color: 'text-purple-600 bg-purple-100' },
  ];

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
    <div className="min-h-screen bg-background p-6 page-content">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF4500]/10 rounded-xl">
              <Bot className="h-6 w-6 text-[#FF4500]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agentes de IA</h1>
              <p className="text-muted-foreground text-sm">
                Crie e gerencie assistentes virtuais inteligentes
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
              <Brain className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="bg-[#FF4500] hover:bg-[#FF4500]/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Agente
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-0 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-semibold">Meus Agentes</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {agents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum agente criado</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Comece criando seu primeiro agente IA para automatizar atendimentos
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
                  Ver Templates
                </Button>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Agente
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => (
                <Card key={agent.id} className="border shadow-sm hover:shadow-md transition-all group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#FF4500]/10 rounded-xl group-hover:bg-[#FF4500]/20 transition-colors">
                          <Bot className="h-5 w-5 text-[#FF4500]" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{agent.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {AI_MODELS.find(m => m.value === agent.model)?.label || agent.model}
                          </p>
                        </div>
                      </div>
                      <Badge variant={agent.is_active ? 'default' : 'secondary'} className={agent.is_active ? 'bg-[#FF4500]' : ''}>
                        {agent.is_active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {agent.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                      )}
                      
                      <div className="bg-muted/50 rounded-lg p-3">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Personalidade
                        </label>
                        <p className="text-sm text-foreground line-clamp-2 mt-1">{agent.personality}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => { setSelectedAgent(agent); setShowChatModal(true); }}
                          className="flex-1 bg-[#FF4500] hover:bg-[#FF4500]/90"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Conversar
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedAgent(agent); setShowChannelModal(true); }}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Canal
                        </Button>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedAgent(agent); setShowEditModal(true); }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAgent(agent.id, agent.is_active)}
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
        </CardContent>
      </Card>

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
                className={`cursor-pointer hover:shadow-md transition-all border-2 ${
                  selectedTemplate?.name === template.name ? 'border-primary bg-primary/5' : 'border-transparent hover:border-primary/20'
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
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancelar</Button>
            <Button onClick={useTemplate} disabled={!selectedTemplate}>
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
                <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Ex: Assistente de Vendas" />
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea value={agentDescription} onChange={(e) => setAgentDescription(e.target.value)} placeholder="Breve descrição do agente..." rows={2} />
              </div>
              
              <div>
                <label className="text-sm font-medium">Modelo de IA</label>
                <Select value={agentModel} onValueChange={setAgentModel}>
                  <SelectTrigger>
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
                <Textarea value={agentPersonality} onChange={(e) => setAgentPersonality(e.target.value)} placeholder="Ex: Profissional, amigável e prestativo..." rows={2} />
              </div>
              
              <div>
                <label className="text-sm font-medium">Instruções *</label>
                <Textarea value={agentInstructions} onChange={(e) => setAgentInstructions(e.target.value)} placeholder="Instruções detalhadas sobre como o agente deve se comportar..." rows={6} />
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={createAgent}>Criar Agente</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Channel Modal */}
      <Dialog open={showChannelModal} onOpenChange={setShowChannelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Atribuir a Canal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selecione o canal que o agente <strong>{selectedAgent?.name}</strong> irá atender automaticamente.
            </p>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger>
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
            <Button variant="outline" onClick={() => setShowChannelModal(false)}>Cancelar</Button>
            <Button onClick={assignAgentToChannel} disabled={!selectedChannel}>
              <Link2 className="h-4 w-4 mr-2" />
              Atribuir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
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
