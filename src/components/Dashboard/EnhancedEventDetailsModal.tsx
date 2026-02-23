import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Video, ExternalLink, AlertCircle, FileText, Edit3, Save, X, Check, Pause, Calendar as CalendarIcon, Link, Trash2, Users, CheckCircle, XCircle, HelpCircle, Send, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { format, isPast, isBefore, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EnhancedEventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  onEventUpdate?: () => void;
}

const EnhancedEventDetailsModal: React.FC<EnhancedEventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  onEventUpdate
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({
    notes: '',
    recording_link: '',
    status: 'pending',
    title: '',
    description: '',
  });
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    newDate: '',
    newStartTime: '',
    newEndTime: ''
  });
  const [showReschedule, setShowReschedule] = useState(false);
  const [rsvpList, setRsvpList] = useState<any[]>([]);
  const [sendingRsvpFor, setSendingRsvpFor] = useState<string | null>(null);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { deleteGoogleCalendarEvent, isConnected: googleConnected } = useGoogleCalendar();

  const fetchRsvpData = React.useCallback((eventId: string) => {
    supabase
      .from('meeting_rsvp')
      .select('*')
      .eq('event_id', eventId)
      .order('invited_at', { ascending: true })
      .then(({ data }) => setRsvpList(data || []));
    
    supabase
      .from('meeting_reschedule_requests')
      .select('*')
      .eq('event_id', eventId)
      .in('status', ['reschedule_proposed', 'cancelled', 'awaiting_response'])
      .order('created_at', { ascending: false })
      .then(({ data }) => setRescheduleRequests(data || []));
  }, []);

  React.useEffect(() => {
    if (event && isOpen) {
      const meetingData = event.extendedProps?.meeting_data || {};
      setEditData({
        notes: meetingData.notes || '',
        recording_link: meetingData.recording_link || '',
        status: meetingData.status || 'pending',
        title: event.title || '',
        description: event.extendedProps?.description || '',
      });
      setIsEditingDetails(false);
      
      const eventId = event.id || event.extendedProps?.id;
      if (eventId) {
        fetchRsvpData(eventId);

        // Real-time subscription for RSVP and reschedule updates
        const channel = supabase
          .channel(`rsvp-reschedule-${eventId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'meeting_rsvp',
            filter: `event_id=eq.${eventId}`,
          }, () => {
            fetchRsvpData(eventId);
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'meeting_reschedule_requests',
            filter: `event_id=eq.${eventId}`,
          }, () => {
            fetchRsvpData(eventId);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [event, isOpen, fetchRsvpData]);

  if (!event) return null;

  const getEventStatus = () => {
    const now = new Date();
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    if (now < startDate) {
      const diffMs = startDate.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeText = '';
      if (diffDays > 0) {
        timeText = `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        timeText = `Em ${diffHours}h ${diffMinutes}min`;
      } else {
        timeText = `Em ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
      }
      
      return {
        status: 'upcoming',
        color: 'bg-blue-100 text-blue-800',
        icon: Clock,
        text: timeText
      };
    } else if (now >= startDate && now <= endDate) {
      return {
        status: 'ongoing',
        color: 'bg-green-100 text-green-800',
        icon: Clock,
        text: 'Em andamento'
      };
    } else {
      return {
        status: 'past',
        color: 'bg-gray-100 text-gray-800',
        icon: AlertCircle,
        text: 'Finalizado'
      };
    }
  };

  const eventStatus = getEventStatus();
  const StatusIcon = eventStatus.icon;
  const eventData = event.extendedProps || {};
  const meetingLink = eventData.meeting_link;
  const eventStartDate = new Date(event.start);
  const eventEndDate = new Date(event.end);
  const canReschedule = !isPast(eventStartDate);
  const attendees: string[] = eventData.attendees || [];

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: format(date, 'dd/MM/yyyy', { locale: ptBR }),
      time: format(date, 'HH:mm', { locale: ptBR })
    };
  };

  const startDateTime = formatDateTime(event.start);
  const endDateTime = formatDateTime(event.end);

  // Request RSVP confirmation via WhatsApp
  const handleRequestConfirmation = async (rsvp: any) => {
    setSendingRsvpFor(rsvp.id);
    try {
      const phone = rsvp.attendee_phone;
      if (!phone) {
        toast({ title: "Erro", description: "Participante sem telefone cadastrado", variant: "destructive" });
        return;
      }

      const companyId = eventData.company_id;
      const confirmMsg = `📋 *Solicitação de Confirmação*\n\n` +
        `Gostaríamos de confirmar sua presença na reunião:\n\n` +
        `📌 *${event.title}*\n` +
        `📆 ${startDateTime.date} às ${startDateTime.time}\n` +
        (meetingLink ? `🔗 ${meetingLink}\n` : '') +
        `\nResponda *Sim* para confirmar ou *Não* para recusar.`;

      // Reset RSVP status to pending so the webhook can detect the response
      await supabase
        .from('meeting_rsvp')
        .update({ status: 'pending', responded_at: null })
        .eq('id', rsvp.id);

      // Send via notify-event-change with custom message
      await supabase.functions.invoke('notify-event-change', {
        body: {
          change_type: 'confirmation_request',
          event_title: event.title,
          event_date: startDateTime.date,
          event_time: `${startDateTime.time} - ${endDateTime.time}`,
          meeting_link: meetingLink || null,
          attendees: [phone],
          company_id: companyId,
          event_id: event.id || event.extendedProps?.id || null,
          custom_message: confirmMsg,
        }
      });

      toast({ title: "Enviado", description: `Solicitação enviada para ${rsvp.attendee_name || phone}` });
    } catch (err: any) {
      console.error('Error requesting confirmation:', err);
      toast({ title: "Erro", description: "Falha ao enviar solicitação", variant: "destructive" });
    } finally {
      setSendingRsvpFor(null);
    }
  };

  // Handle reschedule response (confirm/deny)
  const handleRescheduleResponse = async (requestId: string, response: 'confirm' | 'deny') => {
    setRespondingTo(requestId);
    try {
      const action = response === 'confirm' ? 'confirm_reschedule' : 'deny_reschedule';
      const res = await supabase.functions.invoke('handle-meeting-reschedule', {
        body: { action, reschedule_request_id: requestId }
      });
      
      if (res.error) throw res.error;
      
      toast({
        title: response === 'confirm' ? '✅ Remarcação confirmada' : '❌ Remarcação negada',
        description: response === 'confirm' 
          ? 'O evento foi remarcado e o participante foi notificado'
          : 'O participante foi notificado da negativa',
      });
      
      // Refresh data
      const eventId = event?.id || event?.extendedProps?.id;
      if (eventId) fetchRsvpData(eventId);
      onEventUpdate?.();
    } catch (err: any) {
      console.error('Error responding to reschedule:', err);
      toast({ title: 'Erro', description: 'Falha ao processar resposta', variant: 'destructive' });
    } finally {
      setRespondingTo(null);
    }
  };

  // Helper to notify attendees about event changes
  const notifyAttendeesChange = (changeType: string, extra: Record<string, any> = {}) => {
    if (attendees.length === 0) return;
    const companyId = eventData.company_id;
    supabase.functions.invoke('notify-event-change', {
      body: {
        change_type: changeType,
        event_title: event.title,
        event_date: startDateTime.date,
        event_time: `${startDateTime.time} - ${endDateTime.time}`,
        meeting_link: meetingLink || null,
        attendees,
        company_id: companyId,
        ...extra,
      }
    }).then(res => {
      if (res.error) console.error('Notify error:', res.error);
      else console.log(`✅ ${changeType} notifications: ${res.data?.sent}/${res.data?.total}`);
    }).catch(err => console.error('Notify error:', err));
  };

  const handleDeleteEvent = async () => {
    if (!event?.id || !user) return;
    
    setIsLoading(true);
    try {
      console.log('🗑️ Starting event deletion process...');
      
      // Se o evento tem Google Event ID e o usuário está conectado ao Google, deletar do Google Calendar primeiro
      if (eventData.google_event_id && googleConnected) {
        try {
          console.log('🔄 Deleting from Google Calendar first...');
          await deleteGoogleCalendarEvent(eventData.google_event_id);
          console.log('✅ Event deleted from Google Calendar');
          
          toast({
            title: "Sucesso",
            description: "Evento removido do Google Calendar",
            duration: 3000
          });
        } catch (error: any) {
          console.error('❌ Error deleting from Google Calendar:', error);
          
          // Se falhar ao deletar do Google Calendar, ainda permitir deletar localmente
          // mas avisar o usuário
          toast({
            title: "Aviso",
            description: "Evento deletado localmente, mas pode ainda existir no Google Calendar",
            variant: "destructive",
            duration: 5000
          });
        }
      }

      // Deletar do banco de dados local
      console.log('🔄 Deleting from local database...');
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', event.id);

      if (error) {
        console.error('❌ Error deleting from database:', error);
        throw error;
      }

      console.log('✅ Event deleted from local database');

      // Notify attendees about cancellation
      notifyAttendeesChange('cancelled');
      const eventCompanyId = event.extendedProps?.company_id || event.company_id;
      if (eventCompanyId) {
        supabase.functions.invoke('send-user-notification', {
          body: {
            user_id: user.id,
            company_id: eventCompanyId,
            title: '📅❌ Evento removido',
            message: `O evento "${event.title}" foi excluído da sua agenda`,
            notification_type: 'event_deleted',
            category: 'calendar',
            icon: 'Calendar',
            action_url: '/dashboard/agenda',
          },
        }).catch(err => console.error('Notification error:', err));
      }

      toast({
        title: "Sucesso",
        description: "Evento excluído com sucesso!"
      });

      onEventUpdate?.();
      onClose();
    } catch (error: any) {
      console.error('💥 Error deleting event:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir evento",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!event?.id || !user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          meeting_data: {
            ...eventData.meeting_data,
            notes: editData.notes,
            recording_link: editData.recording_link,
            status: editData.status,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Informações da reunião atualizadas com sucesso!"
      });

      setIsEditing(false);
      onEventUpdate?.();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar informações",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!event?.id || !user) return;
    
    setIsLoading(true);
    try {
      const updateData: any = {
        title: editData.title,
        description: editData.description,
      };

      // Update dates if changed
      const dateVal = rescheduleData.newDate || format(eventStartDate, 'yyyy-MM-dd');
      const startTime = rescheduleData.newStartTime || format(eventStartDate, 'HH:mm');
      const endTime = rescheduleData.newEndTime || format(eventEndDate, 'HH:mm');
      
      updateData.start_date = new Date(`${dateVal}T${startTime}`).toISOString();
      updateData.end_date = new Date(`${dateVal}T${endTime}`).toISOString();

      const { error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Evento atualizado com sucesso!"
      });

      setIsEditingDetails(false);
      onEventUpdate?.();
    } catch (error: any) {
      console.error('Erro ao salvar detalhes:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar detalhes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescheduleEvent = async () => {
    if (!event?.id || !user || !rescheduleData.newDate || !rescheduleData.newStartTime || !rescheduleData.newEndTime) return;

    setIsLoading(true);
    try {
      const newStartDateTime = new Date(`${rescheduleData.newDate}T${rescheduleData.newStartTime}`);
      const newEndDateTime = new Date(`${rescheduleData.newDate}T${rescheduleData.newEndTime}`);

      const { error } = await supabase
        .from('calendar_events')
        .update({
          start_date: newStartDateTime.toISOString(),
          end_date: newEndDateTime.toISOString(),
          meeting_data: {
            ...eventData.meeting_data,
            rescheduled: true,
            original_date: event.start,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', event.id);

      if (error) throw error;

      // Notify attendees about reschedule
      notifyAttendeesChange('rescheduled', {
        new_date: format(newStartDateTime, 'dd/MM/yyyy', { locale: ptBR }),
        new_time: `${rescheduleData.newStartTime} - ${rescheduleData.newEndTime}`,
      });

      toast({
        title: "Sucesso",
        description: "Reunião reagendada com sucesso!"
      });

      setShowReschedule(false);
      onEventUpdate?.();
      onClose();
    } catch (error: any) {
      console.error('Erro ao reagendar:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao reagendar reunião",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    await updateEventStatus('completed', 'Reunião marcada como concluída');
    notifyAttendeesChange('completed');
  };

  const handleMarkAsPostponed = async () => {
    await updateEventStatus('postponed', 'Reunião marcada como adiada');
  };

  const updateEventStatus = async (status: string, successMessage: string) => {
    if (!event?.id || !user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          meeting_data: {
            ...eventData.meeting_data,
            status: status,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: successMessage
      });

      onEventUpdate?.();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'postponed':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'postponed':
        return 'Adiada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Pendente';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-gray-900 pr-8">
                {event.title}
              </DialogTitle>
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {eventData.event_type === 'meeting' ? 'Reunião' : 
                   eventData.event_type === 'appointment' ? 'Compromisso' : 'Lembrete'}
                </Badge>
                <Badge className={eventStatus.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {eventStatus.text}
                </Badge>
                {editData.status && (
                  <Badge className={getStatusColor(editData.status)}>
                    {getStatusLabel(editData.status)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="notes">Anotações</TabsTrigger>
            <TabsTrigger value="actions">Ações</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            {/* Edit toggle */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingDetails(!isEditingDetails)}
              >
                {isEditingDetails ? <X className="h-4 w-4 mr-1" /> : <Edit3 className="h-4 w-4 mr-1" />}
                {isEditingDetails ? 'Cancelar' : 'Editar Detalhes'}
              </Button>
            </div>

            {isEditingDetails ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Título</label>
                  <Input
                    value={editData.title}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    placeholder="Título do evento"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Descrição</label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                    rows={3}
                    placeholder="Descrição do evento..."
                    className="resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data</label>
                    <Input
                      type="date"
                      value={rescheduleData.newDate || format(eventStartDate, 'yyyy-MM-dd')}
                      onChange={(e) => setRescheduleData({...rescheduleData, newDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Início</label>
                    <Input
                      type="time"
                      value={rescheduleData.newStartTime || format(eventStartDate, 'HH:mm')}
                      onChange={(e) => setRescheduleData({...rescheduleData, newStartTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fim</label>
                    <Input
                      type="time"
                      value={rescheduleData.newEndTime || format(eventEndDate, 'HH:mm')}
                      onChange={(e) => setRescheduleData({...rescheduleData, newEndTime: e.target.value})}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveDetails}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            ) : (
              <>
                {/* Título */}
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Data e Horário</p>
                    <p className="text-sm text-gray-600">
                      {startDateTime.date} das {startDateTime.time} às {endDateTime.time}
                    </p>
                    {startDateTime.date !== endDateTime.date && (
                      <p className="text-sm text-gray-500">
                        Termina em {endDateTime.date}
                      </p>
                    )}
                  </div>
                </div>

                {/* Descrição */}
                {eventData.description && (
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Descrição</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {eventData.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Link da Reunião */}
                {meetingLink && (
                  <div className="flex items-start space-x-3">
                    <Video className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Link da Reunião</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm text-blue-600 break-all">{meetingLink}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(meetingLink, '_blank')}
                          className="h-8 px-3 text-xs"
                          disabled={eventStatus.status === 'past'}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {eventStatus.status === 'past' ? 'Expirado' : 'Abrir'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gravação da Reunião */}
                {editData.recording_link && (
                  <div className="flex items-start space-x-3">
                    <Video className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Gravação da Reunião</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm text-blue-600 break-all">{editData.recording_link}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(editData.recording_link, '_blank')}
                          className="h-8 px-3 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Assistir
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* RSVP Status / Participants */}
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">
                      Participantes {rsvpList.length > 0 && (
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({rsvpList.filter(r => r.status === 'confirmed').length} confirmado(s), {rsvpList.filter(r => r.status === 'declined').length} recusado(s))
                        </span>
                      )}
                    </p>
                    
                    {rsvpList.length > 0 ? (
                      <div className="space-y-2">
                        {rsvpList.map((rsvp) => (
                          <div key={rsvp.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${
                            rsvp.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                            rsvp.status === 'declined' ? 'bg-red-50 border-red-200' :
                            'bg-muted/50 border-border'
                          }`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                rsvp.status === 'confirmed' ? 'bg-green-500' :
                                rsvp.status === 'declined' ? 'bg-red-500' :
                                rsvp.status === 'reminded' ? 'bg-yellow-500' :
                                'bg-gray-400'
                              }`} />
                              <span className="text-sm font-medium">
                                {rsvp.attendee_name || rsvp.attendee_phone || rsvp.attendee_email}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={
                                rsvp.status === 'confirmed' ? 'border-green-300 text-green-700 bg-green-100' :
                                rsvp.status === 'declined' ? 'border-red-300 text-red-700 bg-red-100' :
                                rsvp.status === 'reminded' ? 'border-yellow-300 text-yellow-700 bg-yellow-100' :
                                'border-gray-300 text-gray-600 bg-gray-100'
                              }>
                                {rsvp.status === 'confirmed' && <><CheckCircle className="h-3 w-3 mr-1" /> Confirmado</>}
                                {rsvp.status === 'declined' && <><XCircle className="h-3 w-3 mr-1" /> Recusado</>}
                                {rsvp.status === 'reminded' && <><HelpCircle className="h-3 w-3 mr-1" /> Lembrado</>}
                                {rsvp.status === 'pending' && <><HelpCircle className="h-3 w-3 mr-1" /> Pendente</>}
                              </Badge>
                              {rsvp.attendee_phone && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={sendingRsvpFor === rsvp.id}
                                  onClick={() => handleRequestConfirmation(rsvp)}
                                  title="Solicitar confirmação via WhatsApp"
                                >
                                  {sendingRsvpFor === rsvp.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : attendees.length > 0 ? (
                      <div className="space-y-1.5">
                        {attendees.map((att: string, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              <span className="text-sm">{att}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500">
                                Sem RSVP
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={sendingRsvpFor === att}
                                onClick={async () => {
                                  setSendingRsvpFor(att);
                                  try {
                                    const eventId = event.id || event.extendedProps?.id;
                                    const eventCompanyId = event.extendedProps?.company_id || event.company_id;
                                    const confirmMsg = `📋 *Solicitação de Confirmação*\n\nGostaríamos de confirmar sua presença na reunião:\n\n📌 *${event.title}*\n📆 ${startDateTime.date} às ${startDateTime.time}\n${meetingLink ? `🔗 ${meetingLink}\n` : ''}\nResponda *Sim* para confirmar ou *Não* para recusar.`;
                                    await supabase.functions.invoke('notify-event-change', {
                                      body: {
                                        change_type: 'confirmation_request',
                                        event_title: event.title,
                                        event_date: startDateTime.date,
                                        event_time: `${startDateTime.time} - ${endDateTime.time}`,
                                        meeting_link: meetingLink || null,
                                        attendees: [att],
                                        company_id: eventCompanyId,
                                        event_id: eventId,
                                        custom_message: confirmMsg,
                                      }
                                    });
                                    toast({ title: "Enviado", description: "Solicitação de confirmação enviada" });
                                  } catch (err) {
                                    toast({ title: "Erro", description: "Falha ao enviar", variant: "destructive" });
                                  } finally {
                                    setSendingRsvpFor(null);
                                  }
                                }}
                                title="Solicitar confirmação via WhatsApp"
                              >
                                {sendingRsvpFor === att ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum participante adicionado</p>
                    )}
                  </div>
                </div>

                {/* Reschedule Requests */}
                {rescheduleRequests.length > 0 && (
                  <div className="flex items-start space-x-3 mt-4">
                    <CalendarIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-2">
                        Solicitações de Remarcação
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({rescheduleRequests.filter(r => r.status === 'reschedule_proposed').length} pendente(s))
                        </span>
                      </p>
                      <div className="space-y-3">
                        {rescheduleRequests.map((req) => (
                          <div key={req.id} className={`p-3 rounded-lg border ${
                            req.status === 'reschedule_proposed' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' :
                            req.status === 'cancelled' ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' :
                            'bg-muted/50 border-border'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">
                                {req.attendee_name || req.attendee_phone}
                              </span>
                              <Badge variant="outline" className={
                                req.status === 'reschedule_proposed' ? 'border-amber-300 text-amber-700 bg-amber-100 dark:text-amber-300' :
                                req.status === 'cancelled' ? 'border-red-300 text-red-700 bg-red-100 dark:text-red-300' :
                                req.status === 'awaiting_response' ? 'border-blue-300 text-blue-700 bg-blue-100 dark:text-blue-300' :
                                'border-border text-muted-foreground'
                              }>
                                {req.status === 'reschedule_proposed' && '📅 Quer remarcar'}
                                {req.status === 'cancelled' && '❌ Cancelou'}
                                {req.status === 'awaiting_response' && '⏳ Aguardando resposta'}
                              </Badge>
                            </div>

                            {req.ai_interpretation && (
                              <p className="text-sm text-muted-foreground mb-2 italic">
                                "{req.ai_interpretation}"
                              </p>
                            )}

                            {req.suggested_text && (
                              <p className="text-xs text-muted-foreground mb-2">
                                Mensagem original: "{req.suggested_text}"
                              </p>
                            )}

                            {req.ai_interpreted_date && (
                              <p className="text-sm font-medium text-foreground mb-2">
                                📆 Data sugerida: {new Date(req.ai_interpreted_date).toLocaleDateString('pt-BR', {
                                  weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                  timeZone: 'America/Sao_Paulo'
                                })}
                              </p>
                            )}

                            {req.status === 'reschedule_proposed' && (
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={respondingTo === req.id}
                                  onClick={() => handleRescheduleResponse(req.id, 'confirm')}
                                >
                                  {respondingTo === req.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <Check className="h-3 w-3 mr-1" />
                                  )}
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  disabled={respondingTo === req.id}
                                  onClick={() => handleRescheduleResponse(req.id, 'deny')}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Negar
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">Anotações da Reunião</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                  {isEditing ? 'Cancelar' : 'Editar'}
                </Button>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <Textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({...editData, notes: e.target.value})}
                    rows={4}
                    placeholder="Adicione suas anotações da reunião..."
                    className="resize-none"
                  />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Link da Gravação (Google Drive)
                    </label>
                    <Input
                      value={editData.recording_link}
                      onChange={(e) => setEditData({...editData, recording_link: e.target.value})}
                      placeholder="Cole o link do Google Drive aqui..."
                      type="url"
                    />
                  </div>

                  <Button
                    onClick={handleSaveNotes}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {editData.notes || 'Nenhuma anotação ainda. Clique em "Editar" para adicionar.'}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-6">
            {showReschedule ? (
              <div className="space-y-4 p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-blue-900">Reagendar Reunião</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nova Data</label>
                    <Input
                      type="date"
                      value={rescheduleData.newDate}
                      onChange={(e) => setRescheduleData({...rescheduleData, newDate: e.target.value})}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Horário Início</label>
                    <Input
                      type="time"
                      value={rescheduleData.newStartTime}
                      onChange={(e) => setRescheduleData({...rescheduleData, newStartTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Horário Fim</label>
                    <Input
                      type="time"
                      value={rescheduleData.newEndTime}
                      onChange={(e) => setRescheduleData({...rescheduleData, newEndTime: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleRescheduleEvent}
                    disabled={isLoading || !rescheduleData.newDate || !rescheduleData.newStartTime || !rescheduleData.newEndTime}
                    className="flex-1"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Confirmar Reagendamento
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowReschedule(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : showDeleteConfirm ? (
              <div className="space-y-4 p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-900">Confirmar Exclusão</h4>
                </div>
                <p className="text-sm text-red-700">
                  Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
                  {eventData.google_event_id && googleConnected && (
                    <span className="block mt-2 font-medium">
                      ✅ O evento também será removido do Google Calendar automaticamente.
                    </span>
                  )}
                  {eventData.google_event_id && !googleConnected && (
                    <span className="block mt-2 font-medium text-yellow-700">
                      ⚠️ O evento será removido apenas localmente. Para remover do Google Calendar, conecte sua conta Google primeiro.
                    </span>
                  )}
                </p>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleDeleteEvent}
                    disabled={isLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {canReschedule && (
                  <Button
                    variant="outline"
                    onClick={() => setShowReschedule(true)}
                    className="flex items-center justify-center"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Reagendar
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleMarkAsCompleted}
                  className="flex items-center justify-center text-green-600 hover:text-green-700"
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Marcar como Concluída
                </Button>

                <Button
                  variant="outline"
                  onClick={handleMarkAsPostponed}
                  className="flex items-center justify-center text-yellow-600 hover:text-yellow-700"
                  disabled={isLoading}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Marcar como Adiada
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setActiveTab('notes')}
                  className="flex items-center justify-center"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Adicionar Gravação
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center text-red-600 hover:text-red-700 md:col-span-2"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Evento
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          
          {meetingLink && eventStatus.status !== 'past' && (
            <Button 
              onClick={() => window.open(meetingLink, '_blank')}
              className="bg-[#3600FF] hover:bg-[#3600FF]/90"
            >
              <Video className="h-4 w-4 mr-2" />
              Entrar na Reunião
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedEventDetailsModal;
