import { Link } from "react-router-dom";
import { MessageSquare, Mail, Users, Bot, TrendingUp, Send, UserPlus, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const OMNI_COLOR = "#E34800";

const omniModules = [
  {
    id: "crm-whatsapp",
    title: "CRM WhatsApp",
    description: "Gerencie conversas, leads e atendimentos via WhatsApp",
    icon: MessageSquare,
    path: "/dashboard/crm-whatsapp",
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
    { label: "Agentes IA Ativos", value: agentsCount, icon: Bot },
    { label: "Emails Enviados", value: emailsCount, icon: Send },
    { label: "Conversas Hoje", value: 0, icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div 
        className="text-white"
        style={{ background: `linear-gradient(135deg, ${OMNI_COLOR} 0%, #B33800 100%)` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Ellosuit Omni</h1>
              <p className="text-white/80">Central de Comunicação Multicanal</p>
            </div>
          </div>
          <p className="text-white/90 max-w-2xl">
            Unifique todos os seus canais de comunicação em um só lugar. 
            WhatsApp, Email e Agentes de IA trabalhando juntos.
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
                    style={{ backgroundColor: `${OMNI_COLOR}15` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: OMNI_COLOR }} />
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
        <div className="grid md:grid-cols-2 gap-4">
          {omniModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ 
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 20px 40px -15px ${OMNI_COLOR}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Gradient accent */}
                <div 
                  className="absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: OMNI_COLOR }}
                />
                
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: OMNI_COLOR }}
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
                    style={{ color: OMNI_COLOR }}
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
