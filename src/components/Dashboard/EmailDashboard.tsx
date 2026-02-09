import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Settings, Send, CheckCircle2, AlertCircle, Palette, ExternalLink, Users, BarChart3 } from 'lucide-react';
import EmailComposer from './EmailComposer';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import EmailConnectionWizard from './EmailConnectionWizard';
import EmailLimitIndicator from './EmailLimitIndicator';
import { useGmail } from '@/hooks/useGmail';
import { Button } from '@/components/ui/button';

const OMNI_COLOR = '#FF4500';

const EmailDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('compose');
  const { isConnected, emailAccount } = useGmail();

  const tabs = [
    { id: 'compose', label: 'Compor', icon: Send },
    { id: 'campaigns', label: 'Campanhas', icon: Users },
    { id: 'tracking', label: 'Histórico', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background page-content">
      {/* Clean Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${OMNI_COLOR}12` }}
              >
                <Mail className="h-5 w-5" style={{ color: OMNI_COLOR }} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Email Marketing</h1>
                <p className="text-sm text-muted-foreground">Gerencie emails, campanhas e templates</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                isConnected 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
              }`}>
                {isConnected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{emailAccount?.provider_email || 'Conectado'}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Não conectado</span>
                    <button 
                      className="ml-1 underline underline-offset-2 hover:no-underline"
                      onClick={() => setActiveTab('settings')}
                    >
                      Conectar
                    </button>
                  </>
                )}
              </div>

              {/* Templates Button */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-sm"
                onClick={() => navigate('/dashboard/email-templates')}
              >
                <Palette className="h-4 w-4" />
                Templates
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Clean underline style */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6">
            <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none border-0">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF4500] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground font-medium transition-colors"
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Content */}
          <div className="p-6">
            <TabsContent value="compose" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
              <EmailComposer />
            </TabsContent>

            <TabsContent value="campaigns" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
              <CampaignMail />
            </TabsContent>

            <TabsContent value="tracking" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
              <MailTracking />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
              <div className="space-y-6">
                {/* Email Limits */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-base font-semibold text-foreground mb-4">Limite de Envios</h3>
                  <EmailLimitIndicator showDetails={true} className="w-full" />
                  <p className="text-xs text-muted-foreground mt-3">
                    Seu limite diário de envios é renovado a cada 24 horas.
                  </p>
                </div>

                {/* Connection Wizard */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-base font-semibold text-foreground mb-4">Conexão de Email</h3>
                  <EmailConnectionWizard />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default EmailDashboard;
