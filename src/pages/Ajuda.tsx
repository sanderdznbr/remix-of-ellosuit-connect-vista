import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { BookOpen, Zap, Calculator, CreditCard, RefreshCw, ArrowUpCircle, Send, MessageCircle, ExternalLink, X, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import supportAgentImg from '@/assets/support-agent.jpg';

const WHATSAPP_NUMBER = '5511999999999';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20elloContent`;
const AGENT_NAME = 'Marina';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

/* ─── Floating Chat Widget ─── */
const ChatWidget: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      // Initial greeting with delay to feel natural
      setTyping(true);
      const t1 = setTimeout(() => {
        setMessages([{ role: 'assistant', content: 'Oi! 😊' }]);
        setTyping(false);
        setTimeout(() => {
          setTyping(true);
          setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sou a Marina, do suporte do elloContent. Como posso te ajudar hoje?' }]);
            setTyping(false);
          }, 1200);
        }, 400);
      }, 800);
      return () => clearTimeout(t1);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const addAssistantMessages = async (replyText: string) => {
    const parts = replyText.split('|||').map(s => s.trim()).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      setTyping(true);
      await new Promise(r => setTimeout(r, 600 + Math.min(parts[i].length * 15, 1500)));
      setMessages(prev => [...prev, { role: 'assistant', content: parts[i] }]);
      setTyping(false);
      if (i < parts.length - 1) await new Promise(r => setTimeout(r, 300));
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setLoading(true);
    setTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-support-chat', {
        body: { messages: allMessages },
      });
      if (error) throw error;
      setTyping(false);
      await addAssistantMessages(data?.reply || 'Ops, tive um probleminha aqui. Pode repetir? 😅');
    } catch {
      setTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Eita, deu um errinho aqui! Tenta de novo em alguns segundos 🙏' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-2rem)] z-50 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            backgroundColor: '#111118',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7), 0 0 40px rgba(124,58,237,0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 relative" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16161e 100%)' }}>
            <div className="relative">
              <img src={supportAgentImg} alt={AGENT_NAME} className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-500/30" loading="lazy" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2" style={{ borderColor: '#1a1a2e' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{AGENT_NAME}</p>
              <p className="text-xs text-green-400/80">Online agora</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-[360px] overflow-y-auto px-4 py-4 space-y-1" style={{ WebkitOverflowScrolling: 'touch' as any }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const isFirstInGroup = i === 0 || messages[i - 1].role !== msg.role;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}
                >
                  {!isUser && isFirstInGroup && (
                    <img src={supportAgentImg} alt={AGENT_NAME} className="w-7 h-7 rounded-full object-cover shrink-0" loading="lazy" />
                  )}
                  {!isUser && !isFirstInGroup && <div className="w-7 shrink-0" />}
                  <div
                    className={`max-w-[75%] px-3.5 py-2 text-[13.5px] leading-relaxed ${
                      isUser
                        ? 'rounded-2xl rounded-br-md text-white'
                        : 'rounded-2xl rounded-bl-md text-white/90'
                    }`}
                    style={{
                      backgroundColor: isUser ? '#7C3AED' : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              );
            })}

            {/* Typing indicator */}
            {typing && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-2 mt-3"
              >
                <img src={supportAgentImg} alt={AGENT_NAME} className="w-7 h-7 rounded-full object-cover shrink-0" loading="lazy" />
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/[0.06] flex gap-2" style={{ backgroundColor: '#0d0d14' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Escreva sua mensagem..."
              className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-500/30 transition-colors"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-20 cursor-pointer shrink-0"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* WhatsApp link */}
          <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-center gap-2" style={{ backgroundColor: '#0a0a10' }}>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-green-400 transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              Prefere falar no WhatsApp?
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── FAQ Data ─── */
const faqSections = [
  {
    icon: Calculator,
    color: '#A78BFA',
    title: 'Custo por Card',
    items: [
      { label: 'Simples', value: '1 crédito' },
      { label: 'Avançado (Pro)', value: '2 créditos' },
      { label: 'Extreme', value: '2 créditos' },
      { label: 'Pro + Rosto', value: '4 créditos' },
      { label: 'Tweet', value: '1 crédito' },
      { label: 'Pesquisa Web', value: '+1 fixo' },
    ],
  },
  {
    icon: Zap,
    color: '#FBBF24',
    title: 'Exemplos Práticos',
    items: [
      { label: '1 card Simples', value: '1 cr' },
      { label: '5 cards Simples', value: '5 cr' },
      { label: '8 cards Pro', value: '16 cr' },
      { label: '5 cards Pro + Web', value: '11 cr' },
      { label: '6 cards Pro + Face', value: '24 cr' },
    ],
  },
  {
    icon: RefreshCw,
    color: '#34D399',
    title: 'Renovação',
    items: [
      { label: 'Quando?', value: 'Todo mês, na data de contratação' },
      { label: 'Acumulam?', value: 'Não, são renovados' },
      { label: 'Extras', value: 'Compre a qualquer momento' },
    ],
  },
  {
    icon: ArrowUpCircle,
    color: '#60A5FA',
    title: 'Upgrade',
    items: [
      { label: 'Custo', value: 'Só a diferença proporcional' },
      { label: 'Data', value: 'Mantém a original' },
      { label: 'Créditos', value: 'Antigos são preservados' },
    ],
  },
  {
    icon: CreditCard,
    color: '#F472B6',
    title: 'Pagamento',
    items: [
      { label: 'Cartão', value: 'Todos os planos' },
      { label: 'PIX', value: 'Apenas anuais' },
      { label: 'Parcelamento', value: 'Anuais no cartão' },
    ],
  },
];

const quickQuestions = [
  'Como funciona o consumo de créditos?',
  'Qual a diferença entre os modos?',
  'Como faço upgrade de plano?',
  'Posso pagar com PIX?',
  'Meus créditos expiram?',
];

/* ─── Main Page ─── */
const Ajuda: React.FC = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-14 relative min-h-screen">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-5" style={{ backgroundColor: 'rgba(124,58,237,0.12)', color: '#A78BFA' }}>
            <BookOpen className="w-3.5 h-3.5" />
            Central de Ajuda
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
            Como podemos ajudar?
          </h1>
          <p className="text-white/40 text-base max-w-md mx-auto">
            Encontre respostas rápidas ou converse com nossa equipe de suporte
          </p>
        </div>

        {/* Quick Questions */}
        <div className="mb-14">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4 text-center">Perguntas populares</p>
          <div className="flex flex-wrap justify-center gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setChatOpen(true)}
                className="px-4 py-2 rounded-full text-xs text-white/60 hover:text-white hover:border-purple-500/30 border border-white/[0.06] transition-all cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-16">
          {faqSections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.05] p-5 hover:border-white/[0.1] transition-all group"
                style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${section.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: section.color }} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                </div>
                <div className="space-y-2">
                  {section.items.map((item, j) => (
                    <div key={j} className="flex justify-between items-center gap-2">
                      <span className="text-xs text-white/40">{item.label}</span>
                      <span className="text-xs text-white/70 font-medium text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA to WhatsApp */}
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/[0.05]" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
            <p className="text-sm text-white/50">Não encontrou o que procurava?</p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}
            >
              <MessageCircle className="w-4 h-4" />
              Falar pelo WhatsApp
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Floating chat button */}
      <motion.button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {chatOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }} className="relative">
              <img src={supportAgentImg} alt={AGENT_NAME} className="w-14 h-14 rounded-full object-cover" loading="lazy" />
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 flex items-center justify-center" style={{ borderColor: '#6D28D9' }}>
                <span className="text-[7px] text-white font-bold">1</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat widget */}
      <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </DashboardLayout>
  );
};

export default Ajuda;
