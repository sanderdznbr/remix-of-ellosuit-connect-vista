import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, FileText, Sparkles, Target, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface MeetingExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  transcriptionMessages: Array<{text: string, is_final: boolean, timestamp: string, speaker?: string}>;
  roomName: string;
  savedAudioUrl?: string;
}

export const MeetingExitModal = ({ isOpen, onClose, onConfirmExit, transcriptionMessages, roomName, savedAudioUrl }: MeetingExitModalProps) => {
  const [downloadType, setDownloadType] = useState<'complete' | 'summary' | 'highlights' | 'specific' | null>(null);
  const [specificQuery, setSpecificQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingSpeakers, setIsProcessingSpeakers] = useState(false);
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);
  const [speakerMapping, setSpeakerMapping] = useState<Record<string, string>>({});
  const [identifiedSpeakers, setIdentifiedSpeakers] = useState<string[]>([]);
  const [processedTranscript, setProcessedTranscript] = useState<Array<{text: string, timestamp: string, speaker: string}>>([]);
  const { toast } = useToast();

  // Process speaker diarization when modal opens
  useEffect(() => {
    if (isOpen && savedAudioUrl && transcriptionMessages.length > 0 && !isProcessingSpeakers && identifiedSpeakers.length === 0) {
      processSpeakerDiarization();
    }
  }, [isOpen, savedAudioUrl]);

  const processSpeakerDiarization = async () => {
    if (!savedAudioUrl) {
      // No audio URL - use transcription as-is
      setProcessedTranscript(transcriptionMessages.filter(m => m.is_final).map(m => ({
        text: m.text,
        timestamp: m.timestamp,
        speaker: 'Participante'
      })));
      return;
    }

    setIsProcessingSpeakers(true);
    toast({
      title: "🎙️ Identificando Vozes",
      description: "Analisando tom de voz para identificar cada pessoa...",
      duration: 10000,
    });

    try {
      // Ensure audio URL is publicly accessible
      let publicAudioUrl = savedAudioUrl;
      
      // If it's a relative path or storage path, convert to public URL
      if (!savedAudioUrl.startsWith('http')) {
        const fileName = savedAudioUrl.split('/').pop();
        const { data: urlData } = await supabase.storage
          .from('meeting-recordings')
          .getPublicUrl(fileName || savedAudioUrl);
        publicAudioUrl = urlData.publicUrl;
      }

      console.log('🎤 Enviando para AssemblyAI:', publicAudioUrl);

      const { data, error } = await supabase.functions.invoke('speaker-diarization', {
        body: { audioUrl: publicAudioUrl }
      });

      if (error) {
        console.error('❌ Erro da edge function:', error);
        throw error;
      }

      console.log('📥 Resposta recebida:', data);

      if (data.success && data.segments && data.segments.length > 0) {
        console.log(`✅ Identificados ${data.speakerCount} speakers`);
        
        // Get unique speakers
        const speakers = Array.from(new Set(data.segments.map((s: any) => s.speaker))) as string[];
        setIdentifiedSpeakers(speakers);
        
        // Initialize speaker mapping
        const initialMapping: Record<string, string> = {};
        speakers.forEach((speaker: string) => {
          initialMapping[speaker] = '';
        });
        setSpeakerMapping(initialMapping);
        
        // Store processed transcript with speaker labels
        const transcript = data.segments.map((seg: any) => ({
          text: seg.text,
          timestamp: new Date().toISOString(),
          speaker: seg.speaker
        }));
        setProcessedTranscript(transcript);
        
        // Show speaker mapping dialog
        setShowSpeakerMapping(true);
        toast({
          title: "Vozes Identificadas",
          description: `${speakers.length} pessoa(s) detectada(s). Por favor, identifique cada uma.`,
        });
      } else {
        // No speakers detected, use generic labels
        setProcessedTranscript(transcriptionMessages.filter(m => m.is_final).map(m => ({
          text: m.text,
          timestamp: m.timestamp,
          speaker: 'Participante'
        })));
      }
    } catch (error) {
      console.error('Erro na diarização:', error);
      toast({
        title: "Não foi possível identificar vozes",
        description: "Usando transcrição sem identificação de speakers",
        variant: "destructive"
      });
      // Fallback to generic labels
      setProcessedTranscript(transcriptionMessages.filter(m => m.is_final).map(m => ({
        text: m.text,
        timestamp: m.timestamp,
        speaker: 'Participante'
      })));
    } finally {
      setIsProcessingSpeakers(false);
    }
  };

  const handleSpeakerMappingComplete = () => {
    // Apply speaker mapping to transcript
    const mappedTranscript = processedTranscript.map(item => ({
      ...item,
      speaker: speakerMapping[item.speaker] || item.speaker
    }));
    setProcessedTranscript(mappedTranscript);
    setShowSpeakerMapping(false);
    
    toast({
      title: "Mapeamento Concluído",
      description: "Agora você pode baixar a transcrição com os nomes corretos",
    });
  };

  const handleDownload = async (type: 'complete' | 'summary' | 'highlights' | 'specific') => {
    if (processedTranscript.length === 0) {
      toast({
        title: "Sem transcrição",
        description: "Aguarde o processamento da transcrição",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const fullTranscript = processedTranscript
        .map(msg => `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.speaker}: ${msg.text}`)
        .join('\n\n');

      if (type === 'complete') {
        // Download complete PDF
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Transcrição da Reunião', 20, 20);
        doc.setFontSize(10);
        doc.text(`Sala: ${roomName}`, 20, 30);
        doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 20, 36);
        
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(fullTranscript, 170);
        doc.text(lines, 20, 50);
        
        doc.save(`transcricao-reuniao-${roomName}-${Date.now()}.pdf`);
      } else if (type === 'summary' || type === 'highlights') {
        // Process with AI
        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: {
            messages: [
              {
                role: 'user',
                content: type === 'summary' 
                  ? `Faça um resumo executivo conciso desta transcrição de reunião:\n\n${fullTranscript}`
                  : `Liste os pontos mais importantes e decisões tomadas nesta reunião:\n\n${fullTranscript}`
              }
            ]
          }
        });

        if (error) throw error;

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(type === 'summary' ? 'Resumo da Reunião' : 'Pontos Importantes', 20, 20);
        doc.setFontSize(10);
        doc.text(`Sala: ${roomName}`, 20, 30);
        doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 20, 36);
        
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(data.response || '', 170);
        doc.text(lines, 20, 50);
        
        doc.save(`${type}-reuniao-${roomName}-${Date.now()}.pdf`);
      } else if (type === 'specific') {
        if (!specificQuery.trim()) {
          toast({
            title: "Consulta vazia",
            description: "Por favor, digite sua pergunta",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: {
            messages: [
              {
                role: 'user',
                content: `Com base nesta transcrição de reunião, responda: ${specificQuery}\n\nTranscrição:\n${fullTranscript}`
              }
            ]
          }
        });

        if (error) throw error;

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Consulta Específica', 20, 20);
        doc.setFontSize(10);
        doc.text(`Pergunta: ${specificQuery}`, 20, 30);
        doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 20, 36);
        
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(data.response || '', 170);
        doc.text(lines, 20, 50);
        
        doc.save(`consulta-reuniao-${roomName}-${Date.now()}.pdf`);
      }

      toast({
        title: "Download concluído",
        description: "O arquivo foi baixado com sucesso"
      });

      setDownloadType(null);
      setSpecificQuery('');
    } catch (error) {
      console.error('Error downloading:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível processar o download",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExit = () => {
    onConfirmExit();
    onClose();
  };

  // Show loading while processing speakers
  if (isProcessingSpeakers) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Processando Transcrição</DialogTitle>
            <DialogDescription>
              Identificando vozes e preparando a transcrição...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Analisando tom de voz de cada participante
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show speaker mapping dialog
  if (showSpeakerMapping) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Identificar Participantes</DialogTitle>
            <DialogDescription>
              {identifiedSpeakers.length} voz(es) detectada(s). Por favor, identifique cada pessoa:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {identifiedSpeakers.map((speaker) => (
              <div key={speaker} className="space-y-2">
                <Label htmlFor={speaker}>{speaker}</Label>
                <Input
                  id={speaker}
                  value={speakerMapping[speaker] || ''}
                  onChange={(e) => setSpeakerMapping({
                    ...speakerMapping,
                    [speaker]: e.target.value
                  })}
                  placeholder="Digite o nome da pessoa"
                />
              </div>
            ))}

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  // Skip mapping
                  setShowSpeakerMapping(false);
                }} 
                className="flex-1"
              >
                Pular Mapeamento
              </Button>
              <Button 
                onClick={handleSpeakerMappingComplete}
                className="flex-1"
                disabled={Object.values(speakerMapping).every(v => !v.trim())}
              >
                Confirmar Identificação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show download options
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sair da Reunião</DialogTitle>
          <DialogDescription>
            Você tem uma transcrição disponível. Deseja baixá-la antes de sair?
          </DialogDescription>
        </DialogHeader>

        {downloadType === null ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => handleDownload('complete')}
                disabled={isProcessing}
              >
                <FileText className="h-6 w-6" />
                <span>PDF Completo</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => handleDownload('summary')}
                disabled={isProcessing}
              >
                <Sparkles className="h-6 w-6" />
                <span>Resumo com IA</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => handleDownload('highlights')}
                disabled={isProcessing}
              >
                <Target className="h-6 w-6" />
                <span>Pontos Importantes</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => setDownloadType('specific')}
                disabled={isProcessing}
              >
                <Search className="h-6 w-6" />
                <span>Consulta Específica</span>
              </Button>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Voltar para Reunião
              </Button>
              <Button onClick={handleExit} variant="destructive" className="flex-1">
                Sair sem Download
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="specific-query">Digite sua pergunta sobre a reunião</Label>
              <Textarea
                id="specific-query"
                value={specificQuery}
                onChange={(e) => setSpecificQuery(e.target.value)}
                placeholder="Ex: Quais foram as decisões tomadas sobre o projeto X?"
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDownloadType(null);
                  setSpecificQuery('');
                }} 
                className="flex-1"
                disabled={isProcessing}
              >
                Voltar
              </Button>
              <Button 
                onClick={() => handleDownload('specific')} 
                className="flex-1"
                disabled={isProcessing || !specificQuery.trim()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Resposta
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};