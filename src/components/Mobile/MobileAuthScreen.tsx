import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Building2, Apple, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ellosuitLogo from '@/assets/ellosuit-logo.png';

const MobileAuthScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });

      // Redirecionar para dashboard
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            company_name: company,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      toast({
        title: "Conta criada!",
        description: "Verifique seu email para confirmar a conta.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Logo Header */}
      <div className="p-6 flex justify-center">
        <img src={ellosuitLogo} alt="ElloSuit" className="h-12" />
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-4">
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-neutral-900">
            <TabsTrigger value="signin" className="data-[state=active]:bg-white data-[state=active]:text-black text-neutral-400">
              Entrar
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:text-black text-neutral-400">
              Cadastrar
            </TabsTrigger>
          </TabsList>

          {/* Sign In Tab */}
          <TabsContent value="signin" className="space-y-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-neutral-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 h-14"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-neutral-300">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <Input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 h-14"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-white text-black hover:bg-neutral-200 font-medium"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="relative">
              <Separator className="bg-neutral-800" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-4 text-sm text-neutral-500">
                OU CONTINUE COM
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-16 bg-neutral-900 border-neutral-800 hover:bg-neutral-800"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-16 bg-neutral-900 border-neutral-800 hover:bg-neutral-800"
                disabled={loading}
              >
                <Apple className="h-6 w-6 text-white" fill="white" />
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-16 bg-neutral-900 border-neutral-800 hover:bg-neutral-800"
                disabled={loading}
              >
                <Phone className="h-6 w-6 text-white" />
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-16 bg-neutral-900 border-neutral-800 hover:bg-neutral-800"
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#0078D4">
                  <path d="M23.5 12.2c0-6.3-5.1-11.4-11.4-11.4S.7 5.9.7 12.2s5.1 11.4 11.4 11.4 11.4-5.1 11.4-11.4z"/>
                  <path fill="white" d="M1.8 12.2c0 5.7 4.6 10.3 10.3 10.3s10.3-4.6 10.3-10.3S17.8 1.9 12.1 1.9 1.8 6.5 1.8 12.2zm8.3-1.1h4.1v4.1h2.1v-4.1h4.1v-2.1h-4.1V5h-2.1v4.1h-4.1v2z"/>
                </svg>
              </Button>
            </div>

            <p className="text-center text-xs text-neutral-500 mt-6">
              Ao continuar, você concorda com nossos{' '}
              <a href="/termos" className="text-white underline">
                Termos
              </a>{' '}
              e{' '}
              <a href="/termos" className="text-white underline">
                Privacidade
              </a>
            </p>
          </TabsContent>

          {/* Sign Up Tab */}
          <TabsContent value="signup" className="space-y-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-neutral-300">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 h-14"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-company" className="text-neutral-300">Empresa (opcional)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <Input
                    id="signup-company"
                    type="text"
                    placeholder="Nome da empresa"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="pl-10 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 h-14"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-neutral-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 h-14"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-neutral-300">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 h-14"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-white text-black hover:bg-neutral-200 font-medium"
              >
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>

            <p className="text-center text-xs text-neutral-500">
              Já tem uma conta?{' '}
              <button
                onClick={() => {
                  const tabs = document.querySelector('[role="tablist"]');
                  const signInTab = tabs?.querySelector('[value="signin"]') as HTMLElement;
                  signInTab?.click();
                }}
                className="text-white underline"
              >
                Entrar
              </button>
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MobileAuthScreen;
