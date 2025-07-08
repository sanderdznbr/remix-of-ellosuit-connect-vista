
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
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'group-hover:from-blue-600 group-hover:to-blue-700',
      accentColor: 'blue'
    },
    {
      type: 'appointment' as const,
      title: 'Agendar Compromisso',
      description: 'Marcar um compromisso presencial ou visita',
      icon: Calendar,
      gradient: 'from-green-500 to-green-600',
      hoverGradient: 'group-hover:from-green-600 group-hover:to-green-700',
      accentColor: 'green'
    },
    {
      type: 'reminder' as const,
      title: 'Criar Lembrete',
      description: 'Definir um lembrete com notificações por email ou WhatsApp',
      icon: Bell,
      gradient: 'from-orange-500 to-orange-600',
      hoverGradient: 'group-hover:from-orange-600 group-hover:to-orange-700',
      accentColor: 'orange'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl h-auto bg-white rounded-3xl shadow-2xl border-0 p-0 overflow-hidden">
        <div className="p-8">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-900 text-center mb-4">
              Criar Novo Evento
            </DialogTitle>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 text-center leading-relaxed">
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
        
          <div className="space-y-5 mb-8">
            {eventTypes.map((eventType) => {
              const Icon = eventType.icon;
              return (
                <Button
                  key={eventType.type}
                  onClick={() => onSelectType(eventType.type)}
                  className={`w-full p-7 h-auto rounded-2xl border-2 border-gray-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:bg-${eventType.accentColor}-50 hover:border-${eventType.accentColor}-200 text-left flex items-start space-x-6 bg-white group relative overflow-hidden`}
                  variant="outline"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-gray-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className={`flex-shrink-0 w-18 h-18 rounded-2xl bg-gradient-to-br ${eventType.gradient} ${eventType.hoverGradient} flex items-center justify-center shadow-lg transition-all duration-300 relative z-10`}>
                    <Icon className="h-9 w-9 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pt-2 relative z-10">
                    <h3 className={`font-bold text-gray-900 mb-3 text-xl group-hover:text-${eventType.accentColor}-700 transition-colors`}>
                      {eventType.title}
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                      {eventType.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 relative z-10">
                    <div className={`w-10 h-10 rounded-full bg-${eventType.accentColor}-100 flex items-center justify-center`}>
                      <svg className={`w-5 h-5 text-${eventType.accentColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full rounded-2xl text-gray-500 hover:bg-gray-100 h-14 text-lg font-medium transition-all duration-200"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
