import React, { useState, useCallback } from 'react';
import { Send, Upload, Plus, Trash2, Image, Video, Mic, FileText, Loader2, CheckCircle, XCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
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

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const addRecipient = () => {
    const clean = newPhone.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      toast({ title: 'Número inválido', description: 'Informe um número com DDD', variant: 'destructive' });
      return;
    }
    if (recipients.some(r => r.phone === clean)) {
      toast({ title: 'Duplicado', description: 'Esse número já foi adicionado', variant: 'destructive' });
      return;
    }
    setRecipients(prev => [...prev, { id: crypto.randomUUID(), phone: clean, status: 'pending' }]);
    setNewPhone('');
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

        if (mediaType === 'text') {
          // Send text
          const res = await fetch(`${baileysUrl}/api/message/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instanceName,
              jid: `${phone}@s.whatsapp.net`,
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
              jid: `${phone}@s.whatsapp.net`,
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
                <label className="cursor-pointer">
                  <input type="file" accept=".csv,.txt" className="hidden" onChange={handleImportCSV} />
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: OMNI_COLOR }}>
                    <Upload className="h-3.5 w-3.5" /> Importar Lista
                  </span>
                </label>
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
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline" className="text-green-600 border-green-200">{sentCount} enviados</Badge>
                  <Badge variant="outline" className="text-red-600 border-red-200">{errorCount} erros</Badge>
                  <Badge variant="outline" className="text-gray-600 border-gray-200">{pendingCount} pendentes</Badge>
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

                {['image', 'video', 'audio', 'document'].map(type => (
                  <TabsContent key={type} value={type} className="mt-3 space-y-3">
                    <Input
                      placeholder="URL do arquivo (ex: https://...)"
                      value={mediaUrl}
                      onChange={e => setMediaUrl(e.target.value)}
                      disabled={isSending}
                    />
                    {type !== 'audio' && (
                      <Textarea
                        placeholder="Legenda (opcional)"
                        value={mediaCaption}
                        onChange={e => setMediaCaption(e.target.value)}
                        rows={3}
                        disabled={isSending}
                        className="resize-none"
                      />
                    )}
                  </TabsContent>
                ))}
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
