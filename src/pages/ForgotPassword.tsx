import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import '@/styles/carousel-loader.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) {
      setError('Informe seu email.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação.');
    } finally {
      setSending(false);
    }
  };

  const inputClass = "h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:ring-purple-500/50";
  const labelClass = "text-xs font-medium text-white/40 uppercase tracking-wide";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Orb animation */}
      <div className="absolute bottom-[-500px] md:bottom-[-750px] lg:bottom-[-950px] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="carousel-loader-wrapper" style={{ width: 'clamp(600px, 110vw, 1500px)', height: 'clamp(600px, 110vw, 1500px)' }}>
          <div className="carousel-loader-spinner" />
        </div>
      </div>

      {/* Top Navbar */}
      <motion.nav
        className="relative z-20 flex items-center justify-between px-5 md:px-8 py-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-center gap-6">
          <img src={ellocontentLogo} alt="elloContent" className="h-5 md:h-6 cursor-pointer" onClick={() => navigate('/')} />
        </div>
        <button
          onClick={() => navigate('/auth')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </button>
      </motion.nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-1">Recuperar senha</h1>
          <p className="text-sm text-white/40 mb-8">
            {sent ? 'Verifique seu email' : 'Informe seu email cadastrado'}
          </p>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {!sent ? (
            <div className="space-y-5">
              <div>
                <Label className={labelClass}>Email cadastrado</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@suaempresa.com"
                    className={`${inputClass} pl-10 mt-0`}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReset()}
                  />
                </div>
              </div>
              <Button
                onClick={handleSendReset}
                className="w-full h-12 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#7B50DC' }}
                disabled={sending || !email.trim()}
              >
                {sending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <>Enviar link de recuperação <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 text-center">
                <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
                  <Mail className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Email enviado!</p>
                  <p className="text-sm text-white/50">
                    Enviamos um link de recuperação para <span className="font-semibold text-white">{email}</span>. 
                    Verifique sua caixa de entrada e spam.
                  </p>
                </div>
                <Button
                  onClick={() => { setSent(false); setEmail(''); }}
                  variant="outline"
                  className="w-full h-10 rounded-xl text-sm border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                >
                  Tentar outro email
                </Button>
              </div>
            </div>
          )}

          {/* Login link */}
          <p className="text-center text-xs text-white/30 mt-6">
            Lembrou sua senha?{' '}
            <button onClick={() => navigate('/auth')} className="text-purple-400 font-medium hover:underline">
              Entrar
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
