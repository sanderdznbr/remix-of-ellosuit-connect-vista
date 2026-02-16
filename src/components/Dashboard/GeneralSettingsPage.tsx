import React, { useState } from 'react';
import { Bell, BellRing, Shield, Eye, Moon, Sun, Globe, Smartphone, Volume2, VolumeX, Clock, Palette, Monitor, Languages } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/hooks/useTheme';
import { useOneSignal } from '@/hooks/useOneSignal';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const SettingsSection = ({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const SettingRow = ({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export default function GeneralSettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { permission, ready: pushReady, requestPermission, requestNativePermission, initError: pushError } = useOneSignal();
  const { settings: notifSettings, updateNotificationSettings } = useNotificationSettings();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleNotifToggle = async (key: string, value: boolean) => {
    try {
      await updateNotificationSettings({ [key]: value });
      toast({ title: "Configuração salva", description: "Preferência atualizada com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    }
  };

  const sendPushTest = async () => {
    if (!user?.id) return;
    setIsSendingTest(true);
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      await supabase.functions.invoke('send-user-notification', {
        body: {
          user_id: user.id,
          company_id: cu?.company_id || '',
          title: '🔔 Push de Teste',
          message: 'Se você recebeu esta notificação, o push está funcionando!',
          type: 'push_test',
          category: 'system',
        },
      });
      toast({ title: "Teste enviado!", description: "Verifique se a notificação push chegou." });
    } catch {
      toast({ title: "Erro", description: "Falha ao enviar push de teste.", variant: "destructive" });
    } finally {
      setIsSendingTest(false);
    }
  };

  const pushStatus = permission === 'granted' ? 'active' : permission === 'denied' ? 'blocked' : 'pending';

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas preferências gerais</p>
      </div>

      <div className="space-y-4">
        {/* Aparência */}
        <SettingsSection icon={Palette} title="Aparência" description="Personalize o visual do aplicativo">
          <SettingRow label="Tema escuro" description="Alterne entre modo claro e escuro">
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </SettingRow>
        </SettingsSection>

        {/* Push Notifications */}
        <SettingsSection icon={BellRing} title="Notificações Push" description="Receba alertas no navegador e dispositivo">
          <SettingRow label="Status das notificações push" description="Permissão do navegador para receber notificações">
            <Badge variant={pushStatus === 'active' ? 'default' : pushStatus === 'blocked' ? 'destructive' : 'secondary'} className="text-[10px]">
              {pushStatus === 'active' ? '✅ Ativas' : pushStatus === 'blocked' ? '🚫 Bloqueadas' : '⏳ Pendente'}
            </Badge>
          </SettingRow>

          {pushStatus !== 'active' && pushStatus !== 'blocked' && (
            <Button size="sm" onClick={() => { pushReady ? requestPermission() : requestNativePermission(); }} className="w-full">
              <BellRing className="h-4 w-4 mr-2" />
              Ativar Notificações Push
            </Button>
          )}

          {pushStatus === 'blocked' && (
            <p className="text-xs text-destructive">As notificações foram bloqueadas no navegador. Acesse as configurações do navegador para reativá-las.</p>
          )}

          {pushError && (
            <p className="text-xs text-muted-foreground">⚠️ {pushError} — Usando permissão nativa do navegador.</p>
          )}

          {permission === 'granted' && (
            <Button size="sm" variant="outline" onClick={sendPushTest} disabled={isSendingTest} className="w-full">
              {isSendingTest ? 'Enviando...' : '🔔 Enviar Push de Teste'}
            </Button>
          )}
        </SettingsSection>

        {/* Notification Preferences */}
        <SettingsSection icon={Bell} title="Preferências de Notificação" description="Escolha quais notificações deseja receber">
          <SettingRow label="Notificações de calendário" description="Eventos criados, editados e excluídos">
            <Switch
              checked={notifSettings?.calendar_notifications_enabled ?? true}
              onCheckedChange={(v) => handleNotifToggle('calendar_notifications_enabled', v)}
            />
          </SettingRow>
          <Separator />
          <SettingRow label="Lembretes de eventos" description="Alertas antes dos compromissos">
            <Switch
              checked={notifSettings?.reminder_notifications_enabled ?? true}
              onCheckedChange={(v) => handleNotifToggle('reminder_notifications_enabled', v)}
            />
          </SettingRow>
          <Separator />
          <SettingRow label="Início de eventos" description="Notificar quando um evento está começando">
            <Switch
              checked={notifSettings?.event_start_notifications ?? true}
              onCheckedChange={(v) => handleNotifToggle('event_start_notifications', v)}
            />
          </SettingRow>
          <Separator />
          <SettingRow label="WhatsApp - Eventos criados" description="Receber no WhatsApp ao criar eventos">
            <Switch
              checked={notifSettings?.whatsapp_event_created ?? false}
              onCheckedChange={(v) => handleNotifToggle('whatsapp_event_created', v)}
            />
          </SettingRow>
          <Separator />
          <SettingRow label="WhatsApp - Tarefas com prazo" description="Alertas de tarefas próximas do vencimento">
            <Switch
              checked={notifSettings?.whatsapp_task_due ?? false}
              onCheckedChange={(v) => handleNotifToggle('whatsapp_task_due', v)}
            />
          </SettingRow>
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection icon={Eye} title="Privacidade" description="Controle a visibilidade dos seus dados">
          <SettingRow label="Perfil visível para equipe" description="Membros da empresa podem ver seu perfil">
            <Switch defaultChecked />
          </SettingRow>
          <Separator />
          <SettingRow label="Mostrar status online" description="Exibir quando você está ativo na plataforma">
            <Switch defaultChecked />
          </SettingRow>
          <Separator />
          <SettingRow label="Compartilhar agenda" description="Permitir que colegas vejam sua disponibilidade">
            <Switch defaultChecked />
          </SettingRow>
        </SettingsSection>

        {/* Accessibility */}
        <SettingsSection icon={Monitor} title="Acessibilidade" description="Facilite o uso da plataforma">
          <SettingRow label="Sons de notificação" description="Tocar som ao receber uma notificação">
            <Switch defaultChecked />
          </SettingRow>
          <Separator />
          <SettingRow label="Animações reduzidas" description="Diminuir animações e transições visuais">
            <Switch />
          </SettingRow>
        </SettingsSection>
      </div>
    </div>
  );
}
