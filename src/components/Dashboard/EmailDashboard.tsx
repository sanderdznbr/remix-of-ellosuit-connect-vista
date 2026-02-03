import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, History, Users, FileText, BarChart3, Send, Inbox, Clock, TrendingUp } from 'lucide-react';
import EmailComposer from './EmailComposer';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import EmailTemplates from './EmailTemplates';

const EmailDashboard = () => {
  const [activeTab, setActiveTab] = useState('compose');

  // Quick stats
  const stats = [
    { label: 'Enviados Hoje', value: '24', icon: Send, color: 'text-blue-600 bg-blue-100' },
    { label: 'Na Caixa', value: '156', icon: Inbox, color: 'text-green-600 bg-green-100' },
    { label: 'Agendados', value: '8', icon: Clock, color: 'text-orange-600 bg-orange-100' },
    { label: 'Taxa Abertura', value: '68%', icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
  ];

  return (
    <div className="min-h-screen bg-background p-6 page-content">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Email Marketing</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie seus emails, campanhas e templates
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-0 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0 border-b">
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-0">
              <TabsTrigger 
                value="compose" 
                className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-primary font-medium"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Compor</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tracking" 
                className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-primary font-medium"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
              <TabsTrigger 
                value="campaigns" 
                className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-primary font-medium"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Campanhas</span>
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-primary font-medium"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-6">
            <TabsContent value="compose" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
              <EmailComposer />
            </TabsContent>

            <TabsContent value="tracking" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
              <MailTracking />
            </TabsContent>

            <TabsContent value="campaigns" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
              <CampaignMail />
            </TabsContent>

            <TabsContent value="templates" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
              <EmailTemplates />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default EmailDashboard;
