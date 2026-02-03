import React from 'react';
import { Calendar, Mail, Users, BarChart3 } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useClients } from '@/hooks/useClients';
import MobileStatsCard from './MobileStatsCard';
import MobileCalendarPreview from './MobileCalendarPreview';
import MobileEmailPreview from './MobileEmailPreview';
import MobileHeader from './MobileHeader';

interface MobileHomeProps {
  onNavigate: (item: string) => void;
}

const MobileHome: React.FC<MobileHomeProps> = ({ onNavigate }) => {
  const { events, isLoading: eventsLoading } = useCalendarData();
  const { clients, loading: clientsLoading } = useClients();

  const today = new Date();
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start_date);
    return eventDate.toDateString() === today.toDateString();
  });

  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.start_date);
    return eventDate > today;
  }).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-indigo-50/30">
      <MobileHeader 
        title="Dashboard"
        showSearch={true}
        showNotifications={true}
      />
      
      <div className="p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <MobileStatsCard
            title="Eventos Hoje"
            value={eventsLoading ? "..." : todayEvents.length.toString()}
            icon={<Calendar className="h-5 w-5" />}
            color="blue"
            onClick={() => onNavigate('calendar')}
          />
          
          <MobileStatsCard
            title="Emails"
            value="—"
            subtitle="Em breve"
            icon={<Mail className="h-5 w-5" />}
            color="blue"
            onClick={() => onNavigate('email')}
          />
          
          <MobileStatsCard
            title="Clientes"
            value={clientsLoading ? "..." : clients.length.toString()}
            icon={<Users className="h-5 w-5" />}
            color="blue"
            onClick={() => onNavigate('clients')}
          />
          
          <MobileStatsCard
            title="Analytics"
            value="Ver"
            icon={<BarChart3 className="h-5 w-5" />}
            color="blue"
            onClick={() => onNavigate('analytics')}
          />
        </div>

        {/* Calendar Preview */}
        <MobileCalendarPreview
          todayEvents={todayEvents}
          upcomingEvents={upcomingEvents}
          onNavigate={onNavigate}
        />

        {/* Email Preview */}
        <MobileEmailPreview onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default MobileHome;
