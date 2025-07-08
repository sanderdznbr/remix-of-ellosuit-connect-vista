
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
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[85vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border-0 p-0">
        <div className="p-8 pb-0">
          <DialogHeader className="pb-8">
            <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
              Criar Novo Evento
            </DialogTitle>
            <p className="text-base text-gray-600 text-center mt-3 leading-relaxed">
              Escolha o tipo de evento para {new Date(selectedDate).toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </DialogHeader>
        </div>
        
        <div className="px-8 space-y-4">
          {eventTypes.map((eventType) => {
            const Icon = eventType.icon;
            return (
              <Button
                key={eventType.type}
                onClick={() => onSelectType(eventType.type)}
                className="w-full p-6 h-auto rounded-2xl border border-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:bg-blue-50 hover:border-blue-300 text-left flex items-start space-x-5 bg-white group"
                variant="outline"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300">
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-bold text-gray-900 mb-2 text-xl group-hover:text-blue-700 transition-colors">
                    {eventType.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-700">
                    {eventType.description}
                  </p>
                </div>
                <div className="flex-shrink-0 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="p-8 pt-6">
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full rounded-2xl text-gray-500 hover:bg-gray-100 h-12 text-base font-medium"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
