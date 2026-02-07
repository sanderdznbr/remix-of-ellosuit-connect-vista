import React from 'react';
import { X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlowNode } from './types';

interface ChatBotPropertiesPanelProps {
  node: FlowNode | null;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: Partial<FlowNode>) => void;
}

const ChatBotPropertiesPanel: React.FC<ChatBotPropertiesPanelProps> = ({
  node,
  onClose,
  onUpdate
}) => {
  if (!node) return null;

  const updateConfig = (key: string, value: any) => {
    onUpdate(node.id, {
      data: {
        ...node.data,
        config: {
          ...node.data.config,
          [key]: value
        }
      }
    });
  };

  const updateLabel = (label: string) => {
    onUpdate(node.id, {
      data: {
        ...node.data,
        label
      }
    });
  };

  const renderFields = () => {
    switch (node.type) {
      case 'trigger':
        return (
          <>
            {node.subType === 'keyword' && (
              <div className="space-y-2">
                <Label>Palavras-chave (uma por linha)</Label>
                <Textarea
                  value={(node.data.config?.keywords || []).join('\n')}
                  onChange={(e) => updateConfig('keywords', e.target.value.split('\n').filter(Boolean))}
                  placeholder="oi&#10;olá&#10;bom dia"
                  rows={4}
                />
              </div>
            )}
            {node.subType === 'inactivity' && (
              <div className="space-y-2">
                <Label>Tempo de inatividade (minutos)</Label>
                <Input
                  type="number"
                  value={node.data.config?.minutes || 5}
                  onChange={(e) => updateConfig('minutes', parseInt(e.target.value))}
                  min={1}
                />
              </div>
            )}
            {node.subType === 'webhook' && (
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <Input
                  value={node.data.config?.url || ''}
                  onChange={(e) => updateConfig('url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
          </>
        );

      case 'message':
        return (
          <>
            <div className="space-y-2">
              <Label>Conteúdo da Mensagem</Label>
              <Textarea
                value={node.data.config?.content || ''}
                onChange={(e) => updateConfig('content', e.target.value)}
                placeholder="Digite a mensagem..."
                rows={4}
              />
              <p className="text-xs text-gray-500">
                Use {"{{nome}}"} para variáveis dinâmicas
              </p>
            </div>
            {node.subType === 'buttons' && (
              <div className="space-y-2">
                <Label>Botões (um por linha)</Label>
                <Textarea
                  value={(node.data.config?.buttons || []).join('\n')}
                  onChange={(e) => updateConfig('buttons', e.target.value.split('\n').filter(Boolean))}
                  placeholder="Sim&#10;Não&#10;Talvez"
                  rows={3}
                />
              </div>
            )}
            {node.subType === 'image' && (
              <div className="space-y-2">
                <Label>URL da Imagem</Label>
                <Input
                  value={node.data.config?.url || ''}
                  onChange={(e) => updateConfig('url', e.target.value)}
                  placeholder="https://..."
                />
                <Label>Legenda</Label>
                <Input
                  value={node.data.config?.caption || ''}
                  onChange={(e) => updateConfig('caption', e.target.value)}
                  placeholder="Descrição da imagem"
                />
              </div>
            )}
          </>
        );

      case 'condition':
        return (
          <>
            {node.subType === 'check_variable' && (
              <>
                <div className="space-y-2">
                  <Label>Nome da Variável</Label>
                  <Input
                    value={node.data.config?.variable || ''}
                    onChange={(e) => updateConfig('variable', e.target.value)}
                    placeholder="nome_variavel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Operador</Label>
                  <Select 
                    value={node.data.config?.operator || '=='} 
                    onValueChange={(v) => updateConfig('operator', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="==">Igual a</SelectItem>
                      <SelectItem value="!=">Diferente de</SelectItem>
                      <SelectItem value=">">Maior que</SelectItem>
                      <SelectItem value="<">Menor que</SelectItem>
                      <SelectItem value="contains">Contém</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    value={node.data.config?.value || ''}
                    onChange={(e) => updateConfig('value', e.target.value)}
                    placeholder="valor"
                  />
                </div>
              </>
            )}
            {node.subType === 'check_time' && (
              <>
                <div className="space-y-2">
                  <Label>Horário Inicial</Label>
                  <Input
                    type="number"
                    value={node.data.config?.startHour || 9}
                    onChange={(e) => updateConfig('startHour', parseInt(e.target.value))}
                    min={0}
                    max={23}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário Final</Label>
                  <Input
                    type="number"
                    value={node.data.config?.endHour || 18}
                    onChange={(e) => updateConfig('endHour', parseInt(e.target.value))}
                    min={0}
                    max={23}
                  />
                </div>
              </>
            )}
            {node.subType === 'check_tag' && (
              <div className="space-y-2">
                <Label>Tag do Contato</Label>
                <Input
                  value={node.data.config?.tag || ''}
                  onChange={(e) => updateConfig('tag', e.target.value)}
                  placeholder="nome_da_tag"
                />
              </div>
            )}
          </>
        );

      case 'action':
        return (
          <>
            {node.subType === 'assign_tag' && (
              <div className="space-y-2">
                <Label>Tag a Atribuir</Label>
                <Input
                  value={node.data.config?.tag || ''}
                  onChange={(e) => updateConfig('tag', e.target.value)}
                  placeholder="nome_da_tag"
                />
              </div>
            )}
            {node.subType === 'send_email' && (
              <>
                <div className="space-y-2">
                  <Label>Destinatário</Label>
                  <Input
                    value={node.data.config?.to || ''}
                    onChange={(e) => updateConfig('to', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input
                    value={node.data.config?.subject || ''}
                    onChange={(e) => updateConfig('subject', e.target.value)}
                    placeholder="Assunto do email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Corpo do Email</Label>
                  <Textarea
                    value={node.data.config?.body || ''}
                    onChange={(e) => updateConfig('body', e.target.value)}
                    placeholder="Conteúdo do email..."
                    rows={4}
                  />
                </div>
              </>
            )}
            {node.subType === 'call_api' && (
              <>
                <div className="space-y-2">
                  <Label>URL da API</Label>
                  <Input
                    value={node.data.config?.url || ''}
                    onChange={(e) => updateConfig('url', e.target.value)}
                    placeholder="https://api.exemplo.com/endpoint"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Método HTTP</Label>
                  <Select 
                    value={node.data.config?.method || 'POST'} 
                    onValueChange={(v) => updateConfig('method', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {node.subType === 'set_variable' && (
              <>
                <div className="space-y-2">
                  <Label>Nome da Variável</Label>
                  <Input
                    value={node.data.config?.name || ''}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    placeholder="nome_variavel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    value={node.data.config?.value || ''}
                    onChange={(e) => updateConfig('value', e.target.value)}
                    placeholder="valor"
                  />
                </div>
              </>
            )}
          </>
        );

      case 'delay':
        return (
          <>
            {node.subType === 'wait_seconds' && (
              <div className="space-y-2">
                <Label>Segundos para aguardar</Label>
                <Input
                  type="number"
                  value={node.data.config?.seconds || 5}
                  onChange={(e) => updateConfig('seconds', parseInt(e.target.value))}
                  min={1}
                />
              </div>
            )}
            {node.subType === 'wait_response' && (
              <div className="space-y-2">
                <Label>Timeout (segundos)</Label>
                <Input
                  type="number"
                  value={node.data.config?.timeout || 60}
                  onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                  min={10}
                />
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-white border-l flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Configurações</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <Label>Nome do Bloco</Label>
            <Input
              value={node.data.label}
              onChange={(e) => updateLabel(e.target.value)}
              placeholder="Nome do bloco"
            />
          </div>

          {/* Type-specific fields */}
          {renderFields()}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatBotPropertiesPanel;
