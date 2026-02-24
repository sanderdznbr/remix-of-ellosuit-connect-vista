import React, { useState, useCallback } from 'react';
import { Send, Upload, Plus, Trash2, Image, Video, Mic, FileText, Loader2, CheckCircle, XCircle, Phone, Users, RefreshCw, Wifi } from 'lucide-react';
import AudioRecorder from './AudioRecorder';
import FileUploader from './FileUploader';
import WhatsAppQRModal from '@/components/CRM/WhatsAppQRModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Recipient {
  id: string;
  phone: string;
  name?: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
}

type MediaType = 'text' | 'image' | 'video' | 'audio' | 'document';

const OMNI_COLOR = '#FF4500';

const normalizeRecipientPhone = (input: string): string => {
  const digits = (input || '').replace(/\D/g, '');
  if (!digits) return '';

  let normalized = digits;

  if (!normalized.startsWith('55') && normalized.length <= 11) {
    normalized = `55${normalized}`;
  }

  if (normalized.startsWith('55') && normalized.length === 12) {
    normalized = `${normalized.slice(0, 4)}9${normalized.slice(4)}`;
  }

  return normalized;
};

const buildPhoneVariants = (normalizedPhone: string): string[] => {
  if (!normalizedPhone) return [];

  const variants = new Set<string>([normalizedPhone]);

  if (normalizedPhone.startsWith('55') && normalizedPhone.length === 13) {
    variants.add(normalizedPhone.slice(0, 4) + normalizedPhone.slice(5));
  }

  if (normalizedPhone.startsWith('55') && normalizedPhone.length === 12) {
    variants.add(normalizedPhone.slice(0, 4) + '9' + normalizedPhone.slice(4));
  }

  return Array.from(variants);
};

const isValidRecipientPhone = (normalizedPhone: string): boolean => {
  if (!normalizedPhone.startsWith('55')) return false;
  return normalizedPhone.length === 12 || normalizedPhone.length === 13;
};

const isSameRecipientPhone = (phoneA: string, phoneB: string): boolean => {
  const variantsA = new Set(buildPhoneVariants(normalizeRecipientPhone(phoneA)));
  const variantsB = buildPhoneVariants(normalizeRecipientPhone(phoneB));
  return variantsB.some((variant) => variantsA.has(variant));
};

