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

  // Redirecionar automaticamente se já estiver logado
  useEffect(() => {
    if (user) {
      console.log('🔄 [Mobile] Usuário já logado, redirecionando para /dashboard');
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

      // Redirecionar para o dashboard após login bem-sucedido
      console.log('✅ [Mobile] Login bem-sucedido, redirecionando para /dashboard');
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
      const { data, error } = await supabase.auth.signUp({
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

      // Verificar se precisa confirmar email ou se já está logado
      if (data?.user && !data.session) {
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar a conta.",
        });
      } else if (data?.session) {
        toast({
          title: "Conta criada!",
          description: "Bem-vindo ao ElloSuit.",
        });
        // Redirecionar para o dashboard após cadastro e login automático
        console.log('✅ [Mobile] Cadastro e login bem-sucedidos, redirecionando para /dashboard');
        navigate('/dashboard', { replace: true });
      }
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
      {/* Header com Logo */}
      <div className="flex-shrink-0 pt-safe">
        <div className="flex items-center justify-center py-6">
          <img 
            src="/lovable-uploads/1ace337d-1080-46b1-b9e6-15dba227814c.png" 
            alt="ElloSuit Logo" 
            className="h-10 w-auto filter brightness-0 invert"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-safe">
        <div className="w-full max-w-md space-y-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900 border border-gray-800 h-12 rounded-2xl p-1">
              <TabsTrigger 
                value="signin" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-black text-gray-400 font-medium"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-black text-gray-400 font-medium"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="signin" className="space-y-4 mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 rounded-2xl focus:border-white"
                    required
                  />
                </div>
                
                <div className="space-y-2 relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 rounded-2xl focus:border-white pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl bg-white hover:bg-gray-100 text-black font-semibold text-base mt-2"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="bg-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-black px-3 text-gray-500 uppercase text-xs">ou continue com</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-4 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 border-gray-800 bg-gray-900 hover:bg-gray-800 rounded-2xl"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-14 border-gray-800 bg-gray-900 hover:bg-gray-800 rounded-2xl"
                  disabled
                >
                  <Apple className="h-6 w-6 text-white" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-14 border-gray-800 bg-gray-900 hover:bg-gray-800 rounded-2xl"
                  disabled
                >
                  <Phone className="h-6 w-6 text-white" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-14 border-gray-800 bg-gray-900 hover:bg-gray-800 rounded-2xl"
                  disabled
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="white">
                    <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.88t.1-.87q.1-.41.33-.74.22-.33.57-.52.35-.19.85-.19t.87.19q.36.19.58.52.22.33.33.74.1.42.1.87zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V4.13q0-.46.33-.8.33-.32.8-.32h13.87q.46 0 .8.33.32.33.32.8zm-3 4.13q-.25 0-.25.25v6.75q0 .25.25.25h1.5q.25 0 .25-.25v-6.75q0-.25-.25-.25zm-4.5 0q-.25 0-.25.25v6.75q0 .25.25.25h1.5q.25 0 .25-.25v-6.75q0-.25-.25-.25zm-4.5 0q-.25 0-.25.25v6.75q0 .25.25.25h1.5q.25 0 .25-.25v-6.75q0-.25-.25-.25z"/>
                  </svg>
                </Button>
              </div>

              <p className="text-center text-xs text-gray-500 mt-6">
                Ao continuar, você concorda com nossos{' '}
                <a href="/terms" className="text-white hover:underline">Termos</a>
                {' '}e{' '}
                <a href="/privacy" className="text-white hover:underline">Privacidade</a>
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
                  className="h-14 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 rounded-2xl focus:border-white"
                  required
                />
                
                <Input
                  type="text"
                  placeholder="Empresa (opcional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-14 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 rounded-2xl focus:border-white"
                />
                
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 rounded-2xl focus:border-white"
                  required
                />
                
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha (mín. 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 rounded-2xl focus:border-white pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl bg-white hover:bg-gray-100 text-black font-semibold text-base mt-2"
                  disabled={loading}
                >
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>

              <p className="text-center text-xs text-gray-500 mt-6">
                Ao criar uma conta, você concorda com nossos{' '}
                <a href="/terms" className="text-white hover:underline">Termos</a>
                {' '}e{' '}
                <a href="/privacy" className="text-white hover:underline">Privacidade</a>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MobileAuthScreen;
