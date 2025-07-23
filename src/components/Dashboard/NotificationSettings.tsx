
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Smartphone, Clock, Calendar, TestTube } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const NotificationSettings = () => {
  const { settings, updateSettings, isLoading } = useNotificationSettings();
  const { toast } = useToast();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testTitle, setTestTitle] = useState('Notificação Teste');
  const [testMessage, setTestMessage] = useState('Esta é uma notificação de teste do Ello Suit.');

  const handleSettingChange = async (key: string, value: boolean | number) => {
    try {
      await updateSettings({ [key]: value });
      toast({
        title: "Configuração atualizada",
        description: "Suas preferências de notificação foram salvas.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a configuração.",
        variant: "destructive"
      });
    }
  };

  const sendTestNotification = async () => {
    if (!testTitle.trim() || !testMessage.trim()) {
      toast({
        title: "Erro",
        description: "Título e mensagem são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingTest(true);
    
    try {
      console.log('🔔 Sending test notification...');
      
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          title: testTitle,
          body: testMessage
        }
      });

      if (error) {
        console.error('❌ Error sending test notification:', error);
        throw error;
      }

      console.log('✅ Test notification response:', data);

      toast({
        title: "Notificação teste enviada! 🎉",
        description: data.simulation ? 
          "Notificação simulada (APNs não configurado)" : 
          `Enviada para ${data.sent} dispositivo(s)`,
      });
      
    } catch (error: any) {
      console.error('💥 Error:', error);
      toast({
        title: "Erro",
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
          Configurações de Notificação
        </h3>
        <p className="text-gray-600">
          Gerencie como e quando você recebe notificações sobre seus eventos e compromissos.
        </p>
      </div>

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
            <span>Notificação Teste</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-title">Título da Notificação</Label>
            <Input
              id="test-title"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="Digite o título da notificação teste"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="test-message">Mensagem da Notificação</Label>
            <Input
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Digite a mensagem da notificação teste"
            />
          </div>

          <Button
            onClick={sendTestNotification}
            disabled={isSendingTest || !testTitle.trim() || !testMessage.trim()}
            className="w-full"
          >
            {isSendingTest ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enviar Notificação Teste
              </>
            )}
          </Button>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> A notificação teste será enviada para todos os dispositivos registrados. 
              Se as credenciais do APNs não estiverem configuradas, a notificação será simulada.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Device Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Informações do Dispositivo</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status de Notificações Push</span>
              <Badge variant="outline" className="text-green-600 border-green-600">
                Configurado
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plataforma</span>
              <Badge variant="secondary">
                {navigator.userAgent.includes('iPhone') ? 'iOS' : 
                 navigator.userAgent.includes('Android') ? 'Android' : 'Web'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              As notificações push funcionam melhor quando o app está instalado na tela inicial do seu dispositivo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
