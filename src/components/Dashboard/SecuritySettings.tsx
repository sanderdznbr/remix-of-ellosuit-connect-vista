import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, Key, Smartphone, Monitor, LogOut, Eye, EyeOff, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const SecuritySettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [settings, setSettings] = useState({
    twoFactor: false,
    loginAlerts: true,
    sessionExpiry: true,
  });

  const sessions = [
    {
      id: '1',
      device: 'Chrome no Windows',
      location: 'São Paulo, Brasil',
      ip: '192.168.1.xxx',
      current: true,
      lastActive: new Date().toISOString(),
    },
    {
      id: '2',
      device: 'Safari no iPhone',
      location: 'São Paulo, Brasil',
      ip: '192.168.1.xxx',
      current: false,
      lastActive: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const handleChangePassword = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast({
        title: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.new.length < 6) {
      toast({
        title: 'A nova senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);

    toast({
      title: 'Senha alterada com sucesso!',
      description: 'Sua senha foi atualizada.',
    });

    setPasswordData({ current: '', new: '', confirm: '' });
  };

  const handleToggle2FA = () => {
    setSettings({ ...settings, twoFactor: !settings.twoFactor });
    toast({
      title: settings.twoFactor ? '2FA Desativado' : '2FA Ativado',
      description: settings.twoFactor 
        ? 'A autenticação de dois fatores foi desativada.' 
        : 'Autenticação de dois fatores ativada com sucesso.',
    });
  };

  const handleEndSession = (sessionId: string) => {
    toast({
      title: 'Sessão encerrada',
      description: 'O dispositivo foi desconectado.',
    });
  };

  const handleEndAllSessions = () => {
    toast({
      title: 'Todas as sessões encerradas',
      description: 'Todos os dispositivos foram desconectados, exceto este.',
    });
  };

  return (
    <div className="page-content p-4 md:p-6 space-y-6 bg-muted/30 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          Segurança
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Gerencie a segurança da sua conta</p>
      </div>

      {/* Security Status */}
      <Card className="border-none shadow-md rounded-xl bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-green-500/20">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800 dark:text-green-200">Sua conta está protegida</h3>
            <p className="text-sm text-green-700 dark:text-green-300">Última verificação de segurança: agora</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Password */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Key className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                className="h-11"
              />
            </div>

            <Button onClick={handleChangePassword} className="w-full h-11" disabled={loading}>
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </CardContent>
        </Card>

        {/* Security Options */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              Opções de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Autenticação 2FA</p>
                  <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança</p>
                </div>
              </div>
              <Switch checked={settings.twoFactor} onCheckedChange={handleToggle2FA} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Alertas de Login</p>
                  <p className="text-xs text-muted-foreground">Receba notificações de novos acessos</p>
                </div>
              </div>
              <Switch 
                checked={settings.loginAlerts} 
                onCheckedChange={(checked) => setSettings({ ...settings, loginAlerts: checked })} 
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Expiração de Sessão</p>
                  <p className="text-xs text-muted-foreground">Deslogar após 30 dias de inatividade</p>
                </div>
              </div>
              <Switch 
                checked={settings.sessionExpiry} 
                onCheckedChange={(checked) => setSettings({ ...settings, sessionExpiry: checked })} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card className="border-none shadow-lg rounded-2xl bg-card">
        <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5" />
            Sessões Ativas
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleEndAllSessions}>
            <LogOut className="h-4 w-4 mr-2" />
            Encerrar Todas
          </Button>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${session.current ? 'bg-green-500/10' : 'bg-muted'}`}>
                    <Monitor className={`h-4 w-4 ${session.current ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{session.device}</p>
                      {session.current && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full dark:bg-green-900 dark:text-green-300">
                          Este dispositivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.location} • IP: {session.ip}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button variant="ghost" size="sm" onClick={() => handleEndSession(session.id)}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;
