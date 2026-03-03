import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import '@/styles/carousel-loader.css';

const TYPING_PHRASES = [
  'Estamos aqui para te trazer a melhor experiência',
  'Seu sucesso é a nossa prioridade',
  'Conte com a gente para qualquer dúvida',
  'Suporte humano, rápido e eficiente',
];

const useTypeAndErase = (phrases: string[], typingSpeed = 55, erasingSpeed = 25, pauseMs = 2200) => {
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

  const inputClass = "w-full px-4 py-2.5 rounded-lg text-sm text-white/90 outline-none transition-all placeholder:text-white/15 focus:border-purple-500/40 bg-white/[0.03] border border-white/[0.07]";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header — same pattern as WelcomeScreen */}
      <motion.nav
        className="relative z-20 flex items-center justify-between px-5 md:px-8 py-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-center gap-6 md:gap-8">
          <img src={ellocontentLogo} alt="elloContent" className="h-5 md:h-6 cursor-pointer" onClick={() => navigate('/')} />
          <div className="hidden md:flex items-center gap-5">
            {[
              { label: 'Preços', path: '/precos' },
              { label: 'Recursos', path: '/recursos' },
              { label: 'Suporte', path: '/suporte' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`text-sm font-medium transition-colors cursor-pointer ${item.path === '/suporte' ? 'text-white/90' : 'text-white/50 hover:text-white/80'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/auth')} className="text-white/60 hover:text-white text-sm font-medium transition-colors cursor-pointer px-3 py-1.5">Login</button>
          <button onClick={() => navigate('/auth')} className="text-white text-sm font-medium px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors cursor-pointer">Começar</button>
        </div>
      </motion.nav>

      {/* Giant Orb background — same as WelcomeScreen */}
      <div className="absolute bottom-[-500px] md:bottom-[-750px] lg:bottom-[-950px] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="carousel-loader-wrapper" style={{ width: 'clamp(600px, 110vw, 1500px)', height: 'clamp(600px, 110vw, 1500px)' }}>
          <div className="carousel-loader-spinner" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4 md:px-8 overflow-y-auto">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-8">

          {/* LEFT — Typing animation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight" style={{ minHeight: '7rem' }}>
              {typedText}
              <span className="inline-block w-[3px] h-9 ml-1 align-middle rounded-full" style={{ backgroundColor: '#9B6BFF', animation: 'pulse 1s ease-in-out infinite' }} />
            </h1>

            <p className="text-white/30 text-sm mt-6 max-w-md leading-relaxed">
              Precisa de ajuda? Fale diretamente com nossa equipe pelo WhatsApp ou envie uma mensagem pelo formulário.
            </p>

            {/* WhatsApp quick action */}
            <a href="https://wa.me/5541989015612" target="_blank" rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
              <MessageSquare className="w-5 h-5" />
              Falar pelo WhatsApp
              <ExternalLink className="w-3.5 h-3.5 opacity-40" />
            </a>
            <span className="mt-2.5 text-white/15 text-xs font-mono">+55 41 98901-5612</span>
          </motion.div>

          {/* RIGHT — Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="rounded-2xl p-6 lg:p-8 border backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {sent ? (
              <div className="text-center py-14">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                <h3 className="text-white text-lg font-bold mb-2">Mensagem enviada!</h3>
                <p className="text-white/40 text-sm mb-6">Retornaremos em breve.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', whatsapp: '', subject: '', message: '' }); }}
                  className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">Enviar outra</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="mb-3">
                  <h3 className="text-white text-base font-semibold">Envie uma mensagem</h3>
                  <p className="text-white/20 text-xs mt-1">Campos com * são obrigatórios</p>
                </div>

                <div>
                  <label className="text-white/35 text-[11px] font-medium mb-1 block">Nome *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} maxLength={200}
                    className={inputClass} placeholder="Seu nome" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/35 text-[11px] font-medium mb-1 block">E-mail *</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} maxLength={255}
                      className={inputClass} placeholder="seu@email.com" />
                  </div>
                  <div>
                    <label className="text-white/35 text-[11px] font-medium mb-1 block">WhatsApp</label>
                    <input type="text" value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} maxLength={20}
                      className={inputClass} placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div>
                  <label className="text-white/35 text-[11px] font-medium mb-1 block">Assunto *</label>
                  <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} maxLength={300}
                    className={inputClass} placeholder="Ex: Dúvida sobre planos" />
                </div>

                <div>
                  <label className="text-white/35 text-[11px] font-medium mb-1 block">Mensagem *</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} maxLength={5000} rows={4}
                    className={`${inputClass} resize-none`} placeholder="Como podemos ajudar?" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
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
