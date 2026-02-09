import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Users, Settings, Send, CheckCircle2, AlertCircle, Palette, ExternalLink } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-background p-6 page-content">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-2xl"
              style={{ backgroundColor: `${OMNI_COLOR}15` }}
            >
              <Mail className="h-6 w-6" style={{ color: OMNI_COLOR }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Email Marketing</h1>
              <p className="text-muted-foreground text-sm">
                Gerencie seus emails, campanhas e templates
              </p>
            </div>
          </div>
          
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            isConnected 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
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
                  className="h-6 px-2 text-xs"
                  onClick={() => setActiveTab('settings')}
                >
                  Conectar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Clean Card */}
      <div className="bg-card rounded-3xl shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tabs Navigation - Integrated, no divisions */}
          <div className="px-6 pt-6">
            <TabsList className="w-full justify-start bg-muted/30 h-auto p-1.5 gap-1 rounded-2xl">
              <TabsTrigger 
                value="compose" 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground font-medium transition-all"
                style={{ 
                  color: activeTab === 'compose' ? OMNI_COLOR : undefined 
                }}
              >
                <Send className="h-4 w-4" />
                <span>Compor</span>
              </TabsTrigger>
              <TabsTrigger 
                value="campaigns" 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground font-medium transition-all"
                style={{ 
                  color: activeTab === 'campaigns' ? OMNI_COLOR : undefined 
                }}
              >
                <Users className="h-4 w-4" />
                <span>Campanhas</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tracking" 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground font-medium transition-all"
                style={{ 
                  color: activeTab === 'tracking' ? OMNI_COLOR : undefined 
                }}
              >
                <Mail className="h-4 w-4" />
                <span>Histórico</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground font-medium transition-all"
                style={{ 
                  color: activeTab === 'settings' ? OMNI_COLOR : undefined 
                }}
              >
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </TabsTrigger>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-muted-foreground font-medium hover:bg-muted/50 ml-auto"
                onClick={() => navigate('/dashboard/email-templates')}
              >
                <Palette className="h-4 w-4" />
                <span>Templates</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </TabsList>
          </div>

          {/* Tab Contents - Clean padding */}
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
              {/* Settings includes Connection Wizard + Email Limits */}
              <div className="space-y-8">
                {/* Email Limits Section */}
                <div className="bg-muted/30 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Limite de Envios</h3>
                  <EmailLimitIndicator showDetails={true} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-3">
                    Seu limite diário de envios é renovado a cada 24 horas.
                  </p>
                </div>

                {/* Connection Wizard */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Conexão de Email</h3>
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
