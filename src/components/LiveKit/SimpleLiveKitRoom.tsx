import React, { useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  useToken,
  PreJoin,
  LocalUserChoices,
} from '@livekit/components-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import '@/styles/livekit.css';

interface SimpleLiveKitRoomProps {
  roomName: string;
  participantName: string;
  onLeave: () => void;
}

interface TokenResponse {
  token: string;
  url: string;
  roomName: string;
  participantName: string;
  userId: string;
}

const SimpleLiveKitRoom: React.FC<SimpleLiveKitRoomProps> = ({ 
  roomName, 
  participantName, 
  onLeave 
}) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | undefined>();
  const { user } = useAuth();
  const { toast } = useToast();

  const generateToken = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Generating LiveKit token for room:', roomName);

      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName,
          participantName: participantName || user?.user_metadata?.full_name || 'Participante'
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerar token');
      }

      if (!data || !data.token || !data.url) {
        throw new Error('Resposta inválida do servidor');
      }

      const tokenData = data as TokenResponse;
      console.log('Token generated successfully');

      setToken(tokenData.token);
      setServerUrl(tokenData.url);
      
    } catch (err) {
      console.error('Error generating token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar na sala';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [roomName, participantName, user, toast]);

  useEffect(() => {
    if (roomName) {
      generateToken();
    }
  }, [generateToken]);

  const handlePreJoinSubmit = useCallback((values: LocalUserChoices) => {
    console.log('PreJoin submitted with values:', values);
    setPreJoinChoices(values);
  }, []);

  const handleDisconnected = useCallback(() => {
    console.log('Disconnected from room');
    toast({
      title: "Desconectado",
      description: "Você saiu da sala de reunião",
    });
    onLeave();
  }, [onLeave, toast]);

  const handleError = useCallback((error: Error) => {
    console.error('LiveKit error:', error);
    setError(error.message);
    toast({
      title: "Erro na chamada",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Conectando à sala...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Erro na Conexão</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateToken} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button onClick={onLeave} variant="outline">
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not ready state
  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Preparando sala...</p>
          <Button onClick={generateToken} variant="outline" size="sm">
            Recarregar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        onDisconnected={handleDisconnected}
        onError={handleError}
        style={{ height: '100vh' }}
      >
        {!preJoinChoices ? (
          <div className="h-full flex items-center justify-center">
            <div className="bg-card border rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4 text-center">
                Entrar na Sala {roomName}
              </h2>
              <PreJoin 
                onSubmit={handlePreJoinSubmit}
                defaults={{
                  username: participantName,
                  videoEnabled: true,
                  audioEnabled: true,
                }}
              />
              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={onLeave} 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <VideoConference />
        )}
      </LiveKitRoom>
    </div>
  );
};

export default SimpleLiveKitRoom;