import React, { useState, useCallback } from 'react';
import { Send, Upload, Plus, Trash2, Image, Video, Mic, FileText, Loader2, CheckCircle, XCircle, Phone, Users, RefreshCw } from 'lucide-react';
import AudioRecorder from './AudioRecorder';
import FileUploader from './FileUploader';
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
    const clean = newPhone.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      toast({ title: 'Número inválido', description: 'Informe um número com DDD', variant: 'destructive' });
      return;
    }
    const existing = recipients.find(r => r.phone === clean);
    if (existing) {
      if (existing.status !== 'pending') {
        // Reset to pending for re-send
        setRecipients(prev => prev.map(r => r.phone === clean ? { ...r, status: 'pending' as const, error: undefined } : r));
        setNewPhone('');
        toast({ title: 'Número resetado para reenvio' });
      } else {
        toast({ title: 'Duplicado', description: 'Esse número já está pendente', variant: 'destructive' });
      }
      return;
    }
    setRecipients(prev => [...prev, { id: crypto.randomUUID(), phone: clean, status: 'pending' }]);
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
    for (const m of data) {
      if (!recipients.some(r => r.phone === m.phone) && !newRecipients.some(r => r.phone === m.phone)) {
        newRecipients.push({ id: crypto.randomUUID(), phone: m.phone, name: m.name || undefined, status: 'pending' });
      }
    }
    setRecipients(prev => [...prev, ...newRecipients]);
    setShowGroupPicker(false);
    toast({ title: `${newRecipients.length} contatos carregados do grupo` });
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
      for (const line of lines) {
        const parts = line.split(/[,;\t]/);
        const phone = (parts[0] || '').replace(/\D/g, '');
        const name = parts[1]?.trim() || undefined;
        if (phone.length >= 10 && !recipients.some(r => r.phone === phone) && !newRecipients.some(r => r.phone === phone)) {
          newRecipients.push({ id: crypto.randomUUID(), phone, name, status: 'pending' });
        }
      }
      setRecipients(prev => [...prev, ...newRecipients]);
      toast({ title: `${newRecipients.length} contatos importados` });
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [recipients, toast]);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  /**
   * Resolve o JID correto usando /api/number/check do Baileys.
   * Se não encontrar e for BR (55), tenta variação do 9º dígito.
   * Fallback: usa o número original.
   */
  const resolveJid = async (baileysUrl: string, instanceName: string, phone: string): Promise<string> => {
    const cleanPhone = phone.replace(/\D/g, '');

    const checkNumber = async (p: string): Promise<string | null> => {
      try {
        const res = await fetch(`${baileysUrl}/api/number/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceName, phone: p }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.exists && data?.jid) return data.jid;
        return null;
      } catch {
        return null;
      }
    };

    // 1. Tentar número original
    const jid = await checkNumber(cleanPhone);
    if (jid) return jid;

    // 2. Se BR, tentar variação do 9º dígito
    if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
      const ddd = cleanPhone.substring(2, 4);
      const rest = cleanPhone.substring(4);
      let alt: string | null = null;
      if (rest.length === 9 && rest.startsWith('9')) {
        alt = `55${ddd}${rest.substring(1)}`;
      } else if (rest.length === 8) {
        alt = `55${ddd}9${rest}`;
      }
      if (alt) {
        const altJid = await checkNumber(alt);
        if (altJid) return altJid;
      }
    }

    // 3. Fallback
    return `${cleanPhone}@s.whatsapp.net`;
  };

  const startDisparo = async () => {
    if (!selectedSession) {
      toast({ title: 'Selecione uma sessão', variant: 'destructive' });
      return;
    }
    if (recipients.filter(r => r.status === 'pending').length === 0) {
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

    setIsSending(true);
    setProgress(0);

    const pending = recipients.filter(r => r.status === 'pending');
    const baileysUrl = selectedSession.baileys_server_url;
    const instanceName = selectedSession.instance_name;

    for (let i = 0; i < pending.length; i++) {
      const recipient = pending[i];
      
      // Update status to sending
      setRecipients(prev => prev.map(r => r.id === recipient.id ? { ...r, status: 'sending' as const } : r));

      try {
        let phone = recipient.phone;
        if (!phone.startsWith('55') && phone.length <= 11) {
          phone = '55' + phone;
        }

        // Resolver JID correto antes de enviar (igual à API pública)
        const jid = await resolveJid(baileysUrl, instanceName, phone);
        console.log(`[Disparos] Número ${phone} → JID: ${jid}`);

        if (mediaType === 'text') {
          // Send text
          const res = await fetch(`${baileysUrl}/api/message/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instanceName,
              jid,
              message: { text: message },
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } else {
          // Send media
          const mediaTypeMap: Record<string, string> = {
            image: 'image',
            video: 'video',
            audio: 'audio',
            document: 'document',
          };
          const res = await fetch(`${baileysUrl}/api/message/send-media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instanceName,
              jid,
              mediaType: mediaTypeMap[mediaType],
              url: mediaUrl,
              caption: mediaCaption || undefined,
              fileName: mediaType === 'document' ? 'arquivo' : undefined,
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }

        setRecipients(prev => prev.map(r => r.id === recipient.id ? { ...r, status: 'sent' as const } : r));
      } catch (err: any) {
        setRecipients(prev => prev.map(r => r.id === recipient.id ? { ...r, status: 'error' as const, error: err.message } : r));
      }

      setProgress(Math.round(((i + 1) / pending.length) * 100));

      // Delay between messages
      if (i < pending.length - 1) {
        await sleep(delaySeconds * 1000);
      }
    }

    setIsSending(false);
    toast({ title: 'Disparo concluído!' });
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
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger>
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
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">Nenhuma sessão conectada. Conecte um número no CRM WhatsApp primeiro.</p>
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
                        <span className="truncate font-mono text-gray-700">{r.phone}</span>
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
