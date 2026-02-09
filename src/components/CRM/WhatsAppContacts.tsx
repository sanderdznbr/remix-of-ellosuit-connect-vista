import React, { useState, useEffect } from 'react';
import { Search, User, MessageSquare, UserPlus, RefreshCw, Eye, Filter, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const OMNI_COLOR = '#FF4500';

interface WhatsAppContact {
  id: string;
  wa_id: string;
  phone_number: string;
  push_name?: string;
  profile_picture?: string;
  is_business?: boolean;
  business_name?: string;
  session_id: string;
  created_at: string;
}

interface WhatsAppContactsProps {
  companyId: string;
  sessionId?: string;
  onStartConversation?: (contact: WhatsAppContact) => void;
  onSaveAsLead?: (contact: WhatsAppContact) => void;
  fullPage?: boolean;
}

const WhatsAppContacts: React.FC<WhatsAppContactsProps> = ({
  companyId,
  sessionId,
  onStartConversation,
  onSaveAsLead,
  fullPage = false
}) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalContacts, setTotalContacts] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const loadContacts = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { count } = await supabase
        .from('whatsapp_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      setTotalContacts(count || 0);

      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('push_name', { ascending: true })
        .limit(100);

      if (error) throw error;
      setContacts(data || []);
    } catch (e) {
      console.error('Error loading contacts:', e);
      toast({ title: 'Erro', description: 'Erro ao carregar contatos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('whatsapp-contacts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_contacts',
        filter: `company_id=eq.${companyId}`
      }, () => {
        loadContacts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.push_name?.toLowerCase().includes(query) ||
      contact.phone_number.includes(query) ||
      contact.business_name?.toLowerCase().includes(query)
    );
  });

  const formatPhoneNumber = (phone: string) => {
    if (phone.length === 13 && phone.startsWith('55')) {
      return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return `+${phone}`;
  };

  const toggleSelectContact = (id: string) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  // Generate random avatar color based on name
  const getAvatarColor = (name?: string) => {
    const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: OMNI_COLOR }}></div>
      </div>
    );
  }

  // Sidebar mode (original)
  if (!fullPage) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Contatos</span>
              <Badge variant="secondary" className="text-xs">{totalContacts}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={loadContacts} className="h-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">
                {searchQuery ? 'Nenhum contato encontrado' : 'Nenhum contato'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Tente outra busca' : 'Os contatos serão sincronizados após conectar o WhatsApp'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.profile_picture || undefined} />
                    <AvatarFallback style={{ backgroundColor: getAvatarColor(contact.push_name) }} className="text-white">
                      {contact.push_name?.substring(0, 2).toUpperCase() || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate block">
                      {contact.push_name || contact.business_name || 'Contato sem nome'}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {formatPhoneNumber(contact.phone_number)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onStartConversation && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onStartConversation(contact); }}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                    {onSaveAsLead && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onSaveAsLead(contact); }}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full page mode (Umbler style)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Contatos</h1>
            <span className="text-2xl font-light text-gray-400">{totalContacts}</span>
          </div>
          <p className="text-gray-500 mt-1">
            Aqui você pode gerenciar as informações dos seus contatos e acessar os históricos de mensagens
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Search + Filters */}
          <div className="p-4 flex items-center gap-3 flex-wrap">
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
              <SelectTrigger className="w-[120px] rounded-xl border-gray-200">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="personal">Pessoal</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[120px] rounded-xl border-gray-200">
                <SelectValue placeholder="Etiquetas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Etiquetas</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="name">
              <SelectTrigger className="w-[160px] rounded-xl border-gray-200">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Ordenar por: Nome</SelectItem>
                <SelectItem value="recent">Ordenar por: Recente</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="rounded-xl border-gray-200">
              <Filter className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button 
              className="rounded-xl gap-2 text-white"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              <Plus className="h-4 w-4" />
              Adicionar contato
            </Button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_100px] gap-4 px-4 py-3 border-t border-b border-gray-100 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <Checkbox 
                checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <div>Contato</div>
            <div className="text-right">Ações</div>
          </div>

          {/* List */}
          {filteredContacts.length === 0 ? (
            <div className="text-center py-16">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum contato encontrado</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Tente outra busca' : 'Os contatos serão sincronizados após conectar o WhatsApp'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredContacts.map(contact => (
                <div 
                  key={contact.id}
                  className="grid grid-cols-[40px_1fr_100px] gap-4 px-4 py-4 items-center hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => toggleSelectContact(contact.id)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-full">
                      <AvatarImage src={contact.profile_picture || undefined} />
                      <AvatarFallback 
                        style={{ backgroundColor: getAvatarColor(contact.push_name) }} 
                        className="text-white font-medium"
                      >
                        {contact.push_name?.substring(0, 2).toUpperCase() || <User className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 italic">
                          {contact.push_name || contact.business_name || 'Contato sem nome'}
                        </span>
                        {contact.is_business && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded">
                            Business
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatPhoneNumber(contact.phone_number)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => onStartConversation?.(contact)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {totalContacts > 100 && (
                <div className="p-4 text-center text-sm text-gray-500">
                  Mostrando 100 de {totalContacts} contatos. Use a busca para encontrar mais.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppContacts;
