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
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const screenShareTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera);
  const hasScreenShare = screenShareTracks.length > 0;

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
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#101010' }}>
      {/* Screen Share Area - Layout Responsivo */}
      {hasScreenShare && (
        <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
          {/* Tela Compartilhada - 75% em desktop, 100% em mobile */}
          <div className="flex-1 lg:flex-[0_0_75%] flex items-center justify-center">
            {screenShareTracks.map((trackRef: TrackReference, index: number) => (
              <div
                key={`screenshare-${trackRef.participant.identity}-${index}`}
                className="flex items-center justify-center bg-black rounded-lg overflow-hidden w-full h-full"
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
              >
                <VideoTrack
                  trackRef={trackRef}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
          
          {/* Participantes - Sidebar vertical em desktop, horizontal em mobile */}
          {cameraTracks.length > 0 && (
            <div className="lg:flex-[0_0_25%] flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden pb-2 lg:pb-0 px-2 lg:px-0">
              {cameraTracks.map((trackRef: TrackReference, index: number) => (
                <div
                  key={`camera-sidebar-${trackRef.participant.identity}-${index}`}
                  className="relative flex-shrink-0 lg:flex-shrink lg:w-full w-32 lg:h-auto h-24 lg:aspect-video rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                  style={{ backgroundColor: '#1a1a1a' }}
                >
                  {isVideoEnabled(trackRef.participant) ? (
                    <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center overflow-hidden">
                      <VideoTrack
                        trackRef={trackRef}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted rounded-2xl">
                      <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-base lg:text-xl">
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
                        className="max-w-full max-h-full object-cover rounded-3xl"
                        style={{ aspectRatio: '16/9' }}
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