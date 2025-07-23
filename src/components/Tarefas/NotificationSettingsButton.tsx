
import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDeviceRegistration } from '@/hooks/useDeviceRegistration';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const NotificationSettingsButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    isRegistered, 
    permission, 
    requestNotificationPermission, 
    registerForNotifications 
  } = useDeviceRegistration();

  const handleActivateNotifications = async () => {
    await requestNotificationPermission();
    if (permission === 'granted') {
      await registerForNotifications();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-2 h-8 w-8"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações de Notificações</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status das Notificações</CardTitle>
              <CardDescription>
                Configure como receber notificações das suas tarefas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Notificações Push</Label>
                  <div className="text-xs text-muted-foreground">
                    {permission === 'granted' ? (
                      isRegistered ? 'Ativo e funcionando' : 'Permissão concedida'
                    ) : permission === 'denied' ? (
                      'Bloqueado - verifique as configurações do navegador'
                    ) : (
                      'Não configurado'
                    )}
                  </div>
                </div>
                <Switch 
                  checked={permission === 'granted' && isRegistered}
                  disabled={permission === 'denied'}
                  onCheckedChange={handleActivateNotifications}
                />
              </div>
              
              {permission === 'denied' && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  Para ativar as notificações, você precisa permitir nas configurações do seu navegador.
                </div>
              )}
              
              {permission === 'default' && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  Clique no botão acima para ativar as notificações e receber lembretes das suas tarefas.
                </div>
              )}
              
              {permission === 'granted' && isRegistered && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  ✅ Notificações ativas! Você receberá lembretes das suas tarefas.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationSettingsButton;
