
import React, { useState } from 'react';
import { Plus, Calendar, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { vibrate } from '@/utils/mobile-helpers';

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

  const handleClose = () => {
    onClose();
    vibrate(30);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-end md:items-center md:justify-center">
      <div className="ios-modal w-full max-h-[90vh] flex flex-col ios-slide-up">
        {/* Drag Handle */}
        <div className="flex justify-center py-3 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--ios-gray-300)' }}></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--ios-gray-200)' }}>
          <button
            onClick={handleClose}
            className="ios-button ios-button-ghost p-2 w-10 h-10 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
          
          <h2 className="ios-title-2">Novo Lembrete</h2>
          
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className={cn(
              "ios-button px-4 py-2 rounded-full",
              title.trim() ? "ios-button-primary" : "ios-button-secondary opacity-50"
            )}
          >
            <span className="ios-callout font-medium">Salvar</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 ios-scroll">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Título do lembrete"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="ios-input ios-title-3 font-medium"
                style={{ backgroundColor: 'var(--ios-bg-secondary)' }}
              />
            </div>

            <div>
              <Textarea
                placeholder="Descrição (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="ios-input min-h-[100px] resize-none ios-body"
                style={{ backgroundColor: 'var(--ios-bg-secondary)' }}
              />
            </div>

            {/* Date & Time Selection */}
            <div className="space-y-4">
              <div className="ios-card p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Calendar className="h-5 w-5" style={{ color: 'var(--ios-gray-600)' }} />
                  <span className="ios-headline">Data</span>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="ios-input"
                  style={{ backgroundColor: 'var(--ios-bg-secondary)' }}
                />
              </div>

              <div className="ios-card p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Clock className="h-5 w-5" style={{ color: 'var(--ios-gray-600)' }} />
                  <span className="ios-headline">Hora</span>
                </div>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="ios-input"
                  style={{ backgroundColor: 'var(--ios-bg-secondary)' }}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {title && (
            <div className="ios-card p-4" style={{ backgroundColor: 'var(--ios-blue-light)', borderColor: 'var(--ios-blue)' }}>
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--ios-orange)' }}></div>
                <div>
                  <h3 className="ios-headline mb-1">{title}</h3>
                  {description && (
                    <p className="ios-subheadline mb-2">{description}</p>
                  )}
                  <p className="ios-footnote" style={{ color: 'var(--ios-blue)' }}>
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
        </div>
      </div>
    </div>
  );
};

export default NovoLembreteModal;
