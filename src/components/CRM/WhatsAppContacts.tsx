import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, User, MessageSquare, UserPlus, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
}

const WhatsAppContacts: React.FC<WhatsAppContactsProps> = ({
  companyId,
  sessionId,
  onStartConversation,
  onSaveAsLead
}) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalContacts, setTotalContacts] = useState(0);

  const loadContacts = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('whatsapp_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      setTotalContacts(count || 0);

      // Get contacts (paginated)
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
      toast({
        title: 'Erro',
        description: 'Erro ao carregar contatos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [companyId]);

  // Subscribe to new contacts
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
    // Format as +55 (41) 99999-9999
    if (phone.length === 13 && phone.startsWith('55')) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Contatos</h2>
            <Badge variant="secondary" className="text-xs">
              {totalContacts}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={loadContacts}
            className="h-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
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

      {/* Contacts List */}
      <ScrollArea className="flex-1">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">
              {searchQuery ? 'Nenhum contato encontrado' : 'Nenhum contato'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? 'Tente outra busca' 
                : 'Os contatos serão sincronizados após conectar o WhatsApp'}
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
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {contact.push_name?.substring(0, 2).toUpperCase() || 
                     <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {contact.push_name || contact.business_name || formatPhoneNumber(contact.phone_number)}
                    </span>
                    {contact.is_business && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Business
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPhoneNumber(contact.phone_number)}
                  </p>
                </div>

                {/* Actions - show on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onStartConversation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartConversation(contact);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                  {onSaveAsLead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveAsLead(contact);
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {totalContacts > 100 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Mostrando 100 de {totalContacts} contatos. Use a busca para encontrar mais.
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default WhatsAppContacts;
