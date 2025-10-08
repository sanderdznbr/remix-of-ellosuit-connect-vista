import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SimpleLiveKitRoom from '@/components/LiveKit/SimpleLiveKitRoom';
import { useAuth } from '@/hooks/useAuth';

const LiveKitMeeting = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!roomCode) {
    navigate('/dashboard/reunioes');
    return null;
  }

  const handleLeaveRoom = () => navigate('/dashboard/reunioes');

  return (
    <div data-meeting-page style={{
      backgroundColor: '#101010', 
      minHeight: '100vh', 
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden'
    }}>
      <SimpleLiveKitRoom
        roomName={roomCode}
        participantName={user?.user_metadata?.full_name || 'Convidado'}
        onLeave={handleLeaveRoom}
      />
    </div>
  );
};

export default LiveKitMeeting;