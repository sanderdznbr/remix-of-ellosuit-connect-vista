import React, { useState, useEffect } from 'react';
import { Plus, Phone, MessageSquare, Settings, ExternalLink, Play, Pause, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppIntegration {
  id: string;
  phone_number: string;
  access_token: string;
  is_active: boolean;
  settings: any;
  created_at: string;
}

interface WhatsAppConversation {
  id: string;
  contact_phone: string;
  contact_name?: string;
  last_message_at: string;
  status: string;
  assigned_to?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
}

const WhatsAppCRM: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [integrations, setIntegrations] = useState<WhatsAppIntegration[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');

  const companyId = user?.user_metadata?.company_id;

  // Load data
  const loadIntegrations = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('whatsapp_integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading integrations:', error);
      return;
    }
    
    setIntegrations(data || []);
  };

  const loadConversations = async () => {
    if (!companyId) return;
    
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('company_id', companyId)
      .order('last_message_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }
    
    setConversations(data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadIntegrations(),
        loadConversations()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [user?.id, companyId]);

  // Setup WhatsApp integration
  const setupIntegration = async () => {
    if (!phoneNumber || !accessToken || !user?.id || !companyId) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    
    const { error } = await supabase
      .from('whatsapp_integrations')
      .insert({
        phone_number: phoneNumber,
        access_token: accessToken,
        user_id: user.id,
        company_id: companyId,
        is_active: true,
        settings: {}
      });
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao configurar WhatsApp', variant: 'destructive' });
      return;
    }
    
    setPhoneNumber('');
    setAccessToken('');
    setShowSetupModal(false);
    loadIntegrations();
    toast({ title: 'Sucesso', description: 'WhatsApp configurado com sucesso!' });
  };

  // Toggle integration status
  const toggleIntegration = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('whatsapp_integrations')
      .update({ is_active: !isActive })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao alterar status', variant: 'destructive' });
      return;
    }
    
    loadIntegrations();
    toast({ 
      title: 'Sucesso', 
      description: isActive ? 'Integração pausada' : 'Integração ativada' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando CRM WhatsApp...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM WhatsApp</h1>
            <p className="text-gray-600">Gerencie suas conversas do WhatsApp Business</p>
          </div>
        </div>
        <Button onClick={() => setShowSetupModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Conectar WhatsApp
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="conversations">Conversas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Integrações Ativas
                  </CardTitle>
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {integrations.filter(i => i.is_active).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Conversas Abertas
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {conversations.filter(c => c.status === 'open').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Templates
                  </CardTitle>
                  <Settings className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Taxa de Resposta
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">85%</div>
              </CardContent>
            </Card>
          </div>

          {/* Active Integrations */}
          <Card>
            <CardHeader>
              <CardTitle>Integrações do WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              {integrations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma integração configurada
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Conecte sua conta do WhatsApp Business para começar
                  </p>
                  <Button onClick={() => setShowSetupModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {integrations.map(integration => (
                    <div 
                      key={integration.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-100 rounded-full">
                          <Phone className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">{integration.phone_number}</div>
                          <div className="text-sm text-gray-600">
                            Conectado em {new Date(integration.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                          {integration.is_active ? 'Ativo' : 'Pausado'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleIntegration(integration.id, integration.is_active)}
                        >
                          {integration.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Conversas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Nenhuma conversa encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversations.map(conversation => (
                      <div 
                        key={conversation.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-full">
                            <MessageSquare className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {conversation.contact_name || conversation.contact_phone}
                            </div>
                            <div className="text-sm text-gray-600">
                              {conversation.contact_phone}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant={
                            conversation.status === 'open' ? 'default' : 'secondary'
                          }>
                            {conversation.status}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(conversation.last_message_at).toLocaleString()}
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

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Templates de Mensagem</CardTitle>
              <Button onClick={() => setShowTemplateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Templates em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Análises e Métricas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Análises em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Conexão via QR Code</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Para conectar o WhatsApp usando QR Code, você pode usar bibliotecas como:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 mb-4">
                    <li><strong>whatsapp-web.js</strong> - Para conexão via WhatsApp Web</li>
                    <li><strong>Baileys</strong> - Biblioteca completa para WhatsApp</li>
                    <li><strong>Venom-bot</strong> - Bot para WhatsApp Web</li>
                    <li>Integração com serviços como ChatWoot, Evolution API</li>
                  </ul>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 bg-yellow-400 rounded-full flex-shrink-0 mt-0.5"></div>
                      <div>
                        <h4 className="font-medium text-yellow-800 mb-1">Implementação Necessária</h4>
                        <p className="text-sm text-yellow-700">
                          Para conectar via QR Code, é necessário implementar um backend em Node.js 
                          com uma das bibliotecas mencionadas. Isso requer infraestrutura adicional.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Button variant="outline" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      WhatsApp Business API (Meta)
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Evolution API
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      ChatWoot
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">WhatsApp Business API</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Para implementação oficial da Meta (recomendado para empresas):
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 mb-4">
                    <li>Criar conta no Meta Business</li>
                    <li>Configurar aplicativo WhatsApp Business</li>
                    <li>Verificar número de telefone</li>
                    <li>Configurar webhooks</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Setup Modal */}
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp Business</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Número do WhatsApp</label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+55 11 99999-9999"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Token de Acesso</label>
              <Input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Token da API do WhatsApp Business"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowSetupModal(false)}>
                Cancelar
              </Button>
              <Button onClick={setupIntegration}>
                Conectar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppCRM;