import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import LiveKitRoomComponent from '@/components/LiveKit/LiveKitRoom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Video } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const LiveKitMeeting = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [participantName, setParticipantName] = useState(
    searchParams.get('name') || user?.user_metadata?.full_name || ''
  );
  const [showNameInput, setShowNameInput] = useState(!participantName);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!roomCode) {
      navigate('/dashboard/reunioes');
    }
  }, [roomCode, navigate]);

  const handleJoinRoom = () => {
    if (participantName.trim()) {
      setIsJoining(true);
      setShowNameInput(false);
    }
  };

  const handleLeaveRoom = () => {
    navigate('/dashboard/reunioes');
  };

  if (!roomCode) {
    return null;
  }

  if (showNameInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Video className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle>Entrar na Reunião</CardTitle>
            <CardDescription>
              Reunião: <span className="font-mono font-semibold text-blue-600">{roomCode}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Como você quer aparecer?</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/reunioes')}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleJoinRoom}
                disabled={!participantName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Video className="h-4 w-4 mr-2" />
                Entrar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isJoining) {
    return (
      <LiveKitRoomComponent
        roomName={roomCode}
        participantName={participantName}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return null;
};

export default LiveKitMeeting;