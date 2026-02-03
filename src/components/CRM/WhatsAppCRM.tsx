import React, { useState, useEffect, useRef } from 'react';
import { Plus, Phone, MessageSquare, Settings, QrCode, Trash2, Users, Bot, Search, Filter, MoreVertical, Send, Paperclip, Smile, Check, CheckCheck, Circle, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import WhatsAppQRModal from './WhatsAppQRModal';
import { cn } from '@/lib/utils';

interface WhatsAppSession {
  id: string;
  instance_name: string;
  status: string;
  phone_number?: string;
  phone_name?: string;
  profile_picture?: string;
  connected_at?: string;
  created_at: string;
}

interface WhatsAppConversationData {
  id: string;
  contact_phone: string;
  contact_name?: string;
  last_message_at: string;
  last_message?: string;
  status: string;
  unread_count?: number;
  profile_picture?: string;
  session_id?: string;
  assigned_agent_id?: string;
  is_demo?: boolean;
  is_ai_agent?: boolean;
}

interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  content: string;
  from_me: boolean;
  status: string;
  created_at: string;
  sender_name?: string;
}

interface AIAgent {
  id: string;
  name: string;
  description?: string;
  personality: string;
  instructions: string;
  avatar_url?: string;
  is_active: boolean;
}

// Demo conversations data
const DEMO_CONVERSATIONS: WhatsAppConversationData[] = [
  {
    id: 'demo-1',
    contact_name: 'Maria Silva',
    contact_phone: '+55 11 99999-1234',
    last_message: 'Olá, gostaria de saber sobre o produto X',
    last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: 'open',
    unread_count: 2,
    is_demo: true
  },
  {
    id: 'demo-2',
    contact_name: 'João Pereira',
    contact_phone: '+55 21 98888-5678',
    last_message: 'Obrigado pelo atendimento!',
    last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'closed',
    unread_count: 0,
    is_demo: true
  },
  {
    id: 'demo-3',
    contact_name: 'Ana Costa',
    contact_phone: '+55 31 97777-9012',
    last_message: 'Preciso de suporte urgente',
    last_message_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'open',
    unread_count: 5,
    is_demo: true
  },
  {
    id: 'demo-4',
    contact_name: 'Pedro Santos',
    contact_phone: '+55 41 96666-3456',
    last_message: 'Qual o prazo de entrega?',
    last_message_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: 'open',
    unread_count: 1,
    is_demo: true
  },
  {
    id: 'demo-5',
    contact_name: 'Empresa ABC',
    contact_phone: '+55 51 95555-7890',
    last_message: 'Podemos agendar uma reunião?',
    last_message_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    unread_count: 3,
    is_demo: true
  }
];

