import React from 'react';
import { 
  useTracks, 
  TrackReference, 
  VideoTrack,
  useParticipants 
} from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import { cn } from '@/lib/utils';
import { MicOff, Wifi, Video } from 'lucide-react';

const ZoomParticipantGrid: React.FC = () => {
  const participants = useParticipants();
  
  // Log para debug no mobile
  console.log('[ZoomParticipantGrid] Total de participantes:', participants.length);
  participants.forEach(p => {
    console.log('[ZoomParticipantGrid] Participante:', p.identity, 'Câmera:', p.isCameraEnabled);
  });
  
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const screenShareTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera);
  const hasScreenShare = screenShareTracks.length > 0;
  
  // Log tracks no mobile
  console.log('[ZoomParticipantGrid] Total de tracks de câmera:', cameraTracks.length);
  console.log('[ZoomParticipantGrid] Total de tracks de screen share:', screenShareTracks.length);

  // Grid dinâmico responsivo - NUNCA corta participantes
  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 4) return 'grid-cols-2 sm:grid-cols-2';
    if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
    if (count <= 9) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3';
    if (count <= 12) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  };

  const getParticipantName = (participant: Participant) => {
    return participant.name || participant.identity || 'Participante';
  };

  const isParticipantMuted = (participant: Participant) => {
    const audioTrack = participant.audioTrackPublications.values().next().value;
    return !audioTrack || audioTrack.isMuted;
  };

  const isVideoEnabled = (participant: Participant) => {
    const videoTrack = participant.videoTrackPublications.values().next().value;
    return videoTrack && !videoTrack.isMuted;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#101010]">
      {/* Screen Share Area - Layout Responsivo para múltiplas telas */}
      {hasScreenShare && (
        <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">
          {/* Telas Compartilhadas - Grid quando há múltiplas */}
          <div className={cn(
            "flex gap-3 overflow-auto",
            screenShareTracks.length === 1 ? "flex-[0_0_70%]" : "flex-[0_0_60%]",
            screenShareTracks.length > 1 && "grid grid-cols-1 lg:grid-cols-2"
          )}>
            {screenShareTracks.map((trackRef: TrackReference, index: number) => (
              <div
                key={`screenshare-${trackRef.participant.identity}-${index}`}
                className="flex flex-col items-center justify-center bg-black rounded-lg overflow-hidden min-h-[300px]"
              >
                <VideoTrack
                  trackRef={trackRef}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-white text-xs font-medium">
                    {getParticipantName(trackRef.participant)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Participantes - Grid horizontal embaixo */}
          {cameraTracks.length > 0 && (
            <div className={cn(
              "flex gap-2 overflow-x-auto overflow-y-hidden pb-2 px-2",
              screenShareTracks.length === 1 ? "flex-[0_0_30%]" : "flex-[0_0_40%]"
            )}>
              {cameraTracks.map((trackRef: TrackReference, index: number) => (
                <div
                  key={`camera-bottom-${trackRef.participant.identity}-${index}`}
                  className="relative flex-shrink-0 w-40 lg:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                  style={{ backgroundColor: '#1a1a1a' }}
                >
                  {isVideoEnabled(trackRef.participant) ? (
                    <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center overflow-hidden">
                      <VideoTrack
                        trackRef={trackRef}
                        className="w-full h-full object-cover"
                        style={{ backgroundColor: '#000' }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted rounded-2xl">
                      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-base lg:text-lg">
                        {getParticipantName(trackRef.participant).charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-white text-xs font-medium truncate">
                        {getParticipantName(trackRef.participant)}
                      </span>
                      {isParticipantMuted(trackRef.participant) && (
                        <div className="bg-destructive rounded-full p-1 flex-shrink-0">
                          <MicOff className="h-2.5 w-2.5 text-destructive-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Camera Grid - sem compartilhamento de tela */}
      {!hasScreenShare && (
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          {cameraTracks.length === 0 ? (
            <div className="text-center">
              <Wifi className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-medium text-foreground">Aguardando participantes...</p>
              <p className="text-sm text-muted-foreground mt-2">Convide pessoas para se juntar à reunião</p>
            </div>
          ) : (
            <div className={cn(
              "grid gap-4 w-full h-full",
              cameraTracks.length === 1 && "max-w-4xl max-h-[600px] mx-auto",
              getGridClass(cameraTracks.length)
            )}
            style={{
              gridAutoRows: cameraTracks.length === 1 ? 'auto' : 'minmax(180px, 1fr)'
            }}>
              {cameraTracks.map((trackRef: TrackReference, index: number) => (
                <div
                  key={`camera-${trackRef.participant.identity}-${index}`}
                  className="relative rounded-3xl overflow-hidden border-2 hover:border-primary transition-all group w-full h-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: '#1a1a1a',
                    borderColor: '#2a2a2a',
                    minHeight: cameraTracks.length === 1 ? '400px' : '180px',
                    aspectRatio: cameraTracks.length === 1 ? '16/9' : 'auto'
                  }}
                >
                  {isVideoEnabled(trackRef.participant) ? (
                    <div className="w-full h-full bg-black rounded-3xl flex items-center justify-center overflow-hidden">
                      <VideoTrack
                        trackRef={trackRef}
                        className="w-full h-full object-contain rounded-3xl"
                        style={{ backgroundColor: '#000' }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted rounded-3xl">
                      <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-3xl">
                        {getParticipantName(trackRef.participant).charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  
                  {/* Participant info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent rounded-b-3xl">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium truncate max-w-[80%] drop-shadow-lg">
                        {getParticipantName(trackRef.participant)}
                      </span>
                      {isParticipantMuted(trackRef.participant) && (
                        <div className="bg-destructive rounded-full p-1.5">
                          <MicOff className="h-3.5 w-3.5 text-destructive-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Speaking indicator */}
                  {!isParticipantMuted(trackRef.participant) && (
                    <div className="absolute top-3 left-3 bg-green-500 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ZoomParticipantGrid;