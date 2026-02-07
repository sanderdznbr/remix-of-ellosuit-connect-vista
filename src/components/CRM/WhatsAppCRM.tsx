import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Phone, MessageSquare, Settings, QrCode, Trash2, Users, Bot, Search, Filter, MoreVertical, Send, Paperclip, Smile, Check, CheckCheck, Circle, ArrowLeft, Sparkles, LayoutGrid, List, Tag, UserPlus, Mic, Contact } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import WhatsAppQRModal from './WhatsAppQRModal';
import WhatsAppKanbanView, { DEFAULT_COLUMNS, KanbanColumn } from './WhatsAppKanbanView';
import ConversationLabelsManager from './ConversationLabelsManager';
import SaveLeadModal from './SaveLeadModal';
import ConversationPopup from './ConversationPopup';
import KanbanColumnConfig from './KanbanColumnConfig';
import AudioRecorder from './AudioRecorder';
import BaileysServerDownload from './BaileysServerDownload';
import WhatsAppContacts from './WhatsAppContacts';
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
  baileys_server_url?: string;
}

interface ConversationLabel {
  id: string;
  name: string;
  color: string;
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
  pipeline_stage?: string;
  labels?: string[];
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

// No demo data - real conversations only

const WhatsAppCRM: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversationData[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingConversations, setSyncingConversations] = useState(false);
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
  const [agentChatHistory, setAgentChatHistory] = useState<Record<string, WhatsAppMessage[]>>({});
  
  // New CRM Features State
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'contacts'>('list');
  const [labels, setLabels] = useState<ConversationLabel[]>([]);
  const [showLabelsManager, setShowLabelsManager] = useState(false);
  const [showSaveLeadModal, setShowSaveLeadModal] = useState(false);
  const [selectedConversationForLabels, setSelectedConversationForLabels] = useState<WhatsAppConversationData | null>(null);
  const [selectedConversationForLead, setSelectedConversationForLead] = useState<WhatsAppConversationData | null>(null);
  const [contactsCount, setContactsCount] = useState(0);
  