// Demo messages for each conversation
const DEMO_MESSAGES: Record<string, WhatsAppMessage[]> = {
  'demo-1': [
    { id: 'm1-1', conversation_id: 'demo-1', content: 'Olá! Bom dia', from_me: false, status: 'read', created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    { id: 'm1-2', conversation_id: 'demo-1', content: 'Bom dia! Como posso ajudar?', from_me: true, status: 'read', created_at: new Date(Date.now() - 9 * 60 * 1000).toISOString() },
    { id: 'm1-3', conversation_id: 'demo-1', content: 'Olá, gostaria de saber sobre o produto X', from_me: false, status: 'delivered', created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    { id: 'm1-4', conversation_id: 'demo-1', content: 'Vocês têm em estoque?', from_me: false, status: 'delivered', created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  ],
  'demo-2': [
    { id: 'm2-1', conversation_id: 'demo-2', content: 'Olá, preciso de ajuda com meu pedido', from_me: false, status: 'read', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-2', conversation_id: 'demo-2', content: 'Claro! Qual o número do pedido?', from_me: true, status: 'read', created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-3', conversation_id: 'demo-2', content: 'Pedido #12345', from_me: false, status: 'read', created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-4', conversation_id: 'demo-2', content: 'Encontrei! Seu pedido está a caminho e chega amanhã.', from_me: true, status: 'read', created_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-5', conversation_id: 'demo-2', content: 'Obrigado pelo atendimento!', from_me: false, status: 'read', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  ],
  'demo-3': [
    { id: 'm3-1', conversation_id: 'demo-3', content: 'Boa tarde!', from_me: false, status: 'read', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    { id: 'm3-2', conversation_id: 'demo-3', content: 'Boa tarde! Em que posso ajudar?', from_me: true, status: 'read', created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString() },
    { id: 'm3-3', conversation_id: 'demo-3', content: 'Meu sistema parou de funcionar', from_me: false, status: 'delivered', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
    { id: 'm3-4', conversation_id: 'demo-3', content: 'Está dando erro toda hora', from_me: false, status: 'delivered', created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
    { id: 'm3-5', conversation_id: 'demo-3', content: 'Preciso de suporte urgente', from_me: false, status: 'delivered', created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  ],
  'demo-4': [
    { id: 'm4-1', conversation_id: 'demo-4', content: 'Oi, fiz uma compra ontem', from_me: false, status: 'read', created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    { id: 'm4-2', conversation_id: 'demo-4', content: 'Olá! Qual o número do pedido?', from_me: true, status: 'read', created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString() },
    { id: 'm4-3', conversation_id: 'demo-4', content: '#54321', from_me: false, status: 'read', created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString() },
    { id: 'm4-4', conversation_id: 'demo-4', content: 'Qual o prazo de entrega?', from_me: false, status: 'delivered', created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
  ],
  'demo-5': [
    { id: 'm5-1', conversation_id: 'demo-5', content: 'Olá, somos da Empresa ABC', from_me: false, status: 'read', created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
    { id: 'm5-2', conversation_id: 'demo-5', content: 'Gostaríamos de conhecer seus serviços', from_me: false, status: 'read', created_at: new Date(Date.now() - 3.8 * 60 * 60 * 1000).toISOString() },
    { id: 'm5-3', conversation_id: 'demo-5', content: 'Olá! Ficaremos felizes em apresentar. Qual seria o melhor horário?', from_me: true, status: 'read', created_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString() },
    { id: 'm5-4', conversation_id: 'demo-5', content: 'Podemos agendar uma reunião?', from_me: false, status: 'delivered', created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  ]
};

const WhatsAppCRM: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversationData[]>(DEMO_CONVERSATIONS);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // UI State
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversationData | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'open' | 'closed'>('all');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [agentChatMessages, setAgentChatMessages] = useState<WhatsAppMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentChatMessages]);

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

  // Load data
  const loadSessions = async () => {
    if (!companyId) return;
    
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setSessions(data || []);
    }
  };

  const loadConversations = async () => {
    if (!companyId) return;
    
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('company_id', companyId)
      .order('last_message_at', { ascending: false })
      .limit(100);
    
    if (!error && data && data.length > 0) {
      // Merge real conversations with demo data
      setConversations([...data, ...DEMO_CONVERSATIONS]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    // Check if it's a demo conversation
    if (conversationId.startsWith('demo-')) {
      setMessages(DEMO_MESSAGES[conversationId] || []);
      return;
    }

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (!error) {
      setMessages(data || []);
    }
  };

  const loadAiAgents = async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    setAiAgents(data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return;
      
      await Promise.all([
        loadSessions(),
        loadConversations(),
        loadAiAgents()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [companyId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      setSelectedAgent(null);
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.id]);

  // Handle session success
  const handleSessionSuccess = (session: WhatsAppSession) => {
    loadSessions();
    toast({ title: 'Sucesso', description: 'WhatsApp conectado!' });
  };

  // Send message to AI Agent
  const sendMessageToAgent = async () => {
    if (!newMessage.trim() || !selectedAgent) return;
    
    setSendingMessage(true);
    const userMessage: WhatsAppMessage = {
      id: `agent-msg-${Date.now()}`,
      conversation_id: `agent-${selectedAgent.id}`,
      content: newMessage,
      from_me: true,
      status: 'sent',
      created_at: new Date().toISOString()
    };
    
    setAgentChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsAiTyping(true);
    
    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          message: newMessage,
          agentId: selectedAgent.id,
          personality: selectedAgent.personality,
          instructions: selectedAgent.instructions
        }
      });
      
      if (response.error) throw response.error;
      
      const aiMessage: WhatsAppMessage = {
        id: `agent-msg-${Date.now() + 1}`,
        conversation_id: `agent-${selectedAgent.id}`,
        content: response.data?.response || 'Desculpe, não consegui processar sua mensagem.',
        from_me: false,
        status: 'delivered',
        created_at: new Date().toISOString(),
        sender_name: selectedAgent.name
      };
      
      setAgentChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao comunicar com o agente IA',
        variant: 'destructive'
      });
    } finally {
      setIsAiTyping(false);
      setSendingMessage(false);
    }
  };

  // Send message to WhatsApp conversation
  const sendMessage = async () => {
    if (selectedAgent) {
      return sendMessageToAgent();
    }
    
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSendingMessage(true);
    try {
      const tempMessage: WhatsAppMessage = {
        id: Date.now().toString(),
        conversation_id: selectedConversation.id,
        content: newMessage,
        from_me: true,
        status: 'sent',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Update last message in conversation
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id 
          ? { ...c, last_message: newMessage, last_message_at: new Date().toISOString() }
          : c
      ));
      
      // Simulate response for demo conversations
      if (selectedConversation.is_demo) {
        setTimeout(() => {
          const responses = [
            'Obrigado pela resposta!',
            'Entendi, vou verificar.',
            'Perfeito, aguardo retorno.',
            'Ok, muito obrigado!',
            'Ótimo, isso me ajuda bastante!'
          ];
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          
          const responseMessage: WhatsAppMessage = {
            id: (Date.now() + 1).toString(),
            conversation_id: selectedConversation.id,
            content: randomResponse,
            from_me: false,
            status: 'delivered',
            created_at: new Date().toISOString()
          };
          setMessages(prev => [...prev, responseMessage]);
        }, 1500);
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao enviar mensagem', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  // Select AI Agent
  const selectAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setSelectedConversation(null);
    setAgentChatMessages([]);
    setShowMobileChat(true);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchQuery === '' || 
      conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contact_phone.includes(searchQuery);
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'unread' && (conv.unread_count || 0) > 0) ||
      (activeTab === 'open' && conv.status === 'open') ||
      (activeTab === 'closed' && conv.status === 'closed');
    
    return matchesSearch && matchesTab;
  });

  const connectedSessions = sessions.filter(s => s.status === 'connected');

  // Format time
  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return d.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando CRM WhatsApp...</p>
        </div>
      </div>
    );
  }

  const currentMessages = selectedAgent ? agentChatMessages : messages;

  return (
    <div className="h-[calc(100vh-64px)] bg-background flex overflow-hidden">
      {/* Conversations List - Left Panel */}
      <div className={cn(
        "w-full md:w-96 lg:w-[400px] border-r flex flex-col bg-card",
        showMobileChat && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h1 className="font-bold text-lg">Conversas</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => setShowQRModal(true)} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                <QrCode className="h-4 w-4 mr-1" />
                Conectar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowQRModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conexão
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-1">
            {['all', 'unread', 'open', 'closed'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "flex-1 text-xs",
                  activeTab === tab && "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {tab === 'all' ? 'Todas' : tab === 'unread' ? 'Não lidas' : tab === 'open' ? 'Abertas' : 'Fechadas'}
              </Button>
            ))}
          </div>
          
          {/* Connection Status */}
          {connectedSessions.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
              {connectedSessions.length} conexão(ões) ativa(s)
            </div>
          )}
        </div>
        
        {/* AI Agents Section */}
        {aiAgents.length > 0 && (
          <div className="border-b">
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Agentes IA</span>
              </div>
              <div className="space-y-1">
                {aiAgents.map(agent => (
                  <div
                    key={agent.id}
                    onClick={() => selectAgent(agent)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                      selectedAgent?.id === agent.id 
                        ? "bg-blue-100 dark:bg-blue-900/30" 
                        : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{agent.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          IA
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.description || 'Agente de IA'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Nenhum resultado</h3>
              <p className="text-sm text-muted-foreground">
                Tente outra busca ou filtro
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map(conversation => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setSelectedAgent(null);
                    setShowMobileChat(true);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedConversation?.id === conversation.id && "bg-muted"
                  )}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.profile_picture} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {(conversation.contact_name || conversation.contact_phone).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {conversation.contact_name || conversation.contact_phone}
                        </span>
                        {conversation.is_demo && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Demo
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate pr-2">
                        {conversation.last_message || 'Nova conversa'}
                      </p>
                      {(conversation.unread_count || 0) > 0 && (
                        <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 min-w-[20px] justify-center">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area - Right Panel */}
      <div className={cn(
        "flex-1 flex flex-col",
        !showMobileChat && "hidden md:flex"
      )}>
        {selectedConversation || selectedAgent ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 bg-card">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  {selectedAgent ? (
                    <>
                      <AvatarImage src={selectedAgent.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <>
                      <AvatarImage src={selectedConversation?.profile_picture} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {(selectedConversation?.contact_name || selectedConversation?.contact_phone || '').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium">
                      {selectedAgent ? selectedAgent.name : (selectedConversation?.contact_name || selectedConversation?.contact_phone)}
                    </h2>
                    {selectedAgent && (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">
                        Agente IA
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedAgent ? selectedAgent.description || 'Assistente virtual' : selectedConversation?.contact_phone}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedConversation && (
                  <Badge variant={selectedConversation.status === 'open' ? 'default' : 'secondary'}>
                    {selectedConversation.status === 'open' ? 'Aberta' : 'Fechada'}
                  </Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Users className="h-4 w-4 mr-2" />
                      Ver perfil
                    </DropdownMenuItem>
                    {!selectedAgent && (
                      <DropdownMenuItem>
                        <Bot className="h-4 w-4 mr-2" />
                        Atribuir agente IA
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
              <div className="space-y-2 max-w-3xl mx-auto">
                {currentMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-20">
                    <div className="text-center">
                      {selectedAgent ? (
                        <>
                          <Bot className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            Inicie uma conversa com <strong>{selectedAgent.name}</strong>
                          </p>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            Nenhuma mensagem ainda. Inicie a conversa!
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {currentMessages.map(message => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.from_me ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
                            message.from_me
                              ? "bg-blue-600 text-white rounded-br-none"
                              : selectedAgent
                                ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-foreground rounded-bl-none border border-blue-100 dark:border-blue-800"
                                : "bg-card text-foreground rounded-bl-none"
                          )}
                        >
                          {!message.from_me && selectedAgent && (
                            <div className="flex items-center gap-1 mb-1">
                              <Bot className="h-3 w-3 text-blue-500" />
                              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                {selectedAgent.name}
                              </span>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className={cn(
                            "flex items-center justify-end gap-1 mt-1",
                            message.from_me ? "text-blue-100" : "text-muted-foreground"
                          )}>
                            <span className="text-[10px]">
                              {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {message.from_me && (
                              message.status === 'read' ? (
                                <CheckCheck className="h-3 w-3 text-cyan-300" />
                              ) : message.status === 'delivered' ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg px-4 py-3 rounded-bl-none border border-blue-100 dark:border-blue-800">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-blue-500 animate-pulse" />
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Input Area */}
            <div className="p-4 border-t bg-card">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Input
                  placeholder={selectedAgent ? `Mensagem para ${selectedAgent.name}...` : "Digite uma mensagem..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 text-center p-8">
            <div className="w-64 h-64 mb-8 opacity-50">
              <MessageSquare className="w-full h-full text-muted-foreground/20" />
            </div>
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">
              CRM WhatsApp
            </h2>
            <p className="text-muted-foreground max-w-md">
              Selecione uma conversa à esquerda para visualizar e responder mensagens.
              {aiAgents.length > 0 && (
                <span className="block mt-2">
                  Ou converse com um dos <strong>Agentes IA</strong> disponíveis.
                </span>
              )}
            </p>
            {connectedSessions.length === 0 && (
              <Button 
                onClick={() => setShowQRModal(true)} 
                className="mt-6 bg-blue-600 hover:bg-blue-700"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Conectar WhatsApp
              </Button>
            )}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {companyId && user?.id && (
        <WhatsAppQRModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          companyId={companyId}
          userId={user.id}
          onSuccess={handleSessionSuccess}
        />
      )}
    </div>
  );
};

export default WhatsAppCRM;
