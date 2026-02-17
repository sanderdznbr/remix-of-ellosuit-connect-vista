import { Link } from "react-router-dom";
import { Calendar, CheckSquare, Video, Zap, CalendarCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HubKPIChart from "./HubKPIChart";
import HubModuleCard from "./HubModuleCard";

import previewAgenda from "@/assets/previews/flow-agenda.jpg";
import previewAgendaOnline from "@/assets/previews/flow-agenda-online.jpg";
import previewTasks from "@/assets/previews/flow-tasks.jpg";
import previewReunioes from "@/assets/previews/flow-reunioes.jpg";
import previewFluxos from "@/assets/previews/flow-fluxos.jpg";

const FLOW_COLOR = "#007DE3";

const flowModules = [
  { id: "agenda", title: "Minha Agenda", description: "Compromissos e eventos", icon: Calendar, path: "/dashboard/agenda", preview: previewAgenda },
  { id: "agenda-online", title: "Agenda Online", description: "Links de agendamento para clientes", icon: CalendarCheck, path: "/dashboard/agenda-aberta", preview: previewAgendaOnline },
  { id: "tasks", title: "Tarefas", description: "Listas, prioridades e lembretes", icon: CheckSquare, path: "/dashboard/tasks", preview: previewTasks },
  { id: "reunioes", title: "Videoconferência", description: "Reuniões com vídeo e gravação", icon: Video, path: "/dashboard/reunioes", preview: previewReunioes },
  { id: "fluxos", title: "Fluxos de Trabalho", description: "Kanban e automações de projetos", icon: Zap, path: "/dashboard/fluxos", preview: previewFluxos },
];

export default function FlowsHub() {
  const { user } = useAuth();

  const { data: companyId } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      return data?.company_id || null;
    },
    enabled: !!user?.id,
  });

  const { data: eventsCount = 0 } = useQuery({
    queryKey: ['flow-events-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase.from('calendar_events').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: bookingsCount = 0 } = useQuery({
    queryKey: ['flow-bookings-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase.from('booking_links').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const totalKPI = eventsCount + bookingsCount;

  const stats = [
    { label: "Eventos", value: eventsCount, icon: Calendar },
    { label: "Links Agenda", value: bookingsCount, icon: CalendarCheck },
    { label: "Tarefas", value: 0, icon: CheckSquare },
    { label: "Reuniões", value: 0, icon: Video },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-2 pb-24 md:py-6">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-foreground">Flow</h1>
          <p className="text-xs text-muted-foreground">Produtividade e organização</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="rounded-2xl border border-border/60 bg-card p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${FLOW_COLOR}14` }}>
                  <Icon className="h-4.5 w-4.5" style={{ color: FLOW_COLOR }} />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <HubKPIChart color={FLOW_COLOR} seed={2} totalValue={totalKPI} label="Atividade Flow" />

        <h2 className="text-sm font-semibold text-foreground mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {flowModules.map((module) => (
            <HubModuleCard key={module.id} {...module} color={FLOW_COLOR} />
          ))}
        </div>
      </div>
    </div>
  );
}
