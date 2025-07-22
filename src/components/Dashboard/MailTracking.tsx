
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Search, Filter, Plus, BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const MailTracking = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmails: 0,
    opened: 0,
    clicked: 0,
    replied: 0
  });

  useEffect(() => {
    if (user) {
      loadEmailStats();
    }
  }, [user]);

  const loadEmailStats = async () => {
    try {
      setLoading(true);
      
      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!companyUser) {
        setStats({ totalEmails: 0, opened: 0, clicked: 0, replied: 0 });
        return;
      }

      // Load email stats (placeholder - will be implemented when email tracking is ready)
      setStats({ totalEmails: 0, opened: 0, clicked: 0, replied: 0 });

    } catch (error) {
      console.error('Error loading email stats:', error);
      setStats({ totalEmails: 0, opened: 0, clicked: 0, replied: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen ml-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-3xl font-bold text-gray-900">Carregando Rastreamento...</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-none shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded-xl"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen ml-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-3 text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📧 Rastreamento de Email
        </h1>
        <p className="text-gray-600 text-base">
          Monitore o desempenho dos seus emails em tempo real
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Total Enviados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmails}</p>
                <p className="text-xs text-gray-500 mt-1">emails</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Taxa de Abertura</p>
                <p className="text-2xl font-bold text-gray-900">{stats.opened}%</p>
                <p className="text-xs text-gray-500 mt-1">abertos</p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Taxa de Clique</p>
                <p className="text-2xl font-bold text-gray-900">{stats.clicked}%</p>
                <p className="text-xs text-gray-500 mt-1">clicados</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Taxa de Resposta</p>
                <p className="text-2xl font-bold text-gray-900">{stats.replied}%</p>
                <p className="text-xs text-gray-500 mt-1">respondidos</p>
              </div>
              <div className="p-3 rounded-full bg-orange-50">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="grid w-full sm:w-auto grid-cols-3 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg">Visão Geral</TabsTrigger>
            <TabsTrigger value="campaigns" className="rounded-lg">Campanhas</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">Análises</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64 rounded-lg border-gray-200"
              />
            </div>
            <Button className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="p-8">
              <div className="text-center">
                <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sistema de Rastreamento em Desenvolvimento
                </h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto text-sm">
                  O sistema de rastreamento de emails está sendo desenvolvido. Em breve você poderá acompanhar todas as métricas dos seus emails em tempo real.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-xs">
                    🔧 Em Desenvolvimento
                  </Badge>
                  <Badge className="bg-green-100 text-green-800 px-3 py-2 rounded-full text-xs">
                    📊 Métricas Avançadas
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-800 px-3 py-2 rounded-full text-xs">
                    📧 Rastreamento em Tempo Real
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="p-8">
              <div className="text-center">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Campanhas de Email
                </h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto text-sm">
                  Nenhuma campanha encontrada. Crie sua primeira campanha para começar a rastrear seus emails.
                </p>
                <Button className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Campanha
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="p-8">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Análises Detalhadas
                </h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto text-sm">
                  As análises detalhadas estarão disponíveis assim que você começar a enviar emails através da plataforma.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-600">Gráficos Interativos</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-600">Relatórios Detalhados</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-600">Comparações</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MailTracking;
