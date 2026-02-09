import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Settings, Send, CheckCircle2, AlertCircle, Palette, Users, BarChart3, ChevronRight, ExternalLink } from 'lucide-react';
import EmailComposer from './EmailComposer';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import EmailConnectionWizard from './EmailConnectionWizard';
import EmailLimitIndicator from './EmailLimitIndicator';
import { useGmail } from '@/hooks/useGmail';
import { Button } from '@/components/ui/button';

const OMNI_COLOR = '#FF4500';

type TabId = 'compose' | 'campaigns' | 'tracking' | 'settings';

const EmailDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('compose');
  const { isConnected, emailAccount } = useGmail();

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'compose', label: 'Compor', icon: Send },
    { id: 'campaigns', label: 'Campanhas', icon: Users },
    { id: 'tracking', label: 'Histórico', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const quickActions = [
    { label: 'Construir Templates', icon: Palette, onClick: () => navigate('/dashboard/email-builder') },
    { label: 'Ver Templates', icon: ExternalLink, onClick: () => navigate('/dashboard/email-templates') },
    { label: 'Emails Enviados', icon: BarChart3, onClick: () => setActiveTab('tracking') },
    { label: 'Configurações', icon: Settings, onClick: () => setActiveTab('settings') },
  ];

  return (
    <div className="min-h-screen bg-background page-content">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${OMNI_COLOR}12` }}
            >
              <Mail className="h-5 w-5" style={{ color: OMNI_COLOR }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Enviar Email</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <EmailLimitIndicator showDetails={false} className="" />
              </div>
            </div>
          </div>

          {/* Connection dot */}
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500'}`} />
            {!isConnected && (
              <button 
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => setActiveTab('settings')}
              >
                Conectar email
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Step-based compose flow */}
        {activeTab === 'compose' && <EmailComposer />}
        {activeTab === 'campaigns' && <CampaignMail />}
        {activeTab === 'tracking' && <MailTracking />}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">Limite de Envios</h3>
              <EmailLimitIndicator showDetails={true} className="w-full" />
              <p className="text-xs text-muted-foreground mt-3">
                Seu limite diário de envios é renovado a cada 24 horas.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">Conexão de Email</h3>
              <EmailConnectionWizard />
            </div>
          </div>
        )}

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-2xl hover:border-muted-foreground/30 transition-colors text-center group"
            >
              <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Tab pills for non-compose views */}
        {activeTab !== 'compose' && (
          <button 
            onClick={() => setActiveTab('compose')}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            ← Voltar para Compor
          </button>
        )}
      </div>
    </div>
  );
};

export default EmailDashboard;
