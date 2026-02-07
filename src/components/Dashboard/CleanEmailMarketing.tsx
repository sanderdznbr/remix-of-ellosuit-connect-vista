import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Send, 
  FileText, 
  BarChart3,
  Link2,
  CheckCircle2,
  AlertCircle,
  Users,
  Eye,
  MousePointer,
  Loader2,
  Building2,
  RefreshCw
} from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';
import { useToast } from '@/hooks/use-toast';
import EmailComposer from './EmailComposer';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import EmailTemplates from './EmailTemplates';
import { supabase } from '@/integrations/supabase/client';

const CleanEmailMarketing: React.FC = () => {
  const { isConnected, loading, emailAccount, connectGmail, disconnectGmail } = useGmail();
  const [activeTab, setActiveTab] = useState('conexao');
  const { toast } = useToast();
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

  const renderConnectionTab = () => (
    <div className="space-y-6">
      {/* Connection Status */}
      {isConnected ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Gmail Conectado</h3>
                  <p className="text-sm text-green-600">{emailAccount?.provider_email}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={disconnectGmail}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Desconectar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-6 w-6 text-amber-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Email não conectado</h3>
                <p className="text-sm text-amber-600">Conecte seu email para começar a enviar campanhas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Options */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Como você quer enviar emails?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gmail Option */}
          <Card className={`cursor-pointer transition-all hover:shadow-md ${isConnected ? 'border-[#3000E3] ring-2 ring-[#3000E3]/20' : 'border-gray-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Meu Email</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Gmail ou Google Workspace. Cada usuário envia do seu próprio email.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                    <Badge variant="outline" className="text-xs">500-2000/dia</Badge>
                    <Badge variant="outline" className="text-xs">Individual</Badge>
                  </div>
                  
                  {isConnected ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Conectado</span>
                    </div>
                  ) : (
                    <Button 
                      onClick={connectGmail}
                      disabled={loading}
                      className="w-full bg-[#3000E3] hover:bg-[#2500B3]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Conectar Gmail
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resend Option */}
          <Card className="cursor-pointer transition-all hover:shadow-md border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Email Empresa</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Domínio próprio via Resend. Ideal para campanhas em massa.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                    <Badge variant="outline" className="text-xs">Ilimitado</Badge>
                    <Badge variant="outline" className="text-xs">Domínio verificado</Badge>
                  </div>
                  
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      toast({
                        title: "Configuração Resend",
                        description: "Configure RESEND_API_KEY nas variáveis de ambiente para usar este provedor.",
                      });
                    }}
                  >
                    Configurar Resend
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connection Benefits */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Vantagens da conexão Gmail</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">Seu próprio email</p>
                <p className="text-xs text-gray-500">Emails enviados do seu endereço real</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <RefreshCw className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">Respostas diretas</p>
                <p className="text-xs text-gray-500">Respostas vão para sua caixa</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">Rastreamento</p>
                <p className="text-xs text-gray-500">Acompanhe aberturas e cliques</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
            <p className="text-sm text-gray-500">
              Envie campanhas e acompanhe resultados
            </p>
          </div>
          
          {/* Connection Status Badge */}
          {isConnected ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Conectado: {emailAccount?.provider_email}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Não conectado
            </Badge>
          )}
        </div>

        {/* KPIs compactos */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <Send className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
              <p className="text-xs text-gray-500">Enviados</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <Eye className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">{stats.opened}</p>
              <p className="text-xs text-gray-500">Abertos</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <MousePointer className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">{stats.clicked}</p>
              <p className="text-xs text-gray-500">Cliques</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.openRate}%</p>
              <p className="text-xs text-gray-500">Taxa Abertura</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.clickRate}%</p>
              <p className="text-xs text-gray-500">Taxa Clique</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="bg-white border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1 m-4 mr-8 rounded-lg" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger 
                value="conexao" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
              >
                <Link2 className="h-4 w-4" />
                Conexão
              </TabsTrigger>
              <TabsTrigger 
                value="compor" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
              >
                <Send className="h-4 w-4" />
                Compor
              </TabsTrigger>
              <TabsTrigger 
                value="campanhas" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
              >
                <Users className="h-4 w-4" />
                Campanhas
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
              >
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger 
                value="metricas" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
              >
                <BarChart3 className="h-4 w-4" />
                Métricas
              </TabsTrigger>
            </TabsList>

            <div className="p-6 pt-2">
              <TabsContent value="conexao" className="mt-0">
                {renderConnectionTab()}
              </TabsContent>

              <TabsContent value="compor" className="mt-0">
                <EmailComposer />
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
