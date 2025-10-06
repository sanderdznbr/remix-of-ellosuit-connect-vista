import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Download, FileText, AlertTriangle, Sparkles, BookOpen, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AudioDeviceSelector } from './AudioDeviceSelector';
import { AudioVisualizer } from './AudioVisualizer';
import { Textarea } from '@/components/ui/textarea';
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
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [specificQuery, setSpecificQuery] = useState('');
  
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
      setShowDownloadOptions(true);

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

  const processTranscriptWithAI = async (type: 'summary' | 'keypoints', customQuery?: string) => {
    setIsProcessingAI(true);
    try {
      const fullTranscript = transcript.map(msg => 
        `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.speaker}: ${msg.text}`
      ).join('\n');

      let prompt = '';
      if (type === 'summary') {
        prompt = `Você é um assistente que cria resumos executivos de reuniões. Analise esta transcrição e crie um resumo profissional e conciso em português, destacando os principais tópicos discutidos, decisões tomadas e próximos passos:\n\n${fullTranscript}`;
      } else if (type === 'keypoints') {
        prompt = `Você é um assistente que identifica pontos-chave em reuniões. Analise esta transcrição e liste os pontos mais importantes, decisões tomadas, ações necessárias e tópicos relevantes em português. Organize em formato de lista:\n\n${fullTranscript}`;
      } else if (customQuery) {
        prompt = `Você é um assistente que ajuda a extrair informações específicas de transcrições de reuniões. O usuário quer saber: "${customQuery}"\n\nAnalise esta transcrição e forneça uma resposta precisa e detalhada em português:\n\n${fullTranscript}`;
      }

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [
            { role: 'user', content: prompt }
          ]
        }
      });

      if (error) throw error;

      return data.message;
    } catch (error) {
      console.error('Erro ao processar com IA:', error);
      toast({
        title: "Erro ao Processar",
        description: "Não foi possível processar a transcrição com IA",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessingAI(false);
    }
  };

  const downloadTranscriptPDF = async (content?: string, title?: string) => {
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
      const docTitle = title || 'Transcrição de Reunião';
      doc.text(docTitle, pageWidth / 2, 45, { align: 'center' });
      
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
      
      // Content
      doc.setFontSize(10);
      let yPosition = 85;
      
      if (content) {
        // AI-processed content
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(content, maxLineWidth);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
      } else {
        // Original transcript
        transcript.forEach((msg) => {
          const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          const speaker = msg.speaker || 'Pessoa 1';
          const header = `[${time}] ${speaker}:`;
          const text = msg.text;
          
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text(header, margin, yPosition);
          yPosition += 6;
          
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
          
          yPosition += 3;
        });
      }
      
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
      
      const filename = title 
        ? `${title.toLowerCase().replace(/\s+/g, '-')}-${meetingTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
        : `transcricao-${meetingTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(filename);
      
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
    <div className="w-full max-w-4xl mx-auto">
      {/* Title Dialog */}
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

      {/* Download Options Dialog */}
      <Dialog open={showDownloadOptions} onOpenChange={setShowDownloadOptions}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Opções de Download</DialogTitle>
            <DialogDescription>
              Escolha como deseja baixar a transcrição da reunião
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={async () => {
                await downloadTranscriptPDF();
                setShowDownloadOptions(false);
              }}
            >
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Transcrição Completa</div>
                <div className="text-xs text-muted-foreground">Download da transcrição original em PDF</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={async () => {
                const summary = await processTranscriptWithAI('summary');
                if (summary) {
                  await downloadTranscriptPDF(summary, 'Resumo Executivo');
                }
                setShowDownloadOptions(false);
              }}
              disabled={isProcessingAI}
            >
              {isProcessingAI ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
              <div className="text-left">
                <div className="font-semibold">Resumo da Reunião</div>
                <div className="text-xs text-muted-foreground">IA cria um resumo executivo da reunião</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={async () => {
                const keypoints = await processTranscriptWithAI('keypoints');
                if (keypoints) {
                  await downloadTranscriptPDF(keypoints, 'Pontos Importantes');
                }
                setShowDownloadOptions(false);
              }}
              disabled={isProcessingAI}
            >
              {isProcessingAI ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <BookOpen className="h-5 w-5 text-primary" />
              )}
              <div className="text-left">
                <div className="font-semibold">Pontos Importantes</div>
                <div className="text-xs text-muted-foreground">IA extrai os pontos-chave e decisões</div>
              </div>
            </Button>

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Busca Específica</span>
              </div>
              <Textarea
                placeholder="Ex: O que foi decidido sobre o orçamento?"
                value={specificQuery}
                onChange={(e) => setSpecificQuery(e.target.value)}
                className="min-h-[80px] mb-2"
              />
              <Button
                className="w-full"
                onClick={async () => {
                  if (!specificQuery.trim()) {
                    toast({
                      title: "Digite sua pergunta",
                      description: "Por favor, descreva o que você procura na transcrição",
                      variant: "destructive"
                    });
                    return;
                  }
                  const result = await processTranscriptWithAI('keypoints', specificQuery);
                  if (result) {
                    await downloadTranscriptPDF(result, 'Busca Específica');
                  }
                  setSpecificQuery('');
                  setShowDownloadOptions(false);
                }}
                disabled={isProcessingAI || !specificQuery.trim()}
              >
                {isProcessingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar e Baixar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Important Alert */}
      {!isRecording && (
        <Alert className="mb-6 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <strong className="block mb-2">Importante antes de gravar:</strong>
            <ul className="space-y-1 text-sm list-disc list-inside">
              <li>Feche abas com vídeos, músicas ou qualquer áudio</li>
              <li>Selecione um microfone físico real</li>
              <li>Use fones de ouvido para evitar eco</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Recording Interface */}
      <Card className="border-2">
        <CardContent className="pt-8 pb-8">
          {!isRecording ? (
            <div className="space-y-8">
              {/* Device Selector */}
              <div className="max-w-md mx-auto">
                <AudioDeviceSelector
                  selectedDeviceId={selectedDeviceId}
                  onDeviceSelect={setSelectedDeviceId}
                />
              </div>
              
              {/* Central Record Button */}
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-8 relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <Button 
                    onClick={() => setShowTitleDialog(true)} 
                    size="lg"
                    disabled={!selectedDeviceId}
                    className="relative h-32 w-32 rounded-full text-lg font-semibold shadow-2xl hover:scale-105 transition-transform"
                  >
                    <Mic className="h-12 w-12" />
                  </Button>
                </div>
                <h3 className="text-2xl font-bold mb-2">Pronto para Gravar</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  {selectedDeviceId 
                    ? 'Clique no botão acima para iniciar a gravação'
                    : 'Selecione um microfone para começar'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recording Header */}
              <div className="flex items-center justify-between p-6 bg-red-50 dark:bg-red-950/20 rounded-xl border-2 border-red-200">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">Gravando</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{meetingTitle}</p>
                  </div>
                </div>
                <Button 
                  onClick={stopRecording} 
                  size="lg"
                  variant="destructive"
                  className="gap-2 font-semibold"
                >
                  <Square className="h-5 w-5 fill-current" />
                  Encerrar
                </Button>
              </div>

              {/* Audio Visualizer */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-8">
                <AudioVisualizer stream={currentStream} />
              </div>

              {/* Live Transcript */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Transcrição em Tempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] w-full rounded-lg border-2 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {transcript.map((msg, index) => (
                        <div key={index} className="border-l-4 border-primary/40 pl-4 py-2 animate-fade-in">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded-full">
                              {msg.speaker || 'Pessoa 1'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                        </div>
                      ))}
                      
                      {currentText && (
                        <div className="border-l-4 border-primary/20 pl-4 py-2 animate-pulse">
                          <p className="text-xs text-muted-foreground mb-1">Transcrevendo...</p>
                          <p className="text-sm text-muted-foreground italic">{currentText}</p>
                        </div>
                      )}

                      {transcript.length === 0 && !currentText && (
                        <div className="text-center py-12">
                          <Mic className="h-12 w-12 mx-auto mb-3 text-primary/40 animate-pulse" />
                          <p className="font-medium text-muted-foreground">Aguardando fala...</p>
                          <p className="text-xs text-muted-foreground mt-1">Comece a falar para ver a transcrição</p>
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

      {/* Success Summary */}
      {showSummary && transcript.length > 0 && (
        <Card className="mt-6 border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Reunião Encerrada com Sucesso
            </CardTitle>
            <CardDescription>
              A gravação e transcrição foram salvas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => setShowDownloadOptions(true)}
                className="gap-2 h-auto py-4 flex-col"
              >
                <Download className="h-6 w-6" />
                <span className="text-sm font-semibold">Baixar Transcrição</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowSummary(false);
                  setTranscript([]);
                  setMeetingTitle('');
                  audioChunksRef.current = [];
                  lastTranscriptRef.current = '';
                  currentSpeakerRef.current = 1;
                  speakerCountRef.current = 1;
                }}
                className="gap-2 h-auto py-4 flex-col"
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm font-semibold">Nova Reunião</span>
              </Button>
            </div>
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-2 text-green-800 dark:text-green-300">Resumo:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {transcript.length} segmentos transcritos</li>
                <li>• {speakerCountRef.current} participante(s) identificado(s)</li>
                <li>• Gravação salva e disponível para download</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InPersonMeeting;
