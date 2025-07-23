
import React from 'react';
import { Calendar, Mail, Users, BarChart3 } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useClients } from '@/hooks/useClients';
import MobileStatsCard from './MobileStatsCard';
import MobileEmailCard from './MobileEmailCard';
import MobileCalendarCard from './MobileCalendarCard';
import MobileHeader from './MobileHeader';

interface MobileHomeProps {
  onNavigate: (item: string) => void;
}

const MobileHome: React.FC<MobileHomeProps> = ({ onNavigate }) => {
  const { events, isLoading: eventsLoading } = useCalendarData();
  const { clients, isLoading: clientsLoading } = useClients();

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
    <div className="min-h-screen bg-gray-50">
      <MobileHeader />
      
      <div className="p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <MobileStatsCard
            title="Eventos Hoje"
            value={eventsLoading ? "..." : todayEvents.length}
            icon={<Calendar className="h-5 w-5" />}
            color="blue"
            onClick={() => onNavigate('calendar')}
          />
          
          <MobileStatsCard
            title="Emails"
            value="12"
            icon={<Mail className="h-5 w-5" />}
            color="green"
            onClick={() => onNavigate('email')}
          />
          
          <MobileStatsCard
            title="Clientes"
            value={clientsLoading ? "..." : clients.length}
            icon={<Users className="h-5 w-5" />}
            color="purple"
            onClick={() => onNavigate('clients')}
          />
          
          <MobileStatsCard
            title="Analytics"
            value="View"
            icon={<BarChart3 className="h-5 w-5" />}
            color="orange"
            onClick={() => onNavigate('analytics')}
          />
        </div>

        {/* Calendar Preview */}
        <MobileCalendarCard
          todayEvents={todayEvents}
          upcomingEvents={upcomingEvents}
          onNavigate={onNavigate}
        />

        {/* Email Preview */}
        <MobileEmailCard onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default MobileHome;
