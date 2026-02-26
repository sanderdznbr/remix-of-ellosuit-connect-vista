import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import '@/styles/carousel-loader.css';

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

const inputClass = "h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:ring-purple-500/50";
const labelClass = "text-xs font-medium text-white/40 uppercase tracking-wide";

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
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
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
        if (!email.trim()) { setError('Informe seu email para verificação.'); return false; }
        if (!emailVerified) { setError('Verifique seu email antes de continuar.'); return false; }
        return true;
      case 2:
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
    else navigate('/auth');
  };

  const handleSendCode = async () => {
    if (!email.trim()) { setError('Informe seu email antes de enviar o código.'); return; }
    setSendingCode(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-email-code', {
        body: { email, phone: phone.replace(/\D/g, '') },
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
    if (verificationCode.length < 4) { setError('Informe o código de verificação.'); return; }
    setVerifyingCode(true);
    setError(null);
    try {
      const identifier = phone.replace(/\D/g, '') || email;
      const { data, error: fnError } = await supabase.functions.invoke('verify-phone-code', {
        body: { phone: identifier, code: verificationCode },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setEmailVerified(true);
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
        try {
          supabase.functions.invoke('send-system-email', {
            body: { template_key: 'welcome', recipient_email: email, recipient_name: username || email.split('@')[0] },
          }).catch(() => {});
        } catch {}
        navigate('/plans');
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <img src={ellocontentLogo} alt="elloContent" className="h-5 md:h-6" />
        </div>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? 'Voltar ao login' : 'Voltar'}
        </button>
      </motion.nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4 py-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {/* Progress bar */}
          <div className="flex gap-1.5 mb-10">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-purple-500' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-1">
            {step === TOTAL_STEPS - 1 ? 'Quase lá!' : 'Crie sua conta'}
          </h1>
          <p className="text-sm text-white/40 mb-8">{STEP_SUBTITLES[step]}</p>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 0 — Personal */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label className={labelClass}>Nome completo</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Como devemos te chamar?"
                  className={`${inputClass} mt-1.5`}
                  autoFocus
                />
              </div>
              <div>
                <Label className={labelClass}>Empresa</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nome da sua empresa"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
            </div>
          )}

          {/* Step 1 — Business + Email Verification */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className={labelClass}>CPF ou CNPJ</Label>
                <Input
                  value={document}
                  onChange={(e) => setDocument(formatDocument(e.target.value))}
                  placeholder="000.000.000-00"
                  className={`${inputClass} mt-1.5`}
                  autoFocus
                />
              </div>
              <div>
                <Label className={labelClass}>Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <Label className={labelClass}>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailVerified) {
                      setEmailVerified(false);
                      setCodeSent(false);
                      setVerificationCode('');
                    }
                  }}
                  placeholder="voce@suaempresa.com"
                  className={`${inputClass} mt-1.5`}
                  disabled={emailVerified}
                />
              </div>

              {/* Email verification inline */}
              {!emailVerified ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-purple-400" />
                    </div>
                    <p className="text-sm text-white/50">
                      {codeSent
                        ? <>Código enviado para <span className="font-semibold text-white">{email}</span>. Verifique sua caixa de entrada e spam.</>
                        : 'Enviaremos um código por email para verificar sua identidade'}
                    </p>
                  </div>

                  {!codeSent ? (
                    <Button
                      type="button"
                      onClick={handleSendCode}
                      variant="outline"
                      className="w-full h-10 rounded-xl text-sm border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                      disabled={sendingCode || !email.trim()}
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
                        className={`${inputClass} text-center text-xl tracking-[0.4em] font-mono`}
                        maxLength={6}
                        autoFocus
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyCode}
                        className="w-full h-10 rounded-xl text-sm"
                        style={{ backgroundColor: '#7B50DC' }}
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
                        className="text-xs text-purple-400 hover:underline w-full text-center"
                      >
                        Reenviar código
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-purple-400 font-medium rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                  <Check className="h-4 w-4" />
                  Email verificado com sucesso!
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Credentials */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm text-white/50 rounded-2xl border border-white/10 bg-white/5 p-4">
                <Mail className="h-4 w-4" />
                <span>{email}</span>
                <Check className="h-4 w-4 text-purple-400 ml-auto" />
              </div>
              <div>
                <Label className={labelClass}>Senha</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={`${inputClass} pr-10`}
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
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
                <Label className={labelClass}>Confirmar senha</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1.5">As senhas não coincidem</p>
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
                style={{ backgroundColor: '#7B50DC' }}
                disabled={step === 1 && !emailVerified}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="w-full h-12 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#7B50DC' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</>
                ) : (
                  'Criar conta'
                )}
              </Button>
            )}
          </div>

          {/* Login link */}
          <p className="text-center text-xs text-white/30 mt-6">
            Já tem uma conta?{' '}
            <button onClick={() => navigate('/auth')} className="text-purple-400 font-medium hover:underline">
              Entrar
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
