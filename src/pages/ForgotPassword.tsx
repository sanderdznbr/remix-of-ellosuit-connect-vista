import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import '@/styles/carousel-loader.css';

const TOTAL_STEPS = 3;
const STEP_SUBTITLES = [
  'Informe seu email e WhatsApp cadastrados',
  'Confirme o código enviado no WhatsApp',
  'Crie sua nova senha',
];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  };

  const handleSendCode = async () => {
    if (!email.trim() || !whatsapp.trim()) {
      setError('Informe seu email e WhatsApp.');
      return;
    }
    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Número de WhatsApp inválido.');
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
      setError(err.message || 'Erro ao enviar código via WhatsApp.');
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
      const cleanPhone = whatsapp.replace(/\D/g, '');
      const { data, error: fnError } = await supabase.functions.invoke('verify-phone-code', {
        body: { phone: cleanPhone, code: verificationCode },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
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
      const cleanPhone = whatsapp.replace(/\D/g, '');
      const { data, error: fnError } = await supabase.functions.invoke('reset-password-by-phone', {
        body: { phone: cleanPhone, email, newPassword: password },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        navigate('/');
        return;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setIsResetting(false);
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
          <h1 className="text-2xl font-bold text-white mb-1">Recuperar senha</h1>
          <p className="text-sm text-white/40 mb-8">{STEP_SUBTITLES[step]}</p>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 0 — Email + WhatsApp */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label className={labelClass}>Email cadastrado</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@suaempresa.com"
                  className={`${inputClass} mt-1.5`}
                  autoFocus
                />
              </div>
              <div>
                <Label className={labelClass}>WhatsApp</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!email.trim()) { setError('Informe seu email.'); return; }
                  if (whatsapp.replace(/\D/g, '').length < 10) { setError('Informe um número de WhatsApp válido.'); return; }
                  setError(null);
                  handleSendCode();
                  setStep(1);
                }}
                className="w-full h-12 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#7B50DC' }}
                disabled={sendingCode || !email.trim() || whatsapp.replace(/\D/g, '').length < 10}
              >
                {sendingCode ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <>Enviar código via WhatsApp <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          )}

          {/* Step 1 — Verify Code */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-green-400" />
                  </div>
                  <p className="text-sm text-white/50">
                    Código enviado para o WhatsApp <span className="font-semibold text-white">{whatsapp}</span>
                  </p>
                </div>

                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="• • • • • •"
                  className={`${inputClass} text-center text-xl tracking-[0.4em] font-mono`}
                  maxLength={6}
                  autoFocus
                />

                <Button
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
            </div>
          )}

          {/* Step 2 — New Password */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm text-green-400 font-medium rounded-2xl border border-green-500/20 bg-green-500/10 p-4 mb-2">
                <Check className="h-4 w-4" />
                WhatsApp verificado com sucesso!
              </div>

              <div>
                <Label className={labelClass}>Nova senha</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={`${inputClass} pr-10`}
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
                <Label className={labelClass}>Confirmar nova senha</Label>
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

              <Button
                onClick={handleResetPassword}
                className="w-full h-12 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#7B50DC' }}
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
