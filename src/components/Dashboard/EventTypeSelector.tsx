
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
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-xl font-semibold text-gray-900 text-center">
            Selecionar Tipo de Evento
          </DialogTitle>
          <p className="text-sm text-gray-500 text-center mt-2">
            Escolha o tipo de evento para {new Date(selectedDate).toLocaleDateString('pt-BR')}
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {eventTypes.map((eventType) => {
            const Icon = eventType.icon;
            return (
              <Button
                key={eventType.type}
                onClick={() => onSelectType(eventType.type)}
                className={`w-full p-6 h-auto rounded-xl border-2 transition-all duration-200 hover:shadow-md ${eventType.color} text-left flex items-start space-x-4`}
                variant="outline"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                  <Icon className="h-6 w-6 text-[#3600FF]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {eventType.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {eventType.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <Button 
            onClick={onClose}
            variant="outline"
            className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
