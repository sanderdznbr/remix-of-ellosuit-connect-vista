import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Bot, User, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WHATSAPP_NUMBER = '5541989015612';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

type Message = { role: 'user' | 'assistant'; content: string };

const SYSTEM_PROMPT = `Você é a assistente de suporte da Ellosuit. Seu papel é fazer um pré-atendimento rápido para entender a dúvida ou problema do usuário antes de direcioná-lo ao suporte humano via WhatsApp.

Regras:
- Seja breve, simpática e objetiva (máximo 2-3 frases por resposta)
- Faça no máximo 1-2 perguntas para entender melhor o problema
- Após entender o contexto, gere um resumo curto da situação e instrua o usuário a clicar no botão para ir ao WhatsApp
- Quando estiver pronto para direcionar, termine sua mensagem com a tag [PRONTO_PARA_WHATSAPP] (essa tag não será exibida ao usuário)
- Responda sempre em português brasileiro
- Não tente resolver o problema, apenas entenda e encaminhe`;

const SupportDashboard = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! 👋 Sou a assistente de suporte da Ellosuit. Antes de te direcionar para nosso time no WhatsApp, me conte rapidamente: qual é sua dúvida ou problema?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [readyForWhatsApp, setReadyForWhatsApp] = useState(false);
  const [summary, setSummary] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...newMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { messages: apiMessages },
      });

      if (error) throw error;

      let reply = data?.response || data?.message || 'Desculpe, tive um problema. Tente novamente.';
      
      if (reply.includes('[PRONTO_PARA_WHATSAPP]')) {
        reply = reply.replace('[PRONTO_PARA_WHATSAPP]', '').trim();
        setReadyForWhatsApp(true);
        // Build summary from conversation
        const userMessages = newMessages.filter(m => m.role === 'user').map(m => m.content).join(' | ');
        setSummary(userMessages);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      console.error('Support AI error:', e);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToWhatsApp = () => {
    const text = encodeURIComponent(`Olá! Preciso de suporte.\n\nResumo: ${summary}`);
    window.open(`${WHATSAPP_URL}?text=${text}`, '_blank');
  };

  const skipToWhatsApp = () => {
    window.open(WHATSAPP_URL, '_blank');
  };

  return (
    <div className="page-content p-4 md:p-6 bg-muted/30 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="text-center space-y-1 mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Suporte Ellosuit
          </h1>
          <p className="text-xs text-muted-foreground">
            Pré-atendimento inteligente • Atendimento humano via WhatsApp
          </p>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 border-none shadow-lg rounded-2xl bg-card flex flex-col overflow-hidden">
          <CardContent className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-1">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {readyForWhatsApp && (
              <div className="flex justify-center pt-2">
                <Button onClick={goToWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-6">
                  <MessageCircle className="h-4 w-4" />
                  Continuar no WhatsApp
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
                className="rounded-xl"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-xl shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <button
              onClick={skipToWhatsApp}
              className="w-full text-xs text-muted-foreground hover:text-foreground mt-2 underline-offset-2 hover:underline transition-colors"
            >
              Ir direto para o WhatsApp sem pré-atendimento
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SupportDashboard;
