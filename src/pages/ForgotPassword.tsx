import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ellosuitLogo from '@/assets/logoellosuit.png';
import authHero from '@/assets/auth-hero.jpg';

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '').substring(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

const TOTAL_STEPS = 3;
const STEP_SUBTITLES = [
  'Informe seu telefone cadastrado',
  'Confirme o código enviado',
  'Crie sua nova senha',
];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSendCode = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Informe um telefone válido.');
      return;
    }
    setSendingCode(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-phone-code', {
        body: { phone: cleanPhone },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setCodeSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar código.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length < 4) {
      setError('Informe o código de verificação.');
      return;
    }
    setVerifyingCode(true);
    setError(null);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const { data, error: fnError } = await supabase.functions.invoke('verify-phone-code', {
        body: { phone: cleanPhone, code: verificationCode },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setPhoneVerified(true);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Código inválido ou expirado.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setIsResetting(true);
    setError(null);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const { data, error: fnError } = await supabase.functions.invoke('reset-password-by-phone', {
        body: { phone: cleanPhone, newPassword: password },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      // Auto-login with the new password
      if (data?.email) {
        setResetEmail(data.email);
        const { error: signInError } = await signIn(data.email, password);
        if (signInError) {
          // Password was reset but auto-login failed, redirect to login
          navigate('/');
          return;
        }
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 sm:px-10 pt-6 flex items-center justify-between">
          <img src={ellosuitLogo} alt="Ellosuit" className="h-8 w-auto" />
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </button>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
          <div className="w-full max-w-md">
            {/* Progress bar */}
            <div className="flex gap-1.5 mb-10">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground mb-1">Recuperar senha</h1>
            <p className="text-sm text-muted-foreground mb-8">{STEP_SUBTITLES[step]}</p>

            {/* Error */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 0 — Phone */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone cadastrado</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="h-12 mt-1.5 rounded-xl"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={() => {
                    const cleanPhone = phone.replace(/\D/g, '');
                    if (cleanPhone.length < 10) {
                      setError('Informe um telefone válido.');
                      return;
                    }
                    setError(null);
                    handleSendCode();
                    setStep(1);
                  }}
                  className="w-full h-12 rounded-xl text-sm font-medium"
                  disabled={sendingCode || phone.replace(/\D/g, '').length < 10}
                >
                  {sendingCode ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <>Enviar código <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            )}

            {/* Step 1 — Verify Code */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Código enviado via <span className="font-semibold text-foreground">WhatsApp</span> para <span className="font-semibold text-foreground">{phone}</span>
                    </p>
                  </div>

                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    placeholder="• • • • • •"
                    className="h-12 rounded-xl text-center text-xl tracking-[0.4em] font-mono"
                    maxLength={6}
                    autoFocus
                  />

                  <Button
                    onClick={handleVerifyCode}
                    className="w-full h-10 rounded-xl text-sm"
                    disabled={verifyingCode || verificationCode.length < 4}
                  >
                    {verifyingCode ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                    ) : (
                      'Verificar código'
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={handleSendCode}
                    className="text-xs text-primary hover:underline w-full text-center"
                  >
                    Reenviar código
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — New Password */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-sm text-primary font-medium rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-2">
                  <Check className="h-4 w-4" />
                  Telefone verificado com sucesso!
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nova senha</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="h-12 pr-10 rounded-xl"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 6 ? 'bg-primary' : 'bg-muted'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 8 ? 'bg-primary' : 'bg-muted'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${/[A-Z]/.test(password) && /\d/.test(password) ? 'bg-primary' : 'bg-muted'}`} />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmar nova senha</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="h-12 pr-10 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1.5">As senhas não coincidem</p>
                  )}
                </div>

                <Button
                  onClick={handleResetPassword}
                  className="w-full h-12 rounded-xl text-sm font-medium"
                  disabled={isResetting || password.length < 6 || password !== confirmPassword}
                >
                  {isResetting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redefinindo...</>
                  ) : (
                    'Redefinir senha'
                  )}
                </Button>
              </div>
            )}

            {/* Login link */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              Lembrou sua senha?{' '}
              <button onClick={() => navigate('/')} className="text-primary font-medium hover:underline">
                Entrar
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right — Hero image (desktop only) */}
      <div className="hidden lg:block w-[45%] relative">
        <img
          src={authHero}
          alt="Ellosuit"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>
    </div>
  );
}
