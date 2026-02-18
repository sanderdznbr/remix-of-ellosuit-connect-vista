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

const TOTAL_STEPS = 3;

const STEP_SUBTITLES = [
  'Conte-nos sobre você',
  'Dados do seu negócio',
  'Crie seu acesso',
];

const formatDocument = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length <= 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '').substring(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [ellosuitNumber, setEllosuitNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validateStep = (): boolean => {
    setError(null);
    switch (step) {
      case 0:
        if (!username.trim()) { setError('Informe seu nome.'); return false; }
        if (!companyName.trim()) { setError('Informe o nome da empresa.'); return false; }
        return true;
      case 1:
        if (!document.trim() || document.replace(/\D/g, '').length < 11) { setError('Informe um CPF ou CNPJ válido.'); return false; }
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10) { setError('Informe um telefone válido.'); return false; }
        if (!phoneVerified) { setError('Verifique seu telefone antes de continuar.'); return false; }
        return true;
      case 2:
        if (!email.trim()) { setError('Informe seu email.'); return false; }
        if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return false; }
        if (password !== confirmPassword) { setError('As senhas não coincidem.'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigate('/');
  };

  const handleSendCode = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Informe um telefone válido antes de enviar o código.');
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
      setError(err.message || 'Erro ao enviar código. Tente novamente.');
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
    } catch (err: any) {
      setError(err.message || 'Código inválido ou expirado.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await signUp(email, password, username, companyName, phone);
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Este email já está cadastrado.');
        } else {
          setError(signUpError.message);
        }
        return;
      }
      if (data?.user) {
        navigate('/plans');
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
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
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? 'Voltar ao login' : 'Voltar'}
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
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {step === TOTAL_STEPS - 1 ? 'Quase lá!' : 'Crie sua conta'}
            </h1>
            <p className="text-sm text-muted-foreground mb-8">{STEP_SUBTITLES[step]}</p>

            {/* Error */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 0 — Personal */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome completo</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Como devemos te chamar?"
                    className="h-12 mt-1.5 rounded-xl"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Empresa</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nome da sua empresa"
                    className="h-12 mt-1.5 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Step 1 — Business + Phone Verification */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF ou CNPJ</Label>
                  <Input
                    value={document}
                    onChange={(e) => setDocument(formatDocument(e.target.value))}
                    placeholder="000.000.000-00"
                    className="h-12 mt-1.5 rounded-xl"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => {
                      setPhone(formatPhone(e.target.value));
                      // Reset verification if phone changes
                      if (phoneVerified) {
                        setPhoneVerified(false);
                        setCodeSent(false);
                        setVerificationCode('');
                      }
                    }}
                    placeholder="(11) 99999-9999"
                    className="h-12 mt-1.5 rounded-xl"
                    disabled={phoneVerified}
                  />
                </div>

                {/* Phone verification inline */}
                {!phoneVerified ? (
                  <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {codeSent
                          ? <>Código enviado via <span className="font-semibold text-foreground">WhatsApp</span> para <span className="font-semibold text-foreground">{phone}</span></>
                          : 'Enviaremos um código via WhatsApp para verificar seu número'}
                      </p>
                    </div>

                    {!codeSent ? (
                      <Button
                        type="button"
                        onClick={handleSendCode}
                        variant="outline"
                        className="w-full h-10 rounded-xl text-sm"
                        disabled={sendingCode || phone.replace(/\D/g, '').length < 10}
                      >
                        {sendingCode ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                        ) : (
                          'Enviar código de verificação'
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                          placeholder="• • • • • •"
                          className="h-12 rounded-xl text-center text-xl tracking-[0.4em] font-mono"
                          maxLength={6}
                          autoFocus
                        />
                        <Button
                          type="button"
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
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-primary font-medium rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <Check className="h-4 w-4" />
                    Telefone verificado com sucesso!
                  </div>
                )}
              </div>
            )}

            {/* Step 2 — Credentials */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@suaempresa.com"
                    className="h-12 mt-1.5 rounded-xl"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Senha</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="h-12 pr-10 rounded-xl"
                      minLength={6}
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
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmar senha</Label>
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
              </div>
            )}

            {/* CTA Button */}
            <div className="mt-8">
              {step < TOTAL_STEPS - 1 ? (
                <Button
                  onClick={handleNext}
                  className="w-full h-12 rounded-xl text-sm font-medium"
                  disabled={step === 1 && !phoneVerified}
                >
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="w-full h-12 rounded-xl text-sm font-medium" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</>
                  ) : (
                    'Criar conta'
                  )}
                </Button>
              )}
            </div>

            {/* Login link */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              Já tem uma conta?{' '}
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
