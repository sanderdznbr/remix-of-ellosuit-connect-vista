
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CampaignCreator from './CampaignCreator';
import CampaignList from './CampaignList';
import ContactManager from './ContactManager';
import EmailTemplates from './EmailTemplates';
import EmailProviders from './EmailProviders';
import { Plus, List, Users, FileText, Settings } from 'lucide-react';

const CampaignMail = () => {
  const [activeTab, setActiveTab] = useState('campaigns');

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Campaign Mail</h1>
        <p className="text-gray-600">
          Crie e gerencie campanhas de email marketing com envios em massa
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-50 rounded-lg p-1 mb-6">
            <TabsTrigger 
              value="campaigns" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <List className="h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger 
              value="create" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Criar Campanha
            </TabsTrigger>
            <TabsTrigger 
              value="contacts" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              Contatos
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger 
              value="providers" 
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Settings className="h-4 w-4" />
              Provedores
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="campaigns" className="mt-0">
              <CampaignList />
            </TabsContent>

            <TabsContent value="create" className="mt-0">
              <CampaignCreator />
            </TabsContent>

            <TabsContent value="contacts" className="mt-0">
              <ContactManager />
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              <EmailTemplates />
            </TabsContent>

            <TabsContent value="providers" className="mt-0">
              <EmailProviders />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default CampaignMail;
