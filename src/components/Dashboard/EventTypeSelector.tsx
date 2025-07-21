
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
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      type: 'appointment' as const,
      title: 'Compromisso Presencial',
      description: 'Marcar um compromisso presencial ou visita',
      icon: Calendar,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      type: 'reminder' as const,
      title: 'Lembrete',
      description: 'Definir um lembrete com notificações',
      icon: Bell,
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
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
      <DialogContent className="w-full max-w-4xl mx-auto p-0 bg-white border border-gray-200 shadow-2xl rounded-3xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-8 py-6 text-center border-b border-gray-100 bg-gradient-to-r from-[#3600FF] to-[#4F46E5]">
            <DialogHeader className="space-y-3">
              <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white mb-2">
                  Criar Novo Evento
                </DialogTitle>
                <p className="text-white/90 text-lg">
                  {formatDate(selectedDate)}
                </p>
              </div>
            </DialogHeader>
          </div>

          {/* Content - Grid Layout Horizontal */}
          <div className="flex-1 px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {eventTypes.map((eventType) => {
                const Icon = eventType.icon;
                return (
                  <Button
                    key={eventType.type}
                    onClick={() => onSelectType(eventType.type)}
                    variant="ghost"
                    className={`h-auto p-6 rounded-2xl border-2 border-gray-200 bg-white ${eventType.hoverColor} hover:border-transparent text-left group transition-all duration-300 hover:shadow-xl hover:scale-105`}
                  >
                    <div className="flex flex-col items-center text-center space-y-4 w-full">
                      {/* Icon */}
                      <div className={`w-16 h-16 ${eventType.color} group-hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-300`}>
                        <Icon className="h-8 w-8 text-white transition-all duration-300" />
                      </div>
                      
                      {/* Content */}
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors duration-300">
                          {eventType.title}
                        </h3>
                        <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors duration-300 leading-relaxed">
                          {eventType.description}
                        </p>
                      </div>
                      
                      {/* Arrow */}
                      <div className="pt-2">
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 pt-4">
            <Button 
              onClick={onClose}
              variant="ghost"
              className="w-full h-12 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold text-lg transition-all duration-200"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
