import { Link } from "react-router-dom";
import { FileText, Link2, PlayCircle, Mail, Radio, ArrowRight, MousePointer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TRACK_COLOR = "#3A9A1C";

const trackModules = [
  {
    id: "rastreamento-conteudo",
    title: "Rastrear Conteúdo",
    description: "Envie PDFs, vídeos ou imagens e gere links rastreáveis automaticamente",
    icon: FileText,
    path: "/dashboard/rastreamento",
  },
  {
    id: "encurtador-rastreavel",
    title: "Encurtador Rastreável",
    description: "Encurte qualquer URL e acompanhe cada clique em tempo real com analytics",
    icon: Link2,
    path: "/dashboard/encurtador",
  },
  {
    id: "rastreamento-emails",
    title: "Rastrear Emails",
    description: "Saiba exatamente quando e quantas vezes seus emails foram abertos",
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
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl" style={{ backgroundColor: `${TRACK_COLOR}15` }}>
            <Radio className="h-7 w-7" style={{ color: TRACK_COLOR }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ellosuit Track</h1>
            <p className="text-sm text-gray-500">Rastreamento inteligente de conteúdo</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${TRACK_COLOR}12` }}
                >
                  <Icon className="h-5 w-5" style={{ color: TRACK_COLOR }} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modules */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipos de Rastreamento</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {trackModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.id}
                  to={module.path}
                  className="group bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: TRACK_COLOR }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all mt-1" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{module.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{module.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
