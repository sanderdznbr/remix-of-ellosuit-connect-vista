import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';

interface RoomContextCaptureProps {
  onRoomReady: (room: any) => void;
}

export const RoomContextCapture: React.FC<RoomContextCaptureProps> = ({ onRoomReady }) => {
  const room = useRoomContext();

  useEffect(() => {
    if (room) {
      onRoomReady(room);
    }
  }, [room, onRoomReady]);

  return null;
};
