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
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg">
                    <span className="text-white text-2xl font-bold">
                      {getParticipantName(participant).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-700 text-base font-medium">
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
              <div className="zoom-speaking-indicator" />
            )}
          </div>
        );
      })}

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
  );
};

export default ZoomParticipantGrid;