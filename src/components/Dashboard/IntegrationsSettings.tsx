
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, ExternalLink, CheckCircle, Loader2, AlertCircle, RefreshCw, Plug } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useZoomIntegration } from '@/hooks/useZoomIntegration';

const IntegrationsSettings = () => {
  const { 
    isConnected: googleConnected, 
    loading: googleLoading, 
    processingOAuth: googleProcessingOAuth,
    error: googleError,
    connectGoogle, 
    disconnectGoogle,
    checkConnection: checkGoogleConnection
  } = useGoogleCalendar();

  const {
    isConnected: zoomConnected,
    loading: zoomLoading,
    connectZoom,
    disconnectZoom,
    checkConnection: checkZoomConnection
  } = useZoomIntegration();

  const getGoogleStatusInfo = () => {
    if (googleProcessingOAuth) {
      return {
        icon: <Loader2 className="w-6 h-6 animate-spin text-blue-600" />,
        badge: { variant: 'secondary' as const, text: 'Conectando...' },
        status: 'connecting'
      };
    }
    
    if (googleLoading) {
      return {
        icon: <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />,
        badge: { variant: 'secondary' as const, text: 'Carregando...' },
        status: 'loading'
      };
    }
    
    if (googleError) {
      return {
        icon: <AlertCircle className="w-6 h-6 text-red-600" />,
        badge: { variant: 'destructive' as const, text: 'Erro' },
        status: 'error'
      };
    }
    
    if (googleConnected) {
      return {
        icon: <CheckCircle className="w-6 h-6 text-green-600" />,
        badge: { variant: 'default' as const, text: 'Conectado' },
        status: 'connected'
      };
    }
    
    return {
      icon: <Video className="w-6 h-6 text-blue-600" />,
      badge: { variant: 'secondary' as const, text: 'Desconectado' },
      status: 'disconnected'
    };
  };

  const getZoomStatusInfo = () => {
    if (zoomLoading) {
      return {
        icon: <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />,
        badge: { variant: 'secondary' as const, text: 'Carregando...' },
        status: 'loading'
      };
    }
    
    if (zoomConnected) {
      return {
        icon: <CheckCircle className="w-6 h-6 text-green-600" />,
        badge: { variant: 'default' as const, text: 'Conectado' },
        status: 'connected'
      };
    }
    
    return {
      icon: <Video className="w-6 h-6 text-blue-600" />,
      badge: { variant: 'secondary' as const, text: 'Desconectado' },
      status: 'disconnected'
    };
  };

  const googleStatus = getGoogleStatusInfo();
  const zoomStatus = getZoomStatusInfo();
  const canInteractGoogle = !googleLoading && !googleProcessingOAuth;
  const canInteractZoom = !zoomLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Integrações</h2>
        <p className="text-gray-600">
          Conecte seus serviços favoritos para ampliar as funcionalidades do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Meet Integration */}
        <Card className="shadow-lg border-0 rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-50">
                {googleStatus.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Google Meet</h3>
                <p className="text-sm text-gray-600">Calendário e reuniões automáticas</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={googleStatus.badge.variant}>
                {googleStatus.badge.text}
              </Badge>
              
              <div className="flex items-center space-x-2">
                {googleError && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={checkGoogleConnection}
                    className="min-w-[100px]"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </Button>
                )}
                
                {canInteractGoogle && !googleError && (
                  <Button 
                    variant={googleConnected ? "outline" : "default"}
                    onClick={googleConnected ? disconnectGoogle : connectGoogle}
                    className="min-w-[120px]"
                    disabled={!canInteractGoogle}
                  >
                    {googleConnected ? (
                      "Desconectar"
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Conectar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {googleConnected ? (
                <p>✅ Conectado - Reuniões automáticas ativadas</p>
              ) : googleError ? (
                <p className="text-red-600">❌ {googleError}</p>
              ) : googleProcessingOAuth ? (
                <p className="text-blue-600">🔄 Processando conexão...</p>
              ) : (
                <p>Conecte para criar reuniões automaticamente</p>
              )}
            </div>

            {googleProcessingOAuth && (
              <div className="p-3 bg-blue-100 border border-blue-200 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-700">
                    Finalizando conexão com Google Meet...
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zoom Integration */}
        <Card className="shadow-lg border-0 rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-50">
                {zoomStatus.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Zoom</h3>
                <p className="text-sm text-gray-600">Reuniões e webinars</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={zoomStatus.badge.variant}>
                {zoomStatus.badge.text}
              </Badge>
              
              <div className="flex items-center space-x-2">
                {canInteractZoom && (
                  <Button 
                    variant={zoomConnected ? "outline" : "default"}
                    onClick={zoomConnected ? disconnectZoom : connectZoom}
                    className="min-w-[120px]"
                    disabled={!canInteractZoom}
                  >
                    {zoomConnected ? (
                      "Desconectar"
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Conectar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {zoomConnected ? (
                <p>✅ Conectado - Reuniões Zoom ativadas</p>
              ) : zoomLoading ? (
                <p className="text-blue-600">🔄 Carregando...</p>
              ) : (
                <p>Conecte para criar reuniões Zoom automaticamente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-dashed border-gray-200">
        <CardContent className="p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Plug className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Mais integrações em breve</h3>
          <p className="text-gray-600">
            Estamos trabalhando para adicionar mais integrações como Microsoft Teams, Slack e outras ferramentas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsSettings;
