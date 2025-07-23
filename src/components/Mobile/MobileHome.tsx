
import React from 'react';
import { Calendar, Mail, Users, TrendingUp, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCalendarData } from '@/hooks/useCalendarData';
import { usePullToRefresh } from '@/hooks/use-mobile-gestures';
import { cn } from '@/lib/utils';
import { vibrate } from '@/utils/mobile-helpers';

const MobileHome = () => {
  const { events, loading, refreshEvents } = useCalendarData();
  
  const {
    isPulling,
    isRefreshing,
    pullDistance,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  } = usePullToRefresh({
    onRefresh: async () => {
      vibrate(50);
      await refreshEvents();
    }
  });

  // Calcular estatísticas reais
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(event => 
    event.start_date.startsWith(today)
  );
  const completedEvents = events.filter(event => 
    event.status === 'completed'
  );

  const quickStats = [
    { 
      icon: Calendar, 
      label: 'Eventos Total', 
      value: events.length.toString(), 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      icon: Clock, 
      label: 'Hoje', 
      value: todayEvents.length.toString(), 
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      icon: CheckCircle2, 
      label: 'Concluídos', 
      value: completedEvents.length.toString(), 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      icon: Users, 
      label: 'Clientes', 
      value: '1', 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const upcomingEvents = events
    .filter(event => new Date(event.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 pt-6 space-y-6">
          {/* Stats Loading */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="animate-pulse space-y-2">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Events Loading */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 z-40 flex items-center justify-center py-4 transition-all duration-300",
          isPulling ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          transform: `translateY(${Math.min(pullDistance - 60, 20)}px)`,
          background: 'rgba(255, 255, 255, 0.95)'
        }}
      >
        <div className="flex items-center space-x-2 text-blue-600">
          <TrendingUp className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          <span className="text-sm font-medium">
            {isRefreshing ? 'Atualizando...' : 'Puxe para atualizar'}
          </span>
        </div>
      </div>

      <div className="px-4 pt-6 pb-24 space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Bem-vindo de volta!
              </h2>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          {quickStats.map((stat, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl p-4 shadow-sm animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={cn("inline-flex p-2 rounded-xl mb-3", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Today's Events */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Próximos Eventos</h3>
            <button className="flex items-center space-x-1 text-blue-600">
              <span className="text-sm font-medium">Ver todos</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, index) => (
                <div 
                  key={event.id} 
                  className="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {event.title}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {new Date(event.start_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum evento próximo</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-600">Novo Evento</span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
              <Mail className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-600">Enviar Email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileHome;
