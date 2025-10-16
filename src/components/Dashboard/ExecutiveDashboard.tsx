import React, { useMemo } from 'react';
import ExecutiveHeader from './ExecutiveHeader';
import ExecutiveSummary from './ExecutiveSummary';
import IntelligentAssistant from './IntelligentAssistant';
import ModulePreviewGrid from './ModulePreviewGrid';
import WeeklyPerformance from './WeeklyPerformance';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useTarefas } from '@/hooks/useTarefas';
import { useMeetingRooms } from '@/hooks/useMeetingRooms';
import { Calendar, Mail, CheckSquare, Video } from 'lucide-react';

interface ExecutiveDashboardProps {
  onNavigate: (item: string) => void;
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { events, isLoading: eventsLoading } = useCalendarData();
  const { tarefas, loading: tarefasLoading } = useTarefas();
  const { rooms, loading: roomsLoading } = useMeetingRooms();

  // Calcular dados em tempo real
  const dashboardData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Eventos de hoje
    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= today && eventDate < tomorrow;
    });

    // Próximos eventos (3 dias)
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const upcomingEvents = events
      .filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate >= today && eventDate < threeDaysLater;
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 3);

    // Próxima reunião
    const nextMeeting = upcomingEvents[0];
    const nextMeetingTime = nextMeeting 
      ? new Date(nextMeeting.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : undefined;

    // Tarefas pendentes
    const pendingTasks = tarefas.filter(task => 
      task.status === 'pending' || task.status === undefined
    );

    // Tarefas próximas
    const upcomingTasks = [...pendingTasks]
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 3);

    // Reuniões ativas
    const activeMeetings = rooms.filter(room => room.is_active).slice(0, 3);

    // Urgências
    const urgentCount = pendingTasks.filter(task => {
      const taskDate = new Date(task.start_date);
      return taskDate < tomorrow;
    }).length;

    return {
      meetingsToday: todayEvents.length,
      unreadEmails: 12, // Mock data - integrar com Gmail API futuramente
      pendingTasks: pendingTasks.length,
      nextMeetingTime,
      urgentCount,
      agendaItems: upcomingEvents.map(event => ({
        id: event.id,
        title: event.title,
        subtitle: event.description || 'Sem descrição',
        time: new Date(event.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      })),
      emailItems: [
        { id: '1', title: 'Proposta Comercial - Cliente XYZ', subtitle: 'João Silva', time: '10:30' },
        { id: '2', title: 'Reunião de Alinhamento', subtitle: 'Maria Santos', time: '09:15' },
        { id: '3', title: 'Relatório Mensal', subtitle: 'Pedro Costa', time: 'Ontem' }
      ],
      taskItems: upcomingTasks.map(task => ({
        id: task.id,
        title: task.title,
        subtitle: task.description || 'Sem descrição',
        time: new Date(task.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      })),
      meetingItems: activeMeetings.map(room => ({
        id: room.id,
        title: room.title,
        subtitle: room.description || 'Reunião ativa',
        time: 'Agora'
      }))
    };
  }, [events, tarefas, rooms]);

  const userName = user?.user_metadata?.username || user?.email?.split('@')[0];

  // Sugestões inteligentes baseadas em dados reais
  const intelligentSuggestions = useMemo(() => {
    const suggestions = [];
    
    if (dashboardData.nextMeetingTime) {
      suggestions.push({
        text: `Próxima reunião às ${dashboardData.nextMeetingTime}`,
        icon: <Video className="h-4 w-4" />,
        action: () => onNavigate('calendar')
      });
    }

    if (dashboardData.unreadEmails > 5) {
      suggestions.push({
        text: `${dashboardData.unreadEmails} emails não lidos`,
        icon: <Mail className="h-4 w-4" />,
        action: () => onNavigate('email')
      });
    }

    if (dashboardData.urgentCount > 0) {
      suggestions.push({
        text: `${dashboardData.urgentCount} tarefas com deadline hoje`,
        icon: <CheckSquare className="h-4 w-4" />,
        action: () => onNavigate('tarefas')
      });
    }

    return suggestions;
  }, [dashboardData, onNavigate]);

  if (eventsLoading || tarefasLoading || roomsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <ExecutiveHeader 
        userName={userName}
        urgentCount={dashboardData.urgentCount}
      />
      
      <ExecutiveSummary
        meetingsToday={dashboardData.meetingsToday}
        unreadEmails={dashboardData.unreadEmails}
        pendingTasks={dashboardData.pendingTasks}
        nextMeetingTime={dashboardData.nextMeetingTime}
      />
      
      <IntelligentAssistant 
        onNavigate={onNavigate}
        suggestions={intelligentSuggestions}
      />
      
      <ModulePreviewGrid
        agendaItems={dashboardData.agendaItems}
        emailItems={dashboardData.emailItems}
        taskItems={dashboardData.taskItems}
        meetingItems={dashboardData.meetingItems}
      />
      
      <WeeklyPerformance />
    </div>
  );
};

export default ExecutiveDashboard;
