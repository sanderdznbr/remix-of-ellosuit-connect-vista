import React, { useState, useEffect } from 'react';
import { Key, Copy, Trash2, Plus, Eye, EyeOff, Power, Code, Loader2, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, AlertTriangle, ArrowLeft, BarChart3, ChevronDown, ChevronUp, Lightbulb, AlertCircle, Ban, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ApiKey {
  id: string;
  api_key: string;
  name: string;
  is_active: boolean;
  rate_limit_per_minute: number;
  total_messages_sent: number;
  last_used_at: string | null;
  created_at: string;
  session_id: string;
}

interface ApiLog {
  id: string;
  api_key_id: string;
  phone: string;
  message_preview: string | null;
  status: string;
  error_message: string | null;
  ip_address: string | null;
  created_at: string;
}

interface WhatsAppSession {
  id: string;
  instance_name: string;
  status: string;
  phone_number?: string;
}

const getErrorSolution = (status: string, errorMessage: string | null): { title: string; solution: string } | null => {
  if (status === 'sent') return null;
  const err = (errorMessage || '').toLowerCase();
  if (status === 'rate_limited') return { title: 'Limite de taxa excedido', solution: 'Você está enviando mensagens muito rápido. Reduza a frequência ou aumente o rate_limit_per_minute da API Key. Aguarde 60s.' };
  if (err.includes('not connected') || err.includes('session not connected')) return { title: 'Sessão desconectada', solution: 'A sessão WhatsApp está desconectada. Vá ao painel de sessões e escaneie o QR Code novamente.' };
  if (err.includes('baileys') || err.includes('server not configured')) return { title: 'Servidor não configurado', solution: 'O servidor Baileys não está configurado ou offline. Verifique a variável BAILEYS_SERVER_URL.' };
  if (err.includes('timeout') || err.includes('econnrefused')) return { title: 'Timeout de conexão', solution: 'O servidor não respondeu a tempo. Verifique se o servidor Baileys está acessível e tente novamente.' };
  if (err.includes('not on whatsapp') || err.includes('not registered')) return { title: 'Número sem WhatsApp', solution: 'O número informado não possui conta no WhatsApp. Verifique se está correto.' };
  if (err.includes('media') || err.includes('download')) return { title: 'Erro de mídia', solution: 'Não foi possível processar o arquivo. Verifique se a URL é pública, o formato é suportado e o arquivo não excede 16MB.' };
  if (err.includes('<!doctype') || err.includes('<html')) return { title: 'Resposta HTML inesperada', solution: 'O servidor retornou uma página HTML em vez de JSON. Isso geralmente indica que a URL do servidor Baileys está incorreta ou o endpoint não existe. Verifique a configuração da URL do servidor.' };
  if (err.includes('401') || err.includes('unauthorized')) return { title: 'Não autorizado', solution: 'API Key inválida ou desativada. Verifique se a chave está correta e ativa.' };
  if (err.includes('500') || err.includes('internal')) return { title: 'Erro interno', solution: 'Erro inesperado no servidor. Tente novamente ou contate o suporte.' };
  return { title: 'Erro', solution: 'Verifique a mensagem de erro completa abaixo. Se necessário, contate o suporte técnico.' };
};

const WhatsAppApiPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('keys');
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'failed' | 'rate_limited'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';
  const connectedSessions = sessions.filter(s => s.status === 'connected');

  useEffect(() => {
    loadCompanyData();
  }, [user]);

  const loadCompanyData = async () => {
    if (!user) return;
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (companyUser) {
      setCompanyId(companyUser.company_id);
      await Promise.all([
        fetchSessions(companyUser.company_id),
        fetchApiKeys(companyUser.company_id),
        fetchLogs(companyUser.company_id),
      ]);
    }
    setLoading(false);
  };

  const fetchSessions = async (cId: string) => {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('id, instance_name, status, phone_number')
      .eq('company_id', cId);
    if (data) setSessions(data);
  };

  const fetchApiKeys = async (cId: string) => {
    const { data } = await supabase
      .from('whatsapp_api_keys')
      .select('*')
      .eq('company_id', cId)
      .order('created_at', { ascending: false });
    if (data) setApiKeys(data as unknown as ApiKey[]);
  };

  const fetchLogs = async (cId: string) => {
    setLogsLoading(true);
    // Get api key ids for this company first
    const { data: keys } = await supabase
      .from('whatsapp_api_keys')
      .select('id')
      .eq('company_id', cId);

    if (keys && keys.length > 0) {
      const keyIds = keys.map(k => k.id);
      const { data } = await supabase
        .from('whatsapp_api_logs')
        .select('*')
        .in('api_key_id', keyIds)
        .order('created_at', { ascending: false })
        .limit(200);
      if (data) setLogs(data as unknown as ApiLog[]);
    }
    setLogsLoading(false);
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'ek_';
    for (let i = 0; i < 48; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const handleCreateKey = async () => {
    if (!selectedSessionId || !newKeyName.trim() || !companyId) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const apiKey = generateApiKey();
    const { error } = await supabase.from('whatsapp_api_keys').insert({
      company_id: companyId,
      session_id: selectedSessionId,
      api_key: apiKey,
      name: newKeyName.trim(),
    });
    if (error) {
      toast({ title: 'Erro ao criar API Key', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'API Key criada com sucesso!' });
      setShowCreateDialog(false);
      setNewKeyName('');
      setSelectedSessionId('');
      fetchApiKeys(companyId);
    }
    setCreating(false);
  };

  const toggleKeyStatus = async (key: ApiKey) => {
    await supabase.from('whatsapp_api_keys').update({ is_active: !key.is_active }).eq('id', key.id);
    if (companyId) fetchApiKeys(companyId);
  };

  const deleteKey = async (id: string) => {
    await supabase.from('whatsapp_api_keys').delete().eq('id', id);
    toast({ title: 'API Key removida' });
    if (companyId) fetchApiKeys(companyId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => key.substring(0, 6) + '••••••••••••' + key.substring(key.length - 4);

  const filteredLogs = logFilter === 'all' ? logs : logs.filter(l => l.status === logFilter);

  const logStats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    rateLimited: logs.filter(l => l.status === 'rate_limited').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'rate_limited': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Enviado';
      case 'failed': return 'Falhou';
      case 'rate_limited': return 'Rate Limited';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF4500, #FF6B35)' }}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/crm-whatsapp')} className="text-white hover:bg-white/20 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 text-white truncate">
                <Key className="h-5 w-5 shrink-0" />
                API CRM WhatsApp
              </h1>
              <p className="text-xs md:text-sm text-white/80 truncate">
                Gerencie API Keys, visualize logs e documentação
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-11 md:pl-0 md:justify-end flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/api-whatsapp/checkout')} className="border-white/30 text-white bg-white/10 hover:bg-white/20 text-xs md:text-sm">
              <CreditCard className="h-4 w-4 mr-1 md:mr-2 shrink-0" />
              <span className="hidden sm:inline">Planos & Preços</span>
              <span className="sm:hidden">Planos</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('/docs-apicrm', '_blank')} className="border-white/30 text-white bg-white/10 hover:bg-white/20 text-xs md:text-sm">
              <ExternalLink className="h-4 w-4 mr-1 md:mr-2 shrink-0" />
              <span className="hidden sm:inline">Documentação</span>
              <span className="sm:hidden">Docs</span>
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} disabled={connectedSessions.length === 0} className="bg-white text-[#FF4500] hover:bg-white/90 text-xs md:text-sm">
              <Plus className="h-4 w-4 mr-1 md:mr-2 shrink-0" />
              Nova Key
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 md:p-6 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-[#FF4500]/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-[#FF4500]" />
                <span className="text-sm text-muted-foreground">API Keys</span>
              </div>
              <p className="text-2xl font-bold mt-1">{apiKeys.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Enviados</span>
              </div>
              <p className="text-2xl font-bold mt-1">{logStats.sent}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Falhas</span>
              </div>
              <p className="text-2xl font-bold mt-1">{logStats.failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Rate Limited</span>
              </div>
              <p className="text-2xl font-bold mt-1">{logStats.rateLimited}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden px-4 md:px-6 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-fit" style={{ '--tabs-active-bg': '#FF4500' } as React.CSSProperties}>
            <TabsTrigger value="keys" className="data-[state=active]:bg-[#FF4500] data-[state=active]:text-white">API Keys</TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-[#FF4500] data-[state=active]:text-white">
              Logs
              {logs.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{logs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="examples" className="data-[state=active]:bg-[#FF4500] data-[state=active]:text-white">Exemplos de Código</TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="flex-1 overflow-auto mt-4">
            {connectedSessions.length === 0 && (
              <Card className="border-dashed border-yellow-300 bg-yellow-50/50 mb-4">
                <CardContent className="p-4 text-center text-sm text-yellow-800">
                  ⚠️ Conecte uma sessão WhatsApp via QR Code antes de gerar API Keys.
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Suas API Keys</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => companyId && fetchApiKeys(companyId)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma API Key criada ainda</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Msgs enviadas</TableHead>
                        <TableHead>Limite/min</TableHead>
                        <TableHead>Último uso</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map(key => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded max-w-[180px] truncate">
                                {visibleKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                              </code>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleKeyVisibility(key.id)}>
                                {visibleKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(key.api_key)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={key.is_active ? 'default' : 'secondary'} className={key.is_active ? 'bg-[#FF4500] hover:bg-[#FF4500]/90 text-white' : ''}>
                              {key.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{key.total_messages_sent}</TableCell>
                          <TableCell>{key.rate_limit_per_minute}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {key.last_used_at ? new Date(key.last_used_at).toLocaleString('pt-BR') : 'Nunca'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleKeyStatus(key)} title={key.is_active ? 'Desativar' : 'Ativar'}>
                                <Power className={`h-3 w-3 ${key.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteKey(key.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-hidden mt-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button variant={logFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setLogFilter('all')}>
                  Todos ({logStats.total})
                </Button>
                <Button variant={logFilter === 'sent' ? 'secondary' : 'ghost'} size="sm" onClick={() => setLogFilter('sent')}>
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" /> Enviados ({logStats.sent})
                </Button>
                <Button variant={logFilter === 'failed' ? 'secondary' : 'ghost'} size="sm" onClick={() => setLogFilter('failed')}>
                  <XCircle className="h-3 w-3 mr-1 text-destructive" /> Falhas ({logStats.failed})
                </Button>
                <Button variant={logFilter === 'rate_limited' ? 'secondary' : 'ghost'} size="sm" onClick={() => setLogFilter('rate_limited')}>
                  <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" /> Rate Limited ({logStats.rateLimited})
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => companyId && fetchLogs(companyId)}>
                <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <Card className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {filteredLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum log encontrado</p>
                ) : (
                  <div className="divide-y">
                    {filteredLogs.map(log => {
                      const isExpanded = expandedLogId === log.id;
                      const solution = getErrorSolution(log.status, log.error_message);

                      return (
                        <div key={log.id}>
                          <button
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          >
                            <div className="shrink-0" title={getStatusLabel(log.status)}>
                              {getStatusIcon(log.status)}
                            </div>
                            <span className="font-mono text-xs w-32 shrink-0">{log.phone}</span>
                            <span className="text-xs text-muted-foreground truncate flex-1">
                              {log.message_preview || '-'}
                            </span>
                            {log.error_message && (
                              <span className="text-xs text-destructive truncate max-w-[250px] hidden md:inline">
                                {log.error_message.substring(0, 60)}...
                              </span>
                            )}
                            <span className="font-mono text-xs text-muted-foreground shrink-0 hidden md:inline">{log.ip_address || '-'}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </span>
                            {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3 bg-muted/20">
                              {/* Details grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground block">Status</span>
                                  <span className="font-medium">{getStatusLabel(log.status)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Telefone</span>
                                  <span className="font-mono">{log.phone}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">IP de Origem</span>
                                  <span className="font-mono">{log.ip_address || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Data/Hora</span>
                                  <span>{new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                                </div>
                              </div>

                              {/* Message preview */}
                              {log.message_preview && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground block mb-1">Mensagem Enviada</span>
                                  <div className="bg-muted p-2 rounded font-mono break-all">{log.message_preview}</div>
                                </div>
                              )}

                              {/* Full error */}
                              {log.error_message && (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-semibold text-destructive block">Erro Completo</span>
                                      <pre className="text-xs text-destructive/80 mt-1 whitespace-pre-wrap break-all font-mono bg-destructive/5 p-2 rounded max-h-[300px] overflow-auto">
                                        {log.error_message}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Solution */}
                              {solution && (
                                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                                  <div className="flex items-start gap-2">
                                    <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <div>
                                      <span className="text-xs font-semibold text-primary block">💡 {solution.title}</span>
                                      <p className="text-xs text-foreground/70 mt-1">{solution.solution}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Code Examples Tab */}
          <TabsContent value="examples" className="flex-1 overflow-auto mt-4">
            <CodeExamples apiKey={apiKeys[0]?.api_key || 'SUA_API_KEY'} supabaseUrl={SUPABASE_URL} onCopy={copyToClipboard} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova API Key</DialogTitle>
            <DialogDescription>Gere uma chave para integrar com sistemas externos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da chave</label>
              <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Ex: Meu E-commerce" />
            </div>
            <div>
              <label className="text-sm font-medium">Sessão WhatsApp</label>
              <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
                <option value="">Selecione uma sessão conectada</option>
                {connectedSessions.map(s => (
                  <option key={s.id} value={s.id}>{s.instance_name} {s.phone_number ? `(${s.phone_number})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateKey} disabled={creating} className="bg-[#FF4500] hover:bg-[#FF4500]/90 text-white">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Gerar API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Separate code examples component
const CodeExamples: React.FC<{ apiKey: string; supabaseUrl: string; onCopy: (t: string) => void }> = ({ apiKey, supabaseUrl, onCopy }) => {
  const [tab, setTab] = useState('curl');

  const examples: Record<string, string> = {
    curl: `curl -X POST "${supabaseUrl}/functions/v1/whatsapp-public-api" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "action": "send_text",
    "phone": "5511999999999",
    "message": "Olá! Sua compra foi confirmada."
  }'`,
    javascript: `const response = await fetch(
  "${supabaseUrl}/functions/v1/whatsapp-public-api",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "${apiKey}",
    },
    body: JSON.stringify({
      action: "send_text",
      phone: "5511999999999",
      message: "Olá! Sua compra foi confirmada.",
    }),
  }
);
const data = await response.json();
console.log(data);`,
    python: `import requests

response = requests.post(
    "${supabaseUrl}/functions/v1/whatsapp-public-api",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "${apiKey}",
    },
    json={
        "action": "send_text",
        "phone": "5511999999999",
        "message": "Olá! Sua compra foi confirmada.",
    },
)
print(response.json())`,
    php: `<?php
$ch = curl_init("${supabaseUrl}/functions/v1/whatsapp-public-api");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "X-API-Key: ${apiKey}",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "action" => "send_text",
        "phone" => "5511999999999",
        "message" => "Olá! Sua compra foi confirmada.",
    ]),
]);
$response = curl_exec($ch);
echo $response;`,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-[#FF4500]">
            <Code className="h-4 w-4" /> Exemplos de Integração
          </CardTitle>
          <CardDescription>Copie e cole no seu site ou sistema para enviar mensagens</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
            </TabsList>
            {Object.entries(examples).map(([key, code]) => (
              <TabsContent key={key} value={key}>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">{code}</pre>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => onCopy(code)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#FF4500]">Ações Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg border">
              <code className="font-bold text-[#FF4500] text-sm">send_text</code>
              <p className="text-xs text-muted-foreground mt-1">Envia mensagem de texto</p>
              <p className="text-xs text-muted-foreground font-mono mt-2">phone, message</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <code className="font-bold text-[#FF4500] text-sm">send_media</code>
              <p className="text-xs text-muted-foreground mt-1">Envia imagem/vídeo/documento</p>
              <p className="text-xs text-muted-foreground font-mono mt-2">phone, media_url, caption, media_type</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <code className="font-bold text-[#FF4500] text-sm">check_status</code>
              <p className="text-xs text-muted-foreground mt-1">Verifica se sessão está conectada</p>
              <p className="text-xs text-muted-foreground font-mono mt-2">Sem campos adicionais</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppApiPage;
