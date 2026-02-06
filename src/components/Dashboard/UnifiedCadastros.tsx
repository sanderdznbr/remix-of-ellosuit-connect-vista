import React, { useState } from 'react';
import { Users, Building2, UserPlus, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import ClientsManager from './ClientsManager';
import EmployeeManagement from './EmployeeManagement';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const OMNI_COLOR = "#E34800";

type TabValue = 'clientes' | 'fornecedores' | 'prospectos' | 'colaboradores';

interface TabConfig {
  value: TabValue;
  label: string;
  icon: React.ElementType;
  contactType?: 'cliente' | 'fornecedor' | 'prospecto';
}

const tabs: TabConfig[] = [
  { value: 'clientes', label: 'Clientes', icon: Users, contactType: 'cliente' },
  { value: 'fornecedores', label: 'Fornecedores', icon: Building2, contactType: 'fornecedor' },
  { value: 'prospectos', label: 'Prospectos', icon: UserPlus, contactType: 'prospecto' },
  { value: 'colaboradores', label: 'Colaboradores', icon: Briefcase },
];

const UnifiedCadastros: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('clientes');
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
    queryKey: ['clients-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('client_type', 'cliente');
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: suppliersCount = 0 } = useQuery({
    queryKey: ['suppliers-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('client_type', 'fornecedor');
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: prospectsCount = 0 } = useQuery({
    queryKey: ['prospects-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('client_type', 'prospecto');
      return count || 0;
    },
    enabled: !!companyId,
  });

  const stats = [
    { label: 'Clientes', value: clientsCount, icon: Users },
    { label: 'Fornecedores', value: suppliersCount, icon: Building2 },
    { label: 'Prospectos', value: prospectsCount, icon: UserPlus },
    { label: 'Colaboradores', value: 0, icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div 
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${OMNI_COLOR} 0%, #B33800 100%)` }}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="max-w-7xl mx-auto px-6 py-12 relative">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Users className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Banco de Clientes</h1>
              <p className="text-white/80">Gerencie seus clientes, fornecedores e prospectos</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="text-center">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${OMNI_COLOR}10` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: OMNI_COLOR }} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
            <CardHeader className="pb-0 border-b border-gray-100 bg-gray-50/50">
              <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-0">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.value} 
                      value={tab.value}
                      className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#E34800] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-[#E34800] font-medium"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </CardHeader>

            <CardContent className="p-6 bg-white">
              {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="mt-0 focus-visible:ring-0">
                  {tab.value === 'colaboradores' ? (
                    <EmployeeManagement />
                  ) : (
                    <ClientsManager contactType={tab.contactType!} />
                  )}
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default UnifiedCadastros;
