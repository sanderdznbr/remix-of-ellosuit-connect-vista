import { Link } from "react-router-dom";
import { FileText, Link2, Mail, ArrowRight, MousePointer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HubKPIChart from "./HubKPIChart";

const TRACK_COLOR = "#3A9A1C";

const trackModules = [
  { id: "rastreamento", title: "Rastrear Conteúdo", description: "PDFs, vídeos e imagens com links rastreáveis", icon: FileText, path: "/dashboard/rastreamento" },
  { id: "encurtador", title: "Encurtador Rastreável", description: "Encurte URLs e acompanhe cliques", icon: Link2, path: "/dashboard/encurtador" },
  { id: "email-tracker", title: "Rastrear Emails", description: "Saiba quando seus emails foram abertos", icon: Mail, path: "/dashboard/email-tracker" },
];

export default function TrackHub() {
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

  const { data: docsCount = 0 } = useQuery({
    queryKey: ['track-docs-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase.from('trackable_documents').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: linksCount = 0 } = useQuery({
    queryKey: ['track-links-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase.from('tracked_links').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: emailsTracked = 0 } = useQuery({
    queryKey: ['track-emails-count'],
    queryFn: async () => {
      const { count } = await supabase.from('email_events').select('*', { count: 'exact', head: true }).eq('event_type', 'open');
      return count || 0;
    },
  });

  const totalKPI = docsCount + linksCount + emailsTracked;

  const stats = [
    { label: "Docs Rastreados", value: docsCount, icon: FileText },
    { label: "Links Ativos", value: linksCount, icon: Link2 },
    { label: "Emails Abertos", value: emailsTracked, icon: Mail },
    { label: "Cliques Hoje", value: 0, icon: MousePointer },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Track</h1>
          <p className="text-xs text-muted-foreground">Rastreamento inteligente de conteúdo</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="rounded-2xl border border-border/60 bg-card p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${TRACK_COLOR}14` }}>
                  <Icon className="h-4.5 w-4.5" style={{ color: TRACK_COLOR }} />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <HubKPIChart color={TRACK_COLOR} seed={3} totalValue={totalKPI} label="Atividade Track" />

        <h2 className="text-sm font-semibold text-foreground mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {trackModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.id} to={module.path} className="group rounded-2xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-border transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: TRACK_COLOR }}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-0.5">{module.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{module.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
