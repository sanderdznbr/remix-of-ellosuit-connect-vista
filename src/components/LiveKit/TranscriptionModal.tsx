import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface TranscriptionMessage {
  text: string;
  is_final: boolean;
  timestamp: string;
  speaker?: string;
}

interface TranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: TranscriptionMessage[];
  isActive: boolean;
}

const TranscriptionModal: React.FC<TranscriptionModalProps> = ({
  isOpen,
  onClose,
  messages,
  isActive
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Log when modal opens and messages change
  useEffect(() => {
    console.log('🪟 [TranscriptionModal] Estado:', {
      isOpen,
      isActive,
      messagesCount: messages.length,
      messages: messages.slice(-3) // últimas 3 mensagens
    });
  }, [isOpen, isActive, messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, isOpen]);

  const downloadTranscript = () => {
    const transcript = messages
      .filter(msg => msg.is_final)
      .map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR');
        const speaker = msg.speaker ? `${msg.speaker}: ` : '';
        return `[${time}] ${speaker}${msg.text}`;
      })
      .join('\n\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricao-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const finalMessages = messages.filter(msg => msg.is_final);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Transcrição em Tempo Real</span>
              {isActive && (
                <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Transcrevendo...
                </span>
              )}
            </div>
            <Button
              onClick={downloadTranscript}
              disabled={finalMessages.length === 0}
              size="sm"
              variant="outline"
              className="ml-4"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Aguardando transcrição...
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  A transcrição aparecerá aqui em tempo real
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg transition-all ${
                    msg.is_final
                      ? 'bg-muted'
                      : 'bg-primary/10 border border-primary/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {msg.speaker && (
                      <span className="text-xs font-semibold text-primary">
                        {msg.speaker}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    {!msg.is_final && (
                      <span className="text-xs text-primary italic">
                        (provisório)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {isActive && messages.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center">
              A transcrição está sendo gerada em tempo real. Mensagens provisórias serão atualizadas automaticamente.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TranscriptionModal;
