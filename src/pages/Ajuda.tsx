import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { BookOpen, Zap, Calculator, CreditCard, RefreshCw, ArrowUpCircle, Send, Bot, MessageCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const WHATSAPP_NUMBER = '5511999999999';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20elloContent`;

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const AISupportChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-support-chat', {
        body: { messages: allMessages },
      });
      if (error) throw error;
      setMessages(prev => [...prev, { role: 'assistant', content: data?.reply || 'Desculpe, ocorreu um erro.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar com o suporte. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.06]" style={{ backgroundColor: '#0d0d14' }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]" style={{ backgroundColor: '#111118' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Suporte IA</p>
          <p className="text-xs text-white/40">Tire suas dúvidas antes de falar com um humano</p>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[340px] overflow-y-auto px-5 py-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' as any }}>
        {messages.length === 0 && (
          <div className="text-center py-10">
            <Bot className="w-10 h-10 mx-auto text-white/20 mb-3" />
            <p className="text-sm text-white/30">Pergunte qualquer coisa sobre o elloContent!</p>
            <p className="text-xs text-white/20 mt-1">Créditos, planos, funcionalidades...</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'text-white rounded-br-md'
                  : 'text-white/80 rounded-bl-md border border-white/[0.06]'
              }`}
              style={{
                backgroundColor: msg.role === 'user' ? '#7C3AED' : '#16161e',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-md border border-white/[0.06] text-sm text-white/50" style={{ backgroundColor: '#16161e' }}>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/[0.06] flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Digite sua dúvida..."
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-purple-500/40 transition-colors"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-30 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* WhatsApp fallback */}
      <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-center gap-2">
        <p className="text-xs text-white/30">Ainda precisa de ajuda?</p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-green-400 hover:text-green-300 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Falar no WhatsApp
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

const faqSections = [
  {
    icon: Calculator,
    title: 'Custo por Card',
    items: [
      { label: 'Simples', value: '1 crédito/card' },
      { label: 'Avançado (Pro)', value: '2 créditos/card' },
      { label: 'Extreme', value: '2 créditos/card' },
      { label: 'Pro + Rosto (Face)', value: '4 créditos/card' },
      { label: 'Tweet', value: '1 crédito/card' },
      { label: 'Pesquisa Web', value: '+1 crédito fixo (quando ativada)' },
    ],
  },
  {
    icon: Zap,
    title: 'Exemplos Práticos',
    items: [
      { label: 'Post Simples (1 card)', value: '1 crédito' },
      { label: 'Carrossel 5 cards Simples', value: '5 créditos' },
      { label: 'Carrossel 8 cards Pro', value: '16 créditos' },
      { label: 'Carrossel 5 cards Pro + Pesquisa Web', value: '11 créditos' },
      { label: 'Carrossel 6 cards Pro + Face', value: '24 créditos' },
      { label: 'Carrossel 5 cards Extreme', value: '10 créditos' },
    ],
  },
  {
    icon: RefreshCw,
    title: 'Renovação de Créditos',
    items: [
      { label: 'Quando renova?', value: 'Todo mês na data de contratação' },
      { label: 'Créditos acumulam?', value: 'Não, créditos mensais são renovados' },
      { label: 'Créditos extras', value: 'Podem ser comprados a qualquer momento' },
      { label: 'Créditos bônus', value: 'Aparecem separados e não expiram com o plano' },
    ],
  },
  {
    icon: ArrowUpCircle,
    title: 'Upgrade de Plano',
    items: [
      { label: 'Como funciona?', value: 'Paga só a diferença proporcional' },
      { label: 'Data de renovação', value: 'Mantém a data do primeiro plano' },
      { label: 'Créditos antigos', value: 'Nunca são removidos — só somam os novos' },
    ],
  },
  {
    icon: CreditCard,
    title: 'Pagamento',
    items: [
      { label: 'Cartão de crédito', value: 'Disponível para todos os planos' },
      { label: 'PIX', value: 'Disponível apenas para planos anuais' },
      { label: 'Parcelamento', value: 'Planos anuais podem ser parcelados no cartão' },
    ],
  },
];

const Ajuda: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Central de Ajuda</h1>
            <p className="text-sm text-white/40">Tire suas dúvidas sobre créditos, planos e funcionalidades</p>
          </div>
        </div>

        {/* AI Chat */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Suporte Inteligente
          </h2>
          <AISupportChat />
        </div>

        {/* FAQ Sections */}
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Perguntas Frequentes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {faqSections.map((section, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/[0.06] p-5"
              style={{ backgroundColor: '#0d0d14' }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <section.icon className="w-4.5 h-4.5 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">{section.title}</h3>
              </div>
              <div className="space-y-2.5">
                {section.items.map((item, j) => (
                  <div key={j} className="flex justify-between items-start gap-3">
                    <span className="text-xs text-white/50 shrink-0">{item.label}</span>
                    <span className="text-xs text-white/80 text-right font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Ajuda;