const formatRecipientPhone = (phone: string): string => {
  const normalized = normalizeRecipientPhone(phone);

  if (!normalized.startsWith('55')) return phone;

  if (normalized.length === 13) {
    const ddd = normalized.slice(2, 4);
    const local = normalized.slice(4);
    return `+55 (${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
  }

  if (normalized.length === 12) {
    const ddd = normalized.slice(2, 4);
    const local = normalized.slice(4);
    return `+55 (${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  return normalized;
};

interface ResolveJidResult {
  exists: boolean;
  jid: string | null;
  normalizedPhone: string;
  reason?: string;
}

export default function DisparosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [message, setMessage] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [saveGroupName, setSaveGroupName] = useState('');
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Fetch company
  const { data: companyId } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data?.company_id || null;
    },
    enabled: !!user?.id,
  });

  // Fetch connected sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['whatsapp-sessions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('whatsapp_sessions')
        .select('id, instance_name, status, phone_number, baileys_server_url')
        .eq('company_id', companyId)
        .eq('status', 'connected');
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch contact groups
  const { data: contactGroups = [] } = useQuery({
    queryKey: ['contact-groups', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('contact_groups')
        .select('id, name, description, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const addRecipient = () => {
    const normalizedPhone = normalizeRecipientPhone(newPhone);

    if (!isValidRecipientPhone(normalizedPhone)) {
      toast({ title: 'Número inválido', description: 'Use um número WhatsApp válido com DDI +55 e DDD', variant: 'destructive' });
      return;
    }

    const existing = recipients.find((recipient) => isSameRecipientPhone(recipient.phone, normalizedPhone));

    if (existing) {
      if (existing.status !== 'pending') {
        setRecipients((prev) => prev.map((recipient) =>
          recipient.id === existing.id
            ? { ...recipient, phone: normalizedPhone, status: 'pending' as const, error: undefined }
            : recipient
        ));
        setNewPhone('');
        toast({ title: 'Número resetado para reenvio' });
      } else {
        toast({ title: 'Duplicado', description: 'Esse número já está na lista', variant: 'destructive' });
      }
      return;
    }

    setRecipients((prev) => [...prev, { id: crypto.randomUUID(), phone: normalizedPhone, status: 'pending' }]);
    setNewPhone('');
  };

  const resetAllRecipients = () => {
    setRecipients(prev => prev.map(r => ({ ...r, status: 'pending' as const, error: undefined })));
  };

  const loadGroup = async (groupId: string) => {
    const { data } = await supabase
      .from('contact_group_members')
      .select('phone, name')
      .eq('group_id', groupId);

    if (!data) return;

    const newRecipients: Recipient[] = [];
    let skippedInvalid = 0;
    let skippedDuplicates = 0;

    for (const member of data) {
      const normalizedPhone = normalizeRecipientPhone(member.phone || '');

      if (!isValidRecipientPhone(normalizedPhone)) {
        skippedInvalid += 1;
        continue;
      }

      const alreadyExists = recipients.some((recipient) => isSameRecipientPhone(recipient.phone, normalizedPhone));
      const alreadyAdded = newRecipients.some((recipient) => isSameRecipientPhone(recipient.phone, normalizedPhone));

      if (alreadyExists || alreadyAdded) {
        skippedDuplicates += 1;
        continue;
      }

      newRecipients.push({
        id: crypto.randomUUID(),
        phone: normalizedPhone,
        name: member.name || undefined,
        status: 'pending',
      });
    }

    setRecipients((prev) => [...prev, ...newRecipients]);
    setShowGroupPicker(false);

    toast({
      title: `${newRecipients.length} contatos carregados do grupo`,
      description: skippedInvalid + skippedDuplicates > 0
        ? `${skippedDuplicates} duplicados e ${skippedInvalid} inválidos foram ignorados`
        : undefined,
    });
  };

  const saveAsGroup = async () => {
    if (!saveGroupName.trim() || !companyId || !user?.id) return;
    const { data: group, error } = await supabase
      .from('contact_groups')
      .insert({ company_id: companyId, name: saveGroupName.trim(), created_by: user.id })
      .select('id')
      .single();
    if (error || !group) {
      toast({ title: 'Erro ao salvar grupo', variant: 'destructive' });
      return;
    }
    const members = recipients.map(r => ({ group_id: group.id, phone: r.phone, name: r.name || null }));
    await supabase.from('contact_group_members').insert(members);
    queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
    setSaveGroupName('');
    setShowSaveGroup(false);
    toast({ title: `Grupo "${saveGroupName.trim()}" salvo com ${members.length} contatos` });
  };

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const handleImportCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/[\n\r]+/).filter(Boolean);

      const newRecipients: Recipient[] = [];
      let skippedInvalid = 0;
      let skippedDuplicates = 0;

      for (const line of lines) {
        const parts = line.split(/[,;\t]/);
        const normalizedPhone = normalizeRecipientPhone(parts[0] || '');
        const name = parts[1]?.trim() || undefined;

        if (!isValidRecipientPhone(normalizedPhone)) {
          skippedInvalid += 1;
          continue;
        }

        const existsInList = recipients.some((recipient) => isSameRecipientPhone(recipient.phone, normalizedPhone));
        const existsInBatch = newRecipients.some((recipient) => isSameRecipientPhone(recipient.phone, normalizedPhone));

        if (existsInList || existsInBatch) {
          skippedDuplicates += 1;
          continue;
        }

        newRecipients.push({ id: crypto.randomUUID(), phone: normalizedPhone, name, status: 'pending' });
      }

      setRecipients((prev) => [...prev, ...newRecipients]);
      toast({
        title: `${newRecipients.length} contatos importados`,
        description: skippedInvalid + skippedDuplicates > 0
          ? `${skippedDuplicates} duplicados e ${skippedInvalid} inválidos foram ignorados`
          : undefined,
      });
    };

    reader.readAsText(file);
    e.target.value = '';
  }, [recipients, toast]);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const resolveJid = async (baileysUrl: string, instanceName: string, phone: string): Promise<ResolveJidResult> => {
    const normalizedPhone = normalizeRecipientPhone(phone);

    if (!isValidRecipientPhone(normalizedPhone)) {
      return {
        exists: false,
        jid: null,
        normalizedPhone,
        reason: 'Número inválido para WhatsApp',
      };
    }

    const checkNumber = async (candidatePhone: string): Promise<ResolveJidResult | null> => {
      const response = await fetch(`${baileysUrl}/api/number/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, phone: candidatePhone }),
      });

      if (!response.ok) {
        throw new Error('Falha ao validar número no WhatsApp');
      }

      const data = await response.json();
      if (!data?.exists || !data?.jid) return null;

      const jidPhone = String(data.jid).split('@')[0]?.replace(/\D/g, '') || candidatePhone;
      const normalizedFromJid = normalizeRecipientPhone(jidPhone);

      return {
        exists: true,
        jid: data.jid,
        normalizedPhone: normalizedFromJid || normalizedPhone,
      };
    };

    const candidates = Array.from(new Set(buildPhoneVariants(normalizedPhone)));

    try {
      for (const candidate of candidates) {
        const resolved = await checkNumber(candidate);
        if (resolved) return resolved;
      }
    } catch (error) {
      return {
        exists: false,
        jid: null,
        normalizedPhone,
        reason: error instanceof Error ? error.message : 'Erro ao validar número',
      };
    }

    return {
      exists: false,
      jid: null,
      normalizedPhone,
      reason: 'Número não encontrado no WhatsApp',
    };
  };

  const startDisparo = async () => {
    if (!selectedSession) {
      toast({ title: 'Selecione uma sessão', variant: 'destructive' });
      return;
    }

    if (recipients.filter((recipient) => recipient.status === 'pending').length === 0) {
      toast({ title: 'Adicione destinatários', variant: 'destructive' });
      return;
    }

    if (mediaType === 'text' && !message.trim()) {
      toast({ title: 'Digite uma mensagem', variant: 'destructive' });
      return;
    }

    if (mediaType !== 'text' && !mediaUrl.trim()) {
      toast({ title: 'Informe a URL da mídia', variant: 'destructive' });
      return;
    }

    const baileysUrl = (selectedSession.baileys_server_url || '').replace(/\/+$/, '');
    const instanceName = selectedSession.instance_name;

    if (!baileysUrl) {
      toast({ title: 'Servidor Baileys não configurado', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    setProgress(0);

    const pendingRecipients = recipients.filter((recipient) => recipient.status === 'pending');
    const preValidationUpdates = new Map<string, Partial<Recipient>>();
    const uniquePending: Recipient[] = [];
    const seenPhones = new Set<string>();

    for (const recipient of pendingRecipients) {
      const normalizedPhone = normalizeRecipientPhone(recipient.phone);

      if (!isValidRecipientPhone(normalizedPhone)) {
        preValidationUpdates.set(recipient.id, {
          status: 'error',
          error: 'Número inválido para WhatsApp',
          phone: recipient.phone,
        });
        continue;
      }

      if (seenPhones.has(normalizedPhone)) {
        preValidationUpdates.set(recipient.id, {
          status: 'error',
          error: 'Duplicado na lista',
          phone: normalizedPhone,
        });
        continue;
      }

      seenPhones.add(normalizedPhone);
      uniquePending.push({ ...recipient, phone: normalizedPhone });

      if (recipient.phone !== normalizedPhone) {
        preValidationUpdates.set(recipient.id, {
          status: 'pending',
          error: undefined,
          phone: normalizedPhone,
        });
      }
    }

    if (preValidationUpdates.size > 0) {
      setRecipients((prev) => prev.map((recipient) => {
        const update = preValidationUpdates.get(recipient.id);
        return update ? { ...recipient, ...update } : recipient;
      }));
    }

    if (uniquePending.length === 0) {
      setIsSending(false);
      toast({ title: 'Nenhum número válido para envio', variant: 'destructive' });
      return;
    }

    // Notify admin: dispatch started
    supabase.functions.invoke('admin-notify', {
      body: {
        event_type: 'bulk_dispatch_started',
        event_title: `Disparo de ${uniquePending.length} mensagens iniciado`,
        event_description: `Tipo: ${mediaType}`,
        metadata: { total_messages: uniquePending.length, media_type: mediaType },
      }
    }).catch(() => {});

    // Notify user via WhatsApp: dispatch started
    supabase.functions.invoke('send-user-notification', {
      body: {
        user_id: user?.id,
        company_id: companyId,
        title: '📤🚀 Disparo iniciado',
        message: `Enviando ${uniquePending.length} mensagens (${mediaType})`,
        notification_type: 'dispatch_progress',
        category: 'crm',
        icon: 'Send',
        action_url: '/dashboard/disparos',
        metadata: { total_messages: uniquePending.length, media_type: mediaType },
      }
    }).catch(() => {});

    let sentCounter = 0;
    let errorCounter = 0;

    for (let i = 0; i < uniquePending.length; i++) {
      const recipient = uniquePending[i];

      setRecipients((prev) => prev.map((item) =>
        item.id === recipient.id
          ? { ...item, status: 'sending' as const, error: undefined, phone: recipient.phone }
          : item
      ));

      try {
        const resolved = await resolveJid(baileysUrl, instanceName, recipient.phone);

        if (!resolved.exists || !resolved.jid) {
          throw new Error(resolved.reason || 'Número não encontrado no WhatsApp');
        }

        const jid = resolved.jid;
        const normalizedPhone = resolved.normalizedPhone || recipient.phone;

        if (mediaType === 'text') {
          const response = await fetch(`${baileysUrl}/api/message/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instanceName,
              jid,
              message: { text: message },
            }),
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } else if (mediaType === 'audio') {
          const response = await fetch(`${baileysUrl}/api/message/send-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instanceName,
              jid,
              audioUrl: mediaUrl,
            }),
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } else {
          const response = await fetch(`${baileysUrl}/api/message/send-media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instanceName,
              jid,
              mediaUrl,
              mediaType,
              caption: mediaCaption || '',
            }),
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        }

        sentCounter += 1;
        setRecipients((prev) => prev.map((item) =>
          item.id === recipient.id
            ? { ...item, status: 'sent' as const, error: undefined, phone: normalizedPhone }
            : item
        ));
      } catch (error: any) {
        errorCounter += 1;
        setRecipients((prev) => prev.map((item) =>
          item.id === recipient.id
            ? { ...item, status: 'error' as const, error: error?.message || 'Falha no envio' }
            : item
        ));
      }

      setProgress(Math.round(((i + 1) / uniquePending.length) * 100));

      if (i < uniquePending.length - 1) {
        await sleep(delaySeconds * 1000);
      }
    }

    setIsSending(false);

    // Notify admin: dispatch completed
    supabase.functions.invoke('admin-notify', {
      body: {
        event_type: errorCounter > sentCounter ? 'bulk_dispatch_failed' : 'bulk_dispatch_completed',
        event_title: `Disparo concluído: ${sentCounter} enviadas, ${errorCounter} falhas`,
        event_description: `Total: ${uniquePending.length} mensagens | Tipo: ${mediaType}`,
        metadata: { total_messages: uniquePending.length, sent: sentCounter, errors: errorCounter, media_type: mediaType },
      }
    }).catch(() => {});

    // Notify user via WhatsApp: dispatch completed
    supabase.functions.invoke('send-user-notification', {
      body: {
        user_id: user?.id,
        company_id: companyId,
        title: errorCounter > sentCounter ? '📤❌ Disparo com falhas' : '📤✅ Disparo concluído',
        message: `${sentCounter} enviadas, ${errorCounter} falhas de ${uniquePending.length} mensagens`,
        notification_type: 'dispatch_progress',
        category: 'crm',
        icon: 'Send',
        action_url: '/dashboard/disparos',
        metadata: { total_messages: uniquePending.length, sent: sentCounter, errors: errorCounter },
      }
    }).catch(() => {});

    toast({
      title: 'Disparo concluído!',
      description: `${sentCounter} enviados com sucesso e ${errorCounter} com falha.`,
    });
  };

  const sentCount = recipients.filter(r => r.status === 'sent').length;
  const errorCount = recipients.filter(r => r.status === 'error').length;
  const pendingCount = recipients.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disparos em Massa</h1>
          <p className="text-sm text-gray-500">Envie mensagens para vários contatos de uma vez</p>
        </div>

        {/* Session selector */}
        <Card className="border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" style={{ color: OMNI_COLOR }} />
              Número Conectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o número para envio" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.phone_number || s.instance_name} — {s.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQRModal(true)}
                className="flex items-center gap-1.5 text-white hover:opacity-90 shrink-0"
                style={{ backgroundColor: OMNI_COLOR }}
              >
                <Wifi className="h-4 w-4" />
                Conectar
              </Button>
            </div>
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">Nenhuma sessão conectada. Clique em "Conectar" para adicionar um número.</p>
            )}

            {companyId && user?.id && (
              <WhatsAppQRModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                companyId={companyId}
                userId={user.id}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
                  setShowQRModal(false);
                }}
              />
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Recipients */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Destinatários ({recipients.length})</CardTitle>
                <div className="flex items-center gap-2">
                  {/* Load from group */}
                  <Dialog open={showGroupPicker} onOpenChange={setShowGroupPicker}>
                    <DialogTrigger asChild>
                      <button className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: OMNI_COLOR }}>
                        <Users className="h-3.5 w-3.5" /> Grupos
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Carregar Grupo de Contatos</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {contactGroups.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">Nenhum grupo salvo ainda</p>
                        )}
                        {contactGroups.map(g => (
                          <button
                            key={g.id}
                            onClick={() => loadGroup(g.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                          >
                            <div>
                              <p className="text-sm font-medium">{g.name}</p>
                              {g.description && <p className="text-xs text-gray-400">{g.description}</p>}
                            </div>
                            <Users className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <label className="cursor-pointer">
                    <input type="file" accept=".csv,.txt" className="hidden" onChange={handleImportCSV} />
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: OMNI_COLOR }}>
                      <Upload className="h-3.5 w-3.5" /> Importar
                    </span>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 5541999999999"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRecipient()}
                  disabled={isSending}
                />
                <Button size="sm" onClick={addRecipient} disabled={isSending} style={{ backgroundColor: OMNI_COLOR }} className="text-white hover:opacity-90">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-[280px]">
                <div className="space-y-1.5">
                  {recipients.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.status === 'sent' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                        {r.status === 'error' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        {r.status === 'sending' && <Loader2 className="h-4 w-4 text-orange-500 animate-spin flex-shrink-0" />}
                        {r.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                        <span className="truncate font-mono text-gray-700">{formatRecipientPhone(r.phone)}</span>
                        {r.name && <span className="text-gray-400 truncate">({r.name})</span>}
                      </div>
                      {!isSending && (
                        <button onClick={() => removeRecipient(r.id)} className="text-gray-400 hover:text-red-500 ml-2">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {recipients.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">
                      Adicione números ou importe uma lista CSV
                    </div>
                  )}
                </div>
              </ScrollArea>

              {recipients.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-green-600 border-green-200">{sentCount} enviados</Badge>
                  <Badge variant="outline" className="text-red-600 border-red-200">{errorCount} erros</Badge>
                  <Badge variant="outline" className="text-gray-600 border-gray-200">{pendingCount} pendentes</Badge>
                  {(sentCount > 0 || errorCount > 0) && !isSending && (
                    <button onClick={resetAllRecipients} className="inline-flex items-center gap-1 text-xs font-medium ml-auto" style={{ color: OMNI_COLOR }}>
                      <RefreshCw className="h-3 w-3" /> Reenviar todos
                    </button>
                  )}
                </div>
              )}
              {/* Save as group */}
              {recipients.length > 0 && !isSending && (
                <div>
                  {showSaveGroup ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome do grupo..."
                        value={saveGroupName}
                        onChange={e => setSaveGroupName(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button size="sm" className="h-8 text-xs text-white" style={{ backgroundColor: OMNI_COLOR }} onClick={saveAsGroup}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowSaveGroup(false)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSaveGroup(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      style={{ color: OMNI_COLOR }}
                    >
                      <Users className="h-3 w-3" /> Salvar como grupo
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Message */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Mensagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Media type tabs */}
              <Tabs value={mediaType} onValueChange={v => setMediaType(v as MediaType)}>
                <TabsList className="grid grid-cols-5 h-9">
                  <TabsTrigger value="text" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Texto</TabsTrigger>
                  <TabsTrigger value="image" className="text-xs gap-1"><Image className="h-3.5 w-3.5" /> Imagem</TabsTrigger>
                  <TabsTrigger value="video" className="text-xs gap-1"><Video className="h-3.5 w-3.5" /> Vídeo</TabsTrigger>
                  <TabsTrigger value="audio" className="text-xs gap-1"><Mic className="h-3.5 w-3.5" /> Áudio</TabsTrigger>
                  <TabsTrigger value="document" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Doc</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-3">
                  <Textarea
                    placeholder="Digite sua mensagem aqui..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={6}
                    disabled={isSending}
                    className="resize-none"
                  />
                </TabsContent>

                <TabsContent value="image" className="mt-3 space-y-3">
                  <FileUploader
                    type="image"
                    accept="image/*"
                    onFileUrl={setMediaUrl}
                    disabled={isSending}
                    currentUrl={mediaType === 'image' ? mediaUrl : ''}
                  />
                  <Textarea
                    placeholder="Legenda (opcional)"
                    value={mediaCaption}
                    onChange={e => setMediaCaption(e.target.value)}
                    rows={3}
                    disabled={isSending}
                    className="resize-none"
                  />
                </TabsContent>

                <TabsContent value="video" className="mt-3 space-y-3">
                  <FileUploader
                    type="video"
                    accept="video/*"
                    onFileUrl={setMediaUrl}
                    disabled={isSending}
                    currentUrl={mediaType === 'video' ? mediaUrl : ''}
                  />
                  <Textarea
                    placeholder="Legenda (opcional)"
                    value={mediaCaption}
                    onChange={e => setMediaCaption(e.target.value)}
                    rows={3}
                    disabled={isSending}
                    className="resize-none"
                  />
                </TabsContent>

                <TabsContent value="audio" className="mt-3 space-y-3">
                  <AudioRecorder
                    onAudioUrl={setMediaUrl}
                    disabled={isSending}
                  />
                  <div className="relative flex items-center gap-2">
                    <div className="flex-1 border-t border-gray-200" />
                    <span className="text-xs text-gray-400">ou envie um arquivo</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>
                  <FileUploader
                    type="audio"
                    accept="audio/*"
                    onFileUrl={setMediaUrl}
                    disabled={isSending}
                    currentUrl={mediaType === 'audio' ? mediaUrl : ''}
                  />
                </TabsContent>

                <TabsContent value="document" className="mt-3 space-y-3">
                  <FileUploader
                    type="document"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                    onFileUrl={setMediaUrl}
                    disabled={isSending}
                    currentUrl={mediaType === 'document' ? mediaUrl : ''}
                  />
                  <Textarea
                    placeholder="Legenda (opcional)"
                    value={mediaCaption}
                    onChange={e => setMediaCaption(e.target.value)}
                    rows={3}
                    disabled={isSending}
                    className="resize-none"
                  />
                </TabsContent>
              </Tabs>

              {/* Delay config */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 whitespace-nowrap">Intervalo entre envios:</label>
                <Select value={String(delaySeconds)} onValueChange={v => setDelaySeconds(Number(v))}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 segundo</SelectItem>
                    <SelectItem value="2">2 segundos</SelectItem>
                    <SelectItem value="3">3 segundos</SelectItem>
                    <SelectItem value="5">5 segundos</SelectItem>
                    <SelectItem value="10">10 segundos</SelectItem>
                    <SelectItem value="15">15 segundos</SelectItem>
                    <SelectItem value="30">30 segundos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Progress */}
              {isSending && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-gray-500 text-center">{progress}% concluído</p>
                </div>
              )}

              {/* Send button */}
              <Button
                onClick={startDisparo}
                disabled={isSending || !selectedSessionId || recipients.length === 0}
                className="w-full text-white"
                style={{ backgroundColor: OMNI_COLOR }}
              >
                {isSending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Iniciar Disparo ({pendingCount} contatos)</>
                )}
              </Button>

              {/* Clear all */}
              {!isSending && recipients.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecipients([])}
                  className="w-full text-xs text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar todos os contatos
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
