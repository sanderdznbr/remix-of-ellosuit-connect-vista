import React, { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  ControlBar,
  Chat,
  useRoomContext,
  useTracks,
  useParticipants,
} from '@livekit/components-react';
import { Track, Room } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Video, VideoOff, Mic, MicOff, Monitor, PhoneOff } from 'lucide-react';
import '@/styles/livekit.css';

interface LiveKitRoomProps {
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

const LiveKitRoomComponent: React.FC<LiveKitRoomProps> = ({ 
  roomName, 
  participantName, 
  onLeave 
}) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const generateToken = async () => {
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
          throw error;
        }

        const tokenData = data as TokenResponse;
        console.log('Token generated successfully:', tokenData);

        setToken(tokenData.token);
        setServerUrl(tokenData.url);
        
        toast({
          title: "Conectado",
          description: "Entrando na sala de reunião...",
        });

      } catch (err) {
        console.error('Error generating token:', err);
        setError(err instanceof Error ? err.message : 'Erro ao gerar token');
        toast({
          title: "Erro",
          description: "Falha ao conectar na sala de reunião",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (roomName) {
      generateToken();
    }
  }, [roomName, participantName, user, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Conectando à sala...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-destructive">Erro: {error}</p>
          <Button onClick={onLeave} variant="outline">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Preparando sala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        style={{ height: '100vh' }}
        onConnected={() => {
          console.log('Connected to LiveKit room');
          toast({
            title: "Conectado",
            description: "Você entrou na sala de reunião",
          });
        }}
        onDisconnected={(reason) => {
          console.log('Disconnected from LiveKit room:', reason);
          toast({
            title: "Desconectado",
            description: "Você saiu da sala de reunião",
          });
          onLeave();
        }}
        onError={(error) => {
          console.error('LiveKit room error:', error);
          toast({
            title: "Erro na chamada",
            description: "Ocorreu um erro durante a chamada",
            variant: "destructive",
          });
        }}
      >
        <div className="h-[100dvh] w-full flex">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2 bg-background/80 backdrop-blur">
              <div className="text-sm font-medium">Sala {roomName}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    toast({ title: 'Link copiado', description: 'URL da chamada copiada.' });
                  }}
                >
                  Copiar link
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const url = window.location.href;
                    if ((navigator as any).share) {
                      try {
                        await (navigator as any).share({ title: 'Chamada Ellosuit', url });
                      } catch {}
                    } else {
                      navigator.clipboard.writeText(url);
                      toast({ title: 'Link copiado', description: 'Compartilhe o link com seus convidados.' });
                    }
                  }}
                >
                  Convidar
                </Button>
                <Button variant="destructive" size="sm" onClick={onLeave}>Sair</Button>
              </div>
            </div>

            <div className="relative flex-1 min-h-0">
              <VideoGrid />
              <div className="absolute bottom-4 right-4">
                <ControlBar />
              </div>
            </div>
          </div>

          <aside className="w-[340px] max-w-[380px] min-w-[320px] border-l bg-background flex flex-col">
            <div className="px-4 py-2 border-b text-sm font-medium">Chat</div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <Chat />
            </div>
          </aside>
        </div>
      </LiveKitRoom>
    </div>
  );
};

const VideoGrid: React.FC = () => {
  const tracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);

  return (
    <div className="h-full w-full p-2">
      <GridLayout tracks={tracks as any} className="h-full w-full">
        {tracks.map((track) => (
          <ParticipantTile
            key={`${track.participant.identity}-${String(track.source)}`}
            trackRef={track as any}
          />
        ))}
      </GridLayout>
    </div>
  );
};

const RoomControls: React.FC<{ onLeave: () => void }> = ({ onLeave }) => {
  const room = useRoomContext();
  const participants = useParticipants();
  
  const handleLeaveRoom = () => {
    room?.disconnect();
    onLeave();
  };

  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg">
      <span className="text-sm text-muted-foreground">
        {participants.length} participante{participants.length !== 1 ? 's' : ''}
      </span>
      <Button
        onClick={handleLeaveRoom}
        variant="destructive"
        size="sm"
        className="gap-2"
      >
        <PhoneOff className="h-4 w-4" />
        Sair
      </Button>
    </div>
  );
};

export default LiveKitRoomComponent;