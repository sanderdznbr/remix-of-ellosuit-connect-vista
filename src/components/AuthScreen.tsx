
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Building, AlertCircle, Loader2 } from 'lucide-react';
import ellosuitLogo from '@/assets/ellosuit-logo.png';

const AuthScreen = () => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar parâmetro returnTo na URL
  const getReturnPath = () => {
    const urlParams = new URLSearchParams(location.search);
    const returnTo = urlParams.get('returnTo');
    return returnTo === 'tarefas' ? '/tarefas' : '/dashboard';
  };

  // Verificar se o usuário está específicamente acessando tarefas
  const isFromTarefas = () => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('returnTo') === 'tarefas';
  };

  // Redirecionamento automático se já estiver logado
  useEffect(() => {
    if (user) {
      const returnPath = getReturnPath();
      console.log('🔄 Usuário já logado, redirecionando para:', returnPath);
      navigate(returnPath, { replace: true });
    }
  }, [user, navigate, location.search]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos. Verifique suas credenciais.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login.');
        } else {
          setError(`Erro no login: ${error.message}`);
        }
        return;
      }

      // Login bem-sucedido - o redirecionamento será feito pelo useEffect
      const returnPath = getReturnPath();
      console.log('✅ Login realizado com sucesso, redirecionando para:', returnPath);
      navigate(returnPath, { replace: true });
      
    } catch (error: any) {
      console.error('💥 Erro inesperado no login:', error);
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
          setError('Este email já está cadastrado. Tente fazer login.');
          setActiveTab('signin');
        } else if (error.message.includes('Password should be at least 6 characters')) {
          setError('A senha deve ter pelo menos 6 caracteres.');
        } else {
          setError(`Erro no cadastro: ${error.message}`);
        }
        return;
      }

      if (data?.user && !data.session) {
        setSuccess('Cadastro realizado! Verifique seu email para confirmar a conta.');
        setActiveTab('signin');
      } else if (data?.session) {
        // Cadastro e login automático
        const returnPath = getReturnPath();
        console.log('✅ Cadastro e login realizados, redirecionando para:', returnPath);
        navigate(returnPath, { replace: true });
      }
      
    } catch (error: any) {
      console.error('💥 Erro inesperado no cadastro:', error);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(`Erro no login com Google: ${error.message}`);
      }
      // O redirecionamento será tratado automaticamente pelo Google OAuth
    } catch (error: any) {
      console.error('💥 Erro no login com Google:', error);
      setError('Erro inesperado com Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setCompanyName('');
    setError(null);
    setSuccess(null);
  };

  // Customização visual para tela de tarefas
  const isTarefasLogin = isFromTarefas();
  const containerClass = isTarefasLogin 
    ? "min-h-screen bg-black flex items-center justify-center p-4"
    : "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4";

  const cardClass = isTarefasLogin
    ? "w-full max-w-md bg-gray-900 border-gray-700"
    : "w-full max-w-md";

  const titleColor = isTarefasLogin ? "text-white" : "text-gray-900";
  const descriptionColor = isTarefasLogin ? "text-gray-300" : "text-gray-600";

  return (
    <div className={containerClass}>
      <Card className={cardClass}>
        <CardHeader className="space-y-6">
          {/* Logo Section */}
          <div className="flex justify-center mb-4">
            <div className="w-32 h-16 flex items-center justify-center">
              <img 
                src={ellosuitLogo} 
                alt="ELLOsuit Logo" 
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  console.error('Error loading Ellosuit logo');
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className={`text-3xl font-bold text-center ${titleColor} bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent`}>
              {isTarefasLogin ? 'Acesse suas Tarefas' : 'ELLOsuit Connect'}
            </CardTitle>
            <CardDescription className={`text-center ${descriptionColor} text-lg`}>
              {isTarefasLogin 
                ? 'Faça login para ver seus lembretes e tarefas' 
                : 'Sua plataforma completa de produtividade empresarial'
              }
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => {
              setActiveTab(value as 'signin' | 'signup');
              resetForm();
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            
            {/* Mensagens de erro e sucesso */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mt-4 bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {/* Tab de Login */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Tab de Cadastro */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Nome de usuário</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Seu nome de usuário"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-company">Nome da empresa</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nome da sua empresa"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Separador e login com Google */}
          <div className="mt-6">
            <Separator className="my-4" />
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar com Google
            </Button>
          </div>

          {/* Link para voltar se veio de tarefas */}
          {isTarefasLogin && (
            <div className="mt-4 text-center">
              <Button 
                variant="ghost" 
                className="text-gray-400 hover:text-gray-300"
                onClick={() => navigate('/tarefas')}
              >
                ← Voltar para Tarefas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthScreen;
