import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptionMessage {
  text: string;
  is_final: boolean;
  timestamp: string;
}

interface TranscriptionPanelProps {
  roomId: string;
  isActive: boolean;
  messages: TranscriptionMessage[];
  onMessagesUpdate: (messages: TranscriptionMessage[]) => void;
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ roomId, isActive, messages, onMessagesUpdate }) => {
  const [currentTranscript, setCurrentTranscript] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll quando novas mensagens chegam
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          }
        }
      }, 100);
    }
  }, [messages]);


  const downloadTranscript = () => {
    const fullText = messages.map(msg => 
      `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.text}`
    ).join('\n');
    
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${roomId}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isActive) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">Transcrição em Tempo Real</h3>
          {isActive && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Ativa
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              onClick={downloadTranscript}
              size="sm"
              variant="outline"
              className="h-8 gap-2"
            >
              <Download className="h-3 w-3" />
              <span className="text-xs">Baixar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Transcription Area */}
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div key={index} className="text-sm">
              <div className="text-xs text-muted-foreground mb-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
              <div className="text-foreground leading-relaxed">
                {message.text}
              </div>
            </div>
          ))}
          
          {/* Current transcript being typed */}
          {currentTranscript && (
            <div className="text-sm">
              <div className="text-xs text-muted-foreground mb-1">
                Transcrevendo...
              </div>
              <div className="text-muted-foreground leading-relaxed italic">
                {currentTranscript}
              </div>
            </div>
          )}
          
          {/* Status messages */}
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Mic className="h-8 w-8 mx-auto mb-2 text-primary animate-pulse" />
              <p className="font-medium">Aguardando Transcrição</p>
              <p className="text-xs mt-2">Certifique-se de que os microfones estão habilitados...</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Active indicator */}
      {isActive && (
        <div className="p-2 border-t border-border bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Transcrição ativa</span>
            </div>
            <span className="text-muted-foreground">
              {messages.length} segmento{messages.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionPanel;