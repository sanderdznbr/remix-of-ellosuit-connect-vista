
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
      description: 'Agendar uma reunião virtual com Google Meet ou Zoom',
      icon: Video,
      color: 'blue'
    },
    {
      type: 'appointment' as const,
      title: 'Agendar Compromisso',
      description: 'Marcar um compromisso presencial ou visita',
      icon: Calendar,
      color: 'green'
    },
    {
      type: 'reminder' as const,
      title: 'Criar Lembrete',
      description: 'Definir um lembrete com notificações por email ou WhatsApp',
      icon: Bell,
      color: 'orange'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full mx-4 max-h-[85vh] bg-white rounded-2xl shadow-xl border-0 p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900 text-center mb-2">
              Criar Novo Evento
            </DialogTitle>
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-gray-600 text-center">
              Escolha o tipo de evento para{' '}
              <span className="font-semibold text-gray-800">
                {new Date(selectedDate).toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </p>
          </DialogHeader>
        
          <div className="space-y-3 mb-6">
            {eventTypes.map((eventType) => {
              const Icon = eventType.icon;
              return (
                <Button
                  key={eventType.type}
                  onClick={() => onSelectType(eventType.type)}
                  className="w-full p-4 h-auto rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md hover:scale-[1.02] text-left flex items-center space-x-4 bg-white hover:bg-gray-50 group"
                  variant="outline"
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-${eventType.color}-100 flex items-center justify-center group-hover:bg-${eventType.color}-200 transition-colors`}>
                    <Icon className={`h-6 w-6 text-${eventType.color}-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 text-base">
                      {eventType.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {eventType.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Button>
              );
            })}
          </div>
        
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full rounded-xl text-gray-500 hover:bg-gray-100 h-12 text-base font-medium transition-all duration-200"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
