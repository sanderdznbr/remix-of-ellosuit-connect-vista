import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Smartphone, Clock, TestTube, RefreshCw } from 'lucide-react';
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
      toast({
        title: "❌ Erro",
        description: "Título e mensagem são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingTest(true);
    
    try {
      console.log('🔔 Enviando notificação teste...');
      
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          title: testTitle,
          body: testMessage,
          deviceToken: deviceToken // Enviar para este dispositivo específico
        }
      });

      if (error) {
        console.error('❌ Erro ao enviar notificação teste:', error);
        throw error;
      }

      console.log('✅ Resposta da notificação teste:', data);

      const isSimulated = data.results?.[0]?.simulation;
      
      toast({
        title: "🎉 Notificação teste enviada!",
        description: isSimulated ? 
          `Simulada: ${data.sent} dispositivo(s)` : 
          `Enviada via APNs para ${data.sent} dispositivo(s)`,
      });
      
      // Mostrar notificação browser se suportado
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(testTitle, {
          body: testMessage,
          icon: '/favicon.ico'
        });
      }
      
    } catch (error: any) {
      console.error('💥 Erro:', error);
      toast({
        title: "❌ Erro",
        description: `Falha ao enviar notificação: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          🔔 Configurações de Notificação Push
        </h3>
        <p className="text-gray-600">
          Gerencie como e quando você recebe notificações sobre seus eventos e compromissos.
        </p>
      </div>

      {/* Device Registration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Status do Dispositivo APNs</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">🍎 Notificações Push iOS</Label>
              <p className="text-sm text-gray-500">
                {isRegistered 
                  ? "✅ Dispositivo registrado para APNs" 
                  : "❌ Dispositivo não registrado"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isRegistered ? "default" : "destructive"}>
                {isRegistered ? "✅ Ativo" : "❌ Inativo"}
              </Badge>
              {isRegistered && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetRegistration}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
          
          {deviceToken && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">🔑 Device Token</Label>
              <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                {deviceToken.substring(0, 30)}...
              </p>
            </div>
          )}
          
          {!isRegistered && (
            <Button 
              onClick={requestNotificationPermission} 
              disabled={isRegistering}
              className="w-full"
            >
              {isRegistering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  🍎 Ativar Notificações APNs
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* General Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notificações Gerais</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Notificações do Calendário</Label>
              <p className="text-sm text-gray-500">
                Receba notificações sobre eventos e compromissos
              </p>
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
              <p className="text-sm text-gray-500">
                Seja notificado quando um evento começar
              </p>
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
              <p className="text-sm text-gray-500">
                Receba lembretes antes dos seus eventos
              </p>
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
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Configurações de Lembrete</span>
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
            <p className="text-sm text-gray-500">
              Tempo padrão para lembretes de novos eventos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>🧪 Teste de Notificação APNs</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-title">📱 Título da Notificação</Label>
            <Input
              id="test-title"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="Digite o título da notificação teste"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="test-message">💬 Mensagem da Notificação</Label>
            <Input
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Digite a mensagem da notificação teste"
            />
          </div>

          <Button
            onClick={sendTestNotification}
            disabled={isSendingTest || !testTitle.trim() || !testMessage.trim() || !isRegistered}
            className="w-full"
          >
            {isSendingTest ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                📤 Enviando via APNs...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                🍎 Enviar Teste APNs
              </>
            )}
          </Button>

          {!isRegistered && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Atenção:</strong> Você precisa ativar as notificações primeiro para enviar testes APNs.
              </p>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>✅ APNs Configurado:</strong> O sistema está configurado com chave p8 da Apple. 
              As notificações serão enviadas via APNs para dispositivos iOS registrados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
