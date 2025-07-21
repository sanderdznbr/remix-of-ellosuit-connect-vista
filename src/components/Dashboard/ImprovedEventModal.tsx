
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Video, Users, X, Plus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ColorPicker from './ColorPicker';

interface ImprovedEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  onCreateEvent: (eventData: any) => Promise<void>;
  onNavigateToSettings?: () => void;
}

const ImprovedEventModal: React.FC<ImprovedEventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onCreateEvent,
  onNavigateToSettings
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '10:00',
    is_all_day: false,
    meeting_provider: '',
    attendees: [] as string[],
    color: '#3600FF'
  });

  const [newAttendee, setNewAttendee] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedDate && isOpen) {
      const date = new Date(selectedDate);
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      setFormData(prev => ({
        ...prev,
        start_date: formattedDate,
        end_date: formattedDate
      }));
    }
  }, [selectedDate, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        start_time: '09:00',
        end_time: '10:00',
        is_all_day: false,
        meeting_provider: '',
        attendees: [],
        color: '#3600FF'
      });
      setNewAttendee('');
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addAttendee = () => {
    if (newAttendee.trim() && !formData.attendees.includes(newAttendee.trim())) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, newAttendee.trim()]
      }));
      setNewAttendee('');
    }
  };

  const removeAttendee = (email: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(attendee => attendee !== email)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um título para o evento",
        variant: "destructive"
      });
      return;
    }

    if (!formData.start_date) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma data para o evento",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let startDateTime, endDateTime;

      if (formData.is_all_day) {
        startDateTime = `${formData.start_date}T00:00:00`;
        endDateTime = `${formData.end_date}T23:59:59`;
      } else {
        startDateTime = `${formData.start_date}T${formData.start_time}:00`;
        endDateTime = `${formData.end_date}T${formData.end_time}:00`;
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        start_date: startDateTime,
        end_date: endDateTime,
        event_type: 'meeting',
        meeting_provider: formData.meeting_provider || null,
        attendees: formData.attendees,
        is_all_day: formData.is_all_day,
        color: formData.color
      };

      await onCreateEvent(eventData);
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar evento",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <Video className="h-6 w-6 text-[#3600FF]" />
            <span>Nova Reunião</span>
          </DialogTitle>
          {selectedDate && (
            <p className="text-sm text-gray-600 capitalize">
              {formatDateForDisplay(selectedDate)}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da reunião</Label>
            <Input
              id="title"
              placeholder="Ex: Reunião de planejamento"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="text-base"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Adicione detalhes sobre a reunião..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de início</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data de término</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
          </div>

          {/* Evento de dia inteiro */}
          <div className="flex items-center space-x-2">
            <Switch
              id="all_day"
              checked={formData.is_all_day}
              onCheckedChange={(checked) => handleInputChange('is_all_day', checked)}
            />
            <Label htmlFor="all_day">Evento de dia inteiro</Label>
          </div>

          {/* Horários */}
          {!formData.is_all_day && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Horário de início</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Horário de término</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Seletor de Cor */}
          <ColorPicker
            value={formData.color}
            onChange={(color) => handleInputChange('color', color)}
            label="Cor do evento"
          />

          {/* Provedor de reunião */}
          <div className="space-y-2">
            <Label htmlFor="meeting_provider">Provedor de reunião</Label>
            <Select
              value={formData.meeting_provider}
              onValueChange={(value) => handleInputChange('meeting_provider', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um provedor (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google_meet">Google Meet</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
                <SelectItem value="teams">Microsoft Teams</SelectItem>
                <SelectItem value="custom">Link personalizado</SelectItem>
              </SelectContent>
            </Select>
            {formData.meeting_provider && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToSettings}
                className="mt-2"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar integração
              </Button>
            )}
          </div>

          {/* Participantes */}
          <div className="space-y-3">
            <Label>Participantes</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="E-mail do participante"
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAttendee()}
                className="flex-1"
              />
              <Button onClick={addAttendee} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.attendees.map((email, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{email}</span>
                    <button
                      onClick={() => removeAttendee(email)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#3600FF] hover:bg-[#3600FF]/90"
          >
            {isSubmitting ? 'Criando...' : 'Criar Reunião'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovedEventModal;
