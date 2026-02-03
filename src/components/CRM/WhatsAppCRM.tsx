import React, { useState, useEffect } from 'react';
import { Plus, Phone, MessageSquare, Settings, QrCode, Trash2, Users, Bot, Search, Filter, MoreVertical, Send, Paperclip, Smile, Check, CheckCheck, Circle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  is_active: boolean;
}

const WhatsAppCRM: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversationData[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // UI State
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'open' | 'closed'>('all');
  const [showMobileChat, setShowMobileChat] = useState(false);

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
    
    if (!error) {
      setConversations(data || []);
    }
  };

  const loadMessages = async (conversationId: string) => {
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

  const loadAgents = async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('ai_agents')
      .select('id, name, is_active')
      .eq('company_id', companyId)
      .eq('whatsapp_enabled', true);
    
    setAgents(data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return;
      
      await Promise.all([
        loadSessions(),
        loadConversations(),
        loadAgents()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [companyId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.id]);

  // Handle session success
  const handleSessionSuccess = (session: WhatsAppSession) => {
    loadSessions();
    toast({ title: 'Sucesso', description: 'WhatsApp conectado!' });
  };

  // Delete session
  const deleteSession = async (session: WhatsAppSession) => {
    try {
      await supabase.functions.invoke('whatsapp-api', {
        body: { action: 'delete_session', sessionId: session.id }
      });
      loadSessions();
      toast({ title: 'Sucesso', description: 'Sessão excluída' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSendingMessage(true);
    try {
      // In demo mode, just add to local state
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
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao enviar mensagem', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
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
              <MessageSquare className="h-6 w-6 text-green-600" />
              <h1 className="font-bold text-lg">Conversas</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => setShowQRModal(true)} 
                className="bg-green-600 hover:bg-green-700"
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
                  activeTab === tab && "bg-green-600 hover:bg-green-700"
                )}
              >
                {tab === 'all' ? 'Todas' : tab === 'unread' ? 'Não lidas' : tab === 'open' ? 'Abertas' : 'Fechadas'}
              </Button>
            ))}
          </div>
          
          {/* Connection Status */}
          {connectedSessions.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              {connectedSessions.length} conexão(ões) ativa(s)
            </div>
          )}
        </div>
        
        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              {conversations.length === 0 ? (
                <>
                  <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhuma conversa ainda</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecte seu WhatsApp para começar a receber mensagens
                  </p>
                  <Button 
                    onClick={() => setShowQRModal(true)} 
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhum resultado</h3>
                  <p className="text-sm text-muted-foreground">
                    Tente outra busca ou filtro
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map(conversation => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setShowMobileChat(true);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedConversation?.id === conversation.id && "bg-muted"
                  )}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.profile_picture} />
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {(conversation.contact_name || conversation.contact_phone).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">
                        {conversation.contact_name || conversation.contact_phone}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate pr-2">
                        {conversation.last_message || 'Nova conversa'}
                      </p>
                      {(conversation.unread_count || 0) > 0 && (
                        <Badge className="bg-green-600 text-white text-xs px-2 py-0.5 min-w-[20px] justify-center">
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
        {selectedConversation ? (
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
                  <AvatarImage src={selectedConversation.profile_picture} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {(selectedConversation.contact_name || selectedConversation.contact_phone).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-medium">
                    {selectedConversation.contact_name || selectedConversation.contact_phone}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.contact_phone}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={selectedConversation.status === 'open' ? 'default' : 'secondary'}>
                  {selectedConversation.status === 'open' ? 'Aberta' : 'Fechada'}
                </Badge>
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
                    <DropdownMenuItem>
                      <Bot className="h-4 w-4 mr-2" />
                      Atribuir agente IA
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-[#e5ddd5] dark:bg-muted/30">
              <div className="space-y-2 max-w-3xl mx-auto">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-20">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Nenhuma mensagem ainda. Inicie a conversa!
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map(message => (
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
                            ? "bg-green-600 text-white rounded-br-none"
                            : "bg-card text-foreground rounded-bl-none"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          message.from_me ? "text-green-100" : "text-muted-foreground"
                        )}>
                          <span className="text-[10px]">
                            {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {message.from_me && (
                            message.status === 'read' ? (
                              <CheckCheck className="h-3 w-3 text-blue-300" />
                            ) : message.status === 'delivered' ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
                  placeholder="Digite uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-green-600 hover:bg-green-700"
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
              {connectedSessions.length === 0 && (
                <span className="block mt-2">
                  Conecte seu WhatsApp para começar a receber mensagens.
                </span>
              )}
            </p>
            {connectedSessions.length === 0 && (
              <Button 
                onClick={() => setShowQRModal(true)} 
                className="mt-6 bg-green-600 hover:bg-green-700"
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
