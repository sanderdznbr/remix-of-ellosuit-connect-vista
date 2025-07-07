
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
      <DialogContent className="sm:max-w-[520px] bg-background rounded-3xl shadow-2xl border-0 p-8">
        <DialogHeader className="pb-8">
          <DialogTitle className="text-2xl font-bold text-foreground text-center">
            Criar Novo Evento
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center mt-3">
            Escolha o tipo de evento para {new Date(selectedDate).toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </DialogHeader>
        
        <div className="space-y-3">
          {eventTypes.map((eventType) => {
            const Icon = eventType.icon;
            return (
              <Button
                key={eventType.type}
                onClick={() => onSelectType(eventType.type)}
                className="w-full p-6 h-auto rounded-2xl border border-border/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:bg-accent/10 text-left flex items-center space-x-5 bg-background/50 backdrop-blur-sm"
                variant="outline"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1 text-lg">
                    {eventType.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {eventType.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="flex justify-center pt-6 border-t border-border/50 mt-8">
          <Button 
            onClick={onClose}
            variant="ghost"
            className="rounded-2xl px-8 text-muted-foreground hover:bg-accent/50"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypeSelector;
