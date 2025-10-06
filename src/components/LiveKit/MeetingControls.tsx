import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  Phone,
  Circle,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useLocalParticipant,
  useRoomContext
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MeetingControlsProps {
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onShareMeeting: () => void;
  onLeave: () => void;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  roomCode: string;
  companyId: string;
  onToggleTranscription: () => void;
}

const MeetingControls: React.FC<MeetingControlsProps> = ({
  onToggleChat,
  onToggleParticipants,
  onShareMeeting,
  onLeave,
  isChatOpen,
  isParticipantsOpen,
  roomCode,
  companyId,
  onToggleTranscription
}) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const { toast } = useToast();
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string>('');
  const [livekitRecordingId, setLivekitRecordingId] = useState<string>('');
  const [fallbackRecorder, setFallbackRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionWs, setTranscriptionWs] = useState<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const toggleMic = async () => {
    if (localParticipant) {
      const enabled = !micEnabled;
      await localParticipant.setMicrophoneEnabled(enabled);
      setMicEnabled(enabled);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      const enabled = !cameraEnabled;
      await localParticipant.setCameraEnabled(enabled);
      setCameraEnabled(enabled);
    }
  };

  const handleScreenShare = async () => {
    if (localParticipant) {
      try {
        if (isScreenSharing) {
          // Stop screen sharing
          await localParticipant.setScreenShareEnabled(false);
          setIsScreenSharing(false);
        } else {
          // Start screen sharing
          await localParticipant.setScreenShareEnabled(true);
          setIsScreenSharing(true);
        }
      } catch (error) {
        console.error('Screen share error:', error);
        toast({
          title: "Erro no compartilhamento",
          description: "Não foi possível compartilhar a tela",
          variant: "destructive"
        });
      }
    }
  };

  // Fallback recording using MediaRecorder
  const startFallbackRecording = async () => {
    try {
      // Get audio from room tracks
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      
      // Mix local and remote audio
      if (localParticipant?.audioTrackPublications.size > 0) {
        for (const publication of localParticipant.audioTrackPublications.values()) {
          if (publication.track) {
            const source = audioContext.createMediaStreamSource(new MediaStream([publication.track.mediaStreamTrack!]));
            source.connect(destination);
          }
        }
      }

      // Record the mixed audio
      const mediaRecorder = new MediaRecorder(destination.stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fileName = `meeting-${roomCode}-${Date.now()}.webm`;
        
        try {
          // Upload to Supabase Storage (private bucket)
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('meeting-recordings')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          // Resolve room_id from room_code
          const { data: roomRow, error: roomErr } = await supabase
            .from('meeting_rooms')
            .select('id')
            .eq('room_code', roomCode)
            .single();

          if (roomErr || !roomRow) {
            console.error('Room lookup failed for fallback recording:', roomErr);
            toast({
              title: 'Erro ao salvar',
              description: 'Não foi possível associar a gravação à sala.',
              variant: 'destructive'
            });
            return;
          }

          // Current user
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) throw new Error('User not authenticated');

          // Store storage path (bucket + path). UI will create signed URL when needed
          const storagePath = uploadData.path.startsWith('meeting-recordings/')
            ? uploadData.path
            : `meeting-recordings/${uploadData.path}`;

          const { error: insertErr } = await supabase.from('meeting_recordings').insert({
            room_id: roomRow.id,
            company_id: companyId,
            created_by: userData.user.id,
            title: `Gravação Local - ${new Date().toLocaleString('pt-BR')}`,
            file_url: storagePath,
          });

          if (insertErr) throw insertErr;

          toast({
            title: 'Gravação salva',
            description: 'Sua gravação local foi salva com sucesso!'
          });
        } catch (error) {
          console.error('Error saving fallback recording:', error);
          toast({
            title: 'Erro na gravação',
            description: 'Não foi possível salvar a gravação local.',
            variant: 'destructive'
          });
        }
      };

      mediaRecorder.start();
      setFallbackRecorder(mediaRecorder);
      return true;
    } catch (error) {
      console.error('Fallback recording failed:', error);
      return false;
    }
  };

  const handleRecording = async () => {
    try {
      if (isRecording) {
        // Stop recording
        const { error } = await supabase.functions.invoke('meeting-recording', {
          body: {
            action: 'stop',
            recordingId,
            livekitRecordingId,
            roomName: roomCode
          }
        });

        if (error) {
          console.warn('LiveKit stop failed, but continuing...');
        }

        // Stop fallback recorder if active
        if (fallbackRecorder) {
          fallbackRecorder.stop();
          setFallbackRecorder(null);
        }

        setIsRecording(false);
        setRecordingId('');
        setLivekitRecordingId('');
        
        // Stop transcription if active
        if (isTranscribing && transcriptionWs) {
          transcriptionWs.send(JSON.stringify({ type: 'stop_transcription' }));
          transcriptionWs.close();
          setTranscriptionWs(null);
          setIsTranscribing(false);
        }
        
        toast({
          title: "Gravação finalizada",
          description: "Sua reunião foi gravada com sucesso! Confira 'Ver Gravações' para baixar ou assistir.",
          duration: 5000,
        });
      } else {
        // Start recording
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('User not authenticated');

        let recordingStarted = false;

        try {
          // Try LiveKit recording first
          const { data, error } = await supabase.functions.invoke('meeting-recording', {
            body: {
              action: 'start',
              roomName: roomCode,
              userId: user.user.id,
              companyId
            }
          });

          if (!error && data) {
            setRecordingId(data.recording_id);
            setLivekitRecordingId(data.livekit_recording_id);
            recordingStarted = true;
            
            toast({
              title: "Gravação iniciada",
              description: "A reunião está sendo gravada pelo LiveKit",
            });
          }
        } catch (livekitError) {
          console.warn('LiveKit recording failed, trying fallback:', livekitError);
        }

        // Fallback to local recording if LiveKit failed
        if (!recordingStarted) {
          const fallbackSuccess = await startFallbackRecording();
          if (fallbackSuccess) {
            recordingStarted = true;
            toast({
              title: "Gravação local iniciada",
              description: "A reunião está sendo gravada localmente",
            });
          }
        }

        if (recordingStarted) {
          setIsRecording(true);
          // Auto-start transcription when recording starts
          startTranscription();
        } else {
          throw new Error('Nenhum método de gravação funcionou');
        }
      }
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Erro na gravação",
        description: "Não foi possível iniciar/parar a gravação",
        variant: "destructive"
      });
    }
  };

  const startAudioCapture = async (ws: WebSocket) => {
    try {
      console.log('🎤 Iniciando captura de áudio de TODOS os participantes...');
      
      if (!room) {
        console.error('❌ Room não disponível');
        return;
      }

      // Create audio context at 24kHz (required by Whisper)
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // Create destination to mix all audio
      const destination = audioContext.createMediaStreamDestination();

      // Get all participants including local
      const allParticipants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
      
      console.log(`📊 Total de participantes: ${allParticipants.length}`);

      let connectedCount = 0;
      
      // Connect each participant's audio
      for (const participant of allParticipants) {
        console.log(`🔍 Verificando participante: ${participant.name || participant.identity}`);
        
        // Get all audio track publications
        const audioPublications = [...participant.audioTrackPublications.values()];
        console.log(`  - ${audioPublications.length} publicações de áudio encontradas`);
        
        for (const publication of audioPublications) {
          if (publication.audioTrack?.mediaStreamTrack) {
            try {
              const track = publication.audioTrack.mediaStreamTrack;
              console.log(`  - Estado da track: ${track.readyState}, Enabled: ${track.enabled}`);
              
              const stream = new MediaStream([track]);
              const source = audioContext.createMediaStreamSource(stream);
              source.connect(destination);
              connectedCount++;
              
              console.log(`✅ Áudio conectado com sucesso: ${participant.name || participant.identity}`);
            } catch (err) {
              console.error(`❌ Erro ao conectar áudio de ${participant.name}:`, err);
            }
          } else {
            console.log(`  - Track de áudio não disponível`);
          }
        }
      }

      console.log(`📈 Total de streams de áudio conectados: ${connectedCount}`);

      if (connectedCount === 0) {
        console.warn('⚠️ Nenhum stream de áudio foi conectado!');
        toast({
          title: "Aviso",
          description: "Nenhum áudio detectado. Certifique-se de que os microfones estão habilitados.",
          variant: "destructive"
        });
        return;
      }

      // Store the mixed stream
      audioStreamRef.current = destination.stream;

      // Create MediaRecorder from mixed audio
      const mimeType = 'audio/webm;codecs=opus';
      console.log(`🎙️ Criando MediaRecorder com mimeType: ${mimeType}`);
      
      const recorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond: 16000
      });
      audioRecorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log(`📦 Áudio capturado: ${event.data.size} bytes, WebSocket estado: ${ws.readyState}`);
          
          if (ws.readyState === WebSocket.OPEN) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Audio = (reader.result as string).split(',')[1];
              console.log(`📤 Enviando ${base64Audio.length} caracteres base64 para transcrição`);
              
              ws.send(JSON.stringify({
                type: 'audio_data',
                audio: base64Audio
              }));
            };
            reader.onerror = (error) => {
              console.error('❌ Erro ao ler arquivo de áudio:', error);
            };
            reader.readAsDataURL(event.data);
          } else {
            console.warn('⚠️ WebSocket não está aberto, dados de áudio descartados');
          }
        }
      };

      recorder.onerror = (error) => {
        console.error('❌ Erro no MediaRecorder:', error);
      };

      recorder.onstart = () => {
        console.log('▶️ MediaRecorder iniciado');
      };

      recorder.onstop = () => {
        console.log('⏹️ MediaRecorder parado');
      };

      // Start recording with 1 second chunks
      recorder.start(1000);
      console.log('✅ Captura de áudio iniciada com sucesso!');

      toast({
        title: "Transcrição Ativa",
        description: `Capturando áudio de ${connectedCount} fonte(s)`,
      });

    } catch (error) {
      console.error('❌ Erro fatal ao capturar áudio:', error);
      toast({
        title: "Erro na Captura de Áudio",
        description: "Não foi possível capturar o áudio para transcrição",
        variant: "destructive"
      });
    }
  };

  const stopAudioCapture = () => {
    console.log('Parando captura de áudio...');
    
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const startTranscription = () => {
    try {
      console.log('🚀 Iniciando transcrição automática...');
      const wsUrl = `wss://jwddiyuezqrpuakazvgg.functions.supabase.co/functions/v1/realtime-transcription`;
      console.log(`📡 Conectando ao WebSocket: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket conectado com sucesso!');
        
        const startMessage = {
          type: 'start_transcription',
          roomId: roomCode
        };
        console.log('📤 Enviando mensagem de início:', startMessage);
        
        ws.send(JSON.stringify(startMessage));
        setIsTranscribing(true);
        setTranscriptionWs(ws);
        
        // Wait a bit for the session to be ready, then start audio capture
        setTimeout(() => {
          console.log('⏰ Iniciando captura de áudio após delay...');
          startAudioCapture(ws);
        }, 500);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 Mensagem recebida do servidor:', data.type);
          
          if (data.type === 'transcription_started') {
            console.log('✅ Transcrição iniciada no servidor');
          } else if (data.type === 'transcript_update') {
            console.log('📝 Atualização de transcrição recebida:', data.text?.substring(0, 50) + '...');
          } else if (data.type === 'error') {
            console.error('❌ Erro do servidor:', data.error);
          }
        } catch (err) {
          console.error('❌ Erro ao processar mensagem:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erro no WebSocket de transcrição:', error);
        stopAudioCapture();
        toast({
          title: "Erro na Transcrição",
          description: "Não foi possível conectar ao serviço de transcrição",
          variant: "destructive"
        });
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket fechado. Código: ${event.code}, Razão: ${event.reason}`);
        setTranscriptionWs(null);
        setIsTranscribing(false);
        stopAudioCapture();
      };
      
    } catch (error) {
      console.error('❌ Falha fatal ao iniciar transcrição:', error);
      toast({
        title: "Erro",
        description: "Falha ao iniciar sistema de transcrição",
        variant: "destructive"
      });
    }
  };

  // Auto-start transcription when room is ready and has participants
  useEffect(() => {
    if (room && roomCode && !isTranscribing && !transcriptionWs && localParticipant) {
      console.log('🎬 Preparando para auto-iniciar transcrição...');
      console.log(`  - Room code: ${roomCode}`);
      console.log(`  - Local participant: ${localParticipant.identity}`);
      console.log(`  - Remote participants: ${room.remoteParticipants.size}`);
      
      // Wait for room to be fully connected and audio tracks to be ready
      const timer = setTimeout(() => {
        console.log('⏰ Timer expirou, iniciando transcrição agora...');
        startTranscription();
      }, 3000);

      return () => {
        console.log('🧹 Limpando timer de auto-início');
        clearTimeout(timer);
      };
    }
  }, [room, roomCode, localParticipant]);

  const stopTranscription = () => {
    if (transcriptionWs) {
      transcriptionWs.send(JSON.stringify({ type: 'stop_transcription' }));
      transcriptionWs.close();
      setTranscriptionWs(null);
    }
    setIsTranscribing(false);
    stopAudioCapture();
  };

  // Auto-stop recording when component unmounts (user leaves meeting)
  React.useEffect(() => {
    return () => {
      if (isRecording) {
        // Auto-stop recording when leaving
        supabase.functions.invoke('meeting-recording', {
          body: {
            action: 'stop',
            recordingId,
            livekitRecordingId,
            roomName: roomCode
          }
        });
      }
      if (fallbackRecorder) {
        fallbackRecorder.stop();
      }
      if (transcriptionWs) {
        transcriptionWs.send(JSON.stringify({ type: 'stop_transcription' }));
        transcriptionWs.close();
      }
      stopAudioCapture();
    };
  }, [isRecording, recordingId, livekitRecordingId, transcriptionWs, fallbackRecorder, roomCode]);

  return (
    <div className="meeting-controls">
      <div className="meeting-controls-container">
        {/* Left side - Meeting info */}
        <div className="meeting-controls-left">
          <div className="flex items-center gap-2">
            <div className={cn(
              "recording-indicator",
              isRecording && "recording-active"
            )} />
            <span className="text-sm text-gray-700 font-medium">
              {isRecording ? "Gravando" : "Conectado"}
            </span>
          </div>
        </div>

        {/* Center - Main controls */}
        <div className="meeting-controls-center">
          {/* Audio Control */}
          <Button
            onClick={toggleMic}
            className={cn(
              "control-button",
              !micEnabled && "control-button-muted"
            )}
            size="lg"
          >
            {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          {/* Video Control */}
          <Button
            onClick={toggleCamera}
            className={cn(
              "control-button",
              !cameraEnabled && "control-button-muted"
            )}
            size="lg"
          >
            {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          {/* Screen Share */}
          <Button
            onClick={handleScreenShare}
            className={cn(
              "control-button",
              isScreenSharing && "control-button-active"
            )}
            size="lg"
          >
            <Monitor className="h-5 w-5" />
          </Button>

          {/* Recording Control */}
          <Button
            onClick={handleRecording}
            className={cn(
              "control-button",
              isRecording && "control-button-recording"
            )}
            size="lg"
          >
            {isRecording ? (
              <Square className="h-5 w-5 fill-current" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </Button>

          {/* End Call */}
          <Button
            onClick={async () => {
              // Check if I'm the host and mark room as inactive
              try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: roomData } = await supabase
                  .from('meeting_rooms')
                  .select('created_by')
                  .eq('room_code', roomCode)
                  .single();
                
                if (roomData && user && roomData.created_by === user.id) {
                  await supabase
                    .from('meeting_rooms')
                    .update({ 
                      is_active: false,
                      ended_at: new Date().toISOString()
                    })
                    .eq('room_code', roomCode);
                  
                  console.log('Room ended by host');
                  toast({
                    title: "Reunião encerrada",
                    description: "A sala foi encerrada para todos",
                  });
                }
              } catch (error) {
                console.error('Error ending room:', error);
              }
              
              // Stop transcription and recording
              stopTranscription();
              if (isRecording) {
                await handleRecording();
              }
              
              onLeave();
            }}
            className="control-button control-button-leave"
            size="lg"
          >
            <Phone className="h-5 w-5 rotate-[135deg]" />
          </Button>
        </div>

        {/* Right side - Empty for mobile responsiveness */}
        <div className="meeting-controls-right">
        </div>
      </div>
    </div>
  );
};

export default MeetingControls;