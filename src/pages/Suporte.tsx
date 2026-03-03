import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MessageSquare, Send, CheckCircle, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const Suporte: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', subject: '', message: '' });

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <span className="text-white/80 font-semibold text-sm">Suporte</span>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))' }}>
            <Headphones className="w-8 h-8" style={{ color: '#9B6BFF' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Central de Suporte</h1>
          <p className="text-white/40 text-base max-w-md mx-auto">Estamos aqui para ajudar. Entre em contato por WhatsApp ou preencha o formulário abaixo.</p>
        </motion.div>

        {/* Contact card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl p-6 mb-10 border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="https://wa.me/5541989015612" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-white/[0.04]" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                <MessageSquare className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">WhatsApp</p>
                <p className="text-white/40 text-xs">(41) 98901-5612</p>
              </div>
            </a>
            <a href="tel:+5541989015612"
              className="flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-white/[0.04]" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Telefone</p>
                <p className="text-white/40 text-xs">+55 41 98901-5612</p>
              </div>
            </a>
            <a href="mailto:suporte@ellosuit.com"
              className="flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-white/[0.04]" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">E-mail</p>
                <p className="text-white/40 text-xs">suporte@ellosuit.com</p>
              </div>
            </a>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-8 border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          {sent ? (
            <div className="text-center py-12">
              <CheckCircle className="w-14 h-14 mx-auto mb-4 text-green-400" />
              <h3 className="text-white text-lg font-bold mb-2">Mensagem enviada!</h3>
              <p className="text-white/40 text-sm mb-6">Retornaremos em breve. Obrigado pelo contato.</p>
              <button onClick={() => { setSent(false); setForm({ name: '', email: '', whatsapp: '', subject: '', message: '' }); }}
                className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">Enviar outra mensagem</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h3 className="text-white text-lg font-semibold mb-1">Formulário de contato</h3>
              <p className="text-white/30 text-sm mb-4">Campos com * são obrigatórios</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1.5 block">Nome *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} maxLength={200}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white/90 outline-none transition-all focus:ring-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', focusRingColor: '#7B50DC' } as any}
                    placeholder="Seu nome" />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1.5 block">E-mail *</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} maxLength={255}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white/90 outline-none transition-all focus:ring-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as any}
                    placeholder="seu@email.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1.5 block">WhatsApp</label>
                  <input type="text" value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} maxLength={20}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white/90 outline-none transition-all focus:ring-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as any}
                    placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1.5 block">Assunto *</label>
                  <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} maxLength={300}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white/90 outline-none transition-all focus:ring-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as any}
                    placeholder="Assunto da mensagem" />
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1.5 block">Mensagem *</label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} maxLength={5000} rows={5}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white/90 outline-none transition-all focus:ring-1 resize-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as any}
                  placeholder="Descreva como podemos ajudar..." />
              </div>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)' }}>
                {loading ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar mensagem</>}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Suporte;
