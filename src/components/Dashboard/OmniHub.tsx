import { Link } from "react-router-dom";
import { MessageSquare, Mail, Users, Bot, Send, ArrowRight, GitBranch, Key, Megaphone, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HubKPIChart from "./HubKPIChart";
import HubModuleCard from "./HubModuleCard";

import previewCrmWhatsapp from "@/assets/previews/omni-crm-whatsapp.jpg";
import previewApiWhatsapp from "@/assets/previews/omni-api-whatsapp.jpg";
import previewDisparos from "@/assets/previews/omni-disparos.jpg";
import previewChatbot from "@/assets/previews/omni-chatbot.jpg";
import previewEmail from "@/assets/previews/omni-email.jpg";
import previewAgentesIa from "@/assets/previews/omni-agentes-ia.jpg";
import previewAutomacoes from "@/assets/previews/omni-automacoes.jpg";

const OMNI_COLOR = "#FF4500";

const omniModules = [
  { id: "crm-whatsapp", title: "CRM WhatsApp", description: "Conversas, leads e atendimentos via WhatsApp", icon: MessageSquare, path: "/dashboard/crm-whatsapp", preview: previewCrmWhatsapp },
  { id: "api-whatsapp", title: "API WhatsApp", description: "API restrita para integrar sistemas externos ao CRM", icon: Key, path: "/dashboard/api-whatsapp", preview: previewApiWhatsapp },
  { id: "disparos", title: "Disparos em Massa", description: "Envie mensagens para vários contatos", icon: Megaphone, path: "/dashboard/disparos", preview: previewDisparos },
  { id: "chatbot-builder", title: "ChatBot Builder", description: "Fluxos de atendimento automatizados", icon: GitBranch, path: "/dashboard/chatbot", preview: previewChatbot },
  { id: "email-marketing", title: "Email Marketing", description: "Campanhas, templates e automações", icon: Mail, path: "/dashboard/email", preview: previewEmail },
  { id: "agentes-ia", title: "Agentes de IA", description: "Chatbots inteligentes para atendimento", icon: Bot, path: "/dashboard/bot-ia", preview: previewAgentesIa },
  { id: "automacoes", title: "Automações", description: "Fluxos com webhooks, e-mails e ações", icon: Zap, path: "/dashboard/automacoes", preview: previewAutomacoes },
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
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-2 pb-24 md:py-6">
        {/* Header */}
        <div className="mb-3">
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
          {omniModules.map((module) => (
            <HubModuleCard key={module.id} {...module} color={OMNI_COLOR} />
          ))}
        </div>
      </div>
    </div>
  );
}
