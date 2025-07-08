
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, Calendar, Bell, ChevronRight } from 'lucide-react';

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
      description: 'Agendar uma reunião virtual com Google Meet ou Zoom',
      icon: Video,
    },
    {
      type: 'appointment' as const,
      title: 'Compromisso Presencial',
      description: 'Marcar um compromisso presencial ou visita',
      icon: Calendar,
    },
    {
      type: 'reminder' as const,
      title: 'Lembrete',
      description: 'Definir um lembrete com notificações',
      icon: Bell,
    }
  ];

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-4 p-0 bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-6 text-center border-b border-gray-100">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
              <Calendar className="h-6 w-6 text-[#3600FF]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900 mb-1">
                Criar Novo Evento
              </DialogTitle>
              <p className="text-sm text-gray-600">
                {formatDate(selectedDate)}
              </p>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="space-y-3">
            {eventTypes.map((eventType) => {
              const Icon = eventType.icon;
              return (
                <Button
                  key={eventType.type}
                  onClick={() => onSelectType(eventType.type)}
                  variant="ghost"
                  className="w-full p-4 h-auto rounded-xl border border-gray-200 bg-white hover:bg-[#3600FF] hover:border-[#3600FF] text-left group transition-all duration-200"
                >
                  <div className="flex items-center space-x-4 w-full">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-50 group-hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-200">
                        <Icon className="h-5 w-5 text-[#3600FF] group-hover:text-white transition-colors duration-200" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 group-hover:text-white mb-1 transition-colors duration-200">
                        {eventType.title}
                      </h3>
                      <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors duration-200">
                        {eventType.description}
                      </p>
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex-shrink-0">
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors duration-200" />
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full h-10 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors duration-200"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
