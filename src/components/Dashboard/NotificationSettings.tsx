import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Smartphone, Clock, TestTube, RefreshCw, MessageSquare, Calendar, Mail, Send, CheckSquare, Trash2 } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useDeviceRegistration } from '@/hooks/useDeviceRegistration';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const NotificationSettings = () => {
  const { settings, updateNotificationSettings, isLoading } = useNotificationSettings();
  const { 
    deviceToken, 
    isRegistered, 
    isRegistering,
    requestNotificationPermission, 
    resetRegistration 
  } = useDeviceRegistration();
  const { toast } = useToast();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testTitle, setTestTitle] = useState('🎉 Notificação Teste');
  const [testMessage, setTestMessage] = useState('Esta é uma notificação de teste do Ello Suit com APNs configurado!');

  const handleSettingChange = async (key: string, value: boolean | number) => {
    try {
      await updateNotificationSettings({ [key]: value });
      toast({
        title: "✅ Configuração atualizada",
        description: "Suas preferências de notificação foram salvas.",
      });
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Não foi possível atualizar a configuração.",
        variant: "destructive"
      });
    }
  };

  const sendTestNotification = async () => {
    if (!testTitle.trim() || !testMessage.trim()) {
      toast({ title: "❌ Erro", description: "Título e mensagem são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { title: testTitle, body: testMessage, deviceToken }
      });
      if (error) throw error;
      const isSimulated = data.results?.[0]?.simulation;
      toast({
        title: "🎉 Notificação teste enviada!",
        description: isSimulated ? `Simulada: ${data.sent} dispositivo(s)` : `Enviada via APNs para ${data.sent} dispositivo(s)`,
      });
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(testTitle, { body: testMessage, icon: '/favicon.ico' });
      }
    } catch (error: any) {
      toast({ title: "❌ Erro", description: `Falha ao enviar notificação: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const whatsappToggles = [
    {
      key: 'whatsapp_event_created',
      label: 'Evento agendado no calendário',
      description: 'Notificar quando um novo evento for criado na agenda',
      icon: Calendar,
      color: 'text-blue-500',
    },
    {
      key: 'whatsapp_event_upcoming',
      label: 'Evento próximo (cronômetro)',
      description: 'Notificar quando um evento estiver próximo de começar',
      icon: Clock,
      color: 'text-orange-500',
    },
    {
      key: 'whatsapp_event_deleted',
      label: 'Evento deletado do calendário',
      description: 'Notificar quando um evento for removido da agenda',
      icon: Trash2,
      color: 'text-red-500',
    },
    {
      key: 'whatsapp_task_due',
      label: 'Tarefa prestes a vencer',
      description: 'Notificar quando uma tarefa estiver próxima do prazo',
      icon: CheckSquare,
      color: 'text-green-500',
    },
    {
      key: 'whatsapp_email_sent',
      label: 'E-mail marketing enviado',
      description: 'Notificar quando um e-mail marketing for disparado',
      icon: Mail,
      color: 'text-purple-500',
    },
    {
      key: 'whatsapp_dispatch_progress',
      label: 'Disparos de mensagens em andamento',
      description: 'Notificar sobre o progresso de disparos em massa',
      icon: Send,
      color: 'text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          🔔 Configurações de Notificação
        </h3>
        <p className="text-muted-foreground text-sm">
          Gerencie como e quando você recebe notificações sobre seus eventos e compromissos.
        </p>
      </div>

      {/* WhatsApp Notifications Section */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-green-500" />
              Notificações via WhatsApp
            </CardTitle>
            <Switch
              checked={(settings as any)?.whatsapp_enabled ?? true}
              onCheckedChange={(checked) => handleSettingChange('whatsapp_enabled', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Receba alertas diretamente no seu WhatsApp conectado à conta admin
          </p>
        </CardHeader>
        <CardContent className="space-y-1">
          {whatsappToggles.map((toggle, index) => (
            <React.Fragment key={toggle.key}>
              {index > 0 && <Separator className="my-3" />}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-start gap-3">
                  <toggle.icon className={`h-5 w-5 mt-0.5 ${toggle.color}`} />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium leading-tight">{toggle.label}</Label>
                    <p className="text-xs text-muted-foreground">{toggle.description}</p>
                  </div>
                </div>
                <Switch
                  checked={(settings as any)?.[toggle.key] ?? true}
                  onCheckedChange={(checked) => handleSettingChange(toggle.key, checked)}
                  disabled={!((settings as any)?.whatsapp_enabled ?? true)}
                />
              </div>
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Device Registration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Status do Dispositivo APNs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">🍎 Notificações Push iOS</Label>
              <p className="text-sm text-muted-foreground">
                {isRegistered ? "✅ Dispositivo registrado para APNs" : "❌ Dispositivo não registrado"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isRegistered ? "default" : "destructive"}>
                {isRegistered ? "✅ Ativo" : "❌ Inativo"}
              </Badge>
              {isRegistered && (
                <Button variant="outline" size="sm" onClick={resetRegistration} className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
          {deviceToken && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">🔑 Device Token</Label>
              <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                {deviceToken.substring(0, 30)}...
              </p>
            </div>
          )}
          {!isRegistered && (
            <Button onClick={requestNotificationPermission} disabled={isRegistering} className="w-full">
              {isRegistering ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Registrando...</>
              ) : (
                <><Bell className="h-4 w-4 mr-2" />🍎 Ativar Notificações APNs</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* General Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Notificações do Calendário</Label>
              <p className="text-sm text-muted-foreground">Receba notificações sobre eventos e compromissos</p>
            </div>
            <Switch
              checked={settings?.calendar_notifications_enabled ?? true}
              onCheckedChange={(checked) => handleSettingChange('calendar_notifications_enabled', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Notificações de Início de Evento</Label>
              <p className="text-sm text-muted-foreground">Seja notificado quando um evento começar</p>
            </div>
            <Switch
              checked={settings?.event_start_notifications ?? true}
              onCheckedChange={(checked) => handleSettingChange('event_start_notifications', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Lembretes de Eventos</Label>
              <p className="text-sm text-muted-foreground">Receba lembretes antes dos seus eventos</p>
            </div>
            <Switch
              checked={settings?.reminder_notifications_enabled ?? true}
              onCheckedChange={(checked) => handleSettingChange('reminder_notifications_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Configurações de Lembrete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-reminder">Lembrete Padrão (minutos antes)</Label>
            <Input
              id="default-reminder"
              type="number"
              min="1"
              max="1440"
              value={settings?.default_reminder_minutes ?? 15}
              onChange={(e) => handleSettingChange('default_reminder_minutes', parseInt(e.target.value))}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">Tempo padrão para lembretes de novos eventos</p>
          </div>
        </CardContent>
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            🧪 Teste de Notificação APNs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-title">📱 Título</Label>
            <Input id="test-title" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} placeholder="Título da notificação teste" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-message">💬 Mensagem</Label>
            <Input id="test-message" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Mensagem da notificação teste" />
          </div>
          <Button onClick={sendTestNotification} disabled={isSendingTest || !testTitle.trim() || !testMessage.trim() || !isRegistered} className="w-full">
            {isSendingTest ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>📤 Enviando via APNs...</>
            ) : (
              <><TestTube className="h-4 w-4 mr-2" />🍎 Enviar Teste APNs</>
            )}
          </Button>
          {!isRegistered && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>⚠️ Atenção:</strong> Ative as notificações primeiro para enviar testes APNs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
