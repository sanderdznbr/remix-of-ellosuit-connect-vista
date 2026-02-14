import { Link } from "react-router-dom";
import { Users, FolderOpen, Briefcase, BarChart3, FileText, ArrowRight, FileSignature } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SUITE_COLOR = "#3000E3";

const suiteModules = [
  {
    id: "cadastros",
    title: "Cadastros",
    description: "Gerencie clientes, leads, fornecedores e todos os contatos da empresa",
    icon: Users,
    path: "/dashboard/cadastros",
  },
  {
    id: "drive",
    title: "Arquivos",
    description: "Drive de documentos e arquivos da empresa organizados por pastas",
    icon: FolderOpen,
    path: "/dashboard/drive",
  },
  {
    id: "equipe",
    title: "Equipe",
    description: "Gerencie colaboradores, permissões e papéis da equipe",
    icon: Briefcase,
    path: "/dashboard/equipe",
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "Métricas gerais e indicadores de performance da empresa",
    icon: BarChart3,
    path: "/dashboard/analytics",
  },
  {
    id: "propostas",
    title: "Criar Propostas",
    description: "Gere orçamentos e propostas comerciais personalizadas em PDF",
    icon: FileSignature,
    path: "/dashboard/propostas",
  },
  {
    id: "ello-vision",
    title: "Ello Vision",
    description: "Insights avançados com inteligência artificial",
    icon: BarChart3,
    path: "/dashboard/ello-vision",
  },
  {
    id: "relatorios",
    title: "Relatórios",
    description: "Exporte e visualize relatórios detalhados",
    icon: FileText,
    path: "/dashboard/relatorios",
  },
];

export default function SuiteHub() {
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
    queryKey: ['suite-clients-count', companyId],
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

  const { data: docsCount = 0 } = useQuery({
    queryKey: ['suite-docs-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const stats = [
    { label: "Contatos", value: clientsCount, icon: Users },
    { label: "Arquivos", value: docsCount, icon: FolderOpen },
    { label: "Membros", value: 0, icon: Briefcase },
    { label: "Relatórios", value: 0, icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl" style={{ backgroundColor: `${SUITE_COLOR}12` }}>
            <Users className="h-7 w-7" style={{ color: SUITE_COLOR }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ellosuit Suite</h1>
            <p className="text-sm text-gray-500">Central de Gestão e Análises</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${SUITE_COLOR}12` }}
                >
                  <Icon className="h-5 w-5" style={{ color: SUITE_COLOR }} />
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Módulos</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {suiteModules.map((module) => {
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
                      style={{ backgroundColor: SUITE_COLOR }}
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
