
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Mail, 
  Calendar,
  Target,
  ArrowRight,
  PieChart,
  Activity,
  Clock,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsProps {
  onNavigate: (item: string) => void;
}

const Analytics = ({ onNavigate }: AnalyticsProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmails: 0,
    totalMeetings: 0,
    totalClients: 0,
    totalTemplates: 0,
    emailOpenRate: 0,
    meetingAttendance: 0
  });

  const quickActions = [
    {
      title: 'Rastreamento de Email',
      description: 'Visualizar métricas de email',
      icon: Mail,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      action: () => onNavigate('mail-tracking')
    },
    {
      title: 'Produtividade',
      description: 'Acompanhar produtividade',
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      action: () => onNavigate('mail-productivity')
    },
    {
      title: 'Calendário',
      description: 'Ver agenda e eventos',
      icon: Calendar,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      action: () => onNavigate('my-calendar')
    },
    {
      title: 'Clientes',
      description: 'Gerenciar clientes',
      icon: Users,
      color: 'bg-gradient-to-r from-orange-500 to-orange-600',
      action: () => onNavigate('clients')
    }
  ];

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!companyUser) {
        setStats({
          totalEmails: 0,
          totalMeetings: 0,
          totalClients: 0,
          totalTemplates: 0,
          emailOpenRate: 0,
          meetingAttendance: 0
        });
        return;
      }

      // Load real data from database
      const [clientsData, templatesData, eventsData] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }).eq('company_id', companyUser.company_id),
        supabase.from('email_templates').select('id', { count: 'exact' }).eq('company_id', companyUser.company_id),
        supabase.from('calendar_events').select('id', { count: 'exact' }).eq('company_id', companyUser.company_id)
      ]);

      setStats({
        totalEmails: 0, // Will be implemented when email tracking is ready
        totalMeetings: eventsData.data?.length || 0,
        totalClients: clientsData.data?.length || 0,
        totalTemplates: templatesData.data?.length || 0,
        emailOpenRate: 0, // Will be calculated from email data
        meetingAttendance: 0 // Will be calculated from meeting data
      });

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-gray-50 min-h-screen ml-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-4xl font-bold text-gray-900">Carregando Análises...</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-none shadow-lg rounded-3xl">
              <CardContent className="p-8">
                <div className="h-24 bg-gray-200 rounded-2xl"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen ml-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📊 Analytics
        </h1>
        <p className="text-gray-600 text-xl">
          Acompanhe o desempenho do seu negócio com métricas detalhadas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Total de Emails</p>
                <p className="text-4xl font-bold text-gray-900">{stats.totalEmails}</p>
                <p className="text-sm text-gray-500 mt-2">enviados</p>
              </div>
              <div className="p-5 rounded-full bg-blue-50">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Reuniões</p>
                <p className="text-4xl font-bold text-gray-900">{stats.totalMeetings}</p>
                <p className="text-sm text-gray-500 mt-2">agendadas</p>
              </div>
              <div className="p-5 rounded-full bg-green-50">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Clientes</p>
                <p className="text-4xl font-bold text-gray-900">{stats.totalClients}</p>
                <p className="text-sm text-gray-500 mt-2">cadastrados</p>
              </div>
              <div className="p-5 rounded-full bg-purple-50">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Templates</p>
                <p className="text-4xl font-bold text-gray-900">{stats.totalTemplates}</p>
                <p className="text-sm text-gray-500 mt-2">criados</p>
              </div>
              <div className="p-5 rounded-full bg-orange-50">
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-none shadow-xl rounded-3xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Target className="h-8 w-8 text-[#3600FF]" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className={`group p-6 rounded-3xl ${action.color} text-white hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 rounded-full bg-white/20">
                      <Icon className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{action.title}</h3>
                      <p className="text-sm text-white/80">{action.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-white shadow-lg">
          <TabsTrigger value="overview" className="rounded-xl">Visão Geral</TabsTrigger>
          <TabsTrigger value="email" className="rounded-xl">Email Marketing</TabsTrigger>
          <TabsTrigger value="meetings" className="rounded-xl">Reuniões</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl rounded-3xl bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <PieChart className="h-6 w-6 text-[#3600FF]" />
                  Distribuição de Atividades
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Gráfico de distribuição será exibido aqui</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-3xl bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-[#3600FF]" />
                  Atividade por Período
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Gráfico de timeline será exibido aqui</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-8">
          <Card className="border-none shadow-xl rounded-3xl bg-white">
            <CardContent className="p-12">
              <div className="text-center">
                <Mail className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Análises de Email Marketing
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  As análises detalhadas de email marketing estarão disponíveis quando você começar a enviar campanhas.
                </p>
                <Button onClick={() => onNavigate('mail-tracking')} className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-xl">
                  <Mail className="h-4 w-4 mr-2" />
                  Ir para Rastreamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-8">
          <Card className="border-none shadow-xl rounded-3xl bg-white">
            <CardContent className="p-12">
              <div className="text-center">
                <Calendar className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Análises de Reuniões
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Acompanhe o desempenho das suas reuniões e compromissos agendados.
                </p>
                <Button onClick={() => onNavigate('my-calendar')} className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-xl">
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver Calendário
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
