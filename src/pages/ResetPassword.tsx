import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AuthSplitLayout from '@/components/auth/AuthSplitLayout';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async () => {
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setIsResetting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setIsResetting(false);
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
        title: <>Redefina seu acesso<br /><span className="text-white/50">com tranquilidade.</span></>,
        subtitle: 'Crie uma senha forte para manter sua conta segura.',
      }}
    >
      <div className="space-y-1.5">
        <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">Nova senha</h1>
        <p className="text-sm text-white/40">Crie sua nova senha de acesso</p>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {success ? (
        <div className="flex items-center gap-2 text-sm text-green-400 font-medium rounded-2xl border border-green-500/20 bg-green-500/10 p-5">
          <Check className="h-5 w-5" />
          Senha redefinida com sucesso! Redirecionando...
        </div>
      ) : !sessionReady ? (
        <div className="text-center text-white/40 text-sm py-10">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-purple-400" />
          Verificando link de recuperação...
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label className={labelClass}>Nova senha</Label>
            <div className="relative mt-1.5">
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={`${inputClass} pr-10`} autoFocus />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 6 ? 'bg-purple-500' : 'bg-white/10'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 8 ? 'bg-purple-500' : 'bg-white/10'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors ${/[A-Z]/.test(password) && /\d/.test(password) ? 'bg-purple-500' : 'bg-white/10'}`} />
              </div>
            )}
          </div>

          <div>
            <Label className={labelClass}>Confirmar nova senha</Label>
            <div className="relative mt-1.5">
              <Input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" className={`${inputClass} pr-10`} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-red-400 mt-1.5">As senhas não coincidem</p>
            )}
          </div>

          <Button
            onClick={handleResetPassword}
            className="w-full h-10 rounded-full text-sm font-medium"
            style={{ backgroundColor: '#7B50DC' }}
            disabled={isResetting || password.length < 6 || password !== confirmPassword}
          >
            {isResetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redefinindo...</> : 'Redefinir senha'}
          </Button>
        </div>
      )}
    </AuthSplitLayout>
  );
}
