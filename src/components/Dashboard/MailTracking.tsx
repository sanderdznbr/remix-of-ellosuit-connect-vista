
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmailStats from './EmailStats';
import EmailComposer from './EmailComposer';
import EmailList from './EmailList';
import { Send, BarChart3, List } from 'lucide-react';

const MailTracking = () => {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mail Tracking</h1>
        <p className="text-gray-600">
          Sistema completo de rastreamento de emails com estatísticas em tempo real
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Compor Email
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Emails Enviados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          <EmailStats />
          <EmailList />
        </TabsContent>

        <TabsContent value="compose">
          <EmailComposer />
        </TabsContent>

        <TabsContent value="emails">
          <EmailList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MailTracking;
