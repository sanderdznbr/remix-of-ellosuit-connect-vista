
import React, { useState } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { vibrate } from '@/utils/mobile-helpers';
import MobileModal from '@/components/ui/mobile-modal';
import MobileButton from '@/components/ui/mobile-button';
import MobileCard from '@/components/ui/mobile-card';

interface NovoLembreteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tarefa: any) => Promise<void>;
}

const NovoLembreteModal: React.FC<NovoLembreteModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('09:00');

  const handleSave = async () => {
    if (!title.trim()) return;

    const startDateTime = `${selectedDate}T${selectedTime}:00`;
    const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();

    const tarefaData = {
      title: title.trim(),
      description: description.trim(),
      start_date: startDateTime,
      end_date: endDateTime,
      event_type: 'reminder',
      is_all_day: false,
      status: 'pending'
    };

    await onSave(tarefaData);
    vibrate(30);
    
    // Reset form
    setTitle('');
    setDescription('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedTime('09:00');
  };

  return (
    <MobileModal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Novo Lembrete"
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Form */}
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Título do lembrete"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mobile-input text-lg font-medium"
            />
          </div>

          <div>
            <Textarea
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mobile-input min-h-[100px] resize-none"
            />
          </div>

          {/* Date & Time Selection */}
          <div className="space-y-3">
            <MobileCard className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Data</span>
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mobile-input"
              />
            </MobileCard>

            <MobileCard className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Hora</span>
              </div>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="mobile-input"
              />
            </MobileCard>
          </div>
        </div>

        {/* Preview */}
        {title && (
          <MobileCard className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {description && (
                  <p className="text-sm text-gray-600 mt-1">{description}</p>
                )}
                <p className="text-sm text-blue-600 mt-2">
                  {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </MobileCard>
        )}

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <MobileButton
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </MobileButton>
          <MobileButton
            variant="primary"
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 flex items-center justify-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Salvar</span>
          </MobileButton>
        </div>
      </div>
    </MobileModal>
  );
};

export default NovoLembreteModal;
