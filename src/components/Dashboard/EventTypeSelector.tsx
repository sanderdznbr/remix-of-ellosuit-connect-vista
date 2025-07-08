
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, Calendar, Bell } from 'lucide-react';

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
      description: 'Agendar uma reunião virtual com Google Meet, Zoom ou Teams',
      icon: Video,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      type: 'appointment' as const,
      title: 'Agendar Compromisso',
      description: 'Marcar um compromisso presencial ou visita',
      icon: Calendar,
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      type: 'reminder' as const,
      title: 'Criar Lembrete',
      description: 'Definir um lembrete com notificações por email ou WhatsApp',
      icon: Bell,
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-w-[90vw] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0 p-0">
        <div className="p-6 pb-0">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-bold text-gray-900 text-center">
              Criar Novo Evento
            </DialogTitle>
            <p className="text-sm text-gray-500 text-center mt-2">
              Escolha o tipo de evento para {new Date(selectedDate).toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </DialogHeader>
        </div>
        
        <div className="px-6 space-y-3">
          {eventTypes.map((eventType) => {
            const Icon = eventType.icon;
            return (
              <Button
                key={eventType.type}
                onClick={() => onSelectType(eventType.type)}
                className="w-full p-4 h-auto rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:bg-gray-50 text-left flex items-center space-x-4 bg-white"
                variant="outline"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base truncate">
                    {eventType.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-5 line-clamp-2">
                    {eventType.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="p-6 pt-4">
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full rounded-xl text-gray-500 hover:bg-gray-100"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
