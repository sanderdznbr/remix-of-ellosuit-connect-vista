import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Shield, 
  Key, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const EmailConnectionWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { isConnected, loading, emailAccount, connectGmail, disconnectGmail, checkConnection } = useGmail();
  const { toast } = useToast();

  const steps = [
    {
      id: 'intro',
      title: 'Bem-vindo',
      description: 'Conecte seu email comercial'
    },
    {
      id: 'requirements',
      title: 'Requisitos',
      description: 'O que você precisa'
    },
    {
      id: 'permissions',
      title: 'Permissões',
      description: 'Autorização necessária'
    },
    {
      id: 'connect',
      title: 'Conectar',
      description: 'Autenticação Google'
    },
    {
      id: 'verify',
      title: 'Verificação',
      description: 'Confirmar conexão'
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConnect = async () => {
    await connectGmail();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência"
    });
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'intro':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Mail className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Conecte seu Email Comercial
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Integre sua conta Gmail ou Google Workspace para enviar emails 
                profissionais diretamente da plataforma.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Envio Direto</h4>
                <p className="text-sm text-muted-foreground">Envie emails sem sair da plataforma</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">100% Seguro</h4>
                <p className="text-sm text-muted-foreground">Conexão OAuth2 criptografada</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Rastreamento</h4>
                <p className="text-sm text-muted-foreground">Acompanhe aberturas e cliques</p>
              </div>
            </div>
          </div>
        );

      case 'requirements':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Requisitos para Conexão
              </h2>
              <p className="text-muted-foreground">
                Verifique se você atende aos requisitos abaixo
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">Conta Google/Gmail</h4>
                  <p className="text-sm text-muted-foreground">
                    Você precisa de uma conta Gmail pessoal ou Google Workspace (empresarial).
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>

              <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Key className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">Acesso à Conta</h4>
                  <p className="text-sm text-muted-foreground">
                    Tenha as credenciais de login da conta que deseja conectar.
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>

              <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">Verificação em 2 Etapas</h4>
                  <p className="text-sm text-muted-foreground">
                    Se ativada, tenha seu dispositivo de autenticação em mãos.
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Importante
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Para contas Google Workspace, o administrador da organização pode 
                    precisar autorizar o aplicativo nas configurações de segurança.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Permissões Necessárias
              </h2>
              <p className="text-muted-foreground">
                Entenda quais permissões serão solicitadas
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Ler emails</h4>
                  <p className="text-sm text-muted-foreground">Para sincronizar sua caixa de entrada</p>
                </div>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                  Leitura
                </span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Enviar emails</h4>
                  <p className="text-sm text-muted-foreground">Para enviar emails em seu nome</p>
                </div>
                <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                  Envio
                </span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Informações do perfil</h4>
                  <p className="text-sm text-muted-foreground">Nome e email para identificação</p>
                </div>
                <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                  Perfil
                </span>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                    Sua Privacidade é Prioridade
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Não armazenamos suas senhas. Utilizamos OAuth2 do Google, 
                    o mesmo padrão de segurança usado por grandes empresas.
                    Você pode revogar o acesso a qualquer momento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'connect':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Conectar com Google
              </h2>
              <p className="text-muted-foreground">
                Clique no botão abaixo para autorizar a conexão
              </p>
            </div>

            {isConnected ? (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Email Conectado!
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {emailAccount?.provider_email || 'Conta conectada com sucesso'}
                  </p>
                  <Button
                    variant="outline"
                    onClick={disconnectGmail}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Desconectar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h4 className="font-semibold text-foreground mb-4">
                    Passo a Passo:
                  </h4>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 flex-shrink-0">
                        1
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Clique no botão "Conectar com Google" abaixo
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 flex-shrink-0">
                        2
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Selecione a conta Google que deseja conectar
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 flex-shrink-0">
                        3
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Revise e aceite as permissões solicitadas
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 flex-shrink-0">
                        4
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Aguarde o redirecionamento de volta para a plataforma
                      </span>
                    </li>
                  </ol>
                </div>

                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleConnect}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-6 text-lg rounded-xl shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Conectar com Google
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'verify':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Verificação da Conexão
              </h2>
              <p className="text-muted-foreground">
                Confirme se tudo está funcionando corretamente
              </p>
            </div>

            {isConnected ? (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                    Conexão Verificada!
                  </h3>
                  <p className="text-green-700 dark:text-green-300 mb-4">
                    Seu email está pronto para uso.
                  </p>
                  <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-green-200 dark:border-green-700">
                    <Mail className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-foreground">
                      {emailAccount?.provider_email || 'Email conectado'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-foreground">Leitura de emails</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Permissão concedida para ler emails
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-foreground">Envio de emails</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Permissão concedida para enviar emails
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Você já pode começar a enviar emails profissionais!
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="h-10 w-10 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Email não conectado
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Volte ao passo anterior para conectar seu email.
                  </p>
                  <Button onClick={() => setCurrentStep(3)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Conexão
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  onClick={checkConnection}
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Novamente
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all",
                  index < currentStep 
                    ? "bg-green-500 text-white" 
                    : index === currentStep 
                      ? "bg-blue-600 text-white shadow-lg" 
                      : "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-1 mx-2 rounded-full transition-all",
                    index < currentStep ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground">{steps[currentStep].title}</h3>
          <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
        </div>
      </div>

      {/* Content Card */}
      <Card className="border-0 shadow-lg rounded-2xl">
        <CardContent className="p-8">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button 
            onClick={nextStep}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : isConnected ? (
          <Button 
            className="bg-green-600 hover:bg-green-700 rounded-xl"
            onClick={() => window.location.reload()}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Concluir Setup
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default EmailConnectionWizard;
