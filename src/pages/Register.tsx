import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Phone, Shield, User, Building2, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ellosuitLogo from '@/assets/logoellosuit.png';

const STEPS = [
  { title: 'Informações pessoais', icon: User },
  { title: 'Dados da empresa', icon: Building2 },
  { title: 'Verificação', icon: Phone },
  { title: 'Acesso', icon: Shield },
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

  // Step 1
  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Step 2
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [ellosuitNumber, setEllosuitNumber] = useState('');

  // Step 3 - verification
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  // Step 4
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validateStep = (): boolean => {
    setError(null);
    switch (step) {
      case 0:
        if (!username.trim()) { setError('Informe seu nome de usuário.'); return false; }
        if (!companyName.trim()) { setError('Informe o nome da empresa.'); return false; }
        return true;
      case 1:
        if (!document.trim() || document.replace(/\D/g, '').length < 11) { setError('Informe um CPF ou CNPJ válido.'); return false; }
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10) { setError('Informe um telefone válido.'); return false; }
        return true;
      case 2:
        if (!codeSent) { setError('Envie o código de verificação primeiro.'); return false; }
        if (verificationCode.length < 4) { setError('Informe o código de verificação.'); return false; }
        return true;
      case 3:
        if (!email.trim()) { setError('Informe seu email.'); return false; }
        if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return false; }
        if (password !== confirmPassword) { setError('As senhas não coincidem.'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < STEPS.length - 1) setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSendCode = async () => {
    setSendingCode(true);
    setError(null);
    try {
      // TODO: Integrate with SMS service to send verification code
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCodeSent(true);
    } catch {
      setError('Erro ao enviar código. Tente novamente.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await signUp(email, password, username, companyName);
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Este email já está cadastrado.');
        } else {
          setError(signUpError.message);
        }
        return;
      }
      if (data?.user) {
        // Navigate to plans page after successful registration
        navigate('/plans');
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <Label className="text-sm text-muted-foreground">Nome de usuário</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome completo"
                className="h-12 mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Nome da empresa</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da sua empresa"
                className="h-12 mt-1.5"
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <Label className="text-sm text-muted-foreground">CPF ou CNPJ</Label>
              <Input
                value={document}
                onChange={(e) => setDocument(formatDocument(e.target.value))}
                placeholder="000.000.000-00"
                className="h-12 mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="h-12 mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Número Ellosuit (admin master)</Label>
              <Input
                value={ellosuitNumber}
                onChange={(e) => setEllosuitNumber(e.target.value)}
                placeholder="Número da conta admin master"
                className="h-12 mt-1.5"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-2">
              <Phone className="h-8 w-8 mx-auto text-primary" />
              <p className="text-sm text-foreground font-medium">Verificação de telefone</p>
              <p className="text-xs text-muted-foreground">
                Enviaremos um código SMS para <span className="font-medium text-foreground">{phone}</span>
              </p>
            </div>

            {!codeSent ? (
              <Button
                onClick={handleSendCode}
                className="w-full h-12 rounded-xl"
                disabled={sendingCode}
              >
                {sendingCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar código de verificação'
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Check className="h-4 w-4" />
                  Código enviado com sucesso!
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Código de verificação</Label>
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    placeholder="000000"
                    className="h-12 mt-1.5 text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="text-xs text-primary hover:underline"
                >
                  Reenviar código
                </button>
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="h-12 mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Senha</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="h-12 pr-10"
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
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`h-1 flex-1 rounded-full ${password.length >= 6 ? 'bg-primary' : 'bg-muted'}`} />
                    <div className={`h-1 flex-1 rounded-full ${password.length >= 8 ? 'bg-primary' : 'bg-muted'}`} />
                    <div className={`h-1 flex-1 rounded-full ${/[A-Z]/.test(password) && /\d/.test(password) ? 'bg-primary' : 'bg-muted'}`} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Confirmar senha</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="h-12 pr-10"
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
                <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Header */}
      <div className="max-w-lg mx-auto px-4 pt-6 flex items-center justify-between">
        <img src={ellosuitLogo} alt="Ellosuit" className="h-8 w-auto" />
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 pb-20">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Crie sua conta</h1>
        <p className="text-sm text-muted-foreground mb-8">Preencha as informações passo a passo</p>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step title */}
        <h2 className="text-lg font-semibold text-foreground mb-5">{STEPS[step].title}</h2>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-10">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} className="h-12 rounded-xl px-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="h-12 rounded-xl px-8">
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="h-12 rounded-xl px-8" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          )}
        </div>

        {/* Login link */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Já tem uma conta?{' '}
          <button onClick={() => navigate('/')} className="text-primary font-medium hover:underline">
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
}
