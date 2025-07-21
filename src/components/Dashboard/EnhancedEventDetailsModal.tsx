
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Video, ExternalLink, AlertCircle, FileText, Edit3, Save, X, Check, Pause, Calendar as CalendarIcon, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
  const [editData, setEditData] = useState({
    notes: '',
    recording_link: '',
    status: 'pending'
  });
  const [rescheduleData, setRescheduleData] = useState({
    newDate: '',
    newStartTime: '',
    newEndTime: ''
  });
  const [showReschedule, setShowReschedule] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (event && isOpen) {
      const meetingData = event.extendedProps?.meeting_data || {};
      setEditData({
        notes: meetingData.notes || '',
        recording_link: meetingData.recording_link || '',
        status: meetingData.status || 'pending'
      });
    }
  }, [event, isOpen]);

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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: format(date, 'dd/MM/yyyy', { locale: ptBR }),
      time: format(date, 'HH:mm', { locale: ptBR })
    };
  };

  const startDateTime = formatDateTime(event.start);
  const endDateTime = formatDateTime(event.end);

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
            {/* Data e Horário */}
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
                  {eventStatus.status === 'past' && (
                    <p className="text-xs text-gray-500 mt-1">
                      O link pode não estar mais ativo após o término da reunião
                    </p>
                  )}
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
