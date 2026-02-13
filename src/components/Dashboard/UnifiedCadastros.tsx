import React, { useState } from 'react';
import { Users, Building2, UserPlus, Briefcase, FolderOpen, Code2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClientsManager from './ClientsManager';
import EmployeeManagement from './EmployeeManagement';
import ContactGroupsManager from './ContactGroupsManager';
import FormIntegration from './FormIntegration';

type TabValue = 'clientes' | 'fornecedores' | 'prospectos' | 'colaboradores' | 'grupos' | 'formularios';

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
  { value: 'grupos', label: 'Grupos', icon: FolderOpen },
  { value: 'formularios', label: 'Captação', icon: Code2 },
];

const UnifiedCadastros: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('clientes');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cadastros</h1>
        <p className="text-muted-foreground">Gerencie todos os seus cadastros em um só lugar</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:inline-flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {tab.value === 'colaboradores' ? (
              <EmployeeManagement />
            ) : tab.value === 'grupos' ? (
              <ContactGroupsManager />
            ) : tab.value === 'formularios' ? (
              <FormIntegration />
            ) : (
              <ClientsManager contactType={tab.contactType!} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default UnifiedCadastros;
