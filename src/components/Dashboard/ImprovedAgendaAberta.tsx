import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Clock, Plus, Copy, Link as LinkIcon, Trash2, Eye, EyeOff, Users,
  ExternalLink, CheckCircle2, XCircle, Mail, Phone, CalendarDays, Timer,
  Pencil, Palette, Image, Type, Upload
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const FLOW_COLOR = "#007DE3";

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
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  background_color?: string | null;
  custom_message?: string | null;
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

const COLOR_PRESETS = [
  '#007DE3', '#FF4500', '#10B981', '#8B5CF6', '#F59E0B',
  '#EC4899', '#06B6D4', '#EF4444', '#14B8A6', '#6366F1',
  '#000000', '#374151', '#6B7280', '#9CA3AF', '#FFFFFF',
];

const ImprovedAgendaAberta = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'links' | 'bookings'>('links');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  
  const [editingLink, setEditingLink] = useState<BookingLink | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    buffer_minutes: 15,
    logo_url: '',
    primary_color: FLOW_COLOR,
    secondary_color: '#10B981',
    background_color: '#FFFFFF',
    custom_message: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    buffer_minutes: 15
  });

  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      if (data?.company_id) setCompanyId(data.company_id);
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
    const { data, error } = await supabase.from('public_booking_links').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!error) setBookingLinks(data || []);
    setLoading(false);
  };

  const loadBookings = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase.from('public_bookings').select('*').eq('user_id', user.id).order('booking_date', { ascending: true }).order('booking_time', { ascending: true });
    if (!error) setBookings(data || []);
  };

  const createBookingLink = async () => {
    if (!user?.id || !companyId) return;
    const linkSlug = `${user.email?.split('@')[0]}-${Date.now().toString(36)}`;
    const { error } = await supabase.from('public_booking_links').insert({ ...formData, link_slug: linkSlug, user_id: user.id, company_id: companyId, is_active: true });
    if (error) { toast({ title: 'Erro', description: 'Erro ao criar link', variant: 'destructive' }); return; }
    toast({ title: 'Link criado!', description: 'Seu link de agendamento está pronto' });
    setFormData({ title: '', description: '', duration_minutes: 30, buffer_minutes: 15 });
    setShowCreateDialog(false);
    loadBookingLinks();
  };

  const toggleLinkStatus = async (linkId: string, isActive: boolean) => {
    const { error } = await supabase.from('public_booking_links').update({ is_active: !isActive }).eq('id', linkId);
    if (!error) { loadBookingLinks(); toast({ title: isActive ? 'Link desativado' : 'Link ativado' }); }
  };

  const copyLinkToClipboard = (linkSlug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/booking/${linkSlug}`);
    toast({ title: 'Link copiado!' });
  };

  const openBookingPage = (linkSlug: string) => window.open(`/booking/${linkSlug}`, '_blank');

  const deleteLink = async (linkId: string) => {
    const { error } = await supabase.from('public_booking_links').delete().eq('id', linkId);
    if (!error) { loadBookingLinks(); toast({ title: 'Link excluído' }); }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase.from('public_bookings').update({ status: newStatus }).eq('id', bookingId);
    if (!error) { loadBookings(); toast({ title: 'Status atualizado' }); }
  };

  const getFilteredBookings = () => {
    const today = startOfDay(new Date());
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.booking_date);
      if (bookingFilter === 'upcoming') return isAfter(bookingDate, today) || format(bookingDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      if (bookingFilter === 'past') return isBefore(bookingDate, today);
      return true;
    });
  };

  const getLinkStats = (linkId: string) => {
    const lb = bookings.filter(b => b.booking_link_id === linkId);
    return { total: lb.length, confirmed: lb.filter(b => b.status === 'confirmed').length, pending: lb.filter(b => b.status === 'pending').length };
  };

  const openEditDialog = (link: BookingLink) => {
    setEditingLink(link);
    setEditFormData({
      title: link.title,
      description: link.description || '',
      duration_minutes: link.duration_minutes,
      buffer_minutes: link.buffer_minutes,
      logo_url: link.logo_url || '',
      primary_color: link.primary_color || FLOW_COLOR,
      secondary_color: link.secondary_color || '#10B981',
      background_color: link.background_color || '#FFFFFF',
      custom_message: link.custom_message || '',
    });
    setShowEditDialog(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${companyId}/booking-logos/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Try creating the bucket if it doesn't exist
        await supabase.storage.createBucket('company-assets', { public: true });
        const { error: retryError } = await supabase.storage
          .from('company-assets')
          .upload(filePath, file, { upsert: true });
        if (retryError) throw retryError;
      }

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);
      
      setEditFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast({ title: 'Logo enviado!' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveEditedLink = async () => {
    if (!editingLink) return;

    const { error } = await supabase
      .from('public_booking_links')
      .update({
        title: editFormData.title,
        description: editFormData.description || null,
        duration_minutes: editFormData.duration_minutes,
        buffer_minutes: editFormData.buffer_minutes,
        logo_url: editFormData.logo_url || null,
        primary_color: editFormData.primary_color,
        secondary_color: editFormData.secondary_color,
        background_color: editFormData.background_color,
        custom_message: editFormData.custom_message || null,
      })
      .eq('id', editingLink.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao salvar alterações', variant: 'destructive' });
      return;
    }

    toast({ title: 'Salvo!', description: 'Link atualizado com sucesso' });
    setShowEditDialog(false);
    setEditingLink(null);
    loadBookingLinks();
  };

  const filteredBookings = getFilteredBookings();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agenda Online</h1>
            <p className="text-sm text-gray-500">Gerencie seus links e compromissos de agendamento</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle>Criar Link de Agendamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título do Evento</Label>
                  <Input placeholder="Ex: Consultoria de 30min" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea placeholder="Descreva o compromisso..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="rounded-xl resize-none" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Timer className="h-4 w-4 text-gray-400" />Duração</Label>
                    <Select value={formData.duration_minutes.toString()} onValueChange={(v) => setFormData({ ...formData, duration_minutes: parseInt(v) })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
                    <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" />Intervalo</Label>
                    <Select value={formData.buffer_minutes.toString()} onValueChange={(v) => setFormData({ ...formData, buffer_minutes: parseInt(v) })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1 rounded-xl">Cancelar</Button>
                <Button onClick={createBookingLink} disabled={!formData.title} className="flex-1 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>Criar Link</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: LinkIcon, label: 'Links', value: bookingLinks.length, color: FLOW_COLOR },
            { icon: CalendarDays, label: 'Agendamentos', value: bookings.length, color: '#10B981' },
            { icon: Clock, label: 'Pendentes', value: bookings.filter(b => b.status === 'pending').length, color: '#F59E0B' },
            { icon: CheckCircle2, label: 'Confirmados', value: bookings.filter(b => b.status === 'confirmed').length, color: '#8B5CF6' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${stat.color}12` }}>
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1.5 inline-flex gap-1">
          {[
            { id: 'links' as const, label: 'Meus Links', icon: LinkIcon },
            { id: 'bookings' as const, label: 'Agendamentos', icon: CalendarDays },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              style={activeTab === tab.id ? { backgroundColor: FLOW_COLOR } : {}}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Links Tab */}
        {activeTab === 'links' && (
          <>
            {bookingLinks.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                <div className="p-4 rounded-2xl w-fit mx-auto mb-4" style={{ backgroundColor: `${FLOW_COLOR}10` }}>
                  <LinkIcon className="h-10 w-10" style={{ color: FLOW_COLOR }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Crie seu primeiro link</h3>
                <p className="text-gray-500 mb-6">Permita que clientes agendem reuniões com você</p>
                <Button onClick={() => setShowCreateDialog(true)} className="rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                  <Plus className="mr-2 h-4 w-4" />Criar Link
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookingLinks.map((link) => {
                  const stats = getLinkStats(link.id);
                  return (
                    <div
                      key={link.id}
                      className={cn(
                        "bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all",
                        !link.is_active && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon / Logo */}
                        <div className="p-3 rounded-xl shrink-0 overflow-hidden" style={{ backgroundColor: link.logo_url ? 'transparent' : `${link.primary_color || FLOW_COLOR}10` }}>
                          {link.logo_url ? (
                            <img src={link.logo_url} alt="Logo" className="h-5 w-5 object-contain" />
                          ) : (
                            <LinkIcon className="h-5 w-5" style={{ color: link.primary_color || FLOW_COLOR }} />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{link.title}</h3>
                            <Badge variant={link.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0" style={link.is_active ? { backgroundColor: '#10B981' } : {}}>
                              {link.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {link.primary_color && link.primary_color !== FLOW_COLOR && (
                              <div className="w-3 h-3 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: link.primary_color }} />
                            )}
                          </div>
                          {link.description && <p className="text-sm text-gray-500 line-clamp-1 mb-1">{link.description}</p>}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{link.duration_minutes} min</span>
                            {link.buffer_minutes > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />+{link.buffer_minutes} intervalo</span>}
                            <span>{stats.total} agendamentos</span>
                            <span className="text-green-600">{stats.confirmed} confirmados</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch checked={link.is_active} onCheckedChange={() => toggleLinkStatus(link.id, link.is_active)} />
                          <Button size="icon" variant="outline" className="rounded-xl h-8 w-8" onClick={() => openEditDialog(link)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => copyLinkToClipboard(link.link_slug)}>
                            <Copy className="h-3.5 w-3.5" />Copiar
                          </Button>
                          <Button size="icon" variant="outline" className="rounded-xl h-8 w-8" onClick={() => openBookingPage(link.link_slug)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="outline" className="rounded-xl h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteLink(link.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <>
            {/* Filter Pills */}
            <div className="flex gap-2">
              {(['upcoming', 'all', 'past'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setBookingFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    bookingFilter === filter ? 'text-white' : 'text-gray-600 hover:bg-gray-50 bg-white border border-gray-100'
                  }`}
                  style={bookingFilter === filter ? { backgroundColor: FLOW_COLOR } : {}}
                >
                  {filter === 'upcoming' && 'Próximos'}
                  {filter === 'all' && 'Todos'}
                  {filter === 'past' && 'Passados'}
                </button>
              ))}
            </div>

            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                <div className="p-4 rounded-2xl w-fit mx-auto mb-4" style={{ backgroundColor: `${FLOW_COLOR}10` }}>
                  <CalendarDays className="h-10 w-10" style={{ color: FLOW_COLOR }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum agendamento</h3>
                <p className="text-gray-500">
                  {bookingFilter === 'upcoming' ? 'Sem agendamentos futuros' : bookingFilter === 'past' ? 'Sem agendamentos passados' : 'Aguardando agendamentos'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((booking) => {
                  const bookingLink = bookingLinks.find(l => l.id === booking.booking_link_id);
                  const isPast = isBefore(parseISO(booking.booking_date), startOfDay(new Date()));
                  
                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        "bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all",
                        isPast && "opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${FLOW_COLOR}10` }}>
                            <Users className="h-5 w-5" style={{ color: FLOW_COLOR }} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900">{booking.client_name}</h3>
                            <p className="text-sm text-gray-500">{bookingLink?.title || 'Agendamento'}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{booking.client_email}</span>
                              {booking.client_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{booking.client_phone}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{format(parseISO(booking.booking_date), "dd 'de' MMM", { locale: ptBR })}</p>
                            <p className="text-sm text-gray-500">{booking.booking_time}</p>
                          </div>
                          <Badge className={cn(
                            "rounded-lg",
                            booking.status === 'confirmed' && "bg-green-50 text-green-700 hover:bg-green-50",
                            booking.status === 'pending' && "bg-amber-50 text-amber-700 hover:bg-amber-50",
                            booking.status === 'cancelled' && "bg-red-50 text-red-700 hover:bg-red-50"
                          )}>
                            {booking.status === 'confirmed' && '✓ Confirmado'}
                            {booking.status === 'pending' && '⏳ Pendente'}
                            {booking.status === 'cancelled' && '✕ Cancelado'}
                          </Badge>
                          {!isPast && booking.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => updateBookingStatus(booking.id, 'confirmed')}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => updateBookingStatus(booking.id, 'cancelled')}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Link Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" style={{ color: FLOW_COLOR }} />
              Editar Link de Agendamento
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="mt-2">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-gray-100">
              <TabsTrigger value="general" className="rounded-lg gap-2 text-xs">
                <Type className="h-3.5 w-3.5" />Geral
              </TabsTrigger>
              <TabsTrigger value="visual" className="rounded-lg gap-2 text-xs">
                <Palette className="h-3.5 w-3.5" />Visual
              </TabsTrigger>
              <TabsTrigger value="preview" className="rounded-lg gap-2 text-xs">
                <Eye className="h-3.5 w-3.5" />Preview
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Título do Evento</Label>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="rounded-xl"
                  placeholder="Ex: Consultoria de 30min"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="rounded-xl resize-none"
                  rows={3}
                  placeholder="Descreva o compromisso..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Timer className="h-4 w-4 text-gray-400" />Duração</Label>
                  <Select value={editFormData.duration_minutes.toString()} onValueChange={(v) => setEditFormData({ ...editFormData, duration_minutes: parseInt(v) })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
                  <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" />Intervalo</Label>
                  <Select value={editFormData.buffer_minutes.toString()} onValueChange={(v) => setEditFormData({ ...editFormData, buffer_minutes: parseInt(v) })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
              <div className="space-y-2">
                <Label>Mensagem de boas-vindas</Label>
                <Textarea
                  value={editFormData.custom_message}
                  onChange={(e) => setEditFormData({ ...editFormData, custom_message: e.target.value })}
                  className="rounded-xl resize-none"
                  rows={2}
                  placeholder="Mensagem exibida na página de agendamento..."
                />
              </div>
            </TabsContent>

            {/* Visual Tab */}
            <TabsContent value="visual" className="space-y-5 mt-4">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2"><Image className="h-4 w-4 text-gray-400" />Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                    {editFormData.logo_url ? (
                      <img src={editFormData.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Upload className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                      <span className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingLogo ? 'Enviando...' : 'Enviar logo'}
                      </span>
                    </label>
                    {editFormData.logo_url && (
                      <button
                        onClick={() => setEditFormData({ ...editFormData, logo_url: '' })}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        Remover logo
                      </button>
                    )}
                    <p className="text-[11px] text-gray-400">PNG, JPG ou SVG. Recomendado 200x200px</p>
                  </div>
                </div>
              </div>

              {/* Primary Color */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-gray-400" />Cor Principal
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={`primary-${color}`}
                        onClick={() => setEditFormData({ ...editFormData, primary_color: color })}
                        className={cn(
                          "w-7 h-7 rounded-lg border-2 transition-all",
                          editFormData.primary_color === color ? 'border-gray-900 scale-110' : 'border-gray-200 hover:scale-105'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={editFormData.primary_color}
                    onChange={(e) => setEditFormData({ ...editFormData, primary_color: e.target.value })}
                    className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-gray-400" />Cor Secundária
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={`secondary-${color}`}
                        onClick={() => setEditFormData({ ...editFormData, secondary_color: color })}
                        className={cn(
                          "w-7 h-7 rounded-lg border-2 transition-all",
                          editFormData.secondary_color === color ? 'border-gray-900 scale-110' : 'border-gray-200 hover:scale-105'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={editFormData.secondary_color}
                    onChange={(e) => setEditFormData({ ...editFormData, secondary_color: e.target.value })}
                    className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-gray-400" />Cor de Fundo
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {['#FFFFFF', '#F9FAFB', '#F3F4F6', '#EFF6FF', '#FEF3F2', '#F0FDF4', '#FDF4FF', '#FFFBEB', '#F8FAFC', '#111827'].map((color) => (
                      <button
                        key={`bg-${color}`}
                        onClick={() => setEditFormData({ ...editFormData, background_color: color })}
                        className={cn(
                          "w-7 h-7 rounded-lg border-2 transition-all",
                          editFormData.background_color === color ? 'border-gray-900 scale-110' : 'border-gray-200 hover:scale-105'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={editFormData.background_color}
                    onChange={(e) => setEditFormData({ ...editFormData, background_color: e.target.value })}
                    className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-4">
              <div
                className="rounded-2xl border border-gray-200 p-8 flex flex-col items-center gap-4 min-h-[300px]"
                style={{ backgroundColor: editFormData.background_color }}
              >
                {/* Logo preview */}
                {editFormData.logo_url ? (
                  <img src={editFormData.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded-xl" />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${editFormData.primary_color}20` }}
                  >
                    <CalendarDays className="h-6 w-6" style={{ color: editFormData.primary_color }} />
                  </div>
                )}
                
                <h3
                  className="text-xl font-bold"
                  style={{ color: editFormData.background_color === '#111827' ? '#FFFFFF' : '#111827' }}
                >
                  {editFormData.title || 'Título do evento'}
                </h3>
                
                {editFormData.description && (
                  <p
                    className="text-sm text-center max-w-sm"
                    style={{ color: editFormData.background_color === '#111827' ? '#9CA3AF' : '#6B7280' }}
                  >
                    {editFormData.description}
                  </p>
                )}

                {editFormData.custom_message && (
                  <p
                    className="text-xs text-center max-w-sm italic"
                    style={{ color: editFormData.secondary_color }}
                  >
                    {editFormData.custom_message}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <span
                    className="text-sm flex items-center gap-1.5"
                    style={{ color: editFormData.background_color === '#111827' ? '#D1D5DB' : '#374151' }}
                  >
                    <Timer className="h-4 w-4" />{editFormData.duration_minutes} min
                  </span>
                </div>
                
                <button
                  className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm font-medium"
                  style={{ backgroundColor: editFormData.primary_color }}
                >
                  Agendar Horário
                </button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={saveEditedLink}
              disabled={!editFormData.title}
              className="flex-1 rounded-xl text-white"
              style={{ backgroundColor: FLOW_COLOR }}
            >
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImprovedAgendaAberta;