  // Kanban specific state
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>(() => {
    const saved = localStorage.getItem('whatsapp_kanban_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showConversationPopup, setShowConversationPopup] = useState(false);
  const [popupConversation, setPopupConversation] = useState<WhatsAppConversationData | null>(null);
  const [popupMessages, setPopupMessages] = useState<WhatsAppMessage[]>([]);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  // Load persisted agent chat history from localStorage
  useEffect(() => {
    const savedAgentHistory = localStorage.getItem('whatsapp_agent_history');
    
    if (savedAgentHistory) {
      try {
        setAgentChatHistory(JSON.parse(savedAgentHistory));
      } catch (e) {
        console.error('Error loading agent history:', e);
      }
    }
  }, []);

  // Save agent chat history to localStorage
  useEffect(() => {
    if (Object.keys(agentChatHistory).length > 0) {
      localStorage.setItem('whatsapp_agent_history', JSON.stringify(agentChatHistory));
    }
  }, [agentChatHistory]);

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

  const loadAiAgents = async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    setAiAgents(data || []);
  };

  // Load labels
  const loadLabels = async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('conversation_labels')
      .select('*')
      .eq('company_id', companyId);
    
    setLabels(data || []);
  };

  // Load contacts count
  const loadContactsCount = async () => {
    if (!companyId) return;
    
    const { count } = await supabase
      .from('whatsapp_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    
    setContactsCount(count || 0);
  };

  // Create label
  const handleCreateLabel = async (name: string, color: string) => {
    if (!companyId || !user?.id) return;
    
    const { data, error } = await supabase
      .from('conversation_labels')
      .insert({ name, color, company_id: companyId, created_by: user.id })
      .select()
      .single();
    
    if (!error && data) {
      setLabels(prev => [...prev, data]);
      toast({ title: 'Sucesso', description: 'Etiqueta criada!' });
    }
  };

  // Delete label
  const handleDeleteLabel = async (labelId: string) => {
    const { error } = await supabase
      .from('conversation_labels')
      .delete()
      .eq('id', labelId);
    
    if (!error) {
      setLabels(prev => prev.filter(l => l.id !== labelId));
      toast({ title: 'Sucesso', description: 'Etiqueta removida!' });
    }
  };

  // Toggle label on conversation
  const handleToggleLabel = (labelId: string) => {
    if (!selectedConversationForLabels) return;
    
    setConversations(prev => prev.map(c => {
      if (c.id === selectedConversationForLabels.id) {
        const currentLabels = c.labels || [];
        const newLabels = currentLabels.includes(labelId)
          ? currentLabels.filter(l => l !== labelId)
          : [...currentLabels, labelId];
        return { ...c, labels: newLabels };
      }
      return c;
    }));
  };

  // Update pipeline stage (for Kanban)
  const handleUpdateStage = (conversationId: string, newStage: string) => {
    setConversations(prev => prev.map(c => 
      c.id === conversationId ? { ...c, pipeline_stage: newStage } : c
    ));
    toast({ title: 'Movido', description: `Conversa movida para ${newStage}` });
  };

  // Open labels manager for a conversation
  const openLabelsManager = (conv: WhatsAppConversationData) => {
    setSelectedConversationForLabels(conv);
    setShowLabelsManager(true);
  };

  // Open save lead modal
  const openSaveLeadModal = (conv: WhatsAppConversationData) => {
    setSelectedConversationForLead(conv);
    setShowSaveLeadModal(true);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return;
      
      await Promise.all([
        loadSessions(),
        loadConversations(),
        loadAiAgents(),
        loadLabels(),
        loadContactsCount()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [companyId]);

  // Real-time subscription for messages, conversations, contacts, sessions
  useEffect(() => {
    if (!companyId) return;

    console.log('📡 Setting up realtime subscriptions for company:', companyId);

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('whatsapp-messages-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `company_id=eq.${companyId}`
      }, (payload) => {
        const newMessage = payload.new as any;
        console.log('📨 New WhatsApp message:', newMessage.content?.substring(0, 50));
        
        // If this message is for the selected conversation, add it
        if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, {
              id: newMessage.id,
              conversation_id: newMessage.conversation_id,
              content: newMessage.content,
              from_me: newMessage.from_me,
              status: newMessage.status,
              created_at: newMessage.timestamp || newMessage.created_at
            }];
          });
        }
        
        // Reload conversations to update last message
        loadConversations();
      })
      .subscribe();

    // Subscribe to conversation updates (INSERT and UPDATE)
    const conversationsChannel = supabase
      .channel('whatsapp-conversations-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_conversations',
        filter: `company_id=eq.${companyId}`
      }, (payload) => {
        const newConv = payload.new as any;
        console.log('📥 New conversation:', newConv.contact_name || newConv.contact_phone);
        setConversations(prev => {
          // Avoid duplicates
          if (prev.some(c => c.id === newConv.id)) return prev;
          return [newConv, ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_conversations',
        filter: `company_id=eq.${companyId}`
      }, (payload) => {
        const updated = payload.new as any;
        setConversations(prev => 
          prev.map(c => c.id === updated.id ? { ...c, ...updated } : c)
        );
      })
      .subscribe();

    // Subscribe to session updates
    const sessionsChannel = supabase
      .channel('whatsapp-sessions-rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_sessions',
        filter: `company_id=eq.${companyId}`
      }, () => {
        loadSessions();
      })
      .subscribe();

    // Subscribe to contacts (for count update)
    const contactsChannel = supabase
      .channel('whatsapp-contacts-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_contacts',
        filter: `company_id=eq.${companyId}`
      }, () => {
        // Update contacts count
        loadContactsCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(contactsChannel);
    };
  }, [companyId, selectedConversation?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      setSelectedAgent(null);
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.id]);

  // Handle session success - sync conversations after connection
  const handleSessionSuccess = async (session: WhatsAppSession) => {
    await loadSessions();
    toast({ title: 'Sucesso', description: 'WhatsApp conectado!' });
    
    // Start syncing conversations and contacts
    setSyncingConversations(true);
    toast({ title: 'Sincronizando', description: 'Carregando dados do WhatsApp...' });
    
    try {
      await Promise.all([
        loadConversations(),
        loadContactsCount()
      ]);
      toast({ title: 'Pronto', description: 'Dados carregados com sucesso!' });
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({ 
        title: 'Aviso', 
        description: 'Alguns dados podem não ter sido carregados.',
        variant: 'destructive'
      });
    } finally {
      setSyncingConversations(false);
    }
  };

  // Send message to AI Agent
  const sendMessageToAgent = async () => {
    if (!newMessage.trim() || !selectedAgent) return;
    
    setSendingMessage(true);
    const agentKey = `agent-${selectedAgent.id}`;
    const userMessage: WhatsAppMessage = {
      id: `agent-msg-${Date.now()}`,
      conversation_id: agentKey,
      content: newMessage,
      from_me: true,
      status: 'sent',
      created_at: new Date().toISOString()
    };
    
    const updatedMessages = [...agentChatMessages, userMessage];
    setAgentChatMessages(updatedMessages);
    setAgentChatHistory(prev => ({ ...prev, [agentKey]: updatedMessages }));
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
        conversation_id: agentKey,
        content: response.data?.response || 'Desculpe, não consegui processar sua mensagem.',
        from_me: false,
        status: 'delivered',
        created_at: new Date().toISOString(),
        sender_name: selectedAgent.name
      };
      
