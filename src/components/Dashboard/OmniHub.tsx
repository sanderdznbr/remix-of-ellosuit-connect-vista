import { Link } from "react-router-dom";
import { MessageSquare, Mail, Users, Bot, Send, ArrowRight, GitBranch, Key, Megaphone, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const OMNI_COLOR = "#FF4500";

const omniModules = [
  {
    id: "crm-whatsapp",
    title: "CRM WhatsApp",
    description: "Gerencie conversas, leads e atendimentos via WhatsApp",
    icon: MessageSquare,
    path: "/dashboard/crm-whatsapp",
  },
  {
    id: "api-whatsapp",
    title: "API WhatsApp",
    description: "API pública para integrar envio de mensagens com sistemas externos",
    icon: Key,
    path: "/dashboard/api-whatsapp",
  },
  {
    id: "disparos",
    title: "Disparos em Massa",
    description: "Envie mensagens para vários contatos de uma só vez",
    icon: Megaphone,
    path: "/dashboard/disparos",
  },
  {
    id: "chatbot-builder",
    title: "ChatBot Builder",
    description: "Construa fluxos de atendimento automatizados",
    icon: GitBranch,
    path: "/dashboard/chatbot",
  },
  {
    id: "email-marketing",
    title: "Email Marketing",
    description: "Crie campanhas, templates e automações de email",
    icon: Mail,
    path: "/dashboard/email",
  },
  {
    id: "clientes",
    title: "Banco de Clientes",
    description: "Gerencie sua base de clientes, leads e prospectos",
    icon: Users,
    path: "/dashboard/cadastros",
  },
  {
    id: "agentes-ia",
    title: "Agentes de IA",
    description: "Configure chatbots inteligentes para atendimento",
    icon: Bot,
    path: "/dashboard/bot-ia",
  },
  {
    id: "automacoes",
    title: "Automações",
    description: "Crie fluxos automatizados com webhooks, e-mails e ações inteligentes",
    icon: Zap,
    path: "/dashboard/automacoes",
  }
];

export default function OmniHub() {
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

  const { data: clientsCount = 0 } = useQuery({
    queryKey: ['omni-clients-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: agentsCount = 0 } = useQuery({
    queryKey: ['omni-agents-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase
        .from('ai_agents')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: emailsCount = 0 } = useQuery({
    queryKey: ['omni-emails-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const stats = [
    { label: "Contatos", value: clientsCount, icon: Users, color: OMNI_COLOR },
    { label: "Agentes IA", value: agentsCount, icon: Bot, color: '#8B5CF6' },
    { label: "Emails Enviados", value: emailsCount, icon: Send, color: '#3B82F6' },
    { label: "Conversas Hoje", value: 0, icon: MessageSquare, color: '#10B981' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Ellosuit Omni</h1>
          <p className="text-sm text-gray-500">Central de Comunicação Multicanal</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${stat.color}12` }}
                >
                  <Icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modules */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Módulos</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {omniModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${OMNI_COLOR}12` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: OMNI_COLOR }} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-1">{module.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{module.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
