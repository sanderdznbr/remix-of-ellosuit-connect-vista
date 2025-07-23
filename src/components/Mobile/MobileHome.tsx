
import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Plus, Bell, Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useClients } from '@/hooks/useClients';
import MobileStatsCard from './MobileStatsCard';
import MobileCalendarCard from './MobileCalendarCard';
import CalendarSkeleton from '../Dashboard/CalendarSkeleton';

const MobileHome = () => {
  const { events, isLoading } = useCalendarData();
  const { clients } = useClients();
  const [currentDate] = useState(new Date());

  // Get today's events
  const todayEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.start_date).toISOString().split('T')[0];
      return eventDate === today;
    });
  }, [events]);

  // Get upcoming events (next 5)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(event => new Date(event.start_date) > now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 5);
  }, [events]);

  // Get this week's events
  const thisWeekEvents = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  }, [events, currentDate]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const completedToday = events.filter(event => 
      event.start_date.startsWith(today) && event.status === 'completed'
    ).length;

    return {
      todayEvents: todayEvents.length,
      upcomingEvents: upcomingEvents.length,
      thisWeekEvents: thisWeekEvents.length,
      totalClients: clients.length,
      completedToday
    };
  }, [todayEvents, upcomingEvents, thisWeekEvents, clients, events]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia! ☀️';
    if (hour < 18) return 'Boa tarde! 🌤️';
    return 'Boa noite! 🌙';
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Greeting Header */}
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {getGreeting()}
        </h1>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <MobileStatsCard
          title="Hoje"
          value={stats.todayEvents}
          icon={Calendar}
          color="bg-blue-500"
          subtitle="eventos"
        />
        <MobileStatsCard
          title="Próximos"
          value={stats.upcomingEvents}
          icon={Clock}
          color="bg-green-500"
          subtitle="eventos"
        />
        <MobileStatsCard
          title="Esta Semana"
          value={stats.thisWeekEvents}
          icon={TrendingUp}
          color="bg-purple-500"
          subtitle="eventos"
        />
        <MobileStatsCard
          title="Clientes"
          value={stats.totalClients}
          icon={Users}
          color="bg-orange-500"
          subtitle="total"
        />
      </div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <Card className="border-0 shadow-lg rounded-3xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span>Hoje</span>
              <Badge variant="secondary" className="ml-auto">
                {todayEvents.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayEvents.map(event => (
              <MobileCalendarCard
                key={event.id}
                event={{
                  ...event,
                  start: event.start_date,
                  end: event.end_date,
                  type: event.event_type as any,
                  attendees: Array.isArray(event.attendees) ? 
                    event.attendees.map(a => typeof a === 'string' ? a : String(a)) : 
                    []
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card className="border-0 shadow-lg rounded-3xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Clock className="h-5 w-5 text-green-500" />
              <span>Próximos Eventos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map(event => (
              <MobileCalendarCard
                key={event.id}
                event={{
                  ...event,
                  start: event.start_date,
                  end: event.end_date,
                  type: event.event_type as any,
                  attendees: Array.isArray(event.attendees) ? 
                    event.attendees.map(a => typeof a === 'string' ? a : String(a)) : 
                    []
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg rounded-3xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Plus className="h-5 w-5 text-[#3600FF]" />
            <span>Ações Rápidas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-14 flex-col space-y-2 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#3600FF] hover:bg-[#3600FF]/5"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Novo Evento</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-14 flex-col space-y-2 rounded-2xl border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">Novo Cliente</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No Events Message */}
      {todayEvents.length === 0 && upcomingEvents.length === 0 && (
        <Card className="border-0 shadow-lg rounded-3xl bg-white/80 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Tudo em dia! 🎉
            </h3>
            <p className="text-gray-600 mb-4">
              Você não tem eventos programados para hoje.
            </p>
            <Button className="bg-gradient-to-r from-[#3600FF] to-[#4F46E5] rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Criar Evento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobileHome;
