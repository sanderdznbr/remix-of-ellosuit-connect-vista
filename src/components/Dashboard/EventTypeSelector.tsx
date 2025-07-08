
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, Calendar, Bell, ArrowRight } from 'lucide-react';

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
      hoverGradient: 'from-blue-600 to-blue-700',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      type: 'appointment' as const,
      title: 'Compromisso Presencial',
      description: 'Marcar um compromisso presencial ou visita',
      icon: Calendar,
      gradient: 'from-emerald-500 to-emerald-600',
      hoverGradient: 'from-emerald-600 to-emerald-700',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    {
      type: 'reminder' as const,
      title: 'Lembrete',
      description: 'Definir um lembrete com notificações',
      icon: Bell,
      gradient: 'from-amber-500 to-amber-600',
      hoverGradient: 'from-amber-600 to-amber-700',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600'
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
      <DialogContent className="w-full max-w-lg mx-4 p-0 bg-white border-0 shadow-2xl rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 px-8 py-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
          <div className="relative">
            <DialogHeader className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-800 mb-2">
                  Criar Novo Evento
                </DialogTitle>
                <p className="text-sm text-slate-600 font-medium">
                  {formatDate(selectedDate)}
                </p>
              </div>
            </DialogHeader>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="space-y-4">
            {eventTypes.map((eventType, index) => {
              const Icon = eventType.icon;
              return (
                <Button
                  key={eventType.type}
                  onClick={() => onSelectType(eventType.type)}
                  className={`
                    w-full p-6 h-auto rounded-2xl border-0 
                    bg-gradient-to-r ${eventType.gradient}
                    hover:bg-gradient-to-r hover:${eventType.hoverGradient}
                    text-white shadow-lg hover:shadow-xl
                    transform transition-all duration-300 
                    hover:scale-[1.02] hover:-translate-y-1
                    group relative overflow-hidden
                  `}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fade-in 0.5s ease-out forwards'
                  }}
                >
                  {/* Background decoration */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative flex items-center space-x-5 w-full">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-lg text-white mb-1 group-hover:text-white/95 transition-colors">
                        {eventType.title}
                      </h3>
                      <p className="text-sm text-white/80 leading-relaxed group-hover:text-white/90 transition-colors">
                        {eventType.description}
                      </p>
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex-shrink-0">
                      <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full h-12 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-all duration-200 hover:text-slate-800"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
