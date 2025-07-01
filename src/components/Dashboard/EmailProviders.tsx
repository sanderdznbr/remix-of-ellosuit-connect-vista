
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Settings, CheckCircle, AlertCircle, Plus, Gmail } from 'lucide-react';

interface EmailProvider {
  id: string;
  name: string;
  type: 'resend' | 'gmail';
  status: 'active' | 'inactive' | 'error';
  config: any;
}

const EmailProviders = () => {
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('resend');
  const [resendConfig, setResendConfig] = useState({
    from_email: '',
    from_name: '',
    domain: ''
  });
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const { toast } = useToast();
  const { user, session } = useAuth();

  useEffect(() => {
    loadProviders();
  }, []);

  // Detectar se usuário voltou da autenticação Google
  useEffect(() => {
    if (session?.provider_token && session?.provider === 'google') {
      checkGoogleConnection();
    }
  }, [session]);

  const checkGoogleConnection = () => {
    const existingProviders = JSON.parse(localStorage.getItem('email_providers') || '[]');
    const hasGmailProvider = existingProviders.some((p: EmailProvider) => p.type === 'gmail');
    
    if (!hasGmailProvider && session?.user?.email) {
      const gmailProvider: EmailProvider = {
        id: 'gmail-connected',
        name: 'Gmail (Conectado)',
        type: 'gmail',
        status: 'active',
        config: {
          email: session.user.email,
          connected_at: new Date().toISOString(),
          provider_token: session.provider_token
        }
      };

      const updatedProviders = [...existingProviders, gmailProvider];
      setProviders(updatedProviders);
      localStorage.setItem('email_providers', JSON.stringify(updatedProviders));
      
      toast({
        title: 'Gmail conectado com sucesso!',
        description: `Conta ${session.user.email} foi conectada e está pronta para enviar emails.`
      });
    }
  };

  const loadProviders = async () => {
    // Load from localStorage
    const savedProviders = localStorage.getItem('email_providers');
    if (savedProviders) {
      setProviders(JSON.parse(savedProviders));
    } else {
      // Default Resend provider
      setProviders([
        {
          id: 'resend-default',
          name: 'Resend (Padrão)',
          type: 'resend',
          status: 'active',
          config: {
            from_email: 'noreply@yourdomain.com',
            from_name: 'Sistema de Email'
          }
        }
      ]);
    }
  };

  const saveProviders = (newProviders: EmailProvider[]) => {
    setProviders(newProviders);
    localStorage.setItem('email_providers', JSON.stringify(newProviders));
  };

  const updateResendConfig = () => {
    const updatedProviders = providers.map(provider => {
      if (provider.type === 'resend') {
        return {
          ...provider,
          config: {
            ...provider.config,
            ...resendConfig
          },
          status: 'active' as const
        };
      }
      return provider;
    });

    saveProviders(updatedProviders);
    toast({
      title: 'Configuração atualizada',
      description: 'Configurações do Resend foram salvas com sucesso.'
    });
  };

  const connectGoogleAccount = async () => {
    setIsConnectingGoogle(true);
    
    try {
      // Sign in with Google to get Gmail permissions
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      // The user will be redirected to Google for authentication
      // After successful auth, they'll return to the dashboard
      
    } catch (error: any) {
      console.error('Error connecting Google account:', error);
      toast({
        title: 'Erro ao conectar conta Google',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const disconnectGmail = () => {
    const updatedProviders = providers.filter(p => p.type !== 'gmail');
    saveProviders(updatedProviders);
    
    toast({
      title: 'Gmail desconectado',
      description: 'Conta Gmail foi removida dos provedores de email.'
    });
  };

  const testEmailProvider = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    try {
      const testEmail = 'test@example.com'; // You'd get this from user input
      
      await supabase.functions.invoke('send-email', {
        body: {
          recipient_email: testEmail,
          subject: 'Teste de Configuração de Email',
          content_html: '<h1>Teste</h1><p>Este é um email de teste para verificar a configuração.</p>',
          content_text: 'Este é um email de teste para verificar a configuração.',
          provider: provider.type,
          from_email: provider.config.from_email || provider.config.email,
          from_name: provider.config.from_name || 'Sistema'
        }
      });

      toast({
        title: 'Teste enviado!',
        description: `Email de teste enviado via ${provider.name}`
      });
    } catch (error: any) {
      toast({
        title: 'Erro no teste',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'gmail':
        return <Mail className="h-5 w-5 text-red-500" />;
      default:
        return <Mail className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Provedores de Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Providers */}
          <div>
            <h3 className="text-lg font-medium mb-4">Provedores Configurados</h3>
            <div className="space-y-3">
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getProviderIcon(provider.type)}
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-gray-600">
                        {provider.type === 'gmail' ? provider.config.email : provider.type}
                      </p>
                      {provider.type === 'gmail' && provider.config.connected_at && (
                        <p className="text-xs text-green-600">
                          Conectado em {new Date(provider.config.connected_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={provider.status === 'active' ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {provider.status === 'active' ? 
                        <CheckCircle className="h-3 w-3" /> : 
                        <AlertCircle className="h-3 w-3" />
                      }
                      {provider.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testEmailProvider(provider.id)}
                    >
                      Testar
                    </Button>
                    {provider.type === 'gmail' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={disconnectGmail}
                        className="text-red-600 hover:text-red-700"
                      >
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resend Configuration */}
          <div>
            <h3 className="text-lg font-medium mb-4">Configurar Resend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from-email">Email Remetente</Label>
                <Input
                  id="from-email"
                  placeholder="noreply@seudominio.com"
                  value={resendConfig.from_email}
                  onChange={(e) => setResendConfig(prev => ({ ...prev, from_email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="from-name">Nome Remetente</Label>
                <Input
                  id="from-name"
                  placeholder="Sua Empresa"
                  value={resendConfig.from_name}
                  onChange={(e) => setResendConfig(prev => ({ ...prev, from_name: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={updateResendConfig} className="mt-4">
              Salvar Configuração Resend
            </Button>
          </div>

          {/* Google Integration */}
          <div>
            <h3 className="text-lg font-medium mb-4">Integração com Google</h3>
            <p className="text-sm text-gray-600 mb-4">
              Conecte sua conta Google para enviar emails através do Gmail API.
              Isso oferece melhor deliverability e os emails serão enviados da sua conta.
            </p>
            
            {providers.some(p => p.type === 'gmail') ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800">Gmail conectado com sucesso!</span>
              </div>
            ) : (
              <Button 
                onClick={connectGoogleAccount}
                disabled={isConnectingGoogle}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {isConnectingGoogle ? 'Conectando...' : 'Conectar Conta Google'}
              </Button>
            )}
          </div>

          {/* Provider Selection */}
          <div>
            <h3 className="text-lg font-medium mb-4">Provedor Padrão</h3>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o provedor padrão" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailProviders;
