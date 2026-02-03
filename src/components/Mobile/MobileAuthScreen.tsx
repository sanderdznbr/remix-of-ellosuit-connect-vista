import React, { useState } from 'react';
import { Eye, EyeOff, Apple, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ellosuitLogo from '@/assets/ellosuit-logo.png';

const MobileAuthScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const { toast } = useToast();

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
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: String(error.message),
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
          emailRedirectTo: `${window.location.origin}/`
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
        description: String(error.message),
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
        description: String(error.message),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header com Logo */}
      <div className="flex-shrink-0 pt-safe bg-primary">
        <div className="flex items-center justify-center py-8">
          <img 
            src={ellosuitLogo} 
            alt="ElloSuit Logo" 
            className="h-10 w-auto filter brightness-0 invert"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-safe">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Bem vindo novamente!
            </h1>
            <p className="text-muted-foreground">
              Entre no seu ellosuit
            </p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted h-12 rounded-xl p-1">
              <TabsTrigger 
                value="signin" 
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-medium"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-medium"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="signin" className="space-y-4 mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:border-primary"
                  required
                />
                
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:border-primary pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base mt-2"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="bg-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-muted-foreground uppercase">ou continue com</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-4 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 border-border bg-muted hover:bg-muted/80 rounded-xl"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-14 border-border bg-muted hover:bg-muted/80 rounded-xl"
                  disabled
                >
                  <Apple className="h-6 w-6 text-foreground" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-14 border-border bg-muted hover:bg-muted/80 rounded-xl"
                  disabled
                >
                  <Phone className="h-6 w-6 text-foreground" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-14 border-border bg-muted hover:bg-muted/80 rounded-xl"
                  disabled
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.88t.1-.87q.1-.41.33-.74.22-.33.57-.52.35-.19.85-.19t.87.19q.36.19.58.52.22.33.33.74.1.42.1.87z"/>
                  </svg>
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Ao continuar, você concorda com nossos{' '}
                <a href="/terms" className="text-primary hover:underline">Termos</a>
                {' '}e{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacidade</a>
              </p>
            </TabsContent>
            
            {/* Signup Tab */}
            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:border-primary"
                  required
                />
                
                <Input
                  type="text"
                  placeholder="Empresa (opcional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-14 bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:border-primary"
                />
                
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:border-primary"
                  required
                />
                
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha (mín. 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:border-primary pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base mt-2"
                  disabled={loading}
                >
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Ao criar uma conta, você concorda com nossos{' '}
                <a href="/terms" className="text-primary hover:underline">Termos</a>
                {' '}e{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacidade</a>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer com Logo */}
      <div className="flex-shrink-0 pb-safe py-4">
        <div className="flex items-center justify-center">
          <img 
            src={ellosuitLogo} 
            alt="ElloSuit Logo" 
            className="h-6 w-auto opacity-50"
          />
        </div>
      </div>
    </div>
  );
};

export default MobileAuthScreen;
