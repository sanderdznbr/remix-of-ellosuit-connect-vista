
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmailStats from './EmailStats';
import EmailList from './EmailList';
import { BarChart3, List } from 'lucide-react';

const MailTracking = () => {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mail Tracking</h1>
        <p className="text-gray-600">
          Acompanhe estatísticas e resultados dos seus emails enviados
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Emails Enviados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          <EmailStats />
        </TabsContent>

        <TabsContent value="emails">
          <EmailList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MailTracking;
