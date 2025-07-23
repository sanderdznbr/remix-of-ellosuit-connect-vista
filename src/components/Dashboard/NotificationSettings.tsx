
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Clock, Settings, Smartphone } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useCalendarData } from '@/hooks/useCalendarData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationSettings = () => {
  const { 
    settings, 
    settingsLoading, 
    updateNotificationSettings,
    getEventNotificationSettings,
    updateEventNotificationSettings 
  } = useNotificationSettings();
  
  const { events } = useCalendarData();
  
  const [localSettings, setLocalSettings] = useState({
    calendar_notifications_enabled: true,
    event_start_notifications: true,
    reminder_notifications_enabled: true,
    default_reminder_minutes: 15
  });
  
  const [saving, setSaving] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventSettings, setEventSettings] = useState<Record<string, any>>({});

  // Sincronizar com settings do servidor
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        calendar_notifications_enabled: settings.calendar_notifications_enabled,
        event_start_notifications: settings.event_start_notifications,
        reminder_notifications_enabled: settings.reminder_notifications_enabled,
        default_reminder_minutes: settings.default_reminder_minutes
      });
    }
  }, [settings]);

  // Salvar configurações gerais
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings(localSettings);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  // Carregar configurações de um evento específico
  const loadEventSettings = async (eventId: string) => {
    if (eventSettings[eventId]) return;

    const settings = await getEventNotificationSettings(eventId);
    setEventSettings(prev => ({
      ...prev,
      [eventId]: settings || {
        notifications_enabled: true,
        reminder_minutes: [15],
        notification_at_start: true
      }
    }));
  };

  // Atualizar configurações de evento
  const handleEventSettingsChange = async (eventId: string, updates: any) => {
    const newSettings = {
      ...eventSettings[eventId],
      ...updates
    };

    setEventSettings(prev => ({
      ...prev,
      [eventId]: newSettings
    }));

    try {
      await updateEventNotificationSettings(eventId, newSettings);
    } catch (error) {
      console.error('Erro ao atualizar configurações do evento:', error);
    }
  };

  // Expandir/recolher evento
  const toggleEventExpansion = (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(eventId);
      loadEventSettings(eventId);
    }
  };

  const reminderOptions = [
    { value: 5, label: '5 minutos' },
    { value: 10, label: '10 minutos' },
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 60, label: '1 hora' },
    { value: 120, label: '2 horas' },
    { value: 1440, label: '1 dia' }
  ];

  const upcomingEvents = events
    .filter(event => new Date(event.start_date) >= new Date())
    .slice(0, 10);

  if (settingsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Bell className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Configurações de Notificação</h1>
      </div>

      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configurações Gerais</span>
          </CardTitle>
          <CardDescription>
            Configure suas preferências gerais de notificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="calendar-notifications">Notificações do Calendário</Label>
              <p className="text-sm text-gray-500">
                Receber notificações para eventos do calendário
              </p>
            </div>
            <Switch
              id="calendar-notifications"
              checked={localSettings.calendar_notifications_enabled}
              onCheckedChange={(checked) => 
                setLocalSettings(prev => ({ ...prev, calendar_notifications_enabled: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="event-start">Notificação no Início do Evento</Label>
              <p className="text-sm text-gray-500">
                Receber notificação exatamente quando o evento começar
              </p>
            </div>
            <Switch
              id="event-start"
              checked={localSettings.event_start_notifications}
              onCheckedChange={(checked) => 
                setLocalSettings(prev => ({ ...prev, event_start_notifications: checked }))
              }
              disabled={!localSettings.calendar_notifications_enabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="reminders">Lembretes Antecipados</Label>
              <p className="text-sm text-gray-500">
                Receber notificações antes dos eventos
              </p>
            </div>
            <Switch
              id="reminders"
              checked={localSettings.reminder_notifications_enabled}
              onCheckedChange={(checked) => 
                setLocalSettings(prev => ({ ...prev, reminder_notifications_enabled: checked }))
              }
              disabled={!localSettings.calendar_notifications_enabled}
            />
          </div>

          {localSettings.reminder_notifications_enabled && (
            <div className="space-y-2">
              <Label htmlFor="default-reminder">Tempo Padrão do Lembrete</Label>
              <div className="flex space-x-2">
                <Input
                  id="default-reminder"
                  type="number"
                  value={localSettings.default_reminder_minutes}
                  onChange={(e) => 
                    setLocalSettings(prev => ({ 
                      ...prev, 
                      default_reminder_minutes: parseInt(e.target.value) || 15 
                    }))
                  }
                  className="w-20"
                  min="1"
                />
                <span className="flex items-center text-sm text-gray-500">minutos antes</span>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações por Evento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Eventos Próximos</span>
          </CardTitle>
          <CardDescription>
            Configure notificações específicas para cada evento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento próximo encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleEventExpansion(event.id)}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(event.start_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </span>
                        <Badge variant={event.event_type === 'meeting' ? 'default' : 'secondary'}>
                          {event.event_type === 'meeting' ? 'Reunião' : 
                           event.event_type === 'appointment' ? 'Compromisso' : 'Lembrete'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={eventSettings[event.id]?.notifications_enabled ?? true}
                        onCheckedChange={(checked) => 
                          handleEventSettingsChange(event.id, { notifications_enabled: checked })
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button variant="ghost" size="sm">
                        {expandedEvent === event.id ? '−' : '+'}
                      </Button>
                    </div>
                  </div>

                  {expandedEvent === event.id && eventSettings[event.id] && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Notificação no início do evento</Label>
                        <Switch
                          checked={eventSettings[event.id]?.notification_at_start ?? true}
                          onCheckedChange={(checked) => 
                            handleEventSettingsChange(event.id, { notification_at_start: checked })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Lembretes antecipados</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {reminderOptions.map((option) => {
                            const isSelected = eventSettings[event.id]?.reminder_minutes?.includes(option.value);
                            return (
                              <Button
                                key={option.value}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  const currentReminders = eventSettings[event.id]?.reminder_minutes || [];
                                  const newReminders = isSelected
                                    ? currentReminders.filter((r: number) => r !== option.value)
                                    : [...currentReminders, option.value];
                                  
                                  handleEventSettingsChange(event.id, { reminder_minutes: newReminders });
                                }}
                              >
                                {option.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status de Notificações Push */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Status das Notificações Push</span>
          </CardTitle>
          <CardDescription>
            Informações sobre o status das notificações no seu dispositivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-medium text-blue-900">Notificações Push</h4>
                <p className="text-sm text-blue-700">
                  As notificações push estão habilitadas para este dispositivo
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">Ativo</Badge>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>
                ⚠️ Para receber notificações, certifique-se de que as notificações 
                estão habilitadas nas configurações do seu navegador ou dispositivo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
