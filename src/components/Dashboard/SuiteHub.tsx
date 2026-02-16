import { Link } from "react-router-dom";
import { Users, FolderOpen, Briefcase, BarChart3, FileText, ArrowRight, FileSignature, Target, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HubKPIChart from "./HubKPIChart";

const SUITE_COLOR = "#3000E3";

const suiteModules = [
  { id: "cadastros", title: "Cadastros", description: "Clientes, leads e contatos", icon: Users, path: "/dashboard/cadastros" },
  { id: "drive", title: "Arquivos", description: "Drive de documentos da empresa", icon: FolderOpen, path: "/dashboard/drive" },
  { id: "equipe", title: "Equipe", description: "Colaboradores e permissões", icon: Briefcase, path: "/dashboard/equipe" },
  { id: "habitos", title: "Hábitos", description: "Metas e rotinas diárias", icon: Target, path: "/dashboard/habitos" },
  { id: "contratos", title: "Contratos", description: "Templates e contratos gerados", icon: FileText, path: "/dashboard/contratos" },
  { id: "propostas", title: "Ordem de Serviço", description: "Orçamentos profissionais em PDF", icon: FileSignature, path: "/dashboard/propostas" },
  { id: "recibos", title: "Recibos", description: "Recibos de pagamento", icon: FileText, path: "/dashboard/recibos" },
  { id: "analytics", title: "Analytics", description: "Métricas e indicadores", icon: BarChart3, path: "/dashboard/analytics" },
  { id: "configuracoes", title: "Configurações", description: "Personalize sua conta", icon: Settings, path: "/dashboard/configuracoes" },
];

export default function SuiteHub() {
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
    queryKey: ['suite-clients-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: docsCount = 0 } = useQuery({
    queryKey: ['suite-docs-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const totalKPI = clientsCount + docsCount;

  const stats = [
    { label: "Contatos", value: clientsCount, icon: Users },
    { label: "Arquivos", value: docsCount, icon: FolderOpen },
    { label: "Membros", value: 0, icon: Briefcase },
    { label: "Relatórios", value: 0, icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Suite</h1>
          <p className="text-xs text-muted-foreground">Central de Gestão e Análises</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="rounded-2xl border border-border/60 bg-card p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${SUITE_COLOR}14` }}>
                  <Icon className="h-4.5 w-4.5" style={{ color: SUITE_COLOR }} />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <HubKPIChart color={SUITE_COLOR} seed={4} totalValue={totalKPI} label="Atividade Suite" />

        <h2 className="text-sm font-semibold text-foreground mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {suiteModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.id} to={module.path} className="group rounded-2xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-border transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: SUITE_COLOR }}>
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
