import React, { useState } from 'react';
import { FileText, Link2, Video } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DocumentTrackingDashboard from '@/components/DocumentTracking/DocumentTrackingDashboard';
import LinkTrackingDashboard from './LinkTrackingDashboard';
import VideoTrackingDashboard from './VideoTrackingDashboard';

type TabValue = 'documentos' | 'links' | 'videos';

interface TabConfig {
  value: TabValue;
  label: string;
  icon: React.ElementType;
}

const tabs: TabConfig[] = [
  { value: 'documentos', label: 'Documentos PDF', icon: FileText },
  { value: 'links', label: 'Links', icon: Link2 },
  { value: 'videos', label: 'Vídeos', icon: Video },
];

const UnifiedTracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('documentos');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rastreamento</h1>
        <p className="text-muted-foreground">Acompanhe o engajamento com seus conteúdos</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
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

        <TabsContent value="documentos" className="mt-6">
          <DocumentTrackingDashboard />
        </TabsContent>
        
        <TabsContent value="links" className="mt-6">
          <LinkTrackingDashboard />
        </TabsContent>
        
        <TabsContent value="videos" className="mt-6">
          <VideoTrackingDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedTracking;
