import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Copy,
  Link as LinkIcon,
  Trash2,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BookingLink {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  buffer_minutes: number;
  link_slug: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

interface ScheduledBooking {
  id: string;
  client_name: string;
  client_email: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes?: string;
  booking_links: {
    title: string;
  };
}

const ImprovedAgendaAberta = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [bookings, setBookings] = useState<ScheduledBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    buffer_minutes: 0
  });

  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data?.company_id) {
        setCompanyId(data.company_id);
      }
    };
    
    fetchCompanyId();
  }, [user?.id]);

  useEffect(() => {
    if (companyId) {
      loadBookingLinks();
      loadBookings();
    }
  }, [companyId]);

  const loadBookingLinks = async () => {
    const { data, error } = await supabase
      .from('booking_links')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (!error) setBookingLinks(data || []);
    setLoading(false);
  };

  const loadBookings = async () => {
    const { data, error } = await supabase
      .from('scheduled_bookings')
      .select(`
        *,
        booking_links!inner(title)
      `)
      .eq('user_id', user?.id)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true});
    
    if (!error) setBookings(data || []);
  };

  const createBookingLink = async () => {
    if (!user?.id || !companyId) return;
    
    const linkSlug = `${user.email?.split('@')[0]}-${Date.now().toString(36)}`;
    
    const { error } = await supabase
      .from('booking_links')
      .insert({
        ...formData,
        link_slug: linkSlug,
        user_id: user.id,
        company_id: companyId,
        is_active: true
      });
    
    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar link',
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: 'Link criado!',
      description: 'Seu link está pronto'
    });
    
    setFormData({ title: '', description: '', duration_minutes: 30, buffer_minutes: 0 });
    setShowCreateDialog(false);
    loadBookingLinks();
  };

  const toggleLinkStatus = async (linkId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('booking_links')
      .update({ is_active: !isActive })
      .eq('id', linkId);
    
    if (!error) {
      loadBookingLinks();
      toast({
        title: isActive ? 'Link desativado' : 'Link ativado',
        description: 'Status atualizado'
      });
    }
  };

  const copyLinkToClipboard = (linkSlug: string) => {
    const fullUrl = `${window.location.origin}/booking/${linkSlug}`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: 'Link copiado!',
      description: 'Link copiado para área de transferência'
    });
  };

  const deleteLink = async (linkId: string) => {
    const { error } = await supabase
      .from('booking_links')
      .delete()
      .eq('id', linkId);
    
    if (!error) {
      loadBookingLinks();
      toast({
        title: 'Link excluído',
        description: 'Link removido'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agendamento Online</h1>
        <p className="text-muted-foreground">
          Gerencie links e compromissos
        </p>
      </div>

      <Tabs defaultValue="links" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="bookings">Agendamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Seus Links</h2>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      placeholder="Ex: Reunião 30min"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      placeholder="Descreva o compromisso"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duração (min)</Label>
                      <Input
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Intervalo (min)</Label>
                      <Input
                        type="number"
                        value={formData.buffer_minutes}
                        onChange={(e) => setFormData({ ...formData, buffer_minutes: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createBookingLink} disabled={!formData.title}>
                    Criar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {bookingLinks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum link</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie seu primeiro link
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bookingLinks.map((link) => (
                <Card key={link.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{link.title}</CardTitle>
                        {link.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {link.description}
                          </p>
                        )}
                      </div>
                      <Badge variant={link.is_active ? 'default' : 'secondary'}>
                        {link.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{link.duration_minutes}min</span>
                      </div>
                      {link.buffer_minutes > 0 && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>+{link.buffer_minutes}min</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLinkToClipboard(link.link_slug)}
                        className="flex-1"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleLinkStatus(link.id, link.is_active)}
                      >
                        {link.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteLink(link.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <h2 className="text-xl font-semibold">Próximos</h2>
          
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum agendamento</h3>
                <p className="text-sm text-muted-foreground">
                  Agendamentos aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{booking.client_name}</h3>
                      <p className="text-sm text-muted-foreground">{booking.client_email}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {booking.booking_links.title}
                      </p>
                      {booking.notes && (
                        <p className="text-sm mt-2 italic">{booking.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(booking.booking_date), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-4 w-4" />
                        {booking.booking_time}
                      </div>
                      <Badge className="mt-2" variant={
                        booking.status === 'confirmed' ? 'default' : 'secondary'
                      }>
                        {booking.status === 'confirmed' ? 'Confirmado' : booking.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedAgendaAberta;
