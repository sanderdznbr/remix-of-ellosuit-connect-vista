import { Link } from "react-router-dom";
import { MessageSquare, Mail, Users, Bot, Send, ArrowRight, GitBranch, Key, Megaphone, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HubKPIChart from "./HubKPIChart";

const OMNI_COLOR = "#FF4500";

const omniModules = [
  { id: "crm-whatsapp", title: "CRM WhatsApp", description: "Conversas, leads e atendimentos via WhatsApp", icon: MessageSquare, path: "/dashboard/crm-whatsapp" },
  { id: "api-whatsapp", title: "API WhatsApp", description: "API para integrar envio de mensagens", icon: Key, path: "/dashboard/api-whatsapp" },
  { id: "disparos", title: "Disparos em Massa", description: "Envie mensagens para vários contatos", icon: Megaphone, path: "/dashboard/disparos" },
  { id: "chatbot-builder", title: "ChatBot Builder", description: "Fluxos de atendimento automatizados", icon: GitBranch, path: "/dashboard/chatbot" },
  { id: "email-marketing", title: "Email Marketing", description: "Campanhas, templates e automações", icon: Mail, path: "/dashboard/email" },
  { id: "agentes-ia", title: "Agentes de IA", description: "Chatbots inteligentes para atendimento", icon: Bot, path: "/dashboard/bot-ia" },
  { id: "automacoes", title: "Automações", description: "Fluxos com webhooks, e-mails e ações", icon: Zap, path: "/dashboard/automacoes" },
];

export default function OmniHub() {
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

  const { data: clientsCount = 0 } = useQuery({
    queryKey: ['omni-clients-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: agentsCount = 0 } = useQuery({
    queryKey: ['omni-agents-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase.from('ai_agents').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: emailsCount = 0 } = useQuery({
    queryKey: ['omni-emails-count'],
    queryFn: async () => {
      const { count } = await supabase.from('emails').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const totalKPI = clientsCount + agentsCount + emailsCount;

  const stats = [
    { label: "Contatos", value: clientsCount, icon: Users },
    { label: "Agentes IA", value: agentsCount, icon: Bot },
    { label: "Emails Enviados", value: emailsCount, icon: Send },
    { label: "Conversas Hoje", value: 0, icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Omni</h1>
          <p className="text-xs text-muted-foreground">Comunicação Multicanal</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="rounded-2xl border border-border/60 bg-card p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${OMNI_COLOR}14` }}>
                  <Icon className="h-4.5 w-4.5" style={{ color: OMNI_COLOR }} />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* KPI Chart */}
        <HubKPIChart color={OMNI_COLOR} seed={1} totalValue={totalKPI} label="Atividade Omni" />

        {/* Quick access modules */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {omniModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.id} to={module.path} className="group rounded-2xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-border transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: OMNI_COLOR }}>
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
