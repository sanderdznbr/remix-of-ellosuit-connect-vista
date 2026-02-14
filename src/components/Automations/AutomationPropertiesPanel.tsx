import { useState } from 'react';
import { X, Copy, Check, RefreshCw, Loader2, Globe, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutomationNode, AUTOMATION_BLOCKS } from './types';
import { useToast } from '@/hooks/use-toast';
import * as Icons from 'lucide-react';

const BRAND_COLOR = '#FF4500';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

interface Props {
  node: AutomationNode;
  automationId?: string | null;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: Partial<AutomationNode>) => void;
}

export default function AutomationPropertiesPanel({ node, automationId, onClose, onUpdate }: Props) {
  const { toast } = useToast();
  const block = AUTOMATION_BLOCKS.find(b => b.type === node.type);
  const color = block?.color || '#64748B';
  const [copied, setCopied] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [externalUrl, setExternalUrl] = useState(node.config?.externalWebhookUrl || '');
  const [fetchingFields, setFetchingFields] = useState(false);

  const getIcon = (iconName: string) => {
    const IconComp = (Icons as any)[iconName];
    return IconComp ? <IconComp className="h-5 w-5" /> : null;
  };

  const updateConfig = (key: string, value: any) => {
    onUpdate(node.id, { config: { ...node.config, [key]: value } });
  };

  const webhookUrl = automationId
    ? `${SUPABASE_URL}/functions/v1/automation-webhook/${automationId}`
    : '';

  const copyWebhookUrl = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({ title: 'Copiado!', description: 'URL do webhook copiada' });
    setTimeout(() => setCopied(false), 2000);
  };

  const testWebhook = async () => {
    if (!webhookUrl) return;
    setTestingWebhook(true);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _test: true,
          name: 'Teste Automação',
          email: 'teste@exemplo.com',
          phone: '11999999999',
        }),
      });
      const data = await res.json();
      if (data.success) {
        updateConfig('detectedFields', data.fields_detected || []);
        updateConfig('lastReceivedAt', new Date().toISOString());
        toast({ title: 'Teste enviado!', description: `${data.fields_detected?.length || 0} campos detectados` });
      } else {
        toast({ title: 'Erro', description: data.error || 'Falha no teste', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setTestingWebhook(false);
    }
  };

  const fetchExternalWebhook = async () => {
    if (!externalUrl.trim()) return;
    setFetchingFields(true);
    try {
      const res = await fetch(externalUrl);
      const data = await res.json();
      const fields = typeof data === 'object' && data !== null
        ? extractFieldPaths(data)
        : [];
      updateConfig('externalWebhookUrl', externalUrl);
      updateConfig('externalDetectedFields', fields);
      updateConfig('externalSampleData', data);
      toast({ title: 'Campos detectados!', description: `${fields.length} campos encontrados` });
    } catch (err: any) {
      toast({ title: 'Erro ao buscar dados', description: err.message, variant: 'destructive' });
    } finally {
      setFetchingFields(false);
    }
  };

  const extractFieldPaths = (obj: any, prefix = ''): string[] => {
    const paths: string[] = [];
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        paths.push(...extractFieldPaths(obj[key], fullKey));
      } else {
        paths.push(fullKey);
      }
    }
    return paths;
  };

  const detectedFields: string[] = node.config?.detectedFields || [];
  const externalFields: string[] = node.config?.externalDetectedFields || [];
  const webhookMode = node.config?.webhookMode || 'receive';

  return (
    <div className="w-80 bg-white border-l flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: color }}>
          {block && getIcon(block.icon)}
        </div>
        <div className="flex-1 min-w-0">
          <Input
            value={node.label}
            onChange={e => onUpdate(node.id, { label: e.target.value })}
            className="h-7 text-sm font-semibold border-0 p-0 focus-visible:ring-0"
          />
          <p className="text-[10px] text-gray-400">{block?.description}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Config */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ===== WEBHOOK ===== */}
        {node.type === 'webhook' && (
          <>
            {/* Mode toggle */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Modo do Webhook</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => updateConfig('webhookMode', 'receive')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    webhookMode === 'receive'
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Receber dados
                </button>
                <button
                  onClick={() => updateConfig('webhookMode', 'fetch')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    webhookMode === 'fetch'
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Puxar dados
                </button>
              </div>
            </div>

            {webhookMode === 'receive' ? (
              <>
                {/* Method */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Método</label>
                  <Select value={node.config?.method || 'POST'} onValueChange={v => updateConfig('method', v)}>
                    <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Generated URL */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">URL do Webhook</label>
                  {automationId ? (
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-xl p-2.5 text-[10px] font-mono text-gray-600 break-all border border-gray-100">
                        {webhookUrl}
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={copyWebhookUrl}
                          className="flex-1 rounded-xl h-8 text-xs gap-1.5">
                          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? 'Copiado!' : 'Copiar URL'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={testWebhook}
                          disabled={testingWebhook}
                          className="rounded-xl h-8 text-xs gap-1.5">
                          {testingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Testar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-xl p-2.5 text-[10px] text-amber-700 border border-amber-100">
                      💡 Salve a automação primeiro para gerar a URL do webhook
                    </div>
                  )}
                </div>

                {/* Detected fields */}
                {detectedFields.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Campos detectados
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {detectedFields.map(f => (
                        <Badge key={f} variant="secondary" className="text-[10px] rounded-full px-2 py-0.5 font-mono">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    {node.config?.lastReceivedAt && (
                      <p className="text-[9px] text-gray-400 mt-1.5">
                        Último recebimento: {new Date(node.config.lastReceivedAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Fetch mode */
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">URL externa (GET)</label>
                  <Input
                    value={externalUrl}
                    onChange={e => setExternalUrl(e.target.value)}
                    placeholder="https://api.exemplo.com/dados"
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <Button size="sm" onClick={fetchExternalWebhook} disabled={fetchingFields || !externalUrl.trim()}
                  className="w-full rounded-xl h-8 text-xs gap-1.5 text-white"
                  style={{ backgroundColor: BRAND_COLOR }}>
                  {fetchingFields ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                  Buscar e detectar campos
                </Button>

                {externalFields.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Campos detectados</label>
                    <div className="flex flex-wrap gap-1">
                      {externalFields.map(f => (
                        <Badge key={f} variant="secondary" className="text-[10px] rounded-full px-2 py-0.5 font-mono">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== NEW CLIENT TRIGGER ===== */}
        {node.type === 'new_client' && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de Cliente</label>
            <Select value={node.config?.clientType || 'any'} onValueChange={v => updateConfig('clientType', v)}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer tipo</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="prospect">Prospecto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ===== CLIENT UPDATED TRIGGER ===== */}
        {node.type === 'client_updated' && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Campos monitorados</label>
            <Input
              value={node.config?.watchFields || ''}
              onChange={e => updateConfig('watchFields', e.target.value)}
              placeholder="email, phone, status"
              className="rounded-xl h-9 text-xs"
            />
            <p className="text-[10px] text-gray-400 mt-1">Separe por vírgula. Vazio = qualquer campo</p>
          </div>
        )}

        {/* ===== PROPOSAL STATUS TRIGGER ===== */}
        {node.type === 'proposal_status' && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Status da Proposta</label>
            <Select value={node.config?.status || 'approved'} onValueChange={v => updateConfig('status', v)}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Aprovada</SelectItem>
                <SelectItem value="rejected">Rejeitada</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="viewed">Visualizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ===== SCHEDULE TRIGGER ===== */}
        {node.type === 'schedule' && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Expressão Cron</label>
            <Input
              value={node.config?.cron || '0 9 * * *'}
              onChange={e => updateConfig('cron', e.target.value)}
              placeholder="0 9 * * *"
              className="rounded-xl h-9 text-xs font-mono"
            />
            <p className="text-[10px] text-gray-400 mt-1">Padrão: todo dia às 9h</p>
          </div>
        )}

        {/* ===== CREATE CLIENT ACTION ===== */}
        {node.type === 'create_client' && (
          <>
            <p className="text-[10px] text-gray-400 bg-blue-50 p-2 rounded-lg border border-blue-100">
              Use <code className="font-mono text-blue-600">{'{{data.campo}}'}</code> para mapear campos do gatilho
            </p>
            {['nameField:Nome', 'emailField:Email', 'phoneField:Telefone', 'statusField:Status'].map(pair => {
              const [key, label] = pair.split(':');
              return (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                  <Input
                    value={node.config?.[key] || ''}
                    onChange={e => updateConfig(key, e.target.value)}
                    placeholder={`{{data.${label.toLowerCase()}}}`}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
              );
            })}
          </>
        )}

        {/* ===== UPDATE CLIENT ACTION ===== */}
        {node.type === 'update_client' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Identificador do Cliente</label>
              <Input
                value={node.config?.clientIdentifier || ''}
                onChange={e => updateConfig('clientIdentifier', e.target.value)}
                placeholder="{{data.email}} ou {{data.id}}"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Campos a atualizar (JSON)</label>
              <Textarea
                value={node.config?.updateFields || ''}
                onChange={e => updateConfig('updateFields', e.target.value)}
                placeholder='{"status": "client", "tags": ["vip"]}'
                className="rounded-xl text-xs font-mono min-h-[80px]"
              />
            </div>
          </>
        )}

        {/* ===== SEND EMAIL ACTION ===== */}
        {node.type === 'send_email' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Destinatário</label>
              <Input
                value={node.config?.to || ''}
                onChange={e => updateConfig('to', e.target.value)}
                placeholder="{{client.email}} ou email fixo"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Assunto</label>
              <Input
                value={node.config?.subject || ''}
                onChange={e => updateConfig('subject', e.target.value)}
                placeholder="Bem-vindo, {{client.name}}!"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Conteúdo HTML</label>
              <Textarea
                value={node.config?.body || ''}
                onChange={e => updateConfig('body', e.target.value)}
                placeholder="<h1>Olá {{client.name}}</h1>..."
                className="rounded-xl text-xs min-h-[100px]"
              />
            </div>
          </>
        )}

        {/* ===== SEND WHATSAPP ACTION ===== */}
        {node.type === 'send_whatsapp' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Número</label>
              <Input
                value={node.config?.to || ''}
                onChange={e => updateConfig('to', e.target.value)}
                placeholder="{{client.phone}}"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mensagem</label>
              <Textarea
                value={node.config?.message || ''}
                onChange={e => updateConfig('message', e.target.value)}
                placeholder="Olá {{client.name}}, ..."
                className="rounded-xl text-xs min-h-[80px]"
              />
            </div>
          </>
        )}

        {/* ===== CREATE TASK ACTION ===== */}
        {node.type === 'create_task' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Título da Tarefa</label>
              <Input
                value={node.config?.title || ''}
                onChange={e => updateConfig('title', e.target.value)}
                placeholder="Follow-up com {{client.name}}"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Prazo (dias a partir de hoje)</label>
              <Input
                type="number"
                value={node.config?.dueDays || 3}
                onChange={e => updateConfig('dueDays', parseInt(e.target.value) || 0)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Descrição</label>
              <Textarea
                value={node.config?.description || ''}
                onChange={e => updateConfig('description', e.target.value)}
                placeholder="Detalhes da tarefa..."
                className="rounded-xl text-xs min-h-[60px]"
              />
            </div>
          </>
        )}

        {/* ===== CREATE PROPOSAL ACTION ===== */}
        {node.type === 'create_proposal' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Título da Proposta</label>
              <Input
                value={node.config?.proposalTitle || ''}
                onChange={e => updateConfig('proposalTitle', e.target.value)}
                placeholder="Proposta para {{client.name}}"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Template ID</label>
              <Input
                value={node.config?.templateId || ''}
                onChange={e => updateConfig('templateId', e.target.value)}
                placeholder="ID do template de proposta"
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </>
        )}

        {/* ===== HTTP REQUEST ACTION ===== */}
        {node.type === 'http_request' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">URL</label>
              <Input
                value={node.config?.url || ''}
                onChange={e => updateConfig('url', e.target.value)}
                placeholder="https://api.exemplo.com/endpoint"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Método</label>
              <Select value={node.config?.method || 'POST'} onValueChange={v => updateConfig('method', v)}>
                <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Headers (JSON)</label>
              <Textarea
                value={node.config?.headers || ''}
                onChange={e => updateConfig('headers', e.target.value)}
                placeholder='{"Authorization": "Bearer ..."}'
                className="rounded-xl text-xs font-mono min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Body (JSON)</label>
              <Textarea
                value={node.config?.body || ''}
                onChange={e => updateConfig('body', e.target.value)}
                placeholder='{"key": "{{data.value}}"}'
                className="rounded-xl text-xs font-mono min-h-[80px]"
              />
            </div>
          </>
        )}

        {/* ===== CONDITION ===== */}
        {node.type === 'condition' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Campo</label>
              <Input
                value={node.config?.field || ''}
                onChange={e => updateConfig('field', e.target.value)}
                placeholder="{{data.status}}"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Operador</label>
              <Select value={node.config?.operator || 'equals'} onValueChange={v => updateConfig('operator', v)}>
                <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="not_equals">Diferente de</SelectItem>
                  <SelectItem value="contains">Contém</SelectItem>
                  <SelectItem value="greater">Maior que</SelectItem>
                  <SelectItem value="less">Menor que</SelectItem>
                  <SelectItem value="exists">Existe</SelectItem>
                  <SelectItem value="not_exists">Não existe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Valor</label>
              <Input
                value={node.config?.value || ''}
                onChange={e => updateConfig('value', e.target.value)}
                placeholder="Valor de comparação"
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </>
        )}

        {/* ===== FILTER ===== */}
        {node.type === 'filter' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Campo para filtrar</label>
              <Input
                value={node.config?.filterField || ''}
                onChange={e => updateConfig('filterField', e.target.value)}
                placeholder="{{data.email}}"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Condição</label>
              <Select value={node.config?.filterOperator || 'not_empty'} onValueChange={v => updateConfig('filterOperator', v)}>
                <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_empty">Não está vazio</SelectItem>
                  <SelectItem value="is_empty">Está vazio</SelectItem>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="contains">Contém</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(node.config?.filterOperator === 'equals' || node.config?.filterOperator === 'contains') && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Valor</label>
                <Input
                  value={node.config?.filterValue || ''}
                  onChange={e => updateConfig('filterValue', e.target.value)}
                  placeholder="Valor"
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            )}
          </>
        )}

        {/* ===== TRANSFORM DATA ===== */}
        {node.type === 'transform_data' && (
          <>
            <p className="text-[10px] text-gray-400 bg-teal-50 p-2 rounded-lg border border-teal-100">
              Mapeie campos de entrada para saída. Use <code className="font-mono text-teal-600">{'{{data.campo}}'}</code>
            </p>
            {['mapping1', 'mapping2', 'mapping3'].map((key, i) => (
              <div key={key} className="grid grid-cols-2 gap-1.5">
                <Input
                  value={node.config?.[`${key}_from`] || ''}
                  onChange={e => updateConfig(`${key}_from`, e.target.value)}
                  placeholder={`Origem ${i + 1}`}
                  className="rounded-xl h-8 text-[10px]"
                />
                <Input
                  value={node.config?.[`${key}_to`] || ''}
                  onChange={e => updateConfig(`${key}_to`, e.target.value)}
                  placeholder={`Destino ${i + 1}`}
                  className="rounded-xl h-8 text-[10px]"
                />
              </div>
            ))}
          </>
        )}

        {/* ===== DELAY ===== */}
        {node.type === 'delay' && (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Duração</label>
              <Input
                type="number"
                value={node.config?.duration || 5}
                onChange={e => updateConfig('duration', parseInt(e.target.value) || 0)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Unidade</label>
              <Select value={node.config?.unit || 'minutes'} onValueChange={v => updateConfig('unit', v)}>
                <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Segundos</SelectItem>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
