import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import ellosuitLogo from '@/assets/ellosuit-logo.png';

const MobileAuthScreen = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        options: { data: { full_name: name, company_name: company }, emailRedirectTo: `${window.location.origin}/` }
      });
      if (error) { setError(String(error.message)); return; }
      if (data?.user && !data.session) {
        setSuccess('Conta criada! Verifique seu email.');
        setMode('signin');
      }
    } catch { setError('Erro inesperado.'); }
    finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } });
      if (error) setError(String(error.message));
    } catch { setError('Erro inesperado.'); }
    finally { setLoading(false); }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null); setSuccess(null);
    setEmail(''); setPassword(''); setName(''); setCompany('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-safe pb-safe">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img src={ellosuitLogo} alt="ElloSuit" className="h-8 w-auto object-contain" />
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-foreground">
              {mode === 'signin' ? 'Bem-vindo de volta!' : 'Crie sua conta'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'signin' ? 'Entre no seu ellosuit' : 'Comece agora gratuitamente'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>
          )}
          {success && (
            <Alert className="bg-green-50 border-green-200"><AlertDescription className="text-green-800 text-sm">{success}</AlertDescription></Alert>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="h-11 bg-muted/40 border-border rounded-lg" required />
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={password}
                  onChange={e => setPassword(e.target.value)} className="h-11 bg-muted/40 border-border rounded-lg pr-11" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <button type="button" className="text-xs text-primary hover:underline">Esqueci minha senha</button>
              </div>
              <Button type="submit" className="w-full h-10 rounded-full bg-primary text-primary-foreground text-sm" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <Input placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)}
                className="h-11 bg-muted/40 border-border rounded-lg" required />
              <Input placeholder="Empresa (opcional)" value={company} onChange={e => setCompany(e.target.value)}
                className="h-11 bg-muted/40 border-border rounded-lg" />
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="h-11 bg-muted/40 border-border rounded-lg" required />
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Senha (mín. 6 caracteres)" value={password}
                  onChange={e => setPassword(e.target.value)} className="h-11 bg-muted/40 border-border rounded-lg pr-11" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full h-10 rounded-full bg-primary text-primary-foreground text-sm" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Conta'}
              </Button>
            </form>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><Separator /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Social */}
          <div className="space-y-2.5">
            <Button variant="outline" className="w-full h-10 rounded-full border-border text-sm font-normal"
              onClick={handleGoogleSignIn} disabled={loading}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue com Google
            </Button>
            <Button variant="outline" className="w-full h-10 rounded-full border-border text-sm font-normal" disabled={loading}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue com Apple
            </Button>
            <Button variant="outline" className="w-full h-10 rounded-full border-border text-sm font-normal" disabled={loading}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue com Facebook
            </Button>
          </div>

          {/* Toggle */}
          <p className="text-center text-xs text-muted-foreground">
            {mode === 'signin' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <button type="button" onClick={switchMode} className="text-primary font-medium hover:underline">
              {mode === 'signin' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>

          {/* Legal links */}
          <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-4 pb-2">
            <a href="/privacy" className="underline hover:text-foreground transition-colors">Política de Privacidade</a>
            <span>•</span>
            <a href="/terms" className="underline hover:text-foreground transition-colors">Termos de Uso</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAuthScreen;
