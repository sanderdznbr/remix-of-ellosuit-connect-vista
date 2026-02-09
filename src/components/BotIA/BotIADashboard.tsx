import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bot, MessageCircle, Pencil, BarChart3, Search, MoreVertical, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import BotIAChat from './BotIAChat';
import EditAgentModal from './EditAgentModal';

const OMNI_COLOR = '#FF4500';

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

const BotIADashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  
  const [showChatModal, setShowChatModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);

  const ensureCompany = async (): Promise<string | null> => {
    if (!user?.id) return null;
    const metadataCompanyId = user.user_metadata?.company_id;
    if (metadataCompanyId) return metadataCompanyId;
    const { data: existingCompanyUser } = await supabase
      .from('company_users').select('company_id').eq('user_id', user.id).single();
    if (existingCompanyUser?.company_id) {
      await supabase.auth.updateUser({ data: { company_id: existingCompanyUser.company_id } });
      return existingCompanyUser.company_id;
    }
    const companyName = user.user_metadata?.company_name || user.email?.split('@')[0] || 'Minha Empresa';
    const { data: newCompany } = await supabase.from('companies').insert({ name: companyName }).select().single();
    if (!newCompany) return null;
    await supabase.from('company_users').insert({ company_id: newCompany.id, user_id: user.id, role: 'admin' });
    await supabase.auth.updateUser({ data: { company_id: newCompany.id } });
    return newCompany.id;
  };

  const loadAgents = async (cId: string) => {
    const { data, error } = await supabase
      .from('ai_agents').select('*').eq('company_id', cId).order('created_at', { ascending: false });
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

  const toggleAgent = async (id: string, isActive: boolean) => {
    await supabase.from('ai_agents').update({ is_active: !isActive }).eq('id', id);
    if (companyId) loadAgents(companyId);
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Excluir este agente?')) return;
    await supabase.from('ai_agents').delete().eq('id', id);
    if (companyId) loadAgents(companyId);
    toast({ title: 'Excluído', description: 'Agente removido' });
  };

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAgent = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedAgents(prev => prev.length === filteredAgents.length ? [] : filteredAgents.map(a => a.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: OMNI_COLOR }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Agentes de IA</h1>
          <p className="text-sm text-gray-500 mt-1">Crie, configure e treine seus agentes de IA</p>
        </div>

        {/* Credits Banner */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Você tem</span>
              <span className="font-semibold text-gray-900">{agents.length} agente(s)</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Créditos de IA</span>
              <span className="font-semibold" style={{ color: OMNI_COLOR }}>∞</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
            <div className="flex-1" />
            <Button 
              onClick={() => navigate('/dashboard/bot-ia/novo')}
              className="rounded-xl gap-2 text-white"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              <Plus className="h-4 w-4" />
              Novo agente de IA
            </Button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_150px_100px_200px] gap-4 px-4 py-3 border-t border-b border-gray-100 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <Checkbox 
                checked={selectedAgents.length === filteredAgents.length && filteredAgents.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <div>Nome</div>
            <div>Modelo</div>
            <div>Status</div>
            <div className="text-right">Ações</div>
          </div>

          {/* List */}
          {filteredAgents.length === 0 ? (
            <div className="text-center py-16">
              <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum agente encontrado</h3>
              <p className="text-gray-500 mb-6">Crie seu primeiro agente de IA para começar</p>
              <Button 
                onClick={() => navigate('/dashboard/bot-ia/novo')}
                style={{ backgroundColor: OMNI_COLOR }}
                className="text-white rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Agente
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAgents.map(agent => (
                <div 
                  key={agent.id}
                  className="grid grid-cols-[40px_1fr_150px_100px_200px] gap-4 px-4 py-4 items-center hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={() => toggleSelectAgent(agent.id)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-xl">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback className="rounded-xl text-white text-sm font-medium" style={{ backgroundColor: OMNI_COLOR }}>
                        {agent.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium text-gray-900">{agent.name}</span>
                      {agent.description && (
                        <p className="text-xs text-gray-500 truncate max-w-md">{agent.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-md">elloiav1.0</Badge>
                  </div>
                  
                  <div>
                    <Badge className={`rounded-md text-xs ${
                      agent.is_active 
                        ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                    }`}>
                      {agent.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" size="sm" 
                      className="text-gray-600 hover:text-gray-900 gap-1.5"
                      onClick={() => { setSelectedAgent(agent); setShowEditModal(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" size="sm" 
                      className="text-gray-600 hover:text-gray-900 gap-1.5"
                      onClick={() => { setSelectedAgent(agent); setShowChatModal(true); }}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chat
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => toggleAgent(agent.id, agent.is_active)}>
                          {agent.is_active ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                          {agent.is_active ? 'Pausar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteAgent(agent.id)} className="text-red-600">
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {selectedAgent && (
        <EditAgentModal
          agent={selectedAgent}
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedAgent(null); }}
          onUpdate={() => { if (companyId) loadAgents(companyId); }}
          onDelete={() => { if (companyId) loadAgents(companyId); }}
        />
      )}

      {/* Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="sm:max-w-2xl h-[80vh] p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" style={{ color: OMNI_COLOR }} />
              Conversar com {selectedAgent?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedAgent && <BotIAChat agent={selectedAgent} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BotIADashboard;
