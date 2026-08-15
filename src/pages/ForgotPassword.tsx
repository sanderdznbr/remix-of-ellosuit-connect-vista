import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AuthSplitLayout from '@/components/auth/AuthSplitLayout';
import { getAuthRedirectUrl } from '@/lib/platform';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) { setError('Informe seu email.'); return; }
    setSending(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl('/reset-password'),
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação.');
    } finally {
      setSending(false);
    }
  };

  const inputClass = "h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:ring-purple-500/50";
  const labelClass = "text-xs font-medium text-white/40 uppercase tracking-wide";

  const topRight = (
    <button
      onClick={() => navigate('/auth')}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 px-4 py-1.5 rounded-full border border-white/15 hover:bg-white/5 hover:border-white/30 transition-all"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Login
    </button>
  );

  return (
    <AuthSplitLayout
      topRightSlot={topRight}
      tagline={{
        title: <>Recupere o acesso<br /><span className="text-white/50">em poucos cliques.</span></>,
        subtitle: 'Enviaremos um link seguro para você criar uma nova senha.',
      }}
    >
      <div className="space-y-1.5">
        <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">Recuperar senha</h1>
        <p className="text-sm text-white/40">{sent ? 'Verifique seu email' : 'Informe seu email cadastrado'}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {!sent ? (
        <div className="space-y-4">
          <div>
            <Label className={labelClass}>Email cadastrado</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 z-10" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@suaempresa.com"
                className={`${inputClass} pl-10`}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSendReset()}
              />
            </div>
          </div>
          <Button
            onClick={handleSendReset}
            className="w-full h-10 rounded-full text-sm font-medium"
            style={{ backgroundColor: '#7B50DC' }}
            disabled={sending || !email.trim()}
          >
            {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <>Enviar link <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
            <Mail className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <p className="text-white font-medium mb-1">Email enviado!</p>
            <p className="text-sm text-white/50">
              Enviamos um link de recuperação para <span className="font-semibold text-white">{email}</span>. Verifique sua caixa de entrada e spam.
            </p>
          </div>
          <Button
            onClick={() => { setSent(false); setEmail(''); }}
            variant="outline"
            className="w-full h-10 rounded-full text-sm border-purple-500/30 bg-purple-500/10 text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            Tentar outro email
          </Button>
        </div>
      )}

      <p className="text-center text-xs text-white/30">
        Lembrou sua senha?{' '}
        <button onClick={() => navigate('/auth')} className="text-purple-400 font-medium hover:underline">
          Entrar
        </button>
      </p>
    </AuthSplitLayout>
  );
}
