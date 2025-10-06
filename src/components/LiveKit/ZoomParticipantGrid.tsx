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

  // Grid dinâmico inspirado no Google Meet: 1, 2, 4, 6, 9, etc.
  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 grid-rows-1';
    if (count === 2) return 'grid-cols-2 grid-rows-1';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    if (count <= 12) return 'grid-cols-4 grid-rows-3';
    return 'grid-cols-4 grid-rows-4';
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
    <div className="w-full h-full flex flex-col bg-background">
      {/* Screen Share Area */}
      {hasScreenShare && (
        <div className="flex-1 flex flex-col gap-3 p-3">
          <div className="flex-1 flex items-center justify-center">
            {screenShareTracks.map((trackRef: TrackReference, index: number) => (
              <div
                key={`screenshare-${trackRef.participant.identity}-${index}`}
                className="w-full h-full max-h-full flex items-center justify-center bg-black rounded-lg overflow-hidden"
              >
                <VideoTrack
                  trackRef={trackRef}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
          
          {/* Camera carousel quando há compartilhamento de tela */}
          {cameraTracks.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 px-2">
              {cameraTracks.map((trackRef: TrackReference, index: number) => (
                <div
                  key={`camera-carousel-${trackRef.participant.identity}-${index}`}
                  className="relative flex-shrink-0 w-32 h-24 bg-muted rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                >
                  {isVideoEnabled(trackRef.participant) ? (
                    <VideoTrack
                      trackRef={trackRef}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {getParticipantName(trackRef.participant).charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                    <span className="text-white text-xs font-medium bg-black/70 px-2 py-0.5 rounded truncate max-w-[80px]">
                      {getParticipantName(trackRef.participant)}
                    </span>
                    {isParticipantMuted(trackRef.participant) && (
                      <div className="bg-destructive rounded-full p-1">
                        <MicOff className="h-2.5 w-2.5 text-destructive-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Camera Grid - sem compartilhamento de tela */}
      {!hasScreenShare && (
        <div className="flex-1 flex items-center justify-center p-4">
          {cameraTracks.length === 0 ? (
            <div className="text-center">
              <Wifi className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-medium text-foreground">Aguardando participantes...</p>
              <p className="text-sm text-muted-foreground mt-2">Convide pessoas para se juntar à reunião</p>
            </div>
          ) : (
            <div className={cn(
              "grid gap-3 w-full h-full",
              cameraTracks.length === 1 && "max-w-3xl max-h-[500px]",
              getGridClass(cameraTracks.length)
            )}>
              {cameraTracks.map((trackRef: TrackReference, index: number) => (
                <div
                  key={`camera-${trackRef.participant.identity}-${index}`}
                  className="relative bg-muted rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all group"
                >
                  {isVideoEnabled(trackRef.participant) ? (
                    <VideoTrack
                      trackRef={trackRef}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-3xl">
                        {getParticipantName(trackRef.participant).charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  
                  {/* Participant info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
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