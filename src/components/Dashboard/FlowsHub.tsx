import { Link } from "react-router-dom";
import { Calendar, CheckSquare, Video, Zap, Clock, CalendarCheck, ListTodo, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const flowsModules = [
  {
    id: "agenda",
    title: "Agenda",
    description: "Visualize e gerencie todos os seus compromissos e eventos",
    icon: Calendar,
    path: "/dashboard/agenda",
    color: "from-blue-500 to-cyan-600",
    stats: "Eventos hoje"
  },
  {
    id: "agenda-online",
    title: "Agenda Online",
    description: "Links de agendamento para clientes marcarem horários",
    icon: CalendarCheck,
    path: "/dashboard/agenda-aberta",
    color: "from-teal-500 to-emerald-600",
    stats: "Links ativos"
  },
  {
    id: "tasks",
    title: "Tarefas",
    description: "Organize suas atividades com listas e lembretes",
    icon: CheckSquare,
    path: "/dashboard/tasks",
    color: "from-orange-500 to-amber-600",
    stats: "Pendentes"
  },
  {
    id: "reunioes",
    title: "Reuniões",
    description: "Crie e participe de videoconferências com gravação",
    icon: Video,
    path: "/dashboard/reunioes",
    color: "from-purple-500 to-pink-600",
    stats: "Salas ativas"
  },
  {
    id: "fluxos",
    title: "Fluxos de Trabalho",
    description: "Kanban e automações para gerenciar projetos",
    icon: Zap,
    path: "/dashboard/fluxos",
    color: "from-indigo-500 to-violet-600",
    stats: "Boards"
  }
];

export default function FlowsHub() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-500/20 rounded-2xl">
              <Workflow className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Ellosuit Flow</h1>
              <p className="text-gray-400">Produtividade e Organização</p>
            </div>
          </div>
          <p className="text-gray-300 max-w-2xl">
            Mantenha sua rotina organizada e produtiva. Agenda, tarefas, reuniões 
            e fluxos de trabalho integrados para você alcançar mais resultados.
          </p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flowsModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Gradient accent */}
                <div className={cn(
                  "absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity",
                  module.color
                )} />
                
                <div className={cn(
                  "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4",
                  module.color
                )}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {module.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  {module.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{module.stats}</span>
                  <span className="text-orange-500 text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Acessar →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8">
          <h2 className="text-white font-semibold mb-6">Sua Produtividade</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Eventos Hoje", value: "0", icon: Calendar },
              { label: "Tarefas Pendentes", value: "0", icon: ListTodo },
              { label: "Reuniões Agendadas", value: "0", icon: Video },
              { label: "Fluxos Ativos", value: "0", icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="h-5 w-5 text-orange-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
