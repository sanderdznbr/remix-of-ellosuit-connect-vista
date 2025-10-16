import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar, Mail, CheckSquare, Target } from 'lucide-react';

interface PerformanceData {
  meetingsCompleted: number;
  meetingsTarget: number;
  emailsResponded: number;
  emailsTarget: number;
  tasksCompleted: number;
  tasksTarget: number;
  overallProductivity: number;
}

interface WeeklyPerformanceProps {
  data?: PerformanceData;
}

const WeeklyPerformance: React.FC<WeeklyPerformanceProps> = ({ data }) => {
  const defaultData: PerformanceData = data || {
    meetingsCompleted: 12,
    meetingsTarget: 15,
    emailsResponded: 45,
    emailsTarget: 60,
    tasksCompleted: 18,
    tasksTarget: 20,
    overallProductivity: 78
  };

  const metrics = [
    {
      label: 'Reuniões Realizadas',
      icon: <Calendar className="h-4 w-4" />,
      completed: defaultData.meetingsCompleted,
      target: defaultData.meetingsTarget,
      color: 'bg-blue-500'
    },
    {
      label: 'Emails Respondidos',
      icon: <Mail className="h-4 w-4" />,
      completed: defaultData.emailsResponded,
      target: defaultData.emailsTarget,
      color: 'bg-green-500'
    },
    {
      label: 'Tarefas Concluídas',
      icon: <CheckSquare className="h-4 w-4" />,
      completed: defaultData.tasksCompleted,
      target: defaultData.tasksTarget,
      color: 'bg-orange-500'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Performance Semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Produtividade Geral */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Produtividade Geral</span>
            </div>
            <span className="text-2xl font-bold text-primary">{defaultData.overallProductivity}%</span>
          </div>
          <Progress value={defaultData.overallProductivity} className="h-3" />
        </div>

        {/* Métricas Individuais */}
        <div className="space-y-4">
          {metrics.map((metric, index) => {
            const percentage = Math.round((metric.completed / metric.target) * 100);
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">
                      {metric.icon}
                    </div>
                    <span className="text-sm">{metric.label}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {metric.completed}/{metric.target}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Insights */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium">Insights da Semana</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>✓ Você está {defaultData.overallProductivity >= 75 ? 'acima' : 'dentro'} da meta semanal</p>
            <p>✓ {metrics[0].completed} reuniões realizadas com sucesso</p>
            <p>✓ Taxa de resposta de emails: {Math.round((metrics[1].completed / metrics[1].target) * 100)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyPerformance;
