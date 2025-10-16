import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Mail, CheckSquare, Video, ArrowRight, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PreviewItem {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
}

interface ModulePreviewGridProps {
  agendaItems?: PreviewItem[];
  emailItems?: PreviewItem[];
  taskItems?: PreviewItem[];
  meetingItems?: PreviewItem[];
}

const ModulePreviewGrid: React.FC<ModulePreviewGridProps> = ({
  agendaItems = [],
  emailItems = [],
  taskItems = [],
  meetingItems = []
}) => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Agenda',
      icon: <Calendar className="h-5 w-5" />,
      items: agendaItems,
      route: '/dashboard',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Emails',
      icon: <Mail className="h-5 w-5" />,
      items: emailItems,
      route: '/dashboard',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Tarefas',
      icon: <CheckSquare className="h-5 w-5" />,
      items: taskItems,
      route: '/tarefas',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Reuniões',
      icon: <Video className="h-5 w-5" />,
      items: meetingItems,
      route: '/dashboard',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {modules.map((module, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${module.bgColor} ${module.color}`}>
                  {module.icon}
                </div>
                <span>{module.title}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(module.route)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {module.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhum item para exibir</p>
              </div>
            ) : (
              <div className="space-y-3">
                {module.items.slice(0, 3).map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(module.route)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      )}
                    </div>
                    {item.time && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {item.time}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => navigate(module.route)}
            >
              Ver Todos
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ModulePreviewGrid;
