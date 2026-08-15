import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import '@/styles/carousel-loader.css';
import { getAuthRedirectUrl } from '@/lib/platform';

const MobileAuthScreen = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Force dark status bar on auth screen
  React.useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevTheme = meta?.getAttribute('content') || '#3000E3';
    const prevBg = document.documentElement.style.backgroundColor || '';
    const prevBodyBg = document.body.style.backgroundColor || '';

    if (meta) meta.setAttribute('content', '#0a0a0f');
    document.documentElement.style.backgroundColor = '#0a0a0f';
    document.body.style.backgroundColor = '#0a0a0f';

    return () => {
      if (meta) meta.setAttribute('content', prevTheme);
      document.documentElement.style.backgroundColor = prevBg;
      document.body.style.backgroundColor = prevBodyBg;
    };
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) setError('Email ou senha incorretos.');
        else setError(String(error.message));
      } else {
        if (rememberMe) {
          localStorage.setItem('ellosuit_remember_me', 'true');
          sessionStorage.removeItem('ellosuit_session_active');
        } else {
          localStorage.setItem('ellosuit_remember_me', 'false');
          sessionStorage.setItem('ellosuit_session_active', 'true');
        }
      }
    } catch { setError('Erro inesperado.'); }
    finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    if (password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, company_name: company, source: 'ellocontent' }, emailRedirectTo: getAuthRedirectUrl('/') }
      });
      if (error) { setError(String(error.message)); return; }
      if (data?.user && !data.session) {
        setSuccess('Conta criada! Verifique seu email.');
        setMode('signin');
      }
    } catch { setError('Erro inesperado.'); }
    finally { setLoading(false); }
  };

  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleSocialLogin = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null); setSuccess(null);
    setEmail(''); setPassword(''); setName(''); setCompany('');
  };

  const inputClass = "h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:ring-purple-500/50";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Top bar */}
      <motion.div
        className="relative z-20 flex items-center justify-center px-5 pt-8 pb-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <img src={ellocontentLogo} alt="elloContent" className="h-5 object-contain cursor-pointer" onClick={() => navigate('/')} />
      </motion.div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-8">
        <motion.div
          className="w-full max-w-sm space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-white">
              {mode === 'signin' ? 'Bem-vindo de volta!' : 'Crie sua conta'}
            </h1>
            <p className="text-sm text-white/35">
              {mode === 'signin' ? 'Entre no seu ellocontent' : 'Comece agora gratuitamente'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <AlertDescription className="text-green-300 text-sm">{success}</AlertDescription>
            </Alert>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} required />
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={password}
                  onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-11`} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
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
                <button type="button" className="text-xs text-purple-400 hover:underline" onClick={() => navigate('/forgot-password')}>Esqueci minha senha</button>
              </div>
              <Button type="submit" className="w-full h-10 rounded-full text-sm" style={{ backgroundColor: '#7B50DC' }} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <Input placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)}
                className={inputClass} required />
              <Input placeholder="Empresa (opcional)" value={company} onChange={e => setCompany(e.target.value)}
                className={inputClass} />
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} required />
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Senha (mín. 6 caracteres)" value={password}
                  onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-11`} required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full h-10 rounded-full text-sm" style={{ backgroundColor: '#7B50DC' }} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Conta'}
              </Button>
            </form>
          )}


          {/* Toggle */}
          <p className="text-center text-xs text-white/30">
            {mode === 'signin' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}{' '}
            {mode === 'signin' ? (
              <button type="button" onClick={() => navigate('/register')} className="text-purple-400 font-medium hover:underline">
                Cadastre-se
              </button>
            ) : (
              <button type="button" onClick={switchMode} className="text-purple-400 font-medium hover:underline">
                Entrar
              </button>
            )}
          </p>

          {/* Coming Soon Popup */}
          {showComingSoon && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-5 py-3 rounded-full shadow-lg text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              🚀 Disponível em breve no lançamento!
            </div>
          )}

          {/* Legal links */}
          <div className="flex justify-center gap-4 text-xs text-white/20 pt-4 pb-2">
            <a href="https://www.ellosuit.app/privacy" className="underline hover:text-white/40 transition-colors">Política de Privacidade</a>
            <span>•</span>
            <a href="https://www.ellosuit.app/terms" className="underline hover:text-white/40 transition-colors">Termos de Uso</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MobileAuthScreen;