      const finalMessages = [...updatedMessages, aiMessage];
      setAgentChatMessages(finalMessages);
      setAgentChatHistory(prev => ({ ...prev, [agentKey]: finalMessages }));
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
    const messageContent = newMessage;
    setNewMessage('');
    
    try {
      const tempMessage: WhatsAppMessage = {
        id: Date.now().toString(),
        conversation_id: selectedConversation.id,
        content: messageContent,
        from_me: true,
        status: 'sending',
        created_at: new Date().toISOString()
      };
      
      const updatedMessages = [...messages, tempMessage];
      setMessages(updatedMessages);
      
      // Update last message in conversation
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id 
          ? { ...c, last_message: messageContent, last_message_at: new Date().toISOString() }
          : c
      ));
      
      // Check if this is a real conversation with a connected session
      const connectedSession = sessions.find(s => 
        s.id === selectedConversation.session_id && s.status === 'connected'
      );
      
      if (connectedSession && !selectedConversation.is_demo) {
        // Send via real WhatsApp API
        const { data, error } = await supabase.functions.invoke('whatsapp-api', {
          body: {
            action: 'send_message',
            sessionId: connectedSession.id,
            phone: selectedConversation.contact_phone,
            message: messageContent
          }
        });
        
        if (error) throw error;
        
        // Update message status to sent
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id ? { ...m, status: 'sent' } : m
        ));
        
        toast({ title: 'Enviado', description: 'Mensagem enviada com sucesso' });
      } else {
        // No active session - show warning
        toast({ 
          title: 'Atenção', 
          description: 'Conecte um WhatsApp para enviar mensagens', 
          variant: 'destructive' 
        });
        // Update temp message to sent (local only)
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id ? { ...m, status: 'sent' } : m
        ));
      }
    } catch (e: any) {
      console.error('Error sending message:', e);
      toast({ title: 'Erro', description: e.message || 'Erro ao enviar mensagem', variant: 'destructive' });
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSendingMessage(false);
    }
  };

  // Select AI Agent
  const selectAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setSelectedConversation(null);
    // Load persisted history for this agent
    const agentKey = `agent-${agent.id}`;
    setAgentChatMessages(agentChatHistory[agentKey] || []);
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
    <div className="h-[calc(100vh-64px)] bg-background flex flex-col overflow-hidden">
      {/* Top Header - Always visible */}
      <div className="p-4 border-b bg-card flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="font-bold text-lg">CRM WhatsApp</h1>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 px-2"
            >
              <List className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline text-xs">Lista</span>
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-7 px-2"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline text-xs">Kanban</span>
            </Button>
            <Button
              variant={viewMode === 'contacts' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('contacts')}
              className="h-7 px-2 relative"
            >
              <Users className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline text-xs">Contatos</span>
              {contactsCount > 0 && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 min-w-5 p-0 text-[10px] flex items-center justify-center">
                  {contactsCount > 999 ? '999+' : contactsCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedConversationForLabels(null);
              setShowLabelsManager(true);
            }}
            className="h-8"
          >
            <Tag className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Etiquetas</span>
          </Button>
          <BaileysServerDownload />
          {connectedSessions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                >
                  <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500 mr-2" />
                  <span className="hidden sm:inline">Conectado</span>
                  <Settings className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{connectedSessions[0]?.phone_number || 'WhatsApp'}</p>
                  <p className="text-xs text-muted-foreground">{connectedSessions[0]?.instance_name}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowQRModal(true)}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Conectar outro
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    const session = connectedSessions[0];
                    if (!session) return;
                    
                    // OPTIMISTIC UPDATE - Update UI immediately
                    const previousSessions = [...sessions];
                    setSessions(prev => prev.map(s => 
                      s.id === session.id ? { ...s, status: 'disconnecting' } : s
                    ));
                    toast({ title: 'Desconectando...', description: 'Aguarde...' });
                    
                    try {
                      // Update database first (more reliable)
                      await supabase
                        .from('whatsapp_sessions')
                        .update({ status: 'disconnected' })
                        .eq('id', session.id);
                      
                      // Update UI to disconnected
                      setSessions(prev => prev.map(s => 
                        s.id === session.id ? { ...s, status: 'disconnected' } : s
                      ));
                      
                      // Call server to disconnect (fire and forget - don't wait)
                      const serverUrl = session.baileys_server_url;
                      if (serverUrl) {
                        fetch(`${serverUrl}/disconnect/${session.instance_name}`, { method: 'POST' })
                          .catch(e => console.warn('Server disconnect call failed:', e));
                      }
                      
                      toast({ title: 'Desconectado', description: 'WhatsApp desconectado com sucesso' });
                    } catch (e) {
                      console.error('Error disconnecting:', e);
                      // ROLLBACK on error
                      setSessions(previousSessions);
                      toast({ title: 'Erro', description: 'Erro ao desconectar', variant: 'destructive' });
                    }
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Desconectar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              size="sm" 
              onClick={() => setShowQRModal(true)} 
              className="bg-primary hover:bg-primary/90"
            >
              <QrCode className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Conectar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'kanban' ? (
        <WhatsAppKanbanView
          conversations={filteredConversations}
          labels={labels}
          columns={kanbanColumns}
          onSelectConversation={(conv) => {
            setPopupConversation(conv);
            // Load messages for popup
            supabase
              .from('whatsapp_messages')
              .select('*')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: true })
              .limit(100)
              .then(({ data }) => setPopupMessages(data || []));
            setShowConversationPopup(true);
          }}
          onSaveLead={openSaveLeadModal}
          onManageLabels={openLabelsManager}
          onUpdateStage={handleUpdateStage}
          onConfigureColumns={() => setShowColumnConfig(true)}
        />
      ) : viewMode === 'contacts' ? (
        <div className="flex-1 overflow-hidden">
          <WhatsAppContacts
            companyId={companyId || ''}
            sessionId={connectedSessions[0]?.id}
            onStartConversation={(contact) => {
              // Create a temporary conversation for this contact
              const tempConv: WhatsAppConversationData = {
                id: `temp-${contact.id}`,
                contact_phone: contact.phone_number,
                contact_name: contact.push_name || contact.business_name,
                profile_picture: contact.profile_picture,
                last_message_at: new Date().toISOString(),
                status: 'open',
                session_id: contact.session_id
              };
              setSelectedConversation(tempConv);
              setViewMode('list');
              setShowMobileChat(true);
              toast({ title: 'Iniciar conversa', description: `Enviando mensagem para ${contact.push_name || contact.phone_number}` });
            }}
            onSaveAsLead={(contact) => {
              // Open save lead modal with contact info
              setSelectedConversationForLead({
                id: `temp-${contact.id}`,
                contact_phone: contact.phone_number,
                contact_name: contact.push_name || contact.business_name,
                profile_picture: contact.profile_picture,
                last_message_at: new Date().toISOString(),
                status: 'open'
              });
              setShowSaveLeadModal(true);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations List - Left Panel */}
          <div className={cn(
            "w-full md:w-96 lg:w-[400px] border-r flex flex-col bg-card",
            showMobileChat && "hidden md:flex"
          )}>
            {/* Search & Filters */}
            <div className="p-4 border-b space-y-3">
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
                      activeTab === tab && "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {tab === 'all' ? 'Todas' : tab === 'unread' ? 'Não lidas' : tab === 'open' ? 'Abertas' : 'Fechadas'}
                  </Button>
                ))}
              </div>
              
              {/* Connection Status */}
              {connectedSessions.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
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
          {syncingConversations ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="font-medium mb-2">Sincronizando conversas</h3>
              <p className="text-sm text-muted-foreground">
                Carregando suas conversas do WhatsApp...
              </p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              {connectedSessions.length === 0 ? (
                <>
                  <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhum WhatsApp conectado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecte seu WhatsApp para ver as conversas
                  </p>
                  <Button onClick={() => setShowQRModal(true)} className="bg-primary">
                    <QrCode className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </>
              ) : searchQuery ? (
                <>
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhum resultado</h3>
                  <p className="text-sm text-muted-foreground">
                    Tente outra busca ou filtro
                  </p>
                </>
              ) : (
                <>
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhuma conversa ainda</h3>
                  <p className="text-sm text-muted-foreground">
                    As conversas aparecerão aqui quando você receber mensagens
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
                    <AvatarFallback className="bg-primary/10 text-primary">
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
                        <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 min-w-[20px] justify-center">
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
                            "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                            message.from_me
                              ? "bg-blue-600 rounded-br-sm"
                              : selectedAgent
                                ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-foreground rounded-bl-sm border border-blue-100 dark:border-blue-800"
                                : "bg-card text-foreground rounded-bl-sm border"
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
                          <p className={cn(
                            "text-sm whitespace-pre-wrap",
                            message.from_me ? "text-white" : "text-foreground"
                          )}>
                            {message.content}
                          </p>
                          <div className={cn(
                            "flex items-center justify-end gap-1 mt-1",
                            message.from_me ? "text-white/70" : "text-muted-foreground"
                          )}>
                            <span className="text-[10px]">
                              {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {message.from_me && (
                              message.status === 'read' ? (
                                <CheckCheck className="h-3 w-3 text-cyan-300" />
                              ) : message.status === 'delivered' ? (
                                <CheckCheck className="h-3 w-3 text-white/70" />
                              ) : (
                                <Check className="h-3 w-3 text-white/70" />
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
              {showAudioRecorder ? (
                <div className="max-w-3xl mx-auto">
                  <AudioRecorder
                    onSend={(audioBlob, duration) => {
                      // For demo, just show a message that audio was sent
                      const audioMessage: WhatsAppMessage = {
                        id: Date.now().toString(),
                        conversation_id: selectedConversation?.id || selectedAgent?.id || '',
                        content: `🎤 Áudio (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
                        from_me: true,
                        status: 'sent',
                        created_at: new Date().toISOString()
                      };
                      
                      if (selectedConversation) {
                        setMessages(prev => [...prev, audioMessage]);
                      } else if (selectedAgent) {
                        setAgentChatMessages(prev => [...prev, audioMessage]);
                      }
                      
                      setShowAudioRecorder(false);
                      toast({
                        title: 'Áudio enviado',
                        description: `Duração: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
                      });
                    }}
                    onCancel={() => setShowAudioRecorder(false)}
                  />
                </div>
              ) : (
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
                  {!newMessage.trim() ? (
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowAudioRecorder(true)}
                      className="text-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={sendMessage} 
                      disabled={sendingMessage}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
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
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button 
                  onClick={() => setShowQRModal(true)} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Conectar WhatsApp
                </Button>
                <BaileysServerDownload />
              </div>
            )}
          </div>
        )}
      </div>
      {/* End of list view */}
      </div>
      )}

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

      {/* Labels Manager Modal */}
      <ConversationLabelsManager
        isOpen={showLabelsManager}
        onClose={() => {
          setShowLabelsManager(false);
          setSelectedConversationForLabels(null);
        }}
        labels={labels}
        selectedLabels={selectedConversationForLabels?.labels || []}
        onToggleLabel={handleToggleLabel}
        onCreateLabel={handleCreateLabel}
        onDeleteLabel={handleDeleteLabel}
        mode={selectedConversationForLabels ? 'assign' : 'manage'}
      />

      {/* Save Lead Modal */}
      <SaveLeadModal
        isOpen={showSaveLeadModal}
        onClose={() => {
          setShowSaveLeadModal(false);
          setSelectedConversationForLead(null);
        }}
        conversation={selectedConversationForLead}
        companyId={companyId}
        onSuccess={() => toast({ title: 'Lead salvo!', description: 'Contato adicionado ao banco de dados' })}
      />

      {/* Conversation Popup (for Kanban view) */}
      <ConversationPopup
        open={showConversationPopup}
        onOpenChange={setShowConversationPopup}
        conversation={popupConversation}
        messages={popupMessages}
        labels={labels}
        onSendMessage={(message) => {
          // Demo handling
          if (popupConversation?.is_demo || popupConversation?.id.startsWith('demo-')) {
            const newMsg: WhatsAppMessage = {
              id: `demo-msg-${Date.now()}`,
              conversation_id: popupConversation.id,
              content: message,
              from_me: true,
              status: 'sent',
              created_at: new Date().toISOString()
            };
            setPopupMessages(prev => [...prev, newMsg]);
          }
        }}
        onManageLabels={() => {
          if (popupConversation) {
            openLabelsManager(popupConversation);
          }
        }}
        onSaveLead={() => {
          if (popupConversation) {
            openSaveLeadModal(popupConversation);
          }
        }}
        sendingMessage={sendingMessage}
      />

      {/* Kanban Column Config */}
      <KanbanColumnConfig
        open={showColumnConfig}
        onOpenChange={setShowColumnConfig}
        columns={kanbanColumns}
        onColumnsChange={(newColumns) => {
          setKanbanColumns(newColumns);
          localStorage.setItem('whatsapp_kanban_columns', JSON.stringify(newColumns));
        }}
      />
    </div>
  );
};

export default WhatsAppCRM;
