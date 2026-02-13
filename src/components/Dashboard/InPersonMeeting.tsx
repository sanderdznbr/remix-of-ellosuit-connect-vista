import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
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
  const [isProcessingSpeakers, setIsProcessingSpeakers] = useState(false);
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);
  const [speakerMapping, setSpeakerMapping] = useState<Record<string, string>>({});
  const [identifiedSpeakers, setIdentifiedSpeakers] = useState<string[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const meetingIdRef = useRef<string>('');
  const lastTranscriptRef = useRef<string>('');
  const scribeConnectedRef = useRef(false);

  // Check if two texts are similar (for deduplication)
  const isSimilarText = (text1: string, text2: string): boolean => {
    if (!text1 || !text2) return false;
    const clean1 = text1.toLowerCase().trim().replace(/[.,!?]/g, '');
    const clean2 = text2.toLowerCase().trim().replace(/[.,!?]/g, '');
    if (clean1 === clean2) return true;
    const shorter = clean1.length < clean2.length ? clean1 : clean2;
    const longer = clean1.length < clean2.length ? clean2 : clean1;
    return longer.includes(shorter) && shorter.length / longer.length > 0.9;
  };

  // Scribe for real-time transcription
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      if (data.text && data.text.trim().length > 0) {
        setCurrentText(data.text);
      }
    },
    onCommittedTranscript: (data) => {
      if (data.text && data.text.trim().length > 3) {
        const isDuplicate = isSimilarText(data.text, lastTranscriptRef.current);
        if (!isDuplicate) {
          lastTranscriptRef.current = data.text;
          setTranscript(prev => [...prev, {
            text: data.text,
            timestamp: new Date().toISOString(),
            speaker: undefined
          }]);
          setCurrentText('');
        }
      }
    },
  });

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

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          deviceId: { exact: selectedDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false
      });

      setCurrentStream(stream);

      const audioTrack = stream.getAudioTracks()[0];
      console.log('✅ Usando dispositivo:', audioTrack.label);

      // Validate it's a real microphone
      const suspiciousDevices = [
        'stereo mix', 'loopback', 'monitor', 'what u hear', 
        'blackhole', 'soundflower', 'virtual audio', 'voicemeeter'
      ];
      const deviceNameLower = audioTrack.label.toLowerCase();
      if (suspiciousDevices.some(name => deviceNameLower.includes(name))) {
        stream.getTracks().forEach(track => track.stop());
        toast({
          title: "Dispositivo Inválido",
          description: "Por favor, selecione um microfone físico, não um dispositivo de loopback ou virtual",
          variant: "destructive"
        });
        return;
      }

      // ====== 1. Connect ElevenLabs Scribe for real-time transcription ======
      try {
        console.log('🎤 Obtendo token de transcrição...');
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('elevenlabs-scribe-token');

        if (tokenError || !tokenData?.token) {
          console.error('❌ Erro ao obter token:', tokenError);
          toast({
            title: 'Aviso',
            description: 'Transcrição em tempo real indisponível. A gravação continuará normalmente.',
          });
        } else {
          console.log('🔌 Conectando serviço de transcrição...');
          await scribe.connect({
            token: tokenData.token,
            microphone: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          scribeConnectedRef.current = true;
          console.log('✅ Serviço de transcrição conectado!');
        }
      } catch (scribeErr) {
        console.error('❌ Erro ao conectar transcrição:', scribeErr);
      }

      // ====== 2. Setup MediaRecorder for saving file ======
      meetingIdRef.current = `in-person-${Date.now()}`;
      setTranscript([]);
      setCurrentText('');
      lastTranscriptRef.current = '';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

      toast({
        title: "Reunião Iniciada",
        description: "Gravação e transcrição em andamento",
      });

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

    // Disconnect Scribe
    if (scribeConnectedRef.current) {
      try {
        scribe.disconnect();
      } catch (e) {
        console.error('Erro ao desconectar transcrição:', e);
      }
      scribeConnectedRef.current = false;
    }

    // Stop stream
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setCurrentStream(null);
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

      // Get public URL for AssemblyAI access
      const { data: publicUrlData } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(fileName);

      const fileUrl = publicUrlData.publicUrl;
      console.log('✅ URL pública gerada para AssemblyAI:', fileUrl);

      // Initial save with Whisper transcript
      const whisperTranscript = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      
      const { data: meetingData, error: dbError } = await supabase
        .from('in_person_meetings')
        .insert({
          title: meetingTitle,
          file_url: fileName, // Store just the filename, not the full URL
          transcript: whisperTranscript,
          created_by: user.id,
          company_id: companyData.company_id,
          duration_seconds: Math.floor(audioChunksRef.current.length),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "Reunião Salva",
        description: "Gravação e transcrição foram salvas com sucesso",
      });

      setShowSummary(true);
      // Não mostrar download options ainda - esperar mapeamento de speakers
      // setShowDownloadOptions(true);

      // Process speaker diarization in background with file URL
      processSpeakerDiarization(fileUrl, meetingData.id);

    } catch (error) {
      console.error('Erro ao salvar reunião:', error);
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar a reunião",
        variant: "destructive"
      });
    }
  };

  const processSpeakerDiarization = async (audioUrl: string, meetingId: string) => {
    try {
      setIsProcessingSpeakers(true);
      console.log('🎤 Processando identificação de speakers com AssemblyAI...');
      
      toast({
        title: "🎙️ Identificando Vozes",
        description: "Analisando tom de voz para identificar cada pessoa... Isso pode levar alguns minutos.",
        duration: 10000,
      });

      const { data, error } = await supabase.functions.invoke('speaker-diarization', {
        body: { audioUrl }
      });

      if (error) {
        console.error('Erro na função:', error);
        throw error;
      }

      if (data.success && data.segments && data.segments.length > 0) {
        console.log(`✅ AssemblyAI retornou ${data.speakerCount} speakers`);
        console.log('📊 Primeiros 5 segmentos:', data.segments.slice(0, 5).map((s: any) => ({ speaker: s.speaker, text: s.text.substring(0, 50) })));

        // Update transcript with speaker labels from AssemblyAI
        const updatedTranscript = data.segments.map((seg: any) => 
          `${seg.speaker}: ${seg.text}`
        ).join('\n');

        // Update the meeting record
        const { error: updateError } = await supabase
          .from('in_person_meetings')
          .update({ transcript: updatedTranscript })
          .eq('id', meetingId);

        if (updateError) {
          console.error('Erro ao atualizar reunião:', updateError);
          throw updateError;
        }

        // Update local transcript state with proper speaker labels
        const newTranscript = data.segments.map((seg: any) => ({
          text: seg.text,
          timestamp: new Date().toISOString(),
          speaker: seg.speaker
        }));
        setTranscript(newTranscript);

        // Identificar speakers únicos exatamente como retornado pelo AssemblyAI
        const uniqueSpeakers = Array.from(new Set(data.segments.map((seg: any) => seg.speaker as string))) as string[];
        console.log('👥 Speakers únicos encontrados:', uniqueSpeakers);
        console.log('📊 Total de speakers únicos:', uniqueSpeakers.length);
        
        setIdentifiedSpeakers(uniqueSpeakers);
        
        // Criar mapeamento inicial (vazio)
        const initialMapping: Record<string, string> = {};
        uniqueSpeakers.forEach((speaker: string) => {
          initialMapping[speaker] = ''; // Usuário preencherá
        });
        setSpeakerMapping(initialMapping);

        toast({
          title: "✅ Vozes Identificadas!",
          description: `${uniqueSpeakers.length} ${uniqueSpeakers.length === 1 ? 'pessoa identificada' : 'pessoas diferentes identificadas'} por tom de voz. Agora adicione os nomes.`,
          duration: 5000,
        });

        // Mostrar diálogo de mapeamento em vez de liberar os botões diretamente
        setShowSpeakerMapping(true);
      } else {
        throw new Error('Nenhum segmento retornado pelo AssemblyAI');
      }
    } catch (error) {
      console.error('❌ Erro ao processar speaker diarization:', error);
      
      // Fallback: usar numeração simples se AssemblyAI falhar
      const fallbackTranscript = transcript.map((msg, index) => ({
        ...msg,
        speaker: `Pessoa ${Math.floor(index / 3) + 1}` // Agrupa a cada 3 mensagens
      }));
      setTranscript(fallbackTranscript);
      
      toast({
        title: "Identificação Manual Aplicada",
        description: "Não foi possível analisar os tons de voz. Aplicada numeração sequencial.",
        variant: "default",
      });
    } finally {
      setIsProcessingSpeakers(false);
    }
  };

  // isSimilarText is defined above (before useScribe hook)

  const downloadTranscriptTXT = () => {
    const fullText = transcript.map(msg => {
      const speakerName = msg.speaker && speakerMapping[msg.speaker] 
        ? speakerMapping[msg.speaker] 
        : (msg.speaker || 'Pessoa 1');
      return `[${new Date(msg.timestamp).toLocaleTimeString()}] ${speakerName}: ${msg.text}`;
    }).join('\n\n');
    
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

  // Clean markdown formatting from AI-generated text
  const cleanMarkdownForPDF = (text: string): string => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic *text*
      .replace(/#{1,6}\s+/g, '') // Remove headers #
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url)
      .replace(/`([^`]+)`/g, '$1') // Remove code `text`
      .trim();
  };

  const processTranscriptWithAI = async (type: 'summary' | 'keypoints', customQuery?: string) => {
    setIsProcessingAI(true);
    try {
      const fullTranscript = transcript.map(msg => {
        const speakerName = msg.speaker && speakerMapping[msg.speaker] 
          ? speakerMapping[msg.speaker] 
          : (msg.speaker || 'Pessoa 1');
        return `[${new Date(msg.timestamp).toLocaleTimeString()}] ${speakerName}: ${msg.text}`;
      }).join('\n\n');

      let prompt = '';
      if (type === 'summary') {
        prompt = `Você é um assistente que cria resumos executivos de reuniões. Analise esta transcrição e crie um resumo profissional e conciso em português, SEM usar formatação markdown (sem asteriscos, sem hashtags). Use texto simples e organize em parágrafos claros. Destaque os principais tópicos discutidos, decisões tomadas e próximos passos:\n\n${fullTranscript}`;
      } else if (type === 'keypoints') {
        prompt = `Você é um assistente que identifica pontos-chave em reuniões. Analise esta transcrição e liste os pontos mais importantes em português, SEM usar formatação markdown (sem asteriscos, sem hashtags). Use texto simples com hífens (-) para listas. Liste: decisões tomadas, ações necessárias e tópicos relevantes:\n\n${fullTranscript}`;
      } else if (customQuery) {
        prompt = `Você é um assistente que ajuda a extrair informações específicas de transcrições de reuniões. O usuário quer saber: "${customQuery}"\n\nAnalise esta transcrição e forneça uma resposta precisa e detalhada em português, SEM usar formatação markdown:\n\n${fullTranscript}`;
      }

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [
            { role: 'user', content: prompt }
          ]
        }
      });

      if (error) throw error;

      // Clean any remaining markdown that might have slipped through
      const cleanedText = cleanMarkdownForPDF(data.message);
      return cleanedText;
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
          
          const speakerName = msg.speaker && speakerMapping[msg.speaker] 
            ? speakerMapping[msg.speaker] 
            : (msg.speaker || 'Pessoa 1');
          const header = `[${time}] ${speakerName}:`;
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
          
          yPosition += 8; // More space between different speakers
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
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Título da Reunião</DialogTitle>
            <DialogDescription>
              Insira um título para identificar esta reunião
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Reunião com Cliente X"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartWithTitle()}
                className="mt-2 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowTitleDialog(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleStartWithTitle}
                className="rounded-xl hover:scale-105 transition-transform"
              >
                Iniciar Reunião
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Speaker Mapping Dialog */}
      <Dialog open={showSpeakerMapping} onOpenChange={setShowSpeakerMapping}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Identificar Participantes</DialogTitle>
            <DialogDescription>
              {identifiedSpeakers.length} {identifiedSpeakers.length === 1 ? 'voz foi identificada' : 'vozes foram identificadas'} na reunião. 
              Adicione o nome de cada pessoa para gerar o PDF com identificação correta.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {identifiedSpeakers.map((speaker) => {
              // Encontrar exemplo de fala deste speaker
              const exampleText = transcript.find(t => t.speaker === speaker)?.text || '';
              const truncatedExample = exampleText.length > 100 
                ? exampleText.substring(0, 100) + '...' 
                : exampleText;

              return (
                <div key={speaker} className="space-y-2 p-4 border rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold text-primary">{speaker}</Label>
                    <span className="text-xs text-muted-foreground">
                      {transcript.filter(t => t.speaker === speaker).length} falas
                    </span>
                  </div>
                  
                  {truncatedExample && (
                    <div className="text-xs text-muted-foreground italic bg-background/50 p-2 rounded border">
                      "{truncatedExample}"
                    </div>
                  )}
                  
                  <Input
                    placeholder="Digite o nome da pessoa"
                    value={speakerMapping[speaker] || ''}
                    onChange={(e) => setSpeakerMapping(prev => ({
                      ...prev,
                      [speaker]: e.target.value
                    }))}
                    className="rounded-xl"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                // Pular mapeamento - usar labels originais
                setShowSpeakerMapping(false);
                setShowDownloadOptions(true);
              }}
              className="rounded-xl flex-1"
            >
              Pular e Usar Labels Originais
            </Button>
            <Button 
              onClick={() => {
                // Verificar se todos os campos foram preenchidos
                const allFilled = identifiedSpeakers.every(speaker => 
                  speakerMapping[speaker] && speakerMapping[speaker].trim() !== ''
                );
                
                if (!allFilled) {
                  toast({
                    title: "Campos Incompletos",
                    description: "Por favor, preencha o nome de todos os participantes ou clique em 'Pular'.",
                    variant: "destructive"
                  });
                  return;
                }
                
                setShowSpeakerMapping(false);
                setShowDownloadOptions(true);
                
                toast({
                  title: "Nomes Adicionados!",
                  description: "Os PDFs agora serão gerados com os nomes corretos dos participantes.",
                });
              }}
              className="rounded-xl flex-1 hover:scale-105 transition-transform"
            >
              Confirmar Nomes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Options Dialog */}
      <Dialog open={showDownloadOptions} onOpenChange={setShowDownloadOptions}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Opções de Download</DialogTitle>
            <DialogDescription>
              Escolha como deseja baixar a transcrição da reunião
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 rounded-xl hover:scale-105 transition-transform"
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
              className="w-full justify-start gap-3 h-auto py-4 rounded-xl hover:scale-105 transition-transform"
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
              className="w-full justify-start gap-3 h-auto py-4 rounded-xl hover:scale-105 transition-transform"
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

            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Search className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Busca Específica</span>
              </div>
              <Textarea
                placeholder="Ex: O que foi decidido sobre o orçamento?"
                value={specificQuery}
                onChange={(e) => setSpecificQuery(e.target.value)}
                className="min-h-[80px] rounded-xl"
              />
              <Button
                className="w-full rounded-xl hover:scale-105 transition-transform"
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


      {/* Main Recording Interface */}
      <Card className="border-none shadow-lg rounded-2xl">
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
                    className="relative h-32 w-32 rounded-full text-lg font-semibold shadow-2xl hover:scale-105 transition-transform bg-gradient-to-br from-primary to-primary/80"
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
              {/* Recording Header - Redesigned */}
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 rounded-2xl border border-red-200/50">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-red-700 dark:text-red-400">Gravando</p>
                    <p className="text-xs text-red-600/80 dark:text-red-300/80">{meetingTitle}</p>
                  </div>
                </div>
                <Button 
                  onClick={stopRecording} 
                  size="lg"
                  variant="destructive"
                  className="gap-2 font-semibold rounded-xl hover:scale-105 transition-transform"
                >
                  <Square className="h-4 w-4 fill-current" />
                  Encerrar
                </Button>
              </div>

              {/* Live Transcript */}
              <Card className="rounded-2xl border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Transcrição em Tempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] w-full rounded-xl border p-4 bg-muted/30" ref={scrollRef}>
                    <div className="space-y-3">
                      {transcript.map((msg, index) => (
                        <div key={index} className="border-l-2 border-primary/40 pl-3 py-2 animate-fade-in rounded-r-lg bg-background/50">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground font-medium">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                        </div>
                      ))}
                      
                      {currentText && (
                        <div className="border-l-2 border-primary/20 pl-3 py-2 animate-pulse rounded-r-lg bg-primary/5">
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
        <>
          {/* Loading state para processamento de speakers */}
          {isProcessingSpeakers && (
            <Card className="mt-6 border-2 border-blue-500/50 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20 animate-pulse rounded-2xl">
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">
                      Identificando Vozes...
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Analisando o tom de voz de cada participante para identificar pessoas automaticamente
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isProcessingSpeakers && !showSpeakerMapping && showDownloadOptions && (
            <Card className="mt-6 border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl">
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
                    className="gap-2 h-auto py-4 flex-col rounded-xl hover:scale-105 transition-transform"
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
                      scribeConnectedRef.current = false;
                      setSpeakerMapping({});
                      setIdentifiedSpeakers([]);
                    }}
                    className="gap-2 h-auto py-4 flex-col rounded-xl hover:scale-105 transition-transform"
                  >
                    <FileText className="h-6 w-6" />
                    <span className="text-sm font-semibold">Nova Reunião</span>
                  </Button>
                </div>
                <div className="bg-white/60 dark:bg-black/20 rounded-xl p-4 text-sm border border-green-200/50">
                  <p className="font-semibold mb-2 text-green-800 dark:text-green-300">Resumo:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• {transcript.length} segmentos transcritos</li>
                    <li>• {identifiedSpeakers.length > 0 ? `${identifiedSpeakers.length} participante(s) identificado(s)` : 'Identificando participantes...'}</li>
                    <li>• Gravação salva e disponível para download</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default InPersonMeeting;
