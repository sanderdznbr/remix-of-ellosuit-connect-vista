
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CampaignCreator from './CampaignCreator';
import CampaignList from './CampaignList';
import ContactManager from './ContactManager';
import EmailTemplates from './EmailTemplates';
import { Plus, List, Users, FileText } from 'lucide-react';

const CampaignMail = () => {
  const [activeTab, setActiveTab] = useState('campaigns');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Campaign Mail</h1>
        <p className="text-gray-600">
          Crie e gerencie campanhas de email marketing com envios em massa
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Criar Campanha
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignList />
        </TabsContent>

        <TabsContent value="create">
          <CampaignCreator />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactManager />
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignMail;
