
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import '@/styles/carousel-loader.css';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileAuthScreen from '@/components/Mobile/MobileAuthScreen';

const AuthScreen = () => {
  const { isMobile } = useIsMobile();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getReturnPath = () => {
    return '/';
  };

  useEffect(() => {
    if (!authLoading && user) {
      navigate(getReturnPath(), { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (isMobile) {
    return <MobileAuthScreen />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Confirme seu email antes de fazer login.');
        } else {
          setError(String(error.message));
        }
        return;
      }
      if (rememberMe) {
        localStorage.setItem('ellosuit_remember_me', 'true');
        sessionStorage.removeItem('ellosuit_session_active');
      } else {
        localStorage.setItem('ellosuit_remember_me', 'false');
        sessionStorage.setItem('ellosuit_session_active', 'true');
      }
      navigate(getReturnPath(), { replace: true });
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await signUp(email, password, username, companyName);
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('Este email já está cadastrado.');
          setMode('signin');
        } else {
          setError(String(error.message));
        }
        return;
      }
      if (data?.user) {
        navigate(getReturnPath(), { replace: true });
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
    setUsername('');
    setCompanyName('');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Ambient purple glow at bottom — signature */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '55%',
          background: 'radial-gradient(ellipse 900px 500px at 50% 100%, rgba(139,92,246,0.22), transparent 70%)',
        }}
      />
      {/* Subtle top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

      {/* Top nav */}
      <motion.nav
        className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <img src={ellocontentLogo} alt="elloContent" className="h-5 cursor-pointer" onClick={() => navigate('/')} />
        {mode === 'signin' ? (
          <button
            onClick={() => navigate('/register')}
            className="text-white/70 hover:text-white text-[13px] font-medium px-4 py-1.5 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/[0.04] transition-all"
          >
            Cadastre-se
          </button>
        ) : (
          <button
            onClick={switchMode}
            className="text-white/70 hover:text-white text-[13px] font-medium px-4 py-1.5 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/[0.04] transition-all"
          >
            Entrar
          </button>
        )}
      </motion.nav>

      {/* Centered form */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <motion.div
          className="w-full max-w-[380px] space-y-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Title */}
          <div className="text-center space-y-2">
            <motion.h1
              className="text-white font-semibold tracking-tight"
              style={{ fontSize: 34, letterSpacing: '-0.03em', lineHeight: 1.1 }}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0)' }}
              transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {mode === 'signin' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </motion.h1>
            <p className="text-[13.5px] text-white/45">
              {mode === 'signin' ? 'Entre na sua conta para continuar' : 'Comece agora, é gratuito'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-500/[0.08] border-red-500/25 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300 text-[13px]">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-500/[0.08] border-green-500/25 rounded-2xl">
              <AlertCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300 text-[13px]">{success}</AlertDescription>
            </Alert>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-12 bg-white/[0.04] border-white/[0.08] text-white text-[14px] placeholder:text-white/30 rounded-xl focus-visible:ring-1 focus-visible:ring-purple-500/60 focus-visible:border-purple-500/40 transition-colors"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="h-12 bg-white/[0.04] border-white/[0.08] text-white text-[14px] placeholder:text-white/30 rounded-xl pr-11 focus-visible:ring-1 focus-visible:ring-purple-500/60 focus-visible:border-purple-500/40 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 accent-purple-500"
                  />
                  <span className="text-[12px] text-white/45 group-hover:text-white/70 transition-colors">Manter conectado</span>
                </label>
                <button
                  type="button"
                  className="text-[12px] text-white/45 hover:text-white transition-colors"
                  onClick={() => navigate('/forgot-password')}
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-12 mt-2 rounded-xl text-[14px] font-medium transition-all duration-200 hover:brightness-110"
                style={{
                  background: 'linear-gradient(180deg, #A78BFA 0%, #7B50DC 100%)',
                  boxShadow: '0 8px 24px -8px rgba(139,92,246,0.5)',
                }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continuar'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nome de usuário"
                className="h-12 bg-white/[0.04] border-white/[0.08] text-white text-[14px] placeholder:text-white/30 rounded-xl focus-visible:ring-1 focus-visible:ring-purple-500/60 focus-visible:border-purple-500/40 transition-colors"
                required
              />
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da empresa"
                className="h-12 bg-white/[0.04] border-white/[0.08] text-white text-[14px] placeholder:text-white/30 rounded-xl focus-visible:ring-1 focus-visible:ring-purple-500/60 focus-visible:border-purple-500/40 transition-colors"
                required
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-12 bg-white/[0.04] border-white/[0.08] text-white text-[14px] placeholder:text-white/30 rounded-xl focus-visible:ring-1 focus-visible:ring-purple-500/60 focus-visible:border-purple-500/40 transition-colors"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha (mín. 6 caracteres)"
                  className="h-12 bg-white/[0.04] border-white/[0.08] text-white text-[14px] placeholder:text-white/30 rounded-xl pr-11 focus-visible:ring-1 focus-visible:ring-purple-500/60 focus-visible:border-purple-500/40 transition-colors"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="submit"
                className="w-full h-12 mt-2 rounded-xl text-[14px] font-medium transition-all duration-200 hover:brightness-110"
                style={{
                  background: 'linear-gradient(180deg, #A78BFA 0%, #7B50DC 100%)',
                  boxShadow: '0 8px 24px -8px rgba(139,92,246,0.5)',
                }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Conta'}
              </Button>
            </form>
          )}

          <p className="text-center text-[12.5px] text-white/35">
            {mode === 'signin' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}{' '}
            {mode === 'signin' ? (
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-white/80 hover:text-white font-medium transition-colors"
              >
                Cadastre-se
              </button>
            ) : (
              <button
                type="button"
                onClick={switchMode}
                className="text-white/80 hover:text-white font-medium transition-colors"
              >
                Entrar
              </button>
            )}
          </p>

          {showComingSoon && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              🚀 Disponível em breve no lançamento!
            </div>
          )}
        </motion.div>

        {/* Footer legal — Apple-style, fixed bottom */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 text-[11px] text-white/25">
          <a href="https://www.ellosuit.online/privacy" className="hover:text-white/50 transition-colors">Política de Privacidade</a>
          <span>·</span>
          <a href="https://www.ellosuit.online/terms" className="hover:text-white/50 transition-colors">Termos de Uso</a>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
