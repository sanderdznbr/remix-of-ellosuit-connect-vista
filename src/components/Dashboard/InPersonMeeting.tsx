import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Download, FileText, AlertTriangle, ChevronDown } from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { jsPDF } from 'jspdf';
import ellosuitLogo from '@/assets/ellosuit-logo.png';

interface TranscriptMessage {
  text: string;
  timestamp: string;
  speaker?: string;
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
  const audioBufferRef = useRef<Int16Array>(new Int16Array(0));
  const lastSendTimeRef = useRef<number>(0);
  const lastTranscriptRef = useRef<string>('');
  const lastSpeakerTimeRef = useRef<number>(Date.now());
  const currentSpeakerRef = useRef<number>(1);
  const speakerCountRef = useRef<number>(1);

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

  // Accumulate audio buffer and send when threshold is met
  const accumulateAndSendAudio = (pcm16Data: Int16Array) => {
    // Accumulate audio in buffer
    const combined = new Int16Array(audioBufferRef.current.length + pcm16Data.length);
    combined.set(audioBufferRef.current);
    combined.set(pcm16Data, audioBufferRef.current.length);
    audioBufferRef.current = combined;

    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    const bufferDurationMs = (audioBufferRef.current.length / 24000) * 1000;

    // Send only if:
    // 1. Buffer has at least 3 seconds of audio
    // 2. At least 2 seconds passed since last send
    if (bufferDurationMs >= 3000 && timeSinceLastSend >= 2000) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log(`🎵 Enviando ${audioBufferRef.current.length} samples (${bufferDurationMs.toFixed(0)}ms)`);
        
        // Convert to Uint8Array for base64 encoding
        const uint8Array = new Uint8Array(audioBufferRef.current.buffer);
        let binary = '';
        const chunkSize = 0x8000;
        
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        const base64Audio = btoa(binary);
        
        wsRef.current.send(JSON.stringify({
          type: 'audio_data',
          audio: base64Audio
        }));

        // Clear buffer and update timestamp
        audioBufferRef.current = new Int16Array(0);
        lastSendTimeRef.current = now;
      }
    }
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
      const settings = audioTrack.getSettings();
      
      console.log('✅ Usando dispositivo:', audioTrack.label);
      console.log('🎤 Configurações completas:', {
        deviceId: settings.deviceId,
        groupId: settings.groupId,
        label: audioTrack.label,
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl
      });

      // Validate it's a real microphone, not a loopback/virtual device
      const suspiciousDevices = [
        'stereo mix', 'loopback', 'monitor', 'what u hear', 
        'blackhole', 'soundflower', 'virtual audio', 'voicemeeter'
      ];
      
      const deviceNameLower = audioTrack.label.toLowerCase();
      const isSuspicious = suspiciousDevices.some(name => deviceNameLower.includes(name));
      
      if (isSuspicious) {
        stream.getTracks().forEach(track => track.stop());
        toast({
          title: "Dispositivo Inválido",
          description: "Por favor, selecione um microfone físico, não um dispositivo de loopback ou virtual",
          variant: "destructive"
        });
        return;
      }

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
        
        // Reset audio buffer and timestamp
        audioBufferRef.current = new Int16Array(0);
        lastSendTimeRef.current = Date.now();
        
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
              // Check for duplicate text
              const isDuplicate = isSimilarText(data.text, lastTranscriptRef.current);
              
              if (!isDuplicate && data.text.trim().length > 0) {
                // Detect speaker change based on time gap
                const now = Date.now();
                const timeSinceLastSpeaker = now - lastSpeakerTimeRef.current;
                
                // If more than 3 seconds passed, consider it a new speaker
                if (timeSinceLastSpeaker > 3000 && transcript.length > 0) {
                  currentSpeakerRef.current++;
                  if (currentSpeakerRef.current > speakerCountRef.current) {
                    speakerCountRef.current = currentSpeakerRef.current;
                  }
                }
                
                lastSpeakerTimeRef.current = now;
                lastTranscriptRef.current = data.text;
                
                setTranscript(prev => [...prev, {
                  text: data.text,
                  timestamp: new Date().toISOString(),
                  speaker: `Pessoa ${currentSpeakerRef.current}`
                }]);
                setCurrentText('');
              } else {
                console.log('⏭️ Texto duplicado ignorado:', data.text);
              }
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
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 (PCM16)
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Accumulate audio and send when buffer is large enough
        accumulateAndSendAudio(int16Data);
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
    // Send any remaining audio in buffer before stopping
    if (audioBufferRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`🎵 Enviando áudio final: ${audioBufferRef.current.length} samples`);
      
      const uint8Array = new Uint8Array(audioBufferRef.current.buffer);
      let binary = '';
      const chunkSize = 0x8000;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binary);
      
      wsRef.current.send(JSON.stringify({
        type: 'audio_data',
        audio: base64Audio
      }));
    }

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

    // Close WebSocket with a small delay to allow final audio to be processed
    setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'stop_transcription' }));
        wsRef.current.close();
      }
    }, 500);

    // Clear audio buffer
    audioBufferRef.current = new Int16Array(0);

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

  // Check if two texts are similar (for deduplication)
  const isSimilarText = (text1: string, text2: string): boolean => {
    if (!text1 || !text2) return false;
    
    const clean1 = text1.toLowerCase().trim().replace(/[.,!?]/g, '');
    const clean2 = text2.toLowerCase().trim().replace(/[.,!?]/g, '');
    
    // Exact match
    if (clean1 === clean2) return true;
    
    // Check if one contains the other (90% threshold)
    const shorter = clean1.length < clean2.length ? clean1 : clean2;
    const longer = clean1.length < clean2.length ? clean2 : clean1;
    
    return longer.includes(shorter) && shorter.length / longer.length > 0.9;
  };

  const downloadTranscriptTXT = () => {
    const fullText = transcript.map(msg => 
      `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.speaker || 'Pessoa 1'}: ${msg.text}`
    ).join('\n\n');
    
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricao-${meetingTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download TXT Iniciado",
      description: "A transcrição em texto está sendo baixada",
    });
  };

  const downloadTranscriptPDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxLineWidth = pageWidth - 2 * margin;
      
      // Add logo
      const img = new Image();
      img.src = ellosuitLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      doc.addImage(img, 'PNG', margin, 15, 50, 15);
      
      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Transcrição de Reunião', pageWidth / 2, 45, { align: 'center' });
      
      // Meeting info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const meetingDate = new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      doc.text(`Reunião: ${meetingTitle}`, margin, 60);
      doc.text(`Data: ${meetingDate}`, margin, 68);
      
      // Line separator
      doc.setLineWidth(0.5);
      doc.line(margin, 75, pageWidth - margin, 75);
      
      // Transcript content
      doc.setFontSize(10);
      let yPosition = 85;
      
      transcript.forEach((msg, index) => {
        const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        const speaker = msg.speaker || 'Pessoa 1';
        const header = `[${time}] ${speaker}:`;
        const text = msg.text;
        
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Add timestamp and speaker
        doc.setFont('helvetica', 'bold');
        doc.text(header, margin, yPosition);
        yPosition += 6;
        
        // Add transcript text (wrap long lines)
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(text, maxLineWidth);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
        
        yPosition += 3; // Space between messages
      });
      
      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      doc.save(`transcricao-${meetingTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Download PDF Iniciado",
        description: "A transcrição em PDF está sendo baixada",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao Gerar PDF",
        description: "Não foi possível gerar o PDF. Tente baixar em TXT.",
        variant: "destructive"
      });
    }
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

      {!isRecording && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <strong>Importante antes de gravar:</strong>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li>Feche TODAS as abas com vídeos, músicas ou qualquer áudio (YouTube, Spotify, etc.)</li>
              <li>Selecione um microfone físico real, não um dispositivo virtual ou de loopback</li>
              <li>Use fones de ouvido para evitar feedback e eco</li>
              <li>Teste o microfone antes de iniciar a gravação</li>
            </ul>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Baixar
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={downloadTranscriptPDF}>
                            <FileText className="h-4 w-4 mr-2" />
                            Baixar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={downloadTranscriptTXT}>
                            <Download className="h-4 w-4 mr-2" />
                            Baixar TXT
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border p-4" ref={scrollRef}>
                    <div className="space-y-3">
                      {transcript.map((msg, index) => (
                        <div key={index} className="text-sm border-l-2 border-primary/30 pl-3 py-2">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                            <span className="font-semibold text-primary">{msg.speaker || 'Pessoa 1'}</span>
                            <span>•</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Baixar Transcrição
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={downloadTranscriptPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadTranscriptTXT}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar TXT
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                onClick={() => {
                  setShowSummary(false);
                  setTranscript([]);
                  setMeetingTitle('');
                  audioChunksRef.current = [];
                  lastTranscriptRef.current = '';
                  currentSpeakerRef.current = 1;
                  speakerCountRef.current = 1;
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
