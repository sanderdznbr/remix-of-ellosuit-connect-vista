
import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { vibrate } from '@/utils/mobile-helpers';
import MobileModal from '@/components/ui/mobile-modal';

interface QuickDateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string, time: string) => void;
  initialDate?: string;
  initialTime?: string;
}

const QuickDateTimeModal: React.FC<QuickDateTimeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate = new Date().toISOString().split('T')[0],
  initialTime = '09:00'
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);

  const handleSave = () => {
    onSave(selectedDate, selectedTime);
    onClose();
    vibrate(30);
  };

  const quickDateOptions = [
    { label: 'Hoje', value: new Date().toISOString().split('T')[0] },
    { label: 'Amanhã', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
    { label: 'Este fim de semana', value: getWeekendDate() }
  ];

  const quickTimeOptions = [
    { label: '09:00', value: '09:00' },
    { label: '12:00', value: '12:00' },
    { label: '15:00', value: '15:00' },
    { label: '18:00', value: '18:00' }
  ];

  function getWeekendDate() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
    const saturday = new Date(today.getTime() + daysUntilSaturday * 86400000);
    return saturday.toISOString().split('T')[0];
  }

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title="Data e Hora"
      size="md"
    >
      <div className="p-6 space-y-6">
        {/* Quick Date Options */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Data</h3>
          <div className="grid grid-cols-1 gap-2 mb-4">
            {quickDateOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSelectedDate(option.value);
                  vibrate(30);
                }}
                className={cn(
                  "p-3 rounded-lg text-left transition-colors",
                  selectedDate === option.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-50 hover:bg-gray-100"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Quick Time Options */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Hora</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickTimeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSelectedTime(option.value);
                  vibrate(30);
                }}
                className={cn(
                  "p-3 rounded-lg text-center transition-colors",
                  selectedTime === option.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-50 hover:bg-gray-100"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            Salvar
          </Button>
        </div>
      </div>
    </MobileModal>
  );
};

export default QuickDateTimeModal;
