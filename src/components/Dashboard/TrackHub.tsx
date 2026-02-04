import { Link } from "react-router-dom";
import { FileText, Link2, PlayCircle, Mail, Radio, Eye, MousePointer, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TRACK_COLOR = "#00E371";

const trackModules = [
  {
    id: "rastreamento-documentos",
    title: "Rastrear Documentos",
    description: "Saiba quem abriu, quanto tempo leu e quais páginas visualizou",
    icon: FileText,
    path: "/dashboard/rastreamento?tab=documents",
  },
  {
    id: "rastreamento-links",
    title: "Rastrear Links",
    description: "Crie links rastreáveis e acompanhe cada clique em tempo real",
    icon: Link2,
    path: "/dashboard/rastreamento?tab=links",
  },
  {
    id: "rastreamento-videos",
    title: "Rastrear Vídeos",
    description: "Monitore visualizações, tempo assistido e engajamento",
    icon: PlayCircle,
    path: "/dashboard/rastreamento?tab=videos",
  },
  {
    id: "rastreamento-emails",
    title: "Rastrear Emails",
    description: "Saiba exatamente quando seus emails foram abertos",
    icon: Mail,
    path: "/dashboard/email-tracker",
  }
];

export default function TrackHub() {
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

  const { data: docsCount = 0 } = useQuery({
    queryKey: ['track-docs-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase
        .from('trackable_documents')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: linksCount = 0 } = useQuery({
    queryKey: ['track-links-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase
        .from('tracked_links')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: emailsTracked = 0 } = useQuery({
    queryKey: ['track-emails-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('email_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'open');
      return count || 0;
    },
  });

  const stats = [
    { label: "Docs Rastreados", value: docsCount, icon: FileText },
    { label: "Links Ativos", value: linksCount, icon: Link2 },
    { label: "Emails Abertos", value: emailsTracked, icon: Mail },
    { label: "Cliques Hoje", value: 0, icon: MousePointer },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div 
        className="text-white"
        style={{ background: `linear-gradient(135deg, ${TRACK_COLOR} 0%, #00B35A 100%)` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Radio className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Ellosuit Track</h1>
              <p className="text-white/80">Rastreamento Inteligente</p>
            </div>
          </div>
          <p className="text-white/90 max-w-2xl">
            Saiba exatamente como seu conteúdo é consumido. Rastreie documentos, 
            links, vídeos e emails com analytics detalhados.
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
                    style={{ backgroundColor: `${TRACK_COLOR}15` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: TRACK_COLOR }} />
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipos de Rastreamento</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {trackModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: 'none' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 20px 40px -15px ${TRACK_COLOR}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div 
                  className="absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: TRACK_COLOR }}
                />
                
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: TRACK_COLOR }}
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
                    style={{ color: TRACK_COLOR }}
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
