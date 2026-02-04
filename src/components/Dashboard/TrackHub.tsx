import { Link } from "react-router-dom";
import { FileText, Link2, PlayCircle, Mail, Radio, Eye, BarChart3, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";

const trackModules = [
  {
    id: "rastreamento-geral",
    title: "Rastreamento Geral",
    description: "Visão unificada de todos os documentos, links e vídeos rastreados",
    icon: Radio,
    path: "/dashboard/rastreamento",
    color: "from-cyan-500 to-blue-600",
    stats: "Itens rastreados"
  },
  {
    id: "email-tracker",
    title: "Rastrear Emails",
    description: "Monitore aberturas, cliques e engajamento dos seus emails",
    icon: Mail,
    path: "/dashboard/email-tracker",
    color: "from-green-500 to-emerald-600",
    stats: "Emails rastreados"
  }
];

const trackFeatures = [
  {
    icon: FileText,
    title: "Documentos PDF",
    description: "Saiba quem abriu, quanto tempo leu e quais páginas visualizou"
  },
  {
    icon: Link2,
    title: "Links Inteligentes",
    description: "Crie links rastreáveis e acompanhe cada clique em tempo real"
  },
  {
    icon: PlayCircle,
    title: "Vídeos",
    description: "Rastreie visualizações, tempo assistido e engajamento"
  },
  {
    icon: Mail,
    title: "Emails",
    description: "Saiba exatamente quando seus emails foram abertos"
  }
];

export default function TrackHub() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-2xl">
              <Radio className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Ellosuit Track</h1>
              <p className="text-gray-400">Rastreamento Inteligente</p>
            </div>
          </div>
          <p className="text-gray-300 max-w-2xl">
            Saiba exatamente como seu conteúdo é consumido. Rastreie documentos, 
            links, vídeos e emails com analytics detalhados e em tempo real.
          </p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {trackModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1"
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
                  <span className="text-cyan-500 text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Acessar →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">O que você pode rastrear</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trackFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                  <Icon className="h-6 w-6 text-cyan-500 mb-3" />
                  <h3 className="font-medium text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-xs text-gray-500">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8">
          <h2 className="text-white font-semibold mb-6">Analytics em Tempo Real</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Visualizações Hoje", value: "0", icon: Eye },
              { label: "Cliques em Links", value: "0", icon: MousePointer },
              { label: "Docs Abertos", value: "0", icon: FileText },
              { label: "Emails Abertos", value: "0", icon: Mail },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
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
