import React from 'react';
import { 
  useTracks, 
  TrackReference, 
  VideoTrack,
  useParticipants 
} from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import { cn } from '@/lib/utils';
import { MicOff, Wifi } from 'lucide-react';
import ResizableVideoTile from './ResizableVideoTile';

const ZoomParticipantGrid: React.FC = () => {
  const participants = useParticipants();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Separate screen share tracks from camera tracks
  const screenShareTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera);
  const hasScreenShare = screenShareTracks.length > 0;

  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-1';
    if (count === 2) return 'grid-2';
    if (count <= 4) return 'grid-4';
    return 'grid-many';
  };

  const getParticipantName = (participant: Participant) => {
    return participant.name || participant.identity || 'Participante';
  };

  const isParticipantMuted = (participant: Participant) => {
    const audioTrack = participant.audioTrackPublications.values().next().value;
    return !audioTrack || audioTrack.isMuted;
  };

  const getConnectionQuality = (participant: Participant) => {
    // This would typically come from LiveKit's connection quality API
    return 'excellent'; // 'excellent', 'good', 'poor'
  };

  return (
    <div className="zoom-participant-grid-container">
      {/* Screen Share Area - Responsive Layout */}
      {hasScreenShare && (
        <div className="zoom-screenshare-area">
          <div className="w-full max-w-full overflow-hidden">
            {screenShareTracks.map((trackRef: TrackReference, index: number) => (
              <div
                key={`screenshare-${trackRef.participant.identity}-${index}`}
                className="w-full aspect-video bg-background rounded-lg overflow-hidden"
              >
                <ResizableVideoTile
                  trackRef={trackRef}
                  isScreenShare={true}
                  defaultWidth={800}
                  defaultHeight={450}
                />
              </div>
            ))}
          </div>
          
          {/* Camera carousel when screen sharing */}
          {cameraTracks.length > 0 && (
            <div className="mt-4 w-full">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                {cameraTracks.map((trackRef: TrackReference, index: number) => (
                  <div
                    key={`camera-carousel-${trackRef.participant.identity}-${index}`}
                    className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-background"
                  >
                    <ResizableVideoTile
                      trackRef={trackRef}
                      isScreenShare={false}
                      defaultWidth={128}
                      defaultHeight={80}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera Participants Grid - Only when no screen share */}
      {!hasScreenShare && (
        <div className={cn(
          "zoom-participant-grid",
          getGridClass(cameraTracks.length)
        )}>
          {cameraTracks.map((trackRef: TrackReference, index: number) => (
            <div
              key={`camera-${trackRef.participant.identity}-${index}`}
              className="aspect-video bg-background rounded-lg overflow-hidden"
            >
              <ResizableVideoTile
                trackRef={trackRef}
                isScreenShare={false}
                defaultWidth={320}
                defaultHeight={240}
              />
            </div>
          ))}

          {/* Show message if no participants */}
          {participants.length === 0 && (
            <div className="col-span-full flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Wifi className="h-16 w-16 mx-auto mb-6 text-gray-400" />
                <p className="text-xl font-medium">Aguardando participantes...</p>
                <p className="text-gray-400 mt-2">Convide pessoas para se juntar à reunião</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ZoomParticipantGrid;