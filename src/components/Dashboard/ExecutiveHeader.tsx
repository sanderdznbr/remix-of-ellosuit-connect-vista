import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExecutiveHeaderProps {
  userName?: string;
  urgentCount?: number;
}

const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({ userName, urgentCount = 0 }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </h1>
        <div className="flex items-center gap-4 mt-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm capitalize">{formatDate()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{formatTime()}</span>
          </div>
        </div>
      </div>
      
      {urgentCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>{urgentCount} {urgentCount === 1 ? 'alerta urgente' : 'alertas urgentes'}</span>
          </Badge>
        </div>
      )}
    </div>
  );
};

export default ExecutiveHeader;
