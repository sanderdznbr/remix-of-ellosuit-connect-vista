
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Eye, EyeOff, Building } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const { user, signUp, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // useEffect para redirect - SIMPLIFICADO
  useEffect(() => {
    if (user) {
      console.log('🔄 Usuário autenticado, redirecionando para dashboard...');
      
      // Verificar se há OAuth callback
      const urlParams = new URLSearchParams(window.location.search);
      const hasGoogleCallback = urlParams.get('code') && urlParams.get('state') === 'google_calendar_auth';
      
      if (hasGoogleCallback) {
        console.log('🔄 OAuth callback detectado, aguardando processamento...');
        // Aguardar um pouco para o hook processar
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        // Redirect normal imediato
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const validateForm = () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive"
      });
      return false;
    }

    if (!password) {
      toast({
        title: "Erro",
        description: "Senha é obrigatória",
        variant: "destructive"
      });
      return false;
    }

    if (isSignUp) {
      if (!username) {
        toast({
          title: "Erro", 
          description: "Nome de usuário é obrigatório",
          variant: "destructive"
        });
        return false;
      }

      if (!companyName) {
        toast({
          title: "Erro",
          description: "Nome da empresa é obrigatório",
          variant: "destructive"
        });
        return false;
      }

      if (password.length < 6) {
        toast({
          title: "Erro",
          description: "Senha deve ter pelo menos 6 caracteres",
          variant: "destructive"
        });
        return false;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Erro",
          description: "Senhas não coincidem",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      if (isSignUp) {
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await signUp(email, password, username, companyName);
        
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              title: "Erro",
              description: "Este email já está cadastrado. Tente fazer login.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Erro no cadastro",
              description: error.message,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Cadastro realizado!",
            description: "Sua conta e empresa foram criadas. Verifique seu email para confirmar a conta.",
          });
        }
      } else {
        const { data, error } = await signIn(email, password);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Erro",
              description: "Email ou senha incorretos",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Erro no login",
              description: error.message,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Login realizado!",
            description: "Bem-vindo de volta!",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    if (provider === 'Google') {
      setIsLoading(true);
      try {
        const { error } = await signInWithGoogle();
        if (error) {
          toast({
            title: "Erro",
            description: error.message,
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao conectar com Google",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      toast({
        title: "Em breve",
        description: `Login com ${provider} será implementado em breve.`,
      });
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    // Reset form fields when switching modes
    setEmail('');
    setUsername('');
    setCompanyName('');
    setWhatsapp('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8 animate-slide-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {isSignUp ? 'Crie sua conta!' : 'Bem vindo novamente!'}
            </h1>
            <p className="text-gray-600">
              {isSignUp ? 'Registre-se no ellosuit' : 'Entre no seu ellosuit'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Registration Fields */}
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Nome de usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 px-4 text-base border-gray-200 focus:border-ellosuit-purple focus:ring-ellosuit-purple/20 transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="text"
                      placeholder="Nome da sua empresa"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-12 pl-12 pr-4 text-base border-gray-200 focus:border-ellosuit-purple focus:ring-ellosuit-purple/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 px-4 text-base border-gray-200 focus:border-ellosuit-purple focus:ring-ellosuit-purple/20 transition-all duration-200"
              />
            </div>

            {/* WhatsApp Input - Only for Sign Up */}
            {isSignUp && (
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder="Seu WhatsApp (opcional)"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="h-12 px-4 text-base border-gray-200 focus:border-ellosuit-purple focus:ring-ellosuit-purple/20 transition-all duration-200"
                />
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-2 relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 px-4 pr-12 text-base border-gray-200 focus:border-ellosuit-purple focus:ring-ellosuit-purple/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Confirm Password Input - Only for Sign Up */}
            {isSignUp && (
              <div className="space-y-2 relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirme sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 px-4 pr-12 text-base border-gray-200 focus:border-ellosuit-purple focus:ring-ellosuit-purple/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!email || !password || isLoading || (isSignUp && (!username || !confirmPassword || !companyName))}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Carregando...</span>
                </div>
              ) : (
                isSignUp ? 'Registrar' : 'Entrar'
              )}
            </Button>

            {/* Divider */}
            <div className="relative flex items-center">
              <Separator className="flex-1" />
              <span className="px-4 text-sm text-gray-500 bg-white">OU</span>
              <Separator className="flex-1" />
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('Google')}
                disabled={isLoading}
                className="w-full h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSocialLogin('Apple')}
                disabled={isLoading}
                className="w-full h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continuar com Apple
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSocialLogin('Telefone')}
                disabled={isLoading}
                className="w-full h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <Phone className="w-5 h-5 mr-3" />
                Continuar com telefone
              </Button>
            </div>

            {/* Footer Links */}
            <div className="space-y-4 text-center">
              <div className="text-sm">
                <a href="#" className="text-ellosuit-purple hover:text-ellosuit-purple-dark transition-colors">
                  Perdeu sua senha?
                </a>
                <span className="text-gray-400 mx-2">|</span>
                <a href="#" className="text-ellosuit-purple hover:text-ellosuit-purple-dark transition-colors">
                  Perdeu seu usuário?
                </a>
              </div>
              
              <div className="text-sm text-gray-600">
                {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
                <button 
                  onClick={toggleMode}
                  className="text-ellosuit-purple hover:text-ellosuit-purple-dark font-medium transition-colors"
                >
                  {isSignUp ? 'Entrar' : 'Inscreva-se'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Logo Only */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden" style={{ backgroundColor: '#3600FF' }}>
        {/* Logo Container - Centered and 30% larger */}
        <div className="flex items-center justify-center animate-fade-in">
          <img 
            src="/lovable-uploads/1ace337d-1080-46b1-b9e6-15dba227814c.png" 
            alt="ELLOSUIT Logo" 
            className="w-52 h-auto filter brightness-0 invert"
          />
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
