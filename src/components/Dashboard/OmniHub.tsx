import { Link } from "react-router-dom";
import { MessageSquare, Mail, Send, Users, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const omniModules = [
  {
    id: "crm-whatsapp",
    title: "CRM WhatsApp",
    description: "Gerencie conversas, leads e atendimentos via WhatsApp",
    icon: MessageSquare,
    path: "/dashboard/crm-whatsapp",
    color: "from-green-500 to-emerald-600",
    stats: "Conversas ativas"
  },
  {
    id: "email-marketing",
    title: "Email Marketing",
    description: "Crie campanhas, templates e automações de email",
    icon: Mail,
    path: "/dashboard/email",
    color: "from-blue-500 to-indigo-600",
    stats: "Campanhas"
  },
  {
    id: "agentes-ia",
    title: "Agentes de IA",
    description: "Configure chatbots inteligentes para atendimento automatizado",
    icon: Bot,
    path: "/dashboard/bot-ia",
    color: "from-purple-500 to-violet-600",
    stats: "Agentes ativos"
  }
];

export default function OmniHub() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-2xl">
              <Sparkles className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Ellosuit Omni</h1>
              <p className="text-gray-400">Central de Comunicação Multicanal</p>
            </div>
          </div>
          <p className="text-gray-300 max-w-2xl">
            Unifique todos os seus canais de comunicação em um só lugar. 
            WhatsApp, Email e Agentes de IA trabalhando juntos para maximizar seu alcance.
          </p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {omniModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Gradient accent */}
                <div className={cn(
                  "absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity",
                  module.color
                )} />
                
                <div className={cn(
                  "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4",
                  module.color
                )}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {module.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  {module.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{module.stats}</span>
                  <span className="text-blue-500 text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Acessar →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8">
          <h2 className="text-white font-semibold mb-6">Visão Geral</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Mensagens Hoje", value: "0", icon: MessageSquare },
              { label: "Emails Enviados", value: "0", icon: Send },
              { label: "Contatos", value: "0", icon: Users },
              { label: "Agentes IA", value: "0", icon: Bot },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
