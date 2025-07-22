
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
    
    // Reset form
    setTitle('');
    setDescription('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedTime('09:00');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-gray-900 w-full rounded-t-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Novo Lembrete</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Título do lembrete"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 text-base py-3"
              autoFocus
            />
          </div>

          <div>
            <Textarea
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 text-base min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Data</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white text-base"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Hora</label>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white text-base"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NovoLembreteModal;
