
import React, { useState } from 'react';
import { Calendar, Users, Mail, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

const MobileHome = () => {
  const { events, loading: eventsLoading, refreshEvents } = useCalendarData();
  const { clients, loading: clientsLoading } = useClients();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshEvents();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(event => 
    event.start_date?.startsWith(today)
  );

  const upcomingEvents = events
    .filter(event => new Date(event.start_date) > new Date())
    .slice(0, 3);

  const StatCard = ({ title, value, icon: Icon, color, loading }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    loading?: boolean;
  }) => (
    <Card className="bg-white border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? (
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              ) : (
                value.toLocaleString()
              )}
            </p>
          </div>
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EventCard = ({ event }: { event: any }) => {
    const formatTime = (dateStr: string) => {
      return new Date(dateStr).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getEventColor = (type: string) => {
      switch (type) {
        case 'meeting':
          return '#3B82F6';
        case 'appointment':
          return '#10B981';
        case 'reminder':
          return '#F59E0B';
        default:
          return '#6B7280';
      }
    };

    return (
      <Card className="bg-white border-0 shadow-sm mb-3">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div 
              className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
              style={{ backgroundColor: getEventColor(event.event_type) }}
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                {event.title}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {formatTime(event.start_date)} - {formatTime(event.end_date)}
              </p>
              {event.description && (
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const isLoading = eventsLoading || clientsLoading;

  return (
    <div className="safe-area-mobile bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="ios-header-mobile">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Início</h1>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ios-haptic-feedback"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <StatCard 
          title="Total Eventos" 
          value={events.length} 
          icon={Calendar}
          color="#3B82F6"
          loading={isLoading}
        />
        <StatCard 
          title="Clientes" 
          value={clients.length} 
          icon={Users}
          color="#10B981"
          loading={isLoading}
        />
        <StatCard 
          title="Hoje" 
          value={todayEvents.length} 
          icon={TrendingUp}
          color="#F59E0B"
          loading={isLoading}
        />
        <StatCard 
          title="E-mails" 
          value={0} 
          icon={Mail}
          color="#8B5CF6"
          loading={isLoading}
        />
      </div>

      {/* Today's Events */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Eventos de Hoje</h2>
          <Button variant="ghost" size="sm" className="ios-haptic-feedback">
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        </div>
        
        {todayEvents.length > 0 ? (
          todayEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        ) : (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm">Nenhum evento para hoje</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upcoming Events */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximos Eventos</h2>
        
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        ) : (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm">Nenhum evento próximo</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MobileHome;
