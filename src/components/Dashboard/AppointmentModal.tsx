
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ColorPicker from './ColorPicker';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onCreateEvent: (eventData: any) => Promise<void>;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onCreateEvent
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '10:00',
    is_all_day: false,
    color: '#10B981'
  });

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
        color: '#10B981'
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um título para o compromisso",
        variant: "destructive"
      });
      return;
    }

    if (!formData.start_date) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma data para o compromisso",
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
        event_type: 'appointment',
        attendees: [],
        is_all_day: formData.is_all_day,
        color: formData.color
      };

      await onCreateEvent(eventData);
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar compromisso",
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <Calendar className="h-6 w-6 text-green-600" />
            <span>Novo Compromisso</span>
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
            <Label htmlFor="title">Título do compromisso</Label>
            <Input
              id="title"
              placeholder="Ex: Consulta médica"
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
              placeholder="Adicione detalhes sobre o compromisso..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Data */}
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
            <Label htmlFor="all_day">Compromisso de dia inteiro</Label>
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
            label="Cor do compromisso"
          />
        </div>

        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Criando...' : 'Criar Compromisso'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentModal;
