import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, CheckCircle, Headphones, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import '@/styles/carousel-loader.css';

const TYPING_PHRASES = [
  'Estamos aqui para te trazer a melhor experiência',
  'Seu sucesso é a nossa prioridade',
  'Conte com a gente para qualquer dúvida',
  'Suporte humano, rápido e eficiente',
];

const useTypeAndErase = (phrases: string[], typingSpeed = 60, erasingSpeed = 30, pauseMs = 2000) => {
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const current = phrases[phraseIndex];
    if (isTyping) {
      if (text.length < current.length) {
        timeoutRef.current = setTimeout(() => setText(current.slice(0, text.length + 1)), typingSpeed);
      } else {
        timeoutRef.current = setTimeout(() => setIsTyping(false), pauseMs);
      }
    } else {
      if (text.length > 0) {
        timeoutRef.current = setTimeout(() => setText(text.slice(0, -1)), erasingSpeed);
      } else {
        setPhraseIndex((phraseIndex + 1) % phrases.length);
        setIsTyping(true);
      }
    }
    return () => clearTimeout(timeoutRef.current);
  }, [text, isTyping, phraseIndex, phrases, typingSpeed, erasingSpeed, pauseMs]);

  return text;
};

const Suporte: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', subject: '', message: '' });
  const typedText = useTypeAndErase(TYPING_PHRASES);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    if (form.name.length > 200 || form.email.length > 255 || form.subject.length > 300 || form.message.length > 5000) {
      toast({ title: 'Texto excede o limite permitido', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        name: form.name.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim() || null,
        subject: form.subject.trim(),
        message: form.message.trim(),
        status: 'open',
        priority: 'medium',
        category: 'support',
        description: form.message.trim(),
      } as any);
      if (error) throw error;
      setSent(true);
      toast({ title: 'Mensagem enviada com sucesso!' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors cursor-pointer text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[70vh]">

          {/* LEFT — Animation + typing text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center lg:items-start"
          >
            {/* Carousel loader animation */}
            <div className="carousel-loader-wrapper mb-10" style={{ width: '200px', height: '200px' }}>
              <div className="carousel-loader-spinner" />
              <Headphones className="w-12 h-12 text-white/60 z-[1]" />
            </div>

            {/* Typing text */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight" style={{ minHeight: '5rem' }}>
                {typedText}
                <span className="inline-block w-[2px] h-8 ml-1 bg-purple-400 animate-pulse align-middle" />
              </h1>
              <p className="text-white/30 text-sm max-w-sm">
                Nossa equipe está disponível para te ajudar com qualquer questão sobre a plataforma.
              </p>
            </div>

            {/* WhatsApp quick button */}
            <a href="https://wa.me/5541989015612" target="_blank" rel="noopener noreferrer"
              className="mt-8 flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
              <MessageSquare className="w-5 h-5" />
              Falar pelo WhatsApp
              <ExternalLink className="w-3.5 h-3.5 opacity-50" />
            </a>
            <span className="mt-2 text-white/20 text-xs">+55 41 98901-5612</span>
          </motion.div>

          {/* RIGHT — Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-2xl p-7 lg:p-9 border"
            style={{ backgroundColor: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {sent ? (
              <div className="text-center py-16">
                <CheckCircle className="w-14 h-14 mx-auto mb-4 text-green-400" />
                <h3 className="text-white text-lg font-bold mb-2">Mensagem enviada!</h3>
                <p className="text-white/40 text-sm mb-6">Retornaremos em breve. Obrigado pelo contato.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', whatsapp: '', subject: '', message: '' }); }}
                  className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">Enviar outra mensagem</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-2">
                  <h3 className="text-white text-base font-semibold">Envie uma mensagem</h3>
                  <p className="text-white/25 text-xs mt-1">Responderemos o mais rápido possível.</p>
                </div>

                <div>
                  <label className="text-white/40 text-[11px] font-medium mb-1 block">Nome *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} maxLength={200}
                    className="w-full px-4 py-2.5 rounded-lg text-sm text-white/90 outline-none transition-all focus:border-purple-500/40 placeholder:text-white/15"
                    style={inputStyle} placeholder="Seu nome" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/40 text-[11px] font-medium mb-1 block">E-mail *</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} maxLength={255}
                      className="w-full px-4 py-2.5 rounded-lg text-sm text-white/90 outline-none transition-all focus:border-purple-500/40 placeholder:text-white/15"
                      style={inputStyle} placeholder="seu@email.com" />
                  </div>
                  <div>
                    <label className="text-white/40 text-[11px] font-medium mb-1 block">WhatsApp</label>
                    <input type="text" value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} maxLength={20}
                      className="w-full px-4 py-2.5 rounded-lg text-sm text-white/90 outline-none transition-all focus:border-purple-500/40 placeholder:text-white/15"
                      style={inputStyle} placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div>
                  <label className="text-white/40 text-[11px] font-medium mb-1 block">Assunto *</label>
                  <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} maxLength={300}
                    className="w-full px-4 py-2.5 rounded-lg text-sm text-white/90 outline-none transition-all focus:border-purple-500/40 placeholder:text-white/15"
                    style={inputStyle} placeholder="Ex: Dúvida sobre planos" />
                </div>

                <div>
                  <label className="text-white/40 text-[11px] font-medium mb-1 block">Mensagem *</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} maxLength={5000} rows={4}
                    className="w-full px-4 py-2.5 rounded-lg text-sm text-white/90 outline-none transition-all focus:border-purple-500/40 resize-none placeholder:text-white/15"
                    style={inputStyle} placeholder="Como podemos ajudar?" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer mt-2"
                  style={{ backgroundColor: '#7B50DC' }}>
                  {loading ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar</>}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Suporte;
