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
    if (isActive && !wsRef.current && roomId) {
      console.log('🎙️ TranscriptionPanel: Connecting to WebSocket for room:', roomId);
      // Connect to transcription WebSocket
      const wsUrl = `wss://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/realtime-transcription`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ TranscriptionPanel: Connected to transcription service');
        setIsTranscribing(true);
        // Auto-start transcription when panel opens
        const startMsg = {
          type: 'start_transcription',
          roomId
        };
        console.log('📤 TranscriptionPanel: Sending start message:', startMsg);
        ws.send(JSON.stringify(startMsg));
      };

      ws.onmessage = (event) => {
        console.log('📨 TranscriptionPanel: Received message:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcription_started') {
            console.log('✅ TranscriptionPanel: Transcription started successfully');
          } else if (data.type === 'transcript_update') {
            console.log('📝 TranscriptionPanel: Transcript update:', data);
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
                const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
                if (scrollElement) {
                  scrollElement.scrollTop = scrollElement.scrollHeight;
                }
              }
            }, 100);
          } else if (data.type === 'error') {
            console.error('❌ TranscriptionPanel: Error from server:', data.error);
          }
        } catch (error) {
          console.error('❌ TranscriptionPanel: Error parsing message:', error);
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
        // Send stop message before closing
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'stop_transcription'
          }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isActive, roomId]);


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
          {isTranscribing && (
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
          {messages.length === 0 && !currentTranscript && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Mic className="h-8 w-8 mx-auto mb-2 text-primary animate-pulse" />
              <p className="font-medium">Transcrição Automática Ativa</p>
              <p className="text-xs mt-2">Capturando áudio de todos os participantes...</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Active indicator */}
      <div className="p-2 border-t border-border bg-green-50 dark:bg-green-950/20">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">Transcrição ativa durante toda a reunião</span>
          </div>
          <span className="text-muted-foreground">
            {messages.length} segmento{messages.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionPanel;