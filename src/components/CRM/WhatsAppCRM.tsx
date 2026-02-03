import React, { useState, useEffect } from 'react';
import { Plus, Phone, MessageSquare, Settings, Play, Pause, BarChart3, QrCode, Trash2, Users, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import WhatsAppQRModal from './WhatsAppQRModal';
import WhatsAppConversation from './WhatsAppConversation';

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
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversationData | null>(null);
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null);

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
      .limit(50);
    
    if (!error) {
      setConversations(data || []);
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

  // Handle session success
  const handleSessionSuccess = (session: WhatsAppSession) => {
    loadSessions();
    toast({ title: 'Sucesso', description: 'WhatsApp conectado!' });
  };

  // Disconnect session
  const disconnectSession = async (session: WhatsAppSession) => {
    try {
      await supabase.functions.invoke('whatsapp-api', {
        body: { action: 'disconnect', sessionId: session.id }
      });
      loadSessions();
      toast({ title: 'Sucesso', description: 'WhatsApp desconectado' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao desconectar', variant: 'destructive' });
    }
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

  // Open conversation
  const openConversation = (conversation: WhatsAppConversationData) => {
    const session = sessions.find(s => s.id === conversation.session_id);
    if (session) {
      setSelectedSession(session);
      setSelectedConversation(conversation);
    } else if (sessions.length > 0) {
      setSelectedSession(sessions[0]);
      setSelectedConversation(conversation);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando CRM WhatsApp...</p>
        </div>
      </div>
    );
  }

  // Show conversation view
  if (selectedConversation && selectedSession) {
    return (
      <div className="h-screen">
        <WhatsAppConversation
          conversation={selectedConversation}
          sessionId={selectedSession.id}
          onBack={() => {
            setSelectedConversation(null);
            setSelectedSession(null);
          }}
        />
      </div>
    );
  }

  const connectedSessions = sessions.filter(s => s.status === 'connected');

  return (
    <div className="min-h-screen bg-background p-6 page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">CRM WhatsApp</h1>
            <p className="text-muted-foreground">Gerencie suas conversas do WhatsApp</p>
          </div>
        </div>
        <Button onClick={() => setShowQRModal(true)} className="bg-green-600 hover:bg-green-700">
          <QrCode className="h-4 w-4 mr-2" />
          Conectar WhatsApp
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="conversations">Conversas</TabsTrigger>
          <TabsTrigger value="connections">Conexões</TabsTrigger>
          <TabsTrigger value="agents">Agentes IA</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Conexões Ativas
                  </CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {connectedSessions.length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Conversas Abertas
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {conversations.filter(c => c.status === 'open').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Agentes Ativos
                  </CardTitle>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {agents.filter(a => a.is_active).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Leads
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {conversations.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          {connectedSessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhum WhatsApp Conectado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Conecte seu WhatsApp via QR Code para começar a receber leads
                </p>
                <Button onClick={() => setShowQRModal(true)} className="bg-green-600 hover:bg-green-700">
                  <QrCode className="h-4 w-4 mr-2" />
                  Conectar Agora
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Conversas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhuma conversa ainda</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.slice(0, 5).map(conversation => (
                      <div 
                        key={conversation.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => openConversation(conversation)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {conversation.contact_name || conversation.contact_phone}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {conversation.last_message || 'Nova conversa'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {conversation.unread_count && conversation.unread_count > 0 && (
                            <Badge className="bg-green-600">{conversation.unread_count}</Badge>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(conversation.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Conversas</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-300px)]">
                {conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map(conversation => (
                      <div 
                        key={conversation.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => openConversation(conversation)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {conversation.contact_name || conversation.contact_phone}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {conversation.contact_phone}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant={conversation.status === 'open' ? 'default' : 'secondary'}>
                            {conversation.status === 'open' ? 'Aberta' : 'Fechada'}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(conversation.last_message_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Conexões WhatsApp</CardTitle>
              <Button onClick={() => setShowQRModal(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Conexão
              </Button>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhuma conexão configurada
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Conecte seu primeiro WhatsApp via QR Code
                  </p>
                  <Button onClick={() => setShowQRModal(true)} className="bg-green-600 hover:bg-green-700">
                    <QrCode className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map(session => (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${session.status === 'connected' ? 'bg-green-100' : 'bg-muted'}`}>
                          <Phone className={`h-5 w-5 ${session.status === 'connected' ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="font-medium">{session.instance_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {session.phone_number || 'Aguardando conexão'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant={session.status === 'connected' ? 'default' : 'secondary'}>
                          {session.status === 'connected' ? 'Conectado' : session.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                        </Badge>
                        
                        {session.status === 'connected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => disconnectSession(session)}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Conexão?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A conexão "{session.instance_name}" será permanentemente excluída.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSession(session)} className="bg-destructive hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Agentes IA no WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-2">Nenhum agente configurado para WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Vá em "Agentes de IA" e ative a integração WhatsApp em um agente
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agents.map(agent => (
                    <div 
                      key={agent.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Responde automaticamente
                          </div>
                        </div>
                      </div>
                      <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                        {agent.is_active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
