import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const meetingIdRef = useRef<string>('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, currentText]);

  const startRecording = async () => {
    if (!meetingTitle.trim()) {
      setShowTitleDialog(true);
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Connect to transcription WebSocket
      const wsUrl = `wss://jwddiyuezqrpuakazvgg.functions.supabase.co/functions/v1/realtime-transcription`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Conectado ao serviço de transcrição');
        
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
          
          if (data.type === 'transcript_update') {
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
          console.error('Erro ao processar transcrição:', err);
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

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio to transcription service
          if (ws.readyState === WebSocket.OPEN) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Audio = (reader.result as string).split(',')[1];
              ws.send(JSON.stringify({
                type: 'audio_data',
                audio: base64Audio
              }));
            };
            reader.readAsDataURL(event.data);
          }
        }
      };

      mediaRecorder.start(1000); // 1 second chunks
      setIsRecording(true);

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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_transcription' }));
      wsRef.current.close();
    }

    setIsRecording(false);

    // Save recording and transcript
    await saveRecording();
  };

  const saveRecording = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get company_id
      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyData) throw new Error('Empresa não encontrada');

      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const fileName = `in-person-meeting-${Date.now()}.webm`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(fileName);

      // Save transcript to database
      const fullTranscript = transcript.map(t => t.text).join(' ');
      
      const { error: dbError } = await supabase
        .from('meeting_recordings')
        .insert({
          title: meetingTitle,
          room_id: null, // In-person meeting
          file_url: publicUrl,
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

      <Card>
        <CardHeader>
          <CardTitle>Reunião Presencial</CardTitle>
          <CardDescription>
            Grave áudio e transcreva reuniões presenciais em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isRecording ? (
            <div className="text-center py-8">
              <Mic className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Pronto para Gravar</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clique no botão abaixo para iniciar a gravação e transcrição
              </p>
              <Button onClick={() => setShowTitleDialog(true)} size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Iniciar Reunião Presencial
              </Button>
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
