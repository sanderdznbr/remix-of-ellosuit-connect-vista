import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { getAffiliateRef } from '@/hooks/useAffiliateTracking';
import AuthSplitLayout from '@/components/auth/AuthSplitLayout';

const TOTAL_STEPS = 2;

const STEP_SUBTITLES = [
  'Conte-nos sobre você',
  'Crie seu acesso',
];

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '').substring(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

const inputClass = "h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:ring-purple-500/50";
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
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validateStep = (): boolean => {
    setError(null);
    switch (step) {
      case 0:
        if (!username.trim()) { setError('Informe seu nome.'); return false; }
        if (!companyName.trim()) { setError('Informe o nome da empresa.'); return false; }
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10) { setError('Informe um telefone válido com WhatsApp.'); return false; }
        return true;
      case 1:
        if (!email.trim()) { setError('Informe seu email.'); return false; }
        if (email !== confirmEmail) { setError('Os emails não coincidem.'); return false; }
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
        const affiliateRef = getAffiliateRef();
        if (affiliateRef) {
          supabase
            .from('affiliate_partners' as any)
            .select('id')
            .eq('affiliate_code', affiliateRef)
            .eq('is_active', true)
            .maybeSingle()
            .then(({ data: partner }) => {
              if (partner) {
                supabase.from('affiliate_referrals' as any).insert({
                  affiliate_id: (partner as any).id,
                  referred_user_id: data.user.id,
                  converted: false,
                  source_url: window.location.href,
                } as any).then(() => {});
              }
            });
        }
        try {
          supabase.functions.invoke('send-system-email', {
            body: { template_key: 'welcome', recipient_email: email, recipient_name: username || email.split('@')[0] },
          }).catch(() => {});
        } catch {}
        navigate('/');
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const topRight = (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 px-4 py-1.5 rounded-full border border-white/15 hover:bg-white/5 hover:border-white/30 transition-all"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {step === 0 ? 'Login' : 'Voltar'}
    </button>
  );

  return (
    <AuthSplitLayout
      topRightSlot={topRight}
      tagline={{
        title: <>Comece grátis,<br /><span className="text-white/50">crie em segundos.</span></>,
        subtitle: 'Crie sua conta e descubra a forma mais elegante de produzir conteúdo com IA.',
      }}
    >
      {/* Progress bar */}
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-purple-500' : 'bg-white/10'}`}
          />
        ))}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">
          {step === TOTAL_STEPS - 1 ? 'Quase lá!' : 'Crie sua conta'}
        </h1>
        <p className="text-sm text-white/40">{STEP_SUBTITLES[step]}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <Label className={labelClass}>Nome completo</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Como devemos te chamar?" className={`${inputClass} mt-1.5`} autoFocus />
          </div>
          <div>
            <Label className={labelClass}>Empresa</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da sua empresa" className={`${inputClass} mt-1.5`} />
          </div>
          <div>
            <Label className={labelClass}>WhatsApp</Label>
            <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" className={`${inputClass} mt-1.5`} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label className={labelClass}>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@suaempresa.com" className={`${inputClass} mt-1.5`} autoFocus />
          </div>
          <div>
            <Label className={labelClass}>Confirmar email</Label>
            <Input type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder="Repita o email" className={`${inputClass} mt-1.5`} />
            {confirmEmail.length > 0 && email !== confirmEmail && (
              <p className="text-xs text-red-400 mt-1.5">Os emails não coincidem</p>
            )}
          </div>
          <div>
            <Label className={labelClass}>Senha</Label>
            <div className="relative mt-1.5">
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={`${inputClass} pr-10`} minLength={6} />
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
            <Label className={labelClass}>Confirmar senha</Label>
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
        </div>
      )}

      <div>
        {step < TOTAL_STEPS - 1 ? (
          <Button onClick={handleNext} className="w-full h-10 rounded-full text-sm font-medium" style={{ backgroundColor: '#7B50DC' }}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="w-full h-10 rounded-full text-sm font-medium" style={{ backgroundColor: '#7B50DC' }} disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</> : 'Criar conta'}
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-white/30">
        Já tem uma conta?{' '}
        <button onClick={() => navigate('/auth')} className="text-purple-400 font-medium hover:underline">
          Entrar
        </button>
      </p>
    </AuthSplitLayout>
  );
}
