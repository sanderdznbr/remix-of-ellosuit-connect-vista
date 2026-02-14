
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutomationNode, AUTOMATION_BLOCKS } from './types';
import * as Icons from 'lucide-react';

const BRAND_COLOR = '#3000E3';

interface Props {
  node: AutomationNode;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: Partial<AutomationNode>) => void;
}

export default function AutomationPropertiesPanel({ node, onClose, onUpdate }: Props) {
  const block = AUTOMATION_BLOCKS.find(b => b.type === node.type);
  const color = block?.color || '#64748B';

  const getIcon = (iconName: string) => {
    const IconComp = (Icons as any)[iconName];
    return IconComp ? <IconComp className="h-5 w-5" /> : null;
  };

  const updateConfig = (key: string, value: any) => {
    onUpdate(node.id, { config: { ...node.config, [key]: value } });
  };

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
        {/* Webhook config */}
        {node.type === 'webhook' && (
          <>
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
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">URL do Webhook</label>
              <div className="bg-gray-50 rounded-xl p-2.5 text-[10px] font-mono text-gray-500 break-all">
                Será gerada ao ativar a automação
              </div>
            </div>
          </>
        )}

        {/* New Client trigger config */}
        {node.type === 'new_client' && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de Cliente</label>
            <Select value={node.config?.clientType || 'any'} onValueChange={v => updateConfig('clientType', v)}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer tipo</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Send Email action config */}
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

        {/* Create Client action config */}
        {node.type === 'create_client' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Campo Nome</label>
              <Input
                value={node.config?.nameField || ''}
                onChange={e => updateConfig('nameField', e.target.value)}
                placeholder="{{data.name}}"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Campo Email</label>
              <Input
                value={node.config?.emailField || ''}
                onChange={e => updateConfig('emailField', e.target.value)}
                placeholder="{{data.email}}"
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Campo Telefone</label>
              <Input
                value={node.config?.phoneField || ''}
                onChange={e => updateConfig('phoneField', e.target.value)}
                placeholder="{{data.phone}}"
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </>
        )}

        {/* Condition config */}
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

        {/* Schedule config */}
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

        {/* Delay config */}
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

        {/* HTTP Request config */}
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

        {/* Send WhatsApp config */}
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

        {/* Generic fallback */}
        {!['webhook', 'new_client', 'send_email', 'create_client', 'condition', 'schedule', 'delay', 'http_request', 'send_whatsapp'].includes(node.type) && (
          <div className="text-center py-6">
            <p className="text-xs text-gray-400">Configuração disponível em breve</p>
          </div>
        )}
      </div>
    </div>
  );
}
