
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Eye, MousePointer, Clock, TrendingUp } from 'lucide-react';

const MailTracking = () => {
  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📧 Rastreamento de Email
        </h1>
        <p className="text-gray-600 text-base">
          Monitore o desempenho dos seus emails em tempo real
        </p>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Emails Enviados</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500 mt-1">este mês</p>
              </div>
              <div className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Taxa de Abertura</p>
                <p className="text-2xl font-bold text-gray-900">0%</p>
                <p className="text-sm text-gray-500 mt-1">média geral</p>
              </div>
              <div className="p-4 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
                <Eye className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Taxa de Clique</p>
                <p className="text-2xl font-bold text-gray-900">0%</p>
                <p className="text-sm text-gray-500 mt-1">dos emails abertos</p>
              </div>
              <div className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                <MousePointer className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Tempo Médio</p>
                <p className="text-2xl font-bold text-gray-900">0min</p>
                <p className="text-sm text-gray-500 mt-1">de leitura</p>
              </div>
              <div className="p-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Emails */}
      <Card className="border-none shadow-xl rounded-3xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Emails Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum email encontrado</h3>
            <p className="text-gray-600 text-base mb-6">
              Comece enviando emails para ver o rastreamento aqui
            </p>
            <Badge variant="secondary" className="px-4 py-2 rounded-full">
              📈 Rastreamento automático ativo
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Performance */}
      <Card className="border-none shadow-xl rounded-3xl bg-white">
        <CardHeader>
          <CardTitle className="text-xl">Performance dos Últimos 30 Dias</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-2xl">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-base">Gráfico será exibido aqui</p>
              <p className="text-sm text-gray-400">quando houver dados suficientes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MailTracking;
