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
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ roomId, isActive }) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (isActive && !wsRef.current) {
      // Connect to transcription WebSocket
      const wsUrl = `wss://jwddiyuezqrpuakazvgg.functions.supabase.co/functions/v1/realtime-transcription`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to transcription service');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcript_update') {
          if (data.is_final) {
            setMessages(prev => [...prev, {
              text: data.text,
              is_final: true,
              timestamp: data.timestamp
            }]);
            setCurrentTranscript('');
          } else {
            setCurrentTranscript(data.text);
          }
          
          // Auto-scroll to bottom
          setTimeout(() => {
            if (scrollAreaRef.current) {
              scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
            }
          }, 100);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Transcription WebSocket closed');
        wsRef.current = null;
      };
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isActive]);

  const startTranscription = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start_transcription',
        roomId
      }));
      setIsTranscribing(true);
    }
  };

  const stopTranscription = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_transcription'
      }));
      setIsTranscribing(false);
    }
  };

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
        <h3 className="font-medium text-sm">Transcrição em Tempo Real</h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={isTranscribing ? stopTranscription : startTranscription}
            size="sm"
            variant={isTranscribing ? "destructive" : "default"}
            className="h-8"
          >
            {isTranscribing ? (
              <>
                <MicOff className="h-3 w-3 mr-1" />
                Parar
              </>
            ) : (
              <>
                <Mic className="h-3 w-3 mr-1" />
                Iniciar
              </>
            )}
          </Button>
          {messages.length > 0 && (
            <Button
              onClick={downloadTranscript}
              size="sm"
              variant="outline"
              className="h-8"
            >
              <Download className="h-3 w-3" />
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
          {isTranscribing && messages.length === 0 && !currentTranscript && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Mic className="h-8 w-8 mx-auto mb-2 animate-pulse" />
              <p>Aguardando áudio para transcrever...</p>
            </div>
          )}
          
          {!isTranscribing && messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <p>Clique em "Iniciar" para começar a transcrição em tempo real</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Recording indicator */}
      {isTranscribing && (
        <div className="p-2 border-t border-border bg-muted/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            Transcrevendo em tempo real
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionPanel;