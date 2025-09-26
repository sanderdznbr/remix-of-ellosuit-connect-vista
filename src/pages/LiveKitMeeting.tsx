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
    <SimpleLiveKitRoom
      roomName={roomCode}
      participantName={user?.user_metadata?.full_name || 'Convidado'}
      onLeave={handleLeaveRoom}
    />
  );
};

export default LiveKitMeeting;