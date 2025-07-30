
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, History, Users, FileText } from 'lucide-react';
import EmailComposer from './EmailComposer';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import EmailTemplates from './EmailTemplates';

const EmailDashboard = () => {
  const [activeTab, setActiveTab] = useState('compose');

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Email Marketing</h1>
        <p className="text-gray-600">
          Gerencie seus emails, campanhas e templates em um só lugar
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-50 rounded-lg p-1 mb-6">
            <TabsTrigger 
              value="compose" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Mail className="h-4 w-4" />
              Compor Email
            </TabsTrigger>
            <TabsTrigger 
              value="tracking" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger 
              value="campaigns" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="compose" className="mt-0">
              <EmailComposer />
            </TabsContent>

            <TabsContent value="tracking" className="mt-0">
              <MailTracking />
            </TabsContent>

            <TabsContent value="campaigns" className="mt-0">
              <CampaignMail />
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              <EmailTemplates />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default EmailDashboard;
