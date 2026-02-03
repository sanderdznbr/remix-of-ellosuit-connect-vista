import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
    <div className="min-h-screen bg-background flex flex-col animate-in fade-in duration-500">
      {/* Clean Header with Logo */}
      <div className="flex-shrink-0 bg-primary pt-safe">
        <div className="flex items-center justify-center py-10">
          <img 
            src={ellosuitLogo} 
            alt="ElloSuit" 
            className="h-8 w-auto filter brightness-0 invert"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-8 pb-safe">
        <div className="w-full max-w-sm mx-auto space-y-8">
          {/* Welcome Text */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Bem-vindo!
            </h1>
            <p className="text-sm text-muted-foreground">
              Entre na sua conta ellosuit
            </p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted h-11 rounded-lg p-1">
              <TabsTrigger 
                value="signin" 
                className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-medium text-sm"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-medium text-sm"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="signin" className="space-y-5 mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-background border-input text-foreground placeholder:text-muted-foreground rounded-lg"
                    required
                  />
                </div>
                
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-background border-input text-foreground placeholder:text-muted-foreground rounded-lg pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">ou</span>
                </div>
              </div>

              {/* Google Login */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-input bg-background hover:bg-muted rounded-lg font-medium"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar com Google
              </Button>

              <p className="text-center text-xs text-muted-foreground pt-4">
                Ao continuar, você concorda com nossos{' '}
                <a href="/terms" className="text-primary hover:underline">Termos</a>
                {' '}e{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacidade</a>
              </p>
            </TabsContent>
            
            {/* Signup Tab */}
            <TabsContent value="signup" className="space-y-5 mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-background border-input text-foreground placeholder:text-muted-foreground rounded-lg"
                  required
                />
                
                <Input
                  type="text"
                  placeholder="Empresa (opcional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-12 bg-background border-input text-foreground placeholder:text-muted-foreground rounded-lg"
                />
                
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-background border-input text-foreground placeholder:text-muted-foreground rounded-lg"
                  required
                />
                
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha (mín. 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-background border-input text-foreground placeholder:text-muted-foreground rounded-lg pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={loading}
                >
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground pt-4">
                Ao criar conta, você concorda com nossos{' '}
                <a href="/terms" className="text-primary hover:underline">Termos</a>
                {' '}e{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacidade</a>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MobileAuthScreen;
