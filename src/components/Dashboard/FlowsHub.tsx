import { Link } from "react-router-dom";
import { Calendar, CheckSquare, Video, Zap, CalendarCheck, ArrowRight } from "lucide-react";

const FLOW_COLOR = "#007DE3";

const flowModules = [
  {
    id: "agenda",
    title: "Minha Agenda",
    description: "Visualize e gerencie todos os seus compromissos e eventos",
    icon: Calendar,
    path: "/dashboard/agenda",
  },
  {
    id: "agenda-online",
    title: "Agenda Online",
    description: "Crie links de agendamento para clientes marcarem horários",
    icon: CalendarCheck,
    path: "/dashboard/agenda-aberta",
  },
  {
    id: "tasks",
    title: "Tarefas",
    description: "Organize suas atividades com listas, prioridades e lembretes",
    icon: CheckSquare,
    path: "/dashboard/tasks",
  },
  {
    id: "reunioes",
    title: "Videoconferência",
    description: "Crie e participe de reuniões com vídeo, gravação e transcrição",
    icon: Video,
    path: "/dashboard/reunioes",
  },
  {
    id: "gravacoes",
    title: "Gravações",
    description: "Acesse gravações e transcrições de reuniões anteriores",
    icon: Video,
    path: "/dashboard/reunioes/gravacoes",
  },
  {
    id: "fluxos",
    title: "Fluxos de Trabalho",
    description: "Kanban e automações para gerenciar projetos e processos",
    icon: Zap,
    path: "/dashboard/fluxos",
  }
];

export default function FlowsHub() {
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Clean Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ellosuit Flow</h1>
          <p className="text-sm text-gray-500">Produtividade e organização em um só lugar</p>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flowModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: FLOW_COLOR }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-1">{module.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{module.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
