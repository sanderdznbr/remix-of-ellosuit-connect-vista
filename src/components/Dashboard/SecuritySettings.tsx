import React, { useState } from 'react';
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
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [settings, setSettings] = useState({ twoFactor: false, loginAlerts: true, sessionExpiry: true });

  const sessions = [
    { id: '1', device: 'Chrome no Windows', location: 'São Paulo, BR', ip: '192.168.1.xxx', current: true, lastActive: new Date().toISOString() },
    { id: '2', device: 'Safari no iPhone', location: 'São Paulo, BR', ip: '192.168.1.xxx', current: false, lastActive: new Date(Date.now() - 3600000).toISOString() },
  ];

  const handleChangePassword = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    if (passwordData.new.length < 6) {
      toast({ title: 'A nova senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    toast({ title: 'Senha alterada com sucesso!', description: 'Sua senha foi atualizada.' });
    setPasswordData({ current: '', new: '', confirm: '' });
  };

  const handleToggle2FA = () => {
    setSettings({ ...settings, twoFactor: !settings.twoFactor });
    toast({
      title: settings.twoFactor ? '2FA Desativado' : '2FA Ativado',
      description: settings.twoFactor ? 'A autenticação de dois fatores foi desativada.' : 'Autenticação de dois fatores ativada com sucesso.',
    });
  };

  const handleEndSession = (sessionId: string) => {
    toast({ title: 'Sessão encerrada', description: 'O dispositivo foi desconectado.' });
  };

  const handleEndAllSessions = () => {
    toast({ title: 'Todas as sessões encerradas', description: 'Todos os dispositivos foram desconectados, exceto este.' });
  };

  const securityOptions = [
    { key: 'twoFactor', icon: Smartphone, iconBg: 'bg-primary/10', iconColor: 'text-primary', label: 'Autenticação 2FA', desc: 'Camada extra de segurança', checked: settings.twoFactor, onChange: handleToggle2FA },
    { key: 'loginAlerts', icon: AlertTriangle, iconBg: 'bg-yellow-500/10', iconColor: 'text-yellow-500', label: 'Alertas de Login', desc: 'Notificações de novos acessos', checked: settings.loginAlerts, onChange: () => setSettings({ ...settings, loginAlerts: !settings.loginAlerts }) },
    { key: 'sessionExpiry', icon: Clock, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', label: 'Expiração de Sessão', desc: 'Deslogar após 30 dias', checked: settings.sessionExpiry, onChange: () => setSettings({ ...settings, sessionExpiry: !settings.sessionExpiry }) },
  ];

  return (
    <div className="page-content p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Header compact */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Segurança</h1>
          <p className="text-xs text-muted-foreground">Gerencie a segurança da sua conta</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <p className="text-sm font-medium text-green-700 dark:text-green-300">Sua conta está protegida</p>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Key className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Alterar Senha</span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Senha atual</Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={passwordData.current}
              onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              className="h-9 text-sm pr-9"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-2 text-muted-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nova senha</Label>
            <Input type={showPassword ? 'text' : 'password'} value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirmar</Label>
            <Input type={showPassword ? 'text' : 'password'} value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} className="h-9 text-sm" />
          </div>
        </div>

        <Button onClick={handleChangePassword} className="w-full h-9 text-sm" disabled={loading}>
          {loading ? 'Alterando...' : 'Alterar Senha'}
        </Button>
      </div>

      {/* Security Options */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50">
          <span className="text-sm font-semibold text-foreground">Opções de Segurança</span>
        </div>
        {securityOptions.map((opt, i) => {
          const Icon = opt.icon;
          return (
            <div key={opt.key} className={`flex items-center justify-between px-4 py-3 ${i < securityOptions.length - 1 ? 'border-b border-border/30' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${opt.iconBg}`}>
                  <Icon className={`h-3.5 w-3.5 ${opt.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                </div>
              </div>
              <Switch checked={opt.checked} onCheckedChange={opt.onChange} />
            </div>
          );
        })}
      </div>

      {/* Active Sessions */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm font-semibold text-foreground">Sessões Ativas</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleEndAllSessions}>
            <LogOut className="h-3 w-3 mr-1" />
            Encerrar Todas
          </Button>
        </div>
        {sessions.map((session, i) => (
          <div key={session.id} className={`flex items-center justify-between px-4 py-3 ${i < sessions.length - 1 ? 'border-b border-border/30' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${session.current ? 'bg-green-500/10' : 'bg-muted'}`}>
                <Monitor className={`h-3.5 w-3.5 ${session.current ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{session.device}</p>
                  {session.current && (
                    <span className="px-1.5 py-0.5 bg-green-500/10 text-green-600 text-[10px] font-medium rounded-full">Atual</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{session.location} • {session.ip}</p>
              </div>
            </div>
            {!session.current && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEndSession(session.id)}>
                <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecuritySettings;
