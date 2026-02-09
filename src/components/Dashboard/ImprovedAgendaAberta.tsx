import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, Clock, Plus, Copy, Link as LinkIcon, Trash2, Eye, EyeOff, Users,
  ExternalLink, CheckCircle2, XCircle, Mail, Phone, CalendarDays, Timer
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
  const [activeTab, setActiveTab] = useState<'links' | 'bookings'>('links');
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
        <div className="grid grid-cols-4 gap-4">
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
                        {/* Icon */}
                        <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${FLOW_COLOR}10` }}>
                          <LinkIcon className="h-5 w-5" style={{ color: FLOW_COLOR }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{link.title}</h3>
                            <Badge variant={link.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0" style={link.is_active ? { backgroundColor: '#10B981' } : {}}>
                              {link.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
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
    </div>
  );
};

export default ImprovedAgendaAberta;
