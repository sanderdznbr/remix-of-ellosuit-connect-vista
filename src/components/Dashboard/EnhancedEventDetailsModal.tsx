
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Users, Video, ExternalLink, AlertCircle, FileText, MessageSquare, Upload, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    notes: '',
    stage: 'inicial',
    tags: ''
  });
  const [interactions, setInteractions] = useState<any[]>([]);
  const [newInteraction, setNewInteraction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (event && isOpen) {
      setEditData({
        title: event.title || '',
        description: event.extendedProps?.description || '',
        notes: event.extendedProps?.notes || '',
        stage: event.extendedProps?.stage || 'inicial',
        tags: event.extendedProps?.tags?.join(', ') || ''
      });
      loadInteractions();
    }
  }, [event, isOpen]);

  const loadInteractions = async () => {
    if (!event?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('client_id', event.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Erro ao carregar interações:', error);
    }
  };

  const handleSaveChanges = async () => {
    if (!event?.id || !user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: editData.title,
          description: editData.description,
          meeting_data: {
            notes: editData.notes,
            stage: editData.stage,
            tags: editData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
          }
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Evento atualizado com sucesso!"
      });

      setIsEditing(false);
      onEventUpdate?.();
    } catch (error: any) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar alterações",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!newInteraction.trim() || !event?.id || !user) return;

    setIsLoading(true);
    try {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error('Usuário não associado a uma empresa');

      const { error } = await supabase
        .from('client_interactions')
        .insert({
          client_id: event.id,
          company_id: companyUser.company_id,
          created_by: user.id,
          interaction_type: 'note',
          description: newInteraction
        });

      if (error) throw error;

      setNewInteraction('');
      await loadInteractions();
      
      toast({
        title: "Sucesso",
        description: "Interação adicionada com sucesso!"
      });
    } catch (error: any) {
      console.error('Erro ao adicionar interação:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar interação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const startDateTime = formatDateTime(event.start);
  const endDateTime = formatDateTime(event.end);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-xl font-semibold text-gray-900 pr-8">
                {isEditing ? (
                  <Input
                    value={editData.title}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    className="text-xl font-semibold"
                  />
                ) : (
                  event.title
                )}
              </DialogTitle>
              <div className="flex items-center space-x-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {eventData.event_type === 'meeting' ? 'Reunião' : 
                   eventData.event_type === 'appointment' ? 'Compromisso' : 'Lembrete'}
                </Badge>
                <Badge className={eventStatus.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {eventStatus.text}
                </Badge>
                {eventData.stage && (
                  <Badge variant="outline">
                    {eventData.stage}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancelar' : 'Editar'}
              </Button>
              {isEditing && (
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={isLoading}
                >
                  Salvar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="notes">Anotações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="files">Arquivos</TabsTrigger>
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
              </div>
            </div>

            {/* Descrição */}
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Descrição</p>
                {isEditing ? (
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                    className="mt-1"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {editData.description || 'Nenhuma descrição'}
                  </p>
                )}
              </div>
            </div>

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
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Participantes */}
            {eventData.attendees?.length > 0 && (
              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Participantes</p>
                  <div className="space-y-1 mt-1">
                    {eventData.attendees.map((attendee: any, index: number) => (
                      <p key={index} className="text-sm text-gray-600">
                        {attendee.displayName ? `${attendee.displayName} (${attendee.email})` : attendee.email}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Etapa do Projeto */}
            {isEditing && (
              <div className="flex items-start space-x-3">
                <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Etapa do Projeto</p>
                  <Select value={editData.stage} onValueChange={(value) => setEditData({...editData, stage: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inicial">Inicial</SelectItem>
                      <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                      <SelectItem value="revisao">Revisão</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Tags */}
            {isEditing && (
              <div className="flex items-start space-x-3">
                <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Tags</p>
                  <Input
                    value={editData.tags}
                    onChange={(e) => setEditData({...editData, tags: e.target.value})}
                    placeholder="tag1, tag2, tag3"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separe as tags com vírgula</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900 mb-2">Anotações do Evento</p>
                {isEditing ? (
                  <Textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({...editData, notes: e.target.value})}
                    rows={4}
                    placeholder="Adicione suas anotações aqui..."
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {editData.notes || 'Nenhuma anotação ainda'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900 mb-2">Nova Interação</p>
                <div className="flex space-x-2">
                  <Textarea
                    value={newInteraction}
                    onChange={(e) => setNewInteraction(e.target.value)}
                    placeholder="Adicione uma nova interação..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddInteraction}
                    disabled={!newInteraction.trim() || isLoading}
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>

              <div>
                <p className="font-medium text-gray-900 mb-2">Histórico de Interações</p>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {interactions.length > 0 ? (
                    interactions.map((interaction) => (
                      <div key={interaction.id} className="bg-gray-50 p-3 rounded-xl">
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="outline" className="text-xs">
                            {interaction.interaction_type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(interaction.created_at).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(interaction.created_at).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{interaction.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhuma interação registrada ainda
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-4 mt-6">
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Funcionalidade de arquivos em desenvolvimento</p>
              <Button variant="outline" disabled>
                <Upload className="h-4 w-4 mr-2" />
                Fazer Upload
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-6 border-t border-gray-100">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "Em desenvolvimento",
                  description: "Funcionalidade de gravação será implementada em breve"
                });
              }}
            >
              📹 Gravação
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('notes')}
            >
              📝 Anotações
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-yellow-600 hover:text-yellow-700"
              onClick={() => {
                toast({
                  title: "Em desenvolvimento",
                  description: "Funcionalidade de adiamento será implementada em breve"
                });
              }}
            >
              ⏰ Adiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={async () => {
                if (window.confirm('Tem certeza que deseja excluir este evento?')) {
                  try {
                    const { error } = await supabase
                      .from('calendar_events')
                      .delete()
                      .eq('id', event.id);
                    
                    if (error) throw error;
                    
                    toast({
                      title: "Sucesso",
                      description: "Evento excluído com sucesso"
                    });
                    
                    onEventUpdate?.();
                    onClose();
                  } catch (error: any) {
                    toast({
                      title: "Erro",
                      description: "Erro ao excluir evento",
                      variant: "destructive"
                    });
                  }
                }
              }}
            >
              🗑️ Excluir
            </Button>
          </div>
          
          <div className="flex space-x-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedEventDetailsModal;
