import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Copy,
  Link as LinkIcon,
  Trash2,
  Eye,
  EyeOff,
  Users,
  ExternalLink,
  Settings,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  CalendarDays,
  Timer,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

interface PublicBooking {
  id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes?: string;
  booking_link_id: string;
  created_at: string;
}

const ImprovedAgendaAberta = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('links');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    buffer_minutes: 15
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
    if (companyId && user?.id) {
      loadBookingLinks();
      loadBookings();
    }
  }, [companyId, user?.id]);

  const loadBookingLinks = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('public_booking_links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error) setBookingLinks(data || []);
    setLoading(false);
  };

  const loadBookings = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('public_bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });
    
    if (!error) setBookings(data || []);
  };

  const createBookingLink = async () => {
    if (!user?.id || !companyId) return;
    
    const linkSlug = `${user.email?.split('@')[0]}-${Date.now().toString(36)}`;
    
    const { error } = await supabase
      .from('public_booking_links')
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
        description: 'Erro ao criar link de agendamento',
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: '✅ Link criado!',
      description: 'Seu link de agendamento está pronto para compartilhar'
    });
    
    setFormData({ title: '', description: '', duration_minutes: 30, buffer_minutes: 15 });
    setShowCreateDialog(false);
    loadBookingLinks();
  };

  const toggleLinkStatus = async (linkId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('public_booking_links')
      .update({ is_active: !isActive })
      .eq('id', linkId);
    
    if (!error) {
      loadBookingLinks();
      toast({
        title: isActive ? 'Link desativado' : 'Link ativado',
        description: isActive ? 'O link não aceita mais agendamentos' : 'O link está ativo novamente'
      });
    }
  };

  const copyLinkToClipboard = (linkSlug: string) => {
    const fullUrl = `${window.location.origin}/booking/${linkSlug}`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: '📋 Link copiado!',
      description: 'Compartilhe com seus clientes'
    });
  };

  const openBookingPage = (linkSlug: string) => {
    window.open(`/booking/${linkSlug}`, '_blank');
  };

  const deleteLink = async (linkId: string) => {
    const { error } = await supabase
      .from('public_booking_links')
      .delete()
      .eq('id', linkId);
    
    if (!error) {
      loadBookingLinks();
      toast({
        title: 'Link excluído',
        description: 'O link foi removido permanentemente'
      });
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase
      .from('public_bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);
    
    if (!error) {
      loadBookings();
      toast({
        title: 'Status atualizado',
        description: `Agendamento marcado como ${newStatus === 'confirmed' ? 'confirmado' : newStatus === 'cancelled' ? 'cancelado' : newStatus}`
      });
    }
  };

  const getFilteredBookings = () => {
    const today = startOfDay(new Date());
    
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.booking_date);
      
      if (bookingFilter === 'upcoming') {
        return isAfter(bookingDate, today) || format(bookingDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      } else if (bookingFilter === 'past') {
        return isBefore(bookingDate, today);
      }
      return true;
    });
  };

  const getLinkStats = (linkId: string) => {
    const linkBookings = bookings.filter(b => b.booking_link_id === linkId);
    return {
      total: linkBookings.length,
      confirmed: linkBookings.filter(b => b.status === 'confirmed').length,
      pending: linkBookings.filter(b => b.status === 'pending').length
    };
  };

  const filteredBookings = getFilteredBookings();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-indigo-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Agendamento Online
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus links e compromissos de forma inteligente
            </p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Novo Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Criar Link de Agendamento
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Título do Evento</Label>
                  <Input
                    placeholder="Ex: Consultoria de 30min, Reunião Inicial..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Descrição (opcional)</Label>
                  <Textarea
                    placeholder="Descreva o que acontecerá neste compromisso..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="rounded-xl resize-none"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      Duração
                    </Label>
                    <Select 
                      value={formData.duration_minutes.toString()}
                      onValueChange={(v) => setFormData({ ...formData, duration_minutes: parseInt(v) })}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1h 30min</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Intervalo
                    </Label>
                    <Select 
                      value={formData.buffer_minutes.toString()}
                      onValueChange={(v) => setFormData({ ...formData, buffer_minutes: parseInt(v) })}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="0">Sem intervalo</SelectItem>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1 rounded-xl">
                  Cancelar
                </Button>
                <Button 
                  onClick={createBookingLink} 
                  disabled={!formData.title}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
                >
                  Criar Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <LinkIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{bookingLinks.length}</p>
                  <p className="text-sm text-muted-foreground">Links Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CalendarDays className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
                  <p className="text-sm text-muted-foreground">Total Agendamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {bookings.filter(b => b.status === 'pending').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Confirmados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-sm rounded-xl p-1 h-auto">
            <TabsTrigger 
              value="links" 
              className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Meus Links
            </TabsTrigger>
            <TabsTrigger 
              value="bookings" 
              className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Agendamentos
            </TabsTrigger>
          </TabsList>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-4">
            {bookingLinks.length === 0 ? (
              <Card className="bg-white border-0 shadow-lg rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                    <LinkIcon className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Crie seu primeiro link</h3>
                  <p className="text-muted-foreground mb-6 text-center max-w-md">
                    Permita que seus clientes agendem reuniões diretamente com você
                  </p>
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Link
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookingLinks.map((link) => {
                  const stats = getLinkStats(link.id);
                  return (
                    <Card 
                      key={link.id} 
                      className={cn(
                        "bg-white border-0 shadow-lg rounded-2xl hover:shadow-xl transition-all overflow-hidden",
                        !link.is_active && "opacity-60"
                      )}
                    >
                      <div className={cn(
                        "h-1",
                        link.is_active ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gray-300"
                      )} />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {link.title}
                              {link.is_active ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inativo</Badge>
                              )}
                            </CardTitle>
                            {link.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {link.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Duration Info */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Timer className="h-4 w-4" />
                            <span>{link.duration_minutes} min</span>
                          </div>
                          {link.buffer_minutes > 0 && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>+{link.buffer_minutes} intervalo</span>
                            </div>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex gap-3">
                          <div className="flex-1 bg-muted/50 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                          <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-green-600">{stats.confirmed}</p>
                            <p className="text-xs text-muted-foreground">Confirmados</p>
                          </div>
                          <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
                            <p className="text-xs text-muted-foreground">Pendentes</p>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => copyLinkToClipboard(link.link_slug)}
                            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copiar Link
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openBookingPage(link.link_slug)}
                            className="rounded-xl"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleLinkStatus(link.id, link.is_active)}
                            className="rounded-xl"
                          >
                            {link.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteLink(link.id)}
                            className="rounded-xl text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
              {(['upcoming', 'all', 'past'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={bookingFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBookingFilter(filter)}
                  className={cn(
                    "rounded-xl",
                    bookingFilter === filter && "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  )}
                >
                  {filter === 'upcoming' && 'Próximos'}
                  {filter === 'all' && 'Todos'}
                  {filter === 'past' && 'Passados'}
                </Button>
              ))}
            </div>

            {filteredBookings.length === 0 ? (
              <Card className="bg-white border-0 shadow-lg rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                    <CalendarDays className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nenhum agendamento</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {bookingFilter === 'upcoming' 
                      ? 'Você não tem agendamentos futuros' 
                      : bookingFilter === 'past' 
                        ? 'Você não tem agendamentos passados' 
                        : 'Quando alguém agendar através dos seus links, aparecerá aqui'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((booking) => {
                  const bookingLink = bookingLinks.find(l => l.id === booking.booking_link_id);
                  const isPast = isBefore(parseISO(booking.booking_date), startOfDay(new Date()));
                  
                  return (
                    <Card 
                      key={booking.id} 
                      className={cn(
                        "bg-white border-0 shadow-lg rounded-2xl hover:shadow-xl transition-all",
                        isPast && "opacity-70"
                      )}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                                <Users className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{booking.client_name}</h3>
                                <p className="text-sm text-muted-foreground">{bookingLink?.title || 'Agendamento'}</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span>{booking.client_email}</span>
                              </div>
                              {booking.client_phone && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-4 w-4" />
                                  <span>{booking.client_phone}</span>
                                </div>
                              )}
                            </div>

                            {booking.notes && (
                              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl">
                                "{booking.notes}"
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-2 text-lg font-semibold">
                                <Calendar className="h-5 w-5 text-primary" />
                                {format(parseISO(booking.booking_date), "dd 'de' MMMM", { locale: ptBR })}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground justify-end">
                                <Clock className="h-4 w-4" />
                                {booking.booking_time}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                className={cn(
                                  "rounded-lg",
                                  booking.status === 'confirmed' && "bg-green-100 text-green-700 hover:bg-green-100",
                                  booking.status === 'pending' && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                                  booking.status === 'cancelled' && "bg-red-100 text-red-700 hover:bg-red-100"
                                )}
                              >
                                {booking.status === 'confirmed' && '✓ Confirmado'}
                                {booking.status === 'pending' && '⏳ Pendente'}
                                {booking.status === 'cancelled' && '✕ Cancelado'}
                              </Badge>
                              
                              {!isPast && booking.status === 'pending' && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ImprovedAgendaAberta;
