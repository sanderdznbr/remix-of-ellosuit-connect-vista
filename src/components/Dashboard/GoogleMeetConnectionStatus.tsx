
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, ExternalLink, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface GoogleMeetConnectionStatusProps {
  isConnected: boolean;
  loading: boolean;
  processingOAuth: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

const GoogleMeetConnectionStatus: React.FC<GoogleMeetConnectionStatusProps> = ({
  isConnected,
  loading,
  processingOAuth,
  error,
  onConnect,
  onDisconnect
}) => {
  const getStatusInfo = () => {
    if (processingOAuth) {
      return {
        icon: <Loader2 className="w-6 h-6 animate-spin text-blue-600" />,
        title: 'Google Meet',
        message: 'Processando conexão...',
        bgColor: 'from-blue-50 to-indigo-50',
        textColor: 'text-blue-700',
        badge: { variant: 'secondary' as const, text: 'Conectando...' }
      };
    }
    
    if (loading) {
      return {
        icon: <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />,
        title: 'Google Meet',
        message: 'Carregando...',
        bgColor: 'from-yellow-50 to-orange-50',
        textColor: 'text-yellow-700',
        badge: { variant: 'secondary' as const, text: 'Carregando...' }
      };
    }
    
    if (error) {
      return {
        icon: <AlertCircle className="w-6 h-6 text-red-600" />,
        title: 'Google Meet',
        message: `Erro: ${error}`,
        bgColor: 'from-red-50 to-pink-50',
        textColor: 'text-red-700',
        badge: { variant: 'destructive' as const, text: 'Erro' }
      };
    }
    
    if (isConnected) {
      return {
        icon: <CheckCircle className="w-6 h-6 text-green-600" />,
        title: 'Google Meet',
        message: 'Conectado - Reuniões automáticas ativadas',
        bgColor: 'from-green-50 to-emerald-50',
        textColor: 'text-green-700',
        badge: { variant: 'default' as const, text: 'Conectado' }
      };
    }
    
    return {
      icon: <Video className="w-6 h-6 text-blue-600" />,
      title: 'Google Meet',
      message: 'Conecte para criar reuniões automaticamente',
      bgColor: 'from-blue-50 to-indigo-50',
      textColor: 'text-gray-600',
      badge: { variant: 'secondary' as const, text: 'Desconectado' }
    };
  };

  const statusInfo = getStatusInfo();
  const canInteract = !loading && !processingOAuth;

  return (
    <Card className={`shadow-lg border-0 rounded-2xl bg-gradient-to-r ${statusInfo.bgColor}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm">
              {statusInfo.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{statusInfo.title}</h3>
              <p className={`text-sm ${statusInfo.textColor}`}>
                {statusInfo.message}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant={statusInfo.badge.variant}>
              {statusInfo.badge.text}
            </Badge>
            
            {canInteract && (
              <Button 
                variant={isConnected ? "outline" : "default"}
                onClick={isConnected ? onDisconnect : onConnect}
                className="min-w-[120px]"
                disabled={!canInteract}
              >
                {isConnected ? (
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
        
        {processingOAuth && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">
                Finalizando conexão com Google Meet...
              </span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                {error}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleMeetConnectionStatus;
