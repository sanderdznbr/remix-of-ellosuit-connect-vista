import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Loader2, FileDown, Eye } from 'lucide-react';
import SavedMeetingDownloadModal from './SavedMeetingDownloadModal';

interface MeetingReference {
  id: string;
  title: string;
  date: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  meetings?: MeetingReference[];
}

interface MeetingData {
  id: string;
  title: string;
  transcript: string;
  created_at: string;
  duration_seconds: number;
  file_url: string;
  speaker_mapping?: Record<string, string>;
  transcript_with_timestamps?: Array<{
    timestamp_seconds: number;
    speaker: string;
    text: string;
  }>;
}

const MeetingsChatAI = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingData | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMeetings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('in_person_meetings')
        .select('id, title, transcript, created_at, duration_seconds, file_url, speaker_mapping, transcript_with_timestamps')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings((data || []) as MeetingData[]);
    } catch (error) {
      console.error('Erro ao carregar reuniões:', error);
    }
  };

  const buildMeetingsContext = () => {
    return meetings.map(meeting => {
      const date = new Date(meeting.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const speakerInfo = meeting.speaker_mapping 
        ? `\nParticipantes: ${Object.values(meeting.speaker_mapping).join(', ')}`
        : '';
      
      return `
ID: ${meeting.id}
Reunião: ${meeting.title}
Data: ${date}${speakerInfo}
Transcrição: ${meeting.transcript.substring(0, 800)}...
---
`;
    }).join('\n');
  };

  const extractMeetingReferences = (text: string): MeetingReference[] => {
    const references: MeetingReference[] = [];
    
    // Procura por menções de reuniões no texto
    meetings.forEach(meeting => {
      const titleLower = meeting.title.toLowerCase();
      const textLower = text.toLowerCase();
      const date = new Date(meeting.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
      
      // Se a IA mencionar o título ou a data da reunião
      if (textLower.includes(titleLower) || text.includes(date)) {
        references.push({
          id: meeting.id,
          title: meeting.title,
          date: date
        });
      }
    });
    
    return references;
  };

  const handleViewMeeting = (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      // Aqui você pode abrir um modal para visualizar a reunião
      toast({
        title: 'Visualizar Reunião',
        description: `Abrindo: ${meeting.title}`
      });
    }
  };

  const handleDownloadMeeting = (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setSelectedMeeting(meeting);
      setShowDownloadModal(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const meetingsContext = buildMeetingsContext();
      
      const systemPrompt = `Você é um assistente especializado em analisar reuniões. 
Você tem acesso ao histórico completo de reuniões do usuário.
Responda de forma clara, concisa e em português.

IMPORTANTE: Quando mencionar reuniões específicas, sempre inclua:
- O título EXATO da reunião
- A data no formato DD/MM/YYYY
- Use o ID da reunião quando disponível no contexto

Use as informações das reuniões para responder perguntas sobre:
- Quem participou de reuniões específicas
- O que foi discutido em determinadas datas
- Decisões tomadas
- Ações definidas
- Qualquer informação presente nas transcrições

Histórico de Reuniões:
${meetingsContext}`;

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
            userMessage
          ]
        }
      });

      if (error) throw error;

      const responseText = data.response || 'Desculpe, não consegui processar sua solicitação.';
      const meetingRefs = extractMeetingReferences(responseText);

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText,
        meetings: meetingRefs.length > 0 ? meetingRefs : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar sua mensagem',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Card className="h-[calc(100vh-12rem)] flex flex-col">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">IA - Assistente de Reuniões</h3>
              <p className="text-sm text-muted-foreground font-normal">
                Faça perguntas sobre suas {meetings.length} reuniões anteriores
              </p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-3xl flex items-center justify-center">
                    <Bot className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Olá! Como posso ajudar?
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Tenho acesso a {meetings.length} reuniõe(s) salva(s).
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                    <Badge variant="secondary" className="text-xs">
                      Quem participou da reunião?
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      O que foi decidido?
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Resumir reunião
                    </Badge>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 max-w-[75%]">
                    <div
                      className={`rounded-2xl p-4 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-card border border-border'
                      }`}
                    >
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        message.role === 'user' ? 'text-white' : 'text-foreground'
                      }`}>
                        {message.content}
                      </p>
                    </div>
                    
                    {/* Botões de Ação para Reuniões Mencionadas */}
                    {message.role === 'assistant' && message.meetings && message.meetings.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        <p className="text-xs text-muted-foreground font-medium">
                          Reuniões mencionadas:
                        </p>
                        {message.meetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {meeting.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {meeting.date}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewMeeting(meeting.id)}
                                className="h-8 px-2"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadMeeting(meeting.id)}
                                className="h-8 px-2"
                              >
                                <FileDown className="h-3 w-3 mr-1" />
                                Baixar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t bg-muted/30 p-4">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pergunte sobre suas reuniões..."
                disabled={isLoading}
                className="flex-1 rounded-xl border-border h-11"
              />
              <Button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-11 w-11 rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedMeeting && (
        <SavedMeetingDownloadModal
          isOpen={showDownloadModal}
          onClose={() => {
            setShowDownloadModal(false);
            setSelectedMeeting(null);
          }}
          meeting={selectedMeeting}
        />
      )}
    </>
  );
};

export default MeetingsChatAI;
