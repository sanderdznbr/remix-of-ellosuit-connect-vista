import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Download, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AudioDeviceSelector } from './AudioDeviceSelector';
import { AudioVisualizer } from './AudioVisualizer';

interface TranscriptMessage {
  text: string;
  timestamp: string;
}

const InPersonMeeting = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [otherAudioSources, setOtherAudioSources] = useState<string[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const meetingIdRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, currentText]);

  useEffect(() => {
    // Check for other audio sources
    checkOtherAudioSources();
  }, []);

  const checkOtherAudioSources = async () => {
    try {
      // This is a simple check - in reality, we can't reliably detect all audio sources
      // but we can warn users
      const sources: string[]= [];
      
      // Check if there are multiple tabs (approximate)
      if (performance.navigation.type === 0) {
        sources.push('Outras abas do navegador podem estar reproduzindo áudio');
      }
      
      setOtherAudioSources(sources);
    } catch (error) {
      console.error('Erro ao verificar fontes de áudio:', error);
    }
  };

  // Convert Float32Array to PCM16 base64
  const convertToPCM16Base64 = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  };

  const startRecording = async () => {
    if (!meetingTitle.trim()) {
      setShowTitleDialog(true);
      return;
    }

    if (!selectedDeviceId) {
      toast({
        title: "Selecione um Microfone",
        description: "Por favor, selecione um dispositivo de áudio antes de iniciar",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🎤 Iniciando gravação com dispositivo:', selectedDeviceId);

      // Request ONLY the selected microphone with strict constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          deviceId: { exact: selectedDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1,
        },
        video: false
      });

      setCurrentStream(stream);

      // Verify the audio track
      const audioTrack = stream.getAudioTracks()[0];
      console.log('✅ Usando dispositivo:', audioTrack.label);
      console.log('🎤 Configurações do track:', audioTrack.getSettings());

      // ====== 1. Setup AudioContext for PCM16 transcription ======
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      console.log('🎵 AudioContext criado - Sample Rate:', audioContextRef.current.sampleRate);

      // ====== 2. Connect to transcription WebSocket ======
      const wsUrl = `wss://jwddiyuezqrpuakazvgg.functions.supabase.co/functions/v1/realtime-transcription`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Conectado ao serviço de transcrição');
        setIsRecording(true);
        
        // Generate meeting ID
        meetingIdRef.current = `in-person-${Date.now()}`;
        
        ws.send(JSON.stringify({
          type: 'start_transcription',
          roomId: meetingIdRef.current
        }));

        toast({
          title: "Reunião Iniciada",
          description: "Gravação e transcrição em andamento",
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 WebSocket:', data.type);
          
          if (data.type === 'transcript_update') {
            console.log('📝 Transcrição:', data.text);
            if (data.is_final) {
              setTranscript(prev => [...prev, {
                text: data.text,
                timestamp: new Date().toISOString()
              }]);
              setCurrentText('');
            } else {
              setCurrentText(data.text);
            }
          }
        } catch (err) {
          console.error('❌ Erro ao processar transcrição:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        toast({
          title: "Erro na Transcrição",
          description: "Não foi possível conectar ao serviço de transcrição",
          variant: "destructive"
        });
      };

      // ====== 3. Process audio in real-time for transcription ======
      processorRef.current.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16Base64 = convertToPCM16Base64(inputData);
          
          ws.send(JSON.stringify({
            type: 'audio_data',
            audio: pcm16Base64
          }));
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      console.log('✅ Pipeline de áudio PCM16 conectado');

      // ====== 4. Setup MediaRecorder for saving file ======
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('💾 Salvando chunk para arquivo:', event.data.size, 'bytes');
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // 1 second chunks
      console.log('✅ MediaRecorder iniciado para salvar arquivo');

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = async () => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    // Clean up AudioContext pipeline
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop stream
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setCurrentStream(null);
    }

    // Close WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_transcription' }));
      wsRef.current.close();
    }

    setIsRecording(false);
    await saveRecording();
  };

  const saveRecording = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyData) throw new Error('Empresa não encontrada');

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const fileName = `in-person-meeting-${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(fileName);

      const fullTranscript = transcript.map(t => t.text).join(' ');
      
      const { error: dbError } = await supabase
        .from('in_person_meetings')
        .insert({
          title: meetingTitle,
          file_url: urlData.publicUrl,
          transcript: fullTranscript,
          created_by: user.id,
          company_id: companyData.company_id,
          duration_seconds: Math.floor(audioChunksRef.current.length),
        });

      if (dbError) throw dbError;

      toast({
        title: "Reunião Salva",
        description: "Gravação e transcrição foram salvas com sucesso",
      });

      setShowSummary(true);

    } catch (error) {
      console.error('Erro ao salvar reunião:', error);
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar a reunião",
        variant: "destructive"
      });
    }
  };

  const downloadTranscript = () => {
    const fullText = transcript.map(msg => 
      `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.text}`
    ).join('\n\n');
    
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${meetingTitle}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Iniciado",
      description: "A transcrição está sendo baixada",
    });
  };

  const handleStartWithTitle = () => {
    if (meetingTitle.trim()) {
      setShowTitleDialog(false);
      startRecording();
    } else {
      toast({
        title: "Título Obrigatório",
        description: "Por favor, insira um título para a reunião",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Título da Reunião</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Reunião com Cliente X"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartWithTitle()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTitleDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleStartWithTitle}>
                Iniciar Reunião
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {otherAudioSources.length > 0 && !isRecording && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Feche outras abas que estejam reproduzindo áudio antes de iniciar a gravação para garantir que apenas o microfone seja capturado.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reunião Presencial</CardTitle>
          <CardDescription>
            Grave áudio e transcreva reuniões presenciais em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isRecording ? (
            <div className="space-y-4">
              <AudioDeviceSelector
                selectedDeviceId={selectedDeviceId}
                onDeviceSelect={setSelectedDeviceId}
              />
              
              <div className="text-center py-8">
                <Mic className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Pronto para Gravar</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione um microfone e clique para iniciar
                </p>
                <Button 
                  onClick={() => setShowTitleDialog(true)} 
                  size="lg" 
                  className="gap-2"
                  disabled={!selectedDeviceId}
                >
                  <Mic className="h-5 w-5" />
                  Iniciar Reunião Presencial
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400">Gravando</p>
                    <p className="text-xs text-red-600 dark:text-red-300">{meetingTitle}</p>
                  </div>
                </div>
                <Button 
                  onClick={stopRecording} 
                  variant="destructive"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Encerrar Reunião
                </Button>
              </div>

              <AudioVisualizer stream={currentStream} />

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Transcrição em Tempo Real</CardTitle>
                    {transcript.length > 0 && (
                      <Button
                        onClick={downloadTranscript}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border p-4" ref={scrollRef}>
                    <div className="space-y-3">
                      {transcript.map((msg, index) => (
                        <div key={index} className="text-sm">
                          <div className="text-xs text-muted-foreground mb-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-foreground leading-relaxed">
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      
                      {currentText && (
                        <div className="text-sm">
                          <div className="text-xs text-muted-foreground mb-1">
                            Transcrevendo...
                          </div>
                          <div className="text-muted-foreground leading-relaxed italic">
                            {currentText}
                          </div>
                        </div>
                      )}

                      {transcript.length === 0 && !currentText && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          <Mic className="h-8 w-8 mx-auto mb-2 text-primary animate-pulse" />
                          <p className="font-medium">Aguardando fala...</p>
                          <p className="text-xs mt-2">Comece a falar para ver a transcrição</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {showSummary && transcript.length > 0 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">Reunião Encerrada</CardTitle>
            <CardDescription>
              A gravação e transcrição foram salvas com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button onClick={downloadTranscript} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Baixar Transcrição
              </Button>
              <Button 
                onClick={() => {
                  setShowSummary(false);
                  setTranscript([]);
                  setMeetingTitle('');
                  audioChunksRef.current = [];
                }}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Nova Reunião
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Resumo:</p>
              <p>• {transcript.length} segmentos transcritos</p>
              <p>• Gravação salva no sistema</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InPersonMeeting;
