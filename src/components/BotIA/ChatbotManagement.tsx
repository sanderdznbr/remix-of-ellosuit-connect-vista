import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, GitBranch, Search, Pencil, BarChart3, Copy, Trash2, MoreVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const OMNI_COLOR = '#FF4500';

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
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlows, setSelectedFlows] = useState<string[]>([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlow, setNewFlow] = useState({
    name: '',
    description: '',
    triggerType: 'keyword',
    triggerValue: '',
    sessionId: ''
  });

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
      if (data?.company_id) setCompanyId(data.company_id);
    };
    getCompanyId();
  }, [user?.id]);

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return;
      setLoading(true);

      const { data: flowsData } = await supabase
        .from('chatbot_flows')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (flowsData) {
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

      const { data: sessionsData } = await supabase
        .from('whatsapp_sessions')
        .select('id, instance_name, phone_number, status')
        .eq('company_id', companyId)
        .eq('status', 'connected');
      if (sessionsData) setSessions(sessionsData);

      setLoading(false);
    };
    loadData();
  }, [companyId]);

  const handleCreateFlow = async () => {
    if (!newFlow.name.trim() || !companyId || !user?.id) {
      toast({ title: 'Erro', description: 'Preencha o nome do chatbot', variant: 'destructive' });
      return;
    }

    const triggerConfig = {
      type: newFlow.triggerType,
      value: newFlow.triggerValue,
      sessionId: newFlow.sessionId || null
    };

    const { data, error } = await supabase
      .from('chatbot_flows')
      .insert({
        name: newFlow.name,
        description: newFlow.description || null,
        company_id: companyId,
        created_by: user.id,
        is_active: false,
        nodes: [{
          id: 'trigger-1',
          type: 'trigger',
          subType: newFlow.triggerType === 'whatsapp_channel' ? 'whatsapp_channel' : 'keyword',
          position: { x: 100, y: 100 },
          data: { label: 'Gatilho', config: triggerConfig }
        }],
        edges: [],
        trigger_config: triggerConfig
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    setShowCreateModal(false);
    setNewFlow({ name: '', description: '', triggerType: 'keyword', triggerValue: '', sessionId: '' });
    toast({ title: 'Sucesso!', description: 'Chatbot criado.' });
    navigate(`/dashboard/chatbot-builder?flowId=${data.id}`);
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Tem certeza que deseja excluir este chatbot?')) return;
    await supabase.from('chatbot_flows').delete().eq('id', flowId);
    setFlows(prev => prev.filter(f => f.id !== flowId));
    toast({ title: 'Excluído', description: 'Chatbot removido' });
  };

  const filteredFlows = flows.filter(flow => 
    flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    return `${Math.floor(diffDays / 30)} meses atrás`;
  };

  const toggleSelectFlow = (id: string) => {
    setSelectedFlows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedFlows.length === filteredFlows.length) {
      setSelectedFlows([]);
    } else {
      setSelectedFlows(filteredFlows.map(f => f.id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: OMNI_COLOR }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Chatbots</h1>
          <p className="text-gray-500 mt-1">
            Aqui você consegue criar e gerenciar os chatbots da sua organização.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Search + Actions */}
          <div className="p-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-gray-200 bg-gray-50 rounded-xl focus:bg-white"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px] rounded-xl border-gray-200">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl gap-2 text-white"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              <Plus className="h-4 w-4" />
              Novo chatbot
            </Button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[40px_40px_1fr_180px_140px_140px_120px_120px] gap-4 px-4 py-3 border-t border-b border-gray-100 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <Checkbox 
                checked={selectedFlows.length === filteredFlows.length && filteredFlows.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <div />
            <div>Nome</div>
            <div>Canais</div>
            <div>Criado em</div>
            <div>Atualizado em</div>
            <div className="flex items-center gap-1">
              Execuções hoje
              <span className="text-gray-400">ⓘ</span>
            </div>
            <div className="text-right">Ações</div>
          </div>

          {/* List */}
          {filteredFlows.length === 0 ? (
            <div className="text-center py-16">
              <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum chatbot encontrado</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Tente uma busca diferente' : 'Crie seu primeiro chatbot para começar'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  style={{ backgroundColor: OMNI_COLOR }}
                  className="text-white rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Chatbot
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredFlows.map(flow => (
                <div 
                  key={flow.id}
                  className="grid grid-cols-[40px_40px_1fr_180px_140px_140px_120px_120px] gap-4 px-4 py-4 items-center hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      checked={selectedFlows.includes(flow.id)}
                      onCheckedChange={() => toggleSelectFlow(flow.id)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="cursor-grab">
                      <svg className="h-4 w-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="4" cy="4" r="1.5" />
                        <circle cx="4" cy="8" r="1.5" />
                        <circle cx="4" cy="12" r="1.5" />
                        <circle cx="10" cy="4" r="1.5" />
                        <circle cx="10" cy="8" r="1.5" />
                        <circle cx="10" cy="12" r="1.5" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="font-medium text-gray-900 truncate">
                    {flow.name}
                  </div>
                  
                  <div className="flex items-center gap-1 flex-wrap">
                    {sessions.length > 0 ? (
                      sessions.slice(0, 2).map(s => (
                        <div key={s.id} className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="text-green-500">●</span>
                          <span className="truncate max-w-[80px]">{s.instance_name}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {formatRelativeDate(flow.created_at)}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {formatRelativeDate(flow.updated_at)}
                  </div>
                  
                  <div className="text-sm text-gray-900 font-medium">
                    {flow.execution_count || 0}
                  </div>
                  
                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => navigate(`/dashboard/chatbot-builder?flowId=${flow.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                    >
                      <GitBranch className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                      onClick={() => handleDeleteFlow(flow.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Chatbot</DialogTitle>
            <DialogDescription>Configure as informações básicas do seu chatbot</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Chatbot *</Label>
              <Input 
                placeholder="Ex: Atendimento Inicial"
                value={newFlow.name}
                onChange={e => setNewFlow(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                placeholder="Descreva o objetivo deste chatbot..."
                value={newFlow.description}
                onChange={e => setNewFlow(prev => ({ ...prev, description: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <Select 
                value={newFlow.triggerType} 
                onValueChange={v => setNewFlow(prev => ({ ...prev, triggerType: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="whatsapp_channel">Canal WhatsApp</SelectItem>
                  <SelectItem value="start">Início da conversa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newFlow.triggerType === 'whatsapp_channel' && sessions.length > 0 && (
              <div className="space-y-2">
                <Label>Canal WhatsApp</Label>
                <Select 
                  value={newFlow.sessionId} 
                  onValueChange={v => setNewFlow(prev => ({ ...prev, sessionId: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione um canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.instance_name} ({s.phone_number || 'Sem número'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateFlow}
              className="rounded-xl text-white"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              Criar e Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatbotManagement;
