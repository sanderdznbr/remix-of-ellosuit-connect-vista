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

const ZoomParticipantGrid: React.FC = () => {
  const participants = useParticipants();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

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
    <div className={cn(
      "zoom-participant-grid",
      getGridClass(participants.length)
    )}>
      {tracks.map((trackRef: TrackReference, index: number) => {
        const participant = trackRef.participant;
        const isLocal = participant.isLocal;
        const isMuted = isParticipantMuted(participant);
        const connectionQuality = getConnectionQuality(participant);
        
        return (
          <div key={`${participant.identity}-${index}`} className="zoom-participant-tile group">
            {trackRef.publication?.kind === Track.Kind.Video ? (
              <VideoTrack 
                trackRef={trackRef} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-3 mx-auto">
                    <span className="text-white text-xl font-semibold">
                      {getParticipantName(participant).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white text-sm">
                    {getParticipantName(participant)}
                  </p>
                </div>
              </div>
            )}

            {/* Participant Name */}
            <div className="zoom-participant-name">
              {getParticipantName(participant)}
              {isLocal && " (Você)"}
            </div>

            {/* Mute Indicator */}
            {isMuted && (
              <div className="zoom-mute-indicator">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Connection Quality */}
            <div className="zoom-participant-controls">
              <div className={cn(
                "w-2 h-2 rounded-full",
                `connection-${connectionQuality}`
              )} />
            </div>

            {/* Speaking Indicator */}
            {!isMuted && participant.isSpeaking && (
              <div className="absolute inset-0 border-2 border-green-400 rounded-xl animate-pulse" />
            )}
          </div>
        );
      })}

      {/* Show message if no participants */}
      {participants.length === 0 && (
        <div className="col-span-full flex items-center justify-center h-full text-white/60">
          <div className="text-center">
            <Wifi className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aguardando participantes...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoomParticipantGrid;