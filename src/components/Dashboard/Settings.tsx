
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Plug, User, Bell, Shield } from 'lucide-react';
import IntegrationsSettings from './IntegrationsSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('integrations');

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Configurações</h1>
        <p className="text-gray-600">
          Gerencie suas configurações e integrações
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-50 rounded-lg p-1 mb-6">
            <TabsTrigger 
              value="integrations" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Plug className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Shield className="h-4 w-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="integrations" className="mt-0">
              <IntegrationsSettings />
            </TabsContent>

            <TabsContent value="profile" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Perfil</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Em desenvolvimento...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Notificações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Em desenvolvimento...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Segurança</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Em desenvolvimento...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
