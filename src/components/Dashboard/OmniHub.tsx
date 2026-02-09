import { Link } from "react-router-dom";
import { MessageSquare, Mail, Users, Bot, TrendingUp, Send, ArrowRight, GitBranch } from "lucide-react";
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
    { label: "Contatos", value: clientsCount, icon: Users },
    { label: "Agentes IA", value: agentsCount, icon: Bot },
    { label: "Emails Enviados", value: emailsCount, icon: Send },
    { label: "Conversas Hoje", value: 0, icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div 
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${OMNI_COLOR} 0%, #B33800 100%)` }}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="max-w-7xl mx-auto px-6 py-16 relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <MessageSquare className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Ellosuit Omni</h1>
              <p className="text-white/80 text-lg">Central de Comunicação Multicanal</p>
            </div>
          </div>
          <p className="text-white/90 max-w-2xl text-lg">
            Unifique todos os seus canais de comunicação. WhatsApp, Email e Agentes de IA 
            trabalhando juntos para maximizar seu alcance e conversões.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="text-center">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${OMNI_COLOR}10` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: OMNI_COLOR }} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Módulos</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {omniModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group relative bg-white rounded-2xl border-2 border-gray-100 p-8 hover:border-transparent transition-all duration-300 hover:-translate-y-1"
                style={{ 
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 25px 50px -12px ${OMNI_COLOR}25`;
                  e.currentTarget.style.borderColor = `${OMNI_COLOR}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#F3F4F6';
                }}
              >
                <div className="flex items-start justify-between">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: OMNI_COLOR }}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <ArrowRight 
                    className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all"
                  />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">
                  {module.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {module.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
