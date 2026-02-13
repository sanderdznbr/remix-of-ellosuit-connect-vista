import React, { useState, useEffect } from 'react';
import { X, Settings, Loader2, Phone, AlertCircle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FlowNode } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WhatsAppSession {
  id: string;
  instance_name: string;
  phone_number: string | null;
  status: string;
  profile_picture: string | null;
}

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
  const { user } = useAuth();
  const [whatsappSessions, setWhatsappSessions] = useState<WhatsAppSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [aiAgents, setAiAgents] = useState<{ id: string; name: string; personality: string; is_active: boolean | null }[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Fetch company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setCompanyId(data.company_id);
      }
    };
    
    fetchCompanyId();
  }, [user?.id]);

  // Load WhatsApp sessions when needed
  useEffect(() => {
    if (node?.subType === 'whatsapp_channel' && companyId) {
      loadWhatsAppSessions();
    }
    if (node?.subType === 'transfer_ai_agent' && companyId) {
      loadAiAgents();
    }
  }, [node?.subType, companyId]);

  const loadWhatsAppSessions = async () => {
    if (!companyId) return;
    
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select('id, instance_name, phone_number, status, profile_picture')
        .eq('company_id', companyId)
        .eq('status', 'connected');
      
      if (error) throw error;
      setWhatsappSessions(data || []);
    } catch (error) {
      console.error('Erro ao carregar sessões WhatsApp:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadAiAgents = async () => {
    if (!companyId) return;
    setLoadingAgents(true);
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('id, name, personality, is_active')
        .eq('company_id', companyId)
        .order('name');
      if (!error) setAiAgents(data || []);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
    } finally {
      setLoadingAgents(false);
    }
  };

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

  const updateMultipleConfig = (updates: Record<string, any>) => {
    onUpdate(node.id, {
      data: {
        ...node.data,
        config: {
          ...node.data.config,
          ...updates
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

  const renderTriggerFields = () => {
    switch (node.subType) {
      case 'whatsapp_channel':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Canal WhatsApp Conectado
              </Label>
              {loadingSessions ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando sessões...</span>
                </div>
              ) : whatsappSessions.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700">Nenhum WhatsApp conectado. Conecte no CRM primeiro.</span>
                </div>
              ) : (
                <Select 
                  value={node.data.config?.sessionId || ''} 
                  onValueChange={(v) => {
                    const session = whatsappSessions.find(s => s.id === v);
                    updateMultipleConfig({
                      sessionId: v,
                      phoneNumber: session?.phone_number || '',
                      sessionName: session?.instance_name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o número" />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsappSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        <div className="flex items-center gap-2 py-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={session.profile_picture || undefined} />
                            <AvatarFallback className="text-xs">
                              {session.phone_number?.slice(-2) || 'WA'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <span className="font-medium">{session.phone_number || 'Sem número'}</span>
                            <span className="text-muted-foreground ml-2 text-xs">({session.instance_name})</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quando Iniciar o Fluxo?</Label>
              <Select 
                value={node.data.config?.triggerWhen || 'any_message'} 
                onValueChange={(v) => updateConfig('triggerWhen', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any_message">Qualquer mensagem recebida</SelectItem>
                  <SelectItem value="new_conversation">Nova conversa (primeiro contato)</SelectItem>
                  <SelectItem value="reopened">Conversa reaberta (após inatividade)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define em quais situações o bot será acionado
              </p>
            </div>

            {node.data.config?.triggerWhen === 'reopened' && (
              <div className="space-y-2">
                <Label>Tempo de Inatividade (horas)</Label>
                <Input
                  type="number"
                  value={node.data.config?.inactivityHours || 24}
                  onChange={(e) => updateConfig('inactivityHours', parseInt(e.target.value))}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Após quantas horas sem mensagem considera como "reaberta"
                </p>
              </div>
            )}
          </div>
        );

      case 'email_channel':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Conta de Email</Label>
              <Input
                value={node.data.config?.email || ''}
                onChange={(e) => updateConfig('email', e.target.value)}
                placeholder="seu@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Email que receberá as mensagens para acionar o bot
              </p>
            </div>
            <div className="space-y-2">
              <Label>Filtro de Assunto (opcional)</Label>
              <Input
                value={node.data.config?.subjectFilter || ''}
                onChange={(e) => updateConfig('subjectFilter', e.target.value)}
                placeholder="Ex: [Suporte]"
              />
            </div>
            <div className="space-y-2">
              <Label>Filtro de Remetente (opcional)</Label>
              <Input
                value={node.data.config?.senderFilter || ''}
                onChange={(e) => updateConfig('senderFilter', e.target.value)}
                placeholder="Ex: @empresa.com"
              />
            </div>
          </div>
        );

      case 'keyword':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Palavras-chave (uma por linha)</Label>
              <Textarea
                value={(node.data.config?.keywords || []).join('\n')}
                onChange={(e) => updateConfig('keywords', e.target.value.split('\n').filter(Boolean))}
                placeholder="oi&#10;olá&#10;bom dia&#10;preço&#10;orçamento"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                O fluxo será iniciado quando o usuário enviar uma mensagem contendo qualquer dessas palavras
              </p>
            </div>
            <div className="space-y-2">
              <Label>Modo de Correspondência</Label>
              <Select 
                value={node.data.config?.matchMode || 'contains'} 
                onValueChange={(v) => updateConfig('matchMode', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contém a palavra</SelectItem>
                  <SelectItem value="exact">Palavra exata</SelectItem>
                  <SelectItem value="starts_with">Começa com</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'conversation_start':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Início</Label>
              <Select 
                value={node.data.config?.startType || 'first_contact'} 
                onValueChange={(v) => updateConfig('startType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_contact">Primeiro contato (lead novo)</SelectItem>
                  <SelectItem value="any_start">Qualquer início de conversa</SelectItem>
                  <SelectItem value="reopened_after">Reaberta após X dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {node.data.config?.startType === 'reopened_after' && (
              <div className="space-y-2">
                <Label>Dias sem contato</Label>
                <Input
                  type="number"
                  value={node.data.config?.daysInactive || 7}
                  onChange={(e) => updateConfig('daysInactive', parseInt(e.target.value))}
                  min={1}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select 
                value={node.data.config?.channel || 'all'} 
                onValueChange={(v) => updateConfig('channel', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os canais</SelectItem>
                  <SelectItem value="whatsapp">Apenas WhatsApp</SelectItem>
                  <SelectItem value="email">Apenas Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'inactivity':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tempo de inatividade (minutos)</Label>
              <Input
                type="number"
                value={node.data.config?.minutes || 5}
                onChange={(e) => updateConfig('minutes', parseInt(e.target.value))}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Após quanto tempo sem resposta do usuário o fluxo será acionado
              </p>
            </div>
            <div className="space-y-2">
              <Label>Máximo de tentativas</Label>
              <Input
                type="number"
                value={node.data.config?.maxAttempts || 3}
                onChange={(e) => updateConfig('maxAttempts', parseInt(e.target.value))}
                min={1}
                max={10}
              />
            </div>
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                value={node.data.config?.url || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
                placeholder="https://sua-api.com/webhook"
              />
              <p className="text-xs text-muted-foreground">
                URL que receberá requisições POST para iniciar o fluxo
              </p>
            </div>
            <div className="space-y-2">
              <Label>Token de Autenticação (opcional)</Label>
              <Input
                value={node.data.config?.authToken || ''}
                onChange={(e) => updateConfig('authToken', e.target.value)}
                placeholder="Bearer token..."
                type="password"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderConditionFields = () => {
    switch (node.subType) {
      case 'if_else':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Condição</Label>
              <Select 
                value={node.data.config?.conditionType || 'user_response'} 
                onValueChange={(v) => updateConfig('conditionType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_response">Resposta do Usuário</SelectItem>
                  <SelectItem value="variable">Valor de Variável</SelectItem>
                  <SelectItem value="time">Horário Atual</SelectItem>
                  <SelectItem value="tag">Tag do Contato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {node.data.config?.conditionType === 'user_response' && (
              <>
                <div className="space-y-2">
                  <Label>A resposta do usuário</Label>
                  <Select 
                    value={node.data.config?.operator || 'contains'} 
                    onValueChange={(v) => updateConfig('operator', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contém</SelectItem>
                      <SelectItem value="equals">É igual a</SelectItem>
                      <SelectItem value="starts_with">Começa com</SelectItem>
                      <SelectItem value="ends_with">Termina com</SelectItem>
                      <SelectItem value="is_number">É um número</SelectItem>
                      <SelectItem value="is_email">É um email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!['is_number', 'is_email'].includes(node.data.config?.operator || '') && (
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      value={node.data.config?.value || ''}
                      onChange={(e) => updateConfig('value', e.target.value)}
                      placeholder="Ex: sim, confirmar, 1..."
                    />
                  </div>
                )}
              </>
            )}

            {node.data.config?.conditionType === 'variable' && (
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
                      <SelectItem value="empty">Está vazio</SelectItem>
                      <SelectItem value="not_empty">Não está vazio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!['empty', 'not_empty'].includes(node.data.config?.operator || '') && (
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      value={node.data.config?.value || ''}
                      onChange={(e) => updateConfig('value', e.target.value)}
                      placeholder="valor"
                    />
                  </div>
                )}
              </>
            )}

            {node.data.config?.conditionType === 'time' && (
              <>
                <div className="space-y-2">
                  <Label>Verificar se está entre</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={node.data.config?.startHour || 9}
                      onChange={(e) => updateConfig('startHour', parseInt(e.target.value))}
                      min={0}
                      max={23}
                      className="w-20"
                    />
                    <span className="text-muted-foreground">h e</span>
                    <Input
                      type="number"
                      value={node.data.config?.endHour || 18}
                      onChange={(e) => updateConfig('endHour', parseInt(e.target.value))}
                      min={0}
                      max={23}
                      className="w-20"
                    />
                    <span className="text-muted-foreground">h</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    "Sim" se dentro do horário, "Não" se fora
                  </p>
                </div>
              </>
            )}

            {node.data.config?.conditionType === 'tag' && (
              <div className="space-y-2">
                <Label>Tag do Contato</Label>
                <Input
                  value={node.data.config?.tag || ''}
                  onChange={(e) => updateConfig('tag', e.target.value)}
                  placeholder="nome_da_tag"
                />
                <p className="text-xs text-muted-foreground">
                  "Sim" se o contato tiver a tag, "Não" se não tiver
                </p>
              </div>
            )}

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Saídas:</strong><br />
                • <span className="text-green-600">Sim (✓)</span>: Condição verdadeira<br />
                • <span className="text-red-600">Não (✗)</span>: Condição falsa
              </p>
            </div>
          </div>
        );

      case 'check_variable':
        return (
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
        );

      case 'check_time':
        return (
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
        );

      case 'check_tag':
        return (
          <div className="space-y-2">
            <Label>Tag do Contato</Label>
            <Input
              value={node.data.config?.tag || ''}
              onChange={(e) => updateConfig('tag', e.target.value)}
              placeholder="nome_da_tag"
            />
          </div>
        );

      case 'multi':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Condições Múltiplas</Label>
              <p className="text-xs text-muted-foreground">
                Cada condição gera uma saída separada. Se nenhuma for verdadeira, segue pela saída "Senão".
              </p>
            </div>
            
            {(node.data.config?.conditions || []).map((cond: any, index: number) => (
              <div key={cond.id} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Condição {index + 1}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      const conditions = [...(node.data.config?.conditions || [])];
                      conditions.splice(index, 1);
                      updateConfig('conditions', conditions);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={cond.label || ''}
                  onChange={(e) => {
                    const conditions = [...(node.data.config?.conditions || [])];
                    conditions[index] = { ...conditions[index], label: e.target.value };
                    updateConfig('conditions', conditions);
                  }}
                  placeholder="Nome da condição"
                  className="h-8 text-sm"
                />
                <Select
                  value={cond.operator || 'contains'}
                  onValueChange={(v) => {
                    const conditions = [...(node.data.config?.conditions || [])];
                    conditions[index] = { ...conditions[index], operator: v };
                    updateConfig('conditions', conditions);
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="equals">É igual a</SelectItem>
                    <SelectItem value="starts_with">Começa com</SelectItem>
                    <SelectItem value="is_number">É um número</SelectItem>
                  </SelectContent>
                </Select>
                {!['is_number', 'is_email'].includes(cond.operator || '') && (
                  <Input
                    value={cond.value || ''}
                    onChange={(e) => {
                      const conditions = [...(node.data.config?.conditions || [])];
                      conditions[index] = { ...conditions[index], value: e.target.value };
                      updateConfig('conditions', conditions);
                    }}
                    placeholder="Valor"
                    className="h-8 text-sm"
                  />
                )}
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const conditions = [...(node.data.config?.conditions || [])];
                conditions.push({
                  id: `cond_${Date.now()}`,
                  label: `Condição ${conditions.length + 1}`,
                  operator: 'contains',
                  value: ''
                });
                updateConfig('conditions', conditions);
              }}
            >
              + Adicionar Condição
            </Button>

            <div className="mt-2 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Saídas:</strong><br />
                {(node.data.config?.conditions || []).map((c: any, i: number) => (
                  <span key={c.id}>• <span className="font-medium">{c.label || `Condição ${i + 1}`}</span><br /></span>
                ))}
                • <span className="text-gray-500">Senão (nenhuma condição)</span>
              </p>
            </div>
          </div>
        );

      case 'weekday':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <p className="text-xs text-muted-foreground">
                Selecione os dias em que o fluxo seguirá pela saída "Sim"
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, i) => (
                  <label key={day} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(node.data.config?.days || []).includes(i)}
                      onChange={(e) => {
                        const days = [...(node.data.config?.days || [])];
                        if (e.target.checked) {
                          days.push(i);
                        } else {
                          const idx = days.indexOf(i);
                          if (idx >= 0) days.splice(idx, 1);
                        }
                        updateConfig('days', days);
                      }}
                      className="rounded"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'time':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Intervalo de Horário</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={node.data.config?.startHour || 9}
                  onChange={(e) => updateConfig('startHour', parseInt(e.target.value))}
                  min={0} max={23} className="w-20"
                />
                <span className="text-muted-foreground">h até</span>
                <Input
                  type="number"
                  value={node.data.config?.endHour || 18}
                  onChange={(e) => updateConfig('endHour', parseInt(e.target.value))}
                  min={0} max={23} className="w-20"
                />
                <span className="text-muted-foreground">h</span>
              </div>
              <p className="text-xs text-muted-foreground">
                "Sim" se dentro do horário, "Não" se fora
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderMessageFields = () => {
    return (
      <>
        <div className="space-y-2">
          <Label>Conteúdo da Mensagem</Label>
          <Textarea
            value={node.data.config?.content || ''}
            onChange={(e) => updateConfig('content', e.target.value)}
            placeholder="Digite a mensagem que será enviada..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Use {"{{nome}}"}, {"{{telefone}}"}, {"{{email}}"} para variáveis dinâmicas
          </p>
        </div>
        
        {node.subType === 'buttons' && (
          <div className="space-y-2">
            <Label>Opções de Escolha</Label>
            <div className="flex flex-wrap gap-2">
              {(node.data.config?.buttons || []).map((btn: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                >
                  {btn}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(node.data.config?.buttons || [])];
                      updated.splice(idx, 1);
                      updateConfig('buttons', updated);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nome da opção"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      updateConfig('buttons', [...(node.data.config?.buttons || []), val]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>('[placeholder="Nome da opção"]');
                  const val = input?.value.trim();
                  if (val && input) {
                    updateConfig('buttons', [...(node.data.config?.buttons || []), val]);
                    input.value = '';
                  }
                }}
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cada opção criará uma saída separada no bloco para conectar a caminhos diferentes. O usuário pode digitar o <strong>número</strong> (1, 2, 3...) ou o <strong>texto exato</strong> da opção. Respostas inválidas seguem pela saída "Inválida".
            </p>
          </div>
        )}
        
        {node.subType === 'list' && (
          <div className="space-y-2">
            <Label>Título do Menu</Label>
            <Input
              value={node.data.config?.title || ''}
              onChange={(e) => updateConfig('title', e.target.value)}
              placeholder="Escolha uma opção"
            />
            <Label>Itens da Lista (um por linha)</Label>
            <Textarea
              value={(node.data.config?.items || []).join('\n')}
              onChange={(e) => updateConfig('items', e.target.value.split('\n').filter(Boolean))}
              placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
              rows={4}
            />
          </div>
        )}
        
        {node.subType === 'image' && (
          <div className="space-y-2">
            <Label>URL da Imagem</Label>
            <Input
              value={node.data.config?.url || ''}
              onChange={(e) => updateConfig('url', e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
            <Label>Legenda (opcional)</Label>
            <Input
              value={node.data.config?.caption || ''}
              onChange={(e) => updateConfig('caption', e.target.value)}
              placeholder="Descrição da imagem"
            />
          </div>
        )}

        {node.subType === 'file' && (
          <div className="space-y-2">
            <Label>URL do Arquivo</Label>
            <Input
              value={node.data.config?.url || ''}
              onChange={(e) => updateConfig('url', e.target.value)}
              placeholder="https://exemplo.com/documento.pdf"
            />
            <Label>Nome do Arquivo</Label>
            <Input
              value={node.data.config?.filename || ''}
              onChange={(e) => updateConfig('filename', e.target.value)}
              placeholder="documento.pdf"
            />
          </div>
        )}
      </>
    );
  };

  const renderActionFields = () => {
    switch (node.subType) {
      case 'assign_tag':
        return (
          <div className="space-y-2">
            <Label>Tag a Atribuir</Label>
            <Input
              value={node.data.config?.tag || ''}
              onChange={(e) => updateConfig('tag', e.target.value)}
              placeholder="lead_quente"
            />
            <p className="text-xs text-muted-foreground">
              Esta tag será adicionada ao contato
            </p>
          </div>
        );

      case 'transfer_human':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Departamento/Atendente</Label>
              <Input
                value={node.data.config?.departmentName || ''}
                onChange={(e) => updateConfig('departmentName', e.target.value)}
                placeholder="Suporte, Vendas..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem ao Transferir (opcional)</Label>
              <Textarea
                value={node.data.config?.transferMessage || ''}
                onChange={(e) => updateConfig('transferMessage', e.target.value)}
                placeholder="Aguarde, você será atendido por um humano..."
                rows={2}
              />
            </div>
          </div>
        );

      case 'save_crm':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Lead (variável)</Label>
              <Input
                value={node.data.config?.nameField || '{{nome}}'}
                onChange={(e) => updateConfig('nameField', e.target.value)}
                placeholder="{{nome}}"
              />
            </div>
            <div className="space-y-2">
              <Label>Email (variável)</Label>
              <Input
                value={node.data.config?.emailField || '{{email}}'}
                onChange={(e) => updateConfig('emailField', e.target.value)}
                placeholder="{{email}}"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags Iniciais</Label>
              <Input
                value={node.data.config?.initialTags || ''}
                onChange={(e) => updateConfig('initialTags', e.target.value)}
                placeholder="lead, chatbot..."
              />
            </div>
          </div>
        );

      case 'send_email':
        return (
          <>
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Input
                value={node.data.config?.to || ''}
                onChange={(e) => updateConfig('to', e.target.value)}
                placeholder="email@exemplo.com ou {{email}}"
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
        );

      case 'call_api':
        return (
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
            <div className="space-y-2">
              <Label>Headers (JSON)</Label>
              <Textarea
                value={node.data.config?.headers || '{}'}
                onChange={(e) => updateConfig('headers', e.target.value)}
                placeholder='{"Authorization": "Bearer token"}'
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Body (JSON)</Label>
              <Textarea
                value={node.data.config?.bodyJson || '{}'}
                onChange={(e) => updateConfig('bodyJson', e.target.value)}
                placeholder='{"campo": "{{valor}}"}'
                rows={3}
              />
            </div>
          </>
        );

      case 'set_variable':
        return (
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
                placeholder="valor ou {{outra_variavel}}"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Variáveis podem ser usadas em outras mensagens e condições
            </p>
          </>
        );

      case 'transfer_ai_agent':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Selecionar Agente de IA
              </Label>
              {loadingAgents ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando agentes...</span>
                </div>
              ) : aiAgents.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700">Nenhum agente de IA cadastrado. Crie um em Bot IA.</span>
                </div>
              ) : (
                <Select
                  value={node.data.config?.agentId || ''}
                  onValueChange={(v) => {
                    const agent = aiAgents.find(a => a.id === v);
                    updateMultipleConfig({
                      agentId: v,
                      agentName: agent?.name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          <span className="font-medium">{agent.name}</span>
                          {!agent.is_active && (
                            <span className="text-xs text-muted-foreground">(inativo)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Mensagem ao Transferir (opcional)</Label>
              <Textarea
                value={node.data.config?.transferMessage || ''}
                onChange={(e) => updateConfig('transferMessage', e.target.value)}
                placeholder="Vou transferir você para nosso assistente de IA..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Comportamento ao entrar na conversa</Label>
              <Select
                value={node.data.config?.aiEntryBehavior || 'send_welcome'}
                onValueChange={(v) => updateConfig('aiEntryBehavior', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_welcome">
                    <div className="flex flex-col">
                      <span className="font-medium">Enviar mensagem imediata</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="wait_client">
                    <div className="flex flex-col">
                      <span className="font-medium">Aguardar o cliente falar</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {node.data.config?.aiEntryBehavior === 'wait_client'
                  ? 'O agente de IA aguardará o cliente enviar uma mensagem antes de responder.'
                  : 'O agente de IA enviará uma saudação assim que assumir a conversa.'}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                O chatbot será encerrado e o agente de IA assumirá a conversa automaticamente.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderDelayFields = () => {
    switch (node.subType) {
      case 'wait_seconds':
        return (
          <div className="space-y-2">
            <Label>Segundos para aguardar</Label>
            <Input
              type="number"
              value={node.data.config?.seconds || 5}
              onChange={(e) => updateConfig('seconds', parseInt(e.target.value))}
              min={1}
              max={300}
            />
            <p className="text-xs text-muted-foreground">
              O fluxo pausará por este tempo antes de continuar
            </p>
          </div>
        );

      case 'wait_response':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tempo máximo de espera (segundos)</Label>
              <Input
                type="number"
                value={node.data.config?.timeout || 60}
                onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                min={10}
                max={3600}
              />
            </div>
            <div className="space-y-2">
              <Label>Salvar resposta em variável</Label>
              <Input
                value={node.data.config?.saveAs || ''}
                onChange={(e) => updateConfig('saveAs', e.target.value)}
                placeholder="resposta_usuario"
              />
              <p className="text-xs text-muted-foreground">
                A resposta do usuário será salva nesta variável
              </p>
            </div>
          </div>
        );

      case 'wait_business_hours':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Horário de Início</Label>
              <Input
                type="number"
                value={node.data.config?.startHour || 9}
                onChange={(e) => updateConfig('startHour', parseInt(e.target.value))}
                min={0}
                max={23}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário de Fim</Label>
              <Input
                type="number"
                value={node.data.config?.endHour || 18}
                onChange={(e) => updateConfig('endHour', parseInt(e.target.value))}
                min={0}
                max={23}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Se fora do horário, o fluxo aguardará o próximo período
            </p>
          </div>
        );

      case 'wait_interval':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor do intervalo</Label>
              <Input
                type="number"
                value={node.data.config?.intervalValue || 1}
                onChange={(e) => updateConfig('intervalValue', parseInt(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={node.data.config?.intervalUnit || 'minutes'}
                onChange={(e) => updateConfig('intervalUnit', e.target.value)}
              >
                <option value="seconds">Segundos</option>
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
                <option value="days">Dias</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              O fluxo pausará pelo intervalo configurado antes de continuar
            </p>
          </div>
        );

      case 'wait_until':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={node.data.config?.waitDate || ''}
                onChange={(e) => updateConfig('waitDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={node.data.config?.waitTime || '09:00'}
                onChange={(e) => updateConfig('waitTime', e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O fluxo pausará até a data e hora especificadas
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const renderFields = () => {
    switch (node.type) {
      case 'trigger':
        return renderTriggerFields();
      case 'message':
        return renderMessageFields();
      case 'condition':
        return renderConditionFields();
      case 'action':
        return renderActionFields();
      case 'delay':
        return renderDelayFields();
      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-background border-l flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Configurações</h3>
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
