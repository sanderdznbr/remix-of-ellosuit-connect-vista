
import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { vibrate } from '@/utils/mobile-helpers';
import MobileModal from '@/components/ui/mobile-modal';

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
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      vibrate(100);
      return;
    }

    setIsLoading(true);
    vibrate(30);

    try {
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
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedTime('09:00');
      
      onClose();
    } catch (error) {
      console.error('Error saving reminder:', error);
      vibrate([100, 50, 100]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    vibrate(30);
  };

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Novo Lembrete"
      size="lg"
    >
      <div className="px-6 pb-6 space-y-6">
        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Título do lembrete"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium border-0 bg-gray-50 rounded-xl px-4 py-3 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              autoFocus
            />
          </div>

          <div>
            <Textarea
              placeholder="Adicione uma descrição..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-0 bg-gray-50 rounded-xl px-4 py-3 resize-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              rows={4}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Data</span>
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-0 bg-transparent text-sm p-0 focus:ring-0"
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Hora</span>
              </div>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="border-0 bg-transparent text-sm p-0 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        {title && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
                {description && (
                  <p className="text-sm text-gray-600 mb-2">{description}</p>
                )}
                <p className="text-sm text-blue-600 font-medium">
                  {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isLoading}
            className={cn(
              "flex-1 py-3 rounded-xl font-medium transition-all",
              title.trim() 
                ? "bg-blue-500 hover:bg-blue-600 text-white" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </MobileModal>
  );
};

export default NovoLembreteModal;
