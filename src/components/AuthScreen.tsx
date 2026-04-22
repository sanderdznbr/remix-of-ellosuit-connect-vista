
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
import { useAuthHeroImage } from '@/hooks/useAuthHeroImage';

const AuthScreen = () => {
  const { isMobile } = useIsMobile();
  const { url: heroImage } = useAuthHeroImage();
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
    <div className="min-h-screen flex relative overflow-hidden" style={{ backgroundColor: '#0F071D' }}>
      {/* ─── LEFT: Brand / Image ─── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden border-r border-white/[0.06] bg-[#130825]">
        {heroImage ? (
          <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover contrast-[1.1] brightness-[1.05]" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs uppercase tracking-[0.2em] select-none">
            Image placeholder
          </div>
        )}
        {/* Soft vignette for legibility of overlay text */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0) 30%, rgba(10,10,15,0) 60%, rgba(10,10,15,0.85) 100%)' }} />

        {/* Logo top */}
        <motion.div
          className="absolute top-8 left-8 z-10"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <img src={ellocontentLogo} alt="elloContent" className="h-6 cursor-pointer" onClick={() => navigate('/')} />
        </motion.div>

        {/* Tagline */}
        <motion.div
          className="absolute bottom-12 left-12 right-12 z-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <h2 className="text-white text-3xl xl:text-4xl font-semibold leading-tight tracking-tight mb-3">
            Crie posts que<br />
            <span className="text-white/50">conectam, em segundos.</span>
          </h2>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            A plataforma de IA mais elegante para criar conteúdo visual para suas redes.
          </p>
        </motion.div>
      </div>

      {/* ─── RIGHT: Form ─── */}
      <div className="w-full lg:w-1/2 flex flex-col relative">
        {/* Mobile-only logo on top of right side (lg hidden case never reached because mobile uses MobileAuthScreen) */}
        <motion.nav
          className="flex items-center justify-between px-6 lg:px-10 py-5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <img src={ellocontentLogo} alt="elloContent" className="h-5 cursor-pointer lg:invisible" onClick={() => navigate('/')} />
          {mode === 'signin' ? (
            <button
              onClick={() => navigate('/register')}
              className="text-white/80 text-sm font-medium px-4 py-1.5 rounded-full border border-white/15 hover:bg-white/5 hover:border-white/30 transition-all cursor-pointer"
            >
              Cadastre-se
            </button>
          ) : (
            <button
              onClick={switchMode}
              className="text-white/80 text-sm font-medium px-4 py-1.5 rounded-full border border-white/15 hover:bg-white/5 hover:border-white/30 transition-all cursor-pointer"
            >
              Entrar
            </button>
          )}
        </motion.nav>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <motion.div
            className="w-full max-w-[360px] space-y-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {/* Title */}
            <div className="space-y-1.5">
              <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">
                {mode === 'signin' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h1>
              <p className="text-sm text-white/40">
                {mode === 'signin' ? 'Entre na sua conta para continuar' : 'Comece agora, é gratuito'}
              </p>
            </div>

          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <AlertCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">{success}</AlertDescription>
            </Alert>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:ring-purple-500/50"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl pr-11 focus-visible:ring-purple-500/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 accent-purple-500"
                  />
                  <span className="text-xs text-white/40">Manter conectado</span>
                </label>
                <button
                  type="button"
                  className="text-xs text-purple-400 hover:text-purple-300 hover:underline"
                  onClick={() => navigate('/forgot-password')}
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-10 rounded-full text-sm font-medium transition-all duration-200"
                style={{ backgroundColor: '#7B50DC' }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nome de usuário"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:ring-purple-500/50"
                required
              />
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da empresa"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:ring-purple-500/50"
                required
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:ring-purple-500/50"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha (mín. 6 caracteres)"
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl pr-11 focus-visible:ring-purple-500/50"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="submit"
                className="w-full h-10 rounded-full text-sm font-medium transition-all duration-200"
                style={{ backgroundColor: '#7B50DC' }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Conta'}
              </Button>
            </form>
          )}

          {/* Divider */}

          {/* Toggle mode */}
          <p className="text-center text-xs text-white/30 pt-2">
            {mode === 'signin' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}{' '}
            {mode === 'signin' ? (
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-purple-400 font-medium hover:underline"
              >
                Cadastre-se
              </button>
            ) : (
              <button
                type="button"
                onClick={switchMode}
                className="text-purple-400 font-medium hover:underline"
              >
                Entrar
              </button>
            )}
            </p>

            {/* Coming Soon Popup */}
            {showComingSoon && (
              <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                🚀 Disponível em breve no lançamento!
              </div>
            )}

            {/* Legal links */}
            <div className="flex justify-center gap-4 text-xs text-white/20 pt-2">
              <a href="https://www.ellosuit.online/privacy" className="underline hover:text-white/40 transition-colors">Política de Privacidade</a>
              <span>•</span>
              <a href="https://www.ellosuit.online/terms" className="underline hover:text-white/40 transition-colors">Termos de Uso</a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
