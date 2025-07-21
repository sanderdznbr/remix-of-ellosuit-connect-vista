
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, Calendar, Bell, X } from 'lucide-react';

interface EventTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'meeting' | 'appointment' | 'reminder') => void;
  selectedDate: string;
}

const EventTypeSelector: React.FC<EventTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelectType,
  selectedDate
}) => {
  const eventTypes = [
    {
      type: 'meeting' as const,
      title: 'Reunião Online',
      icon: Video,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-500',
    },
    {
      type: 'appointment' as const,
      title: 'Compromisso Presencial',
      icon: Calendar,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-500',
    },
    {
      type: 'reminder' as const,
      title: 'Lembrete',
      icon: Bell,
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-500',
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl p-8 bg-white border-none shadow-xl rounded-2xl" hideCloseButton>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Grid das 3 opções */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {eventTypes.map((eventType) => {
            const Icon = eventType.icon;
            return (
              <Button
                key={eventType.type}
                onClick={() => onSelectType(eventType.type)}
                variant="ghost"
                className={`h-auto p-6 rounded-xl border-2 border-gray-200 bg-white ${eventType.hoverColor} hover:border-transparent text-left group transition-all duration-300 hover:shadow-lg hover:scale-105`}
              >
                <div className="flex flex-col items-center text-center space-y-4 w-full">
                  {/* Icon */}
                  <div className={`w-16 h-16 ${eventType.color} rounded-xl flex items-center justify-center transition-all duration-300`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-white transition-colors duration-300">
                    {eventType.title}
                  </h3>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
