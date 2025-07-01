
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Eye, EyeOff } from 'lucide-react';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      console.log('Continue with:', email);
    }, 1500);
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`Continue with ${provider}`);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8 animate-slide-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Bem vindo novamente!
            </h1>
            <p className="text-gray-600">
              Entre no seu ellosuit
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 px-4 text-base border-gray-200 focus:border-ellosuit-purple focus:ring-ellosuit-purple/20 transition-all duration-200"
              />
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!email || isLoading}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                'Continue'
              )}
            </Button>

            {/* Divider */}
            <div className="relative flex items-center">
              <Separator className="flex-1" />
              <span className="px-4 text-sm text-gray-500 bg-white">OR</span>
              <Separator className="flex-1" />
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('Google')}
                className="w-full h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSocialLogin('Apple')}
                className="w-full h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continue with Apple
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSocialLogin('Phone')}
                className="w-full h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <Phone className="w-5 h-5 mr-3" />
                Continue with phone number
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
                Ainda não tem uma conta?{' '}
                <a href="#" className="text-ellosuit-purple hover:text-ellosuit-purple-dark font-medium transition-colors">
                  Inscreva-se
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="flex-1 bg-ellosuit-gradient flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border border-white rounded-full"></div>
          <div className="absolute bottom-32 right-16 w-24 h-24 border border-white rounded-full"></div>
          <div className="absolute top-1/2 right-32 w-16 h-16 border border-white rounded-full"></div>
        </div>

        {/* Logo Container */}
        <div className="relative z-10 text-center animate-fade-in">
          <div className="mb-8">
            <img 
              src="/lovable-uploads/ef66f492-3dea-4edd-b560-85f5eb3319b8.png" 
              alt="ELLOSUIT Logo" 
              className="w-48 h-auto mx-auto filter brightness-0 invert"
            />
          </div>
          
          {/* Additional Branding Text */}
          <div className="text-white/90 text-lg font-light max-w-md">
            Agende suas chamadas de forma inteligente e organize seu tempo com eficiência.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
