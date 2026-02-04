import { Link } from "react-router-dom";
import { Calendar, CheckSquare, Video, Zap, CalendarCheck, ListTodo, Clock, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FLOW_COLOR = "#007DE3";

const flowModules = [
  {
    id: "agenda",
    title: "Agenda",
    description: "Visualize e gerencie todos os seus compromissos e eventos",
    icon: Calendar,
    path: "/dashboard/agenda",
  },
  {
    id: "agenda-online",
    title: "Agenda Online",
    description: "Links de agendamento para clientes marcarem horários",
    icon: CalendarCheck,
    path: "/dashboard/agenda-aberta",
  },
  {
    id: "tasks",
    title: "Tarefas",
    description: "Organize suas atividades com listas e lembretes",
    icon: CheckSquare,
    path: "/dashboard/tasks",
  },
  {
    id: "reunioes",
    title: "Reuniões",
    description: "Crie e participe de videoconferências com gravação",
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
    description: "Kanban e automações para gerenciar projetos",
    icon: Zap,
    path: "/dashboard/fluxos",
  }
];

export default function FlowsHub() {
  const { user } = useAuth();

  const { data: companyId } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data?.company_id || null;
    },
    enabled: !!user?.id,
  });

  const { data: eventsToday = 0 } = useQuery({
    queryKey: ['flow-events-today', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { count } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('start_date', today.toISOString())
        .lt('start_date', tomorrow.toISOString());
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: activeMeetings = 0 } = useQuery({
    queryKey: ['flow-active-meetings', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase
        .from('meeting_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const stats = [
    { label: "Eventos Hoje", value: eventsToday, icon: Calendar },
    { label: "Tarefas Pendentes", value: 0, icon: ListTodo },
    { label: "Reuniões Ativas", value: activeMeetings, icon: Video },
    { label: "Fluxos Ativos", value: 0, icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div 
        className="text-white"
        style={{ background: `linear-gradient(135deg, ${FLOW_COLOR} 0%, #0056A3 100%)` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Ellosuit Flow</h1>
              <p className="text-white/80">Produtividade e Organização</p>
            </div>
          </div>
          <p className="text-white/90 max-w-2xl">
            Mantenha sua rotina organizada e produtiva. Agenda, tarefas, reuniões 
            e fluxos de trabalho integrados.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="text-center">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${FLOW_COLOR}15` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: FLOW_COLOR }} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Módulos</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flowModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: 'none' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 20px 40px -15px ${FLOW_COLOR}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div 
                  className="absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: FLOW_COLOR }}
                />
                
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: FLOW_COLOR }}
                >
                  <Icon className="h-7 w-7 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {module.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {module.description}
                </p>
                
                <div className="flex items-center justify-end pt-4 mt-4 border-t border-gray-100">
                  <span 
                    className="text-sm font-medium group-hover:translate-x-1 transition-transform"
                    style={{ color: FLOW_COLOR }}
                  >
                    Acessar →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
