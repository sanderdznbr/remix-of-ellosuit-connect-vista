import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Mail, History, Users, FileText, Send, Inbox, Clock, TrendingUp, Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import EmailComposer from './EmailComposer';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import EmailTemplates from './EmailTemplates';
import EmailConnectionWizard from './EmailConnectionWizard';
import { useGmail } from '@/hooks/useGmail';
import { Button } from '@/components/ui/button';

const OMNI_COLOR = "#E34800";

const EmailDashboard = () => {
  const [activeTab, setActiveTab] = useState('compose');
  const { isConnected, emailAccount } = useGmail();

  const stats = [
    { label: 'Enviados Hoje', value: '24', icon: Send },
    { label: 'Na Caixa', value: '156', icon: Inbox },
    { label: 'Agendados', value: '8', icon: Clock },
    { label: 'Taxa Abertura', value: '68%', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div 
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${OMNI_COLOR} 0%, #B33800 100%)` }}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="max-w-7xl mx-auto px-6 py-12 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Mail className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Email Marketing</h1>
                <p className="text-white/80">Gerencie seus emails, campanhas e templates</p>
              </div>
            </div>
            
            {/* Connection Status Badge */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isConnected 
                ? 'bg-white/20 text-white' 
                : 'bg-white/20 text-white'
            }`}>
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">{emailAccount?.provider_email || 'Email Conectado'}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Email não conectado</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 text-xs text-white hover:bg-white/20"
                    onClick={() => setActiveTab('connect')}
                  >
                    Conectar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="text-center">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${OMNI_COLOR}10` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: OMNI_COLOR }} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0 border-b border-gray-100 bg-gray-50/50">
              <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-0 flex-wrap">
                <TabsTrigger 
                  value="connect" 
                  className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#E34800] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-[#E34800] font-medium"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Conectar</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="compose" 
                  className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#E34800] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-[#E34800] font-medium"
                >
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">Compor</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tracking" 
                  className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#E34800] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-[#E34800] font-medium"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Histórico</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="campaigns" 
                  className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#E34800] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-[#E34800] font-medium"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Campanhas</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="templates" 
                  className="flex items-center gap-2 px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#E34800] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-[#E34800] font-medium"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Templates</span>
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6 bg-white">
              <TabsContent value="connect" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                <EmailConnectionWizard />
              </TabsContent>

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
    </div>
  );
};

export default EmailDashboard;
