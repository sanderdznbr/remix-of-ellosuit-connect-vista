import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Mail, CheckSquare, Video, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KPIData {
  label: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  action: string;
  route: string;
}

interface ExecutiveSummaryProps {
  meetingsToday: number;
  unreadEmails: number;
  pendingTasks: number;
  nextMeetingTime?: string;
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  meetingsToday,
  unreadEmails,
  pendingTasks,
  nextMeetingTime
}) => {
  const navigate = useNavigate();

  const kpis: KPIData[] = [
    {
      label: 'Reuniões Hoje',
      value: meetingsToday,
      change: 2,
      icon: <Calendar className="h-5 w-5" />,
      color: 'text-blue-500',
      action: 'Ver Agenda',
      route: '/dashboard'
    },
    {
      label: 'Emails Não Lidos',
      value: unreadEmails,
      change: -5,
      icon: <Mail className="h-5 w-5" />,
      color: 'text-green-500',
      action: 'Abrir Email',
      route: '/dashboard'
    },
    {
      label: 'Tarefas Pendentes',
      value: pendingTasks,
      change: -3,
      icon: <CheckSquare className="h-5 w-5" />,
      color: 'text-orange-500',
      action: 'Ver Tarefas',
      route: '/tarefas'
    },
    {
      label: 'Próxima Reunião',
      value: 0,
      icon: <Video className="h-5 w-5" />,
      color: 'text-purple-500',
      action: 'Entrar',
      route: '/dashboard'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg bg-muted ${kpi.color}`}>
                {kpi.icon}
              </div>
              {kpi.change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${kpi.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {kpi.change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{Math.abs(kpi.change)}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-3xl font-bold">
                {index === 3 && nextMeetingTime ? nextMeetingTime : kpi.value}
              </p>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => navigate(kpi.route)}
            >
              {kpi.action}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExecutiveSummary;
