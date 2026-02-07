import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Send, 
  FileText, 
  BarChart3,
  Users,
  Eye,
  MousePointer,
  Palette
} from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';
import EmailComposerWizard from './EmailComposerWizard';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import EmailTemplates from './EmailTemplates';
import EmailConnectionPopover from './EmailConnectionPopover';
import EmailLimitIndicator from './EmailLimitIndicator';
import { supabase } from '@/integrations/supabase/client';

const CleanEmailMarketing: React.FC = () => {
  const { isConnected, loading, emailAccount, connectGmail, disconnectGmail } = useGmail();
  const [activeTab, setActiveTab] = useState('compor');
  const [stats, setStats] = useState({
    sent: 0,
    opened: 0,
    clicked: 0,
    openRate: 0,
    clickRate: 0
  });

  // Fetch email stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: emails, error } = await supabase
          .from('emails')
          .select('id, status');

        if (!error && emails) {
          const { data: events } = await supabase
            .from('email_events')
            .select('event_type, email_id');

          const sent = emails.length;
          const opened = events?.filter(e => e.event_type === 'opened').length || 0;
          const clicked = events?.filter(e => e.event_type === 'clicked').length || 0;

          setStats({
            sent,
            opened,
            clicked,
            openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
            clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0
          });
        }
      } catch (error) {
        console.error('Error fetching email stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header compacto com conexão discreta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Email Marketing</h1>
              <p className="text-sm text-muted-foreground">
                Envie campanhas e acompanhe resultados
              </p>
            </div>
          </div>
          
          {/* Connection Popover - discreto no header */}
          <div className="flex items-center gap-4">
            <EmailLimitIndicator className="hidden md:flex" />
            <EmailConnectionPopover
              isConnected={isConnected}
              loading={loading}
              emailAccount={emailAccount}
              onConnect={connectGmail}
              onDisconnect={disconnectGmail}
            />
          </div>
        </div>

        {/* KPIs compactos */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Send className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.sent}</p>
              <p className="text-xs text-muted-foreground">Enviados</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Eye className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.opened}</p>
              <p className="text-xs text-muted-foreground">Abertos</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <MousePointer className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.clicked}</p>
              <p className="text-xs text-muted-foreground">Cliques</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.openRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa Abertura</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.clickRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa Clique</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs - sem a tab de conexão */}
        <Card className="bg-card border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted p-1 m-4 mr-8 rounded-lg" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger 
                value="compor" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Compor</span>
              </TabsTrigger>
              <TabsTrigger 
                value="campanhas" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Campanhas</span>
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger 
                value="metricas" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Métricas</span>
              </TabsTrigger>
            </TabsList>

            <div className="p-6 pt-2">
              <TabsContent value="compor" className="mt-0">
                <EmailComposerWizard />
              </TabsContent>

              <TabsContent value="campanhas" className="mt-0">
                <CampaignMail />
              </TabsContent>

              <TabsContent value="templates" className="mt-0">
                <EmailTemplates />
              </TabsContent>

              <TabsContent value="metricas" className="mt-0">
                <MailTracking />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default CleanEmailMarketing;
