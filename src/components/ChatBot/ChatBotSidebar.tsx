import React from 'react';
import { 
  MessageSquare, Zap, GitBranch, Clock, Mail, Hash, 
  UserPlus, Database, Send, Globe, 
  Tag, Phone, Image, FileText, List, ToggleLeft
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlockCategory, BlockDefinition } from './types';

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: 'triggers',
    label: 'Gatilhos',
    color: '#E34800',
    blocks: [
      { 
        type: 'trigger', 
        subType: 'whatsapp_channel', 
        label: 'Canal WhatsApp', 
        description: 'Inicia quando receber mensagem no WhatsApp conectado', 
        icon: 'Phone', 
        defaultConfig: { sessionId: '', triggerWhen: 'any_message' } 
      },
      { 
        type: 'trigger', 
        subType: 'email_channel', 
        label: 'Canal Email', 
        description: 'Inicia quando receber email na conta configurada', 
        icon: 'Mail', 
        defaultConfig: { email: '' } 
      },
      { 
        type: 'trigger', 
        subType: 'keyword', 
        label: 'Palavra-chave', 
        description: 'Inicia quando detectar palavras específicas', 
        icon: 'Hash', 
        defaultConfig: { keywords: [], matchMode: 'contains' } 
      },
      { 
        type: 'trigger', 
        subType: 'conversation_start', 
        label: 'Início de Conversa', 
        description: 'Inicia quando uma nova conversa começar', 
        icon: 'MessageSquare', 
        defaultConfig: { startType: 'first_contact', channel: 'all' } 
      },
      { 
        type: 'trigger', 
        subType: 'inactivity', 
        label: 'Inatividade', 
        description: 'Inicia após X minutos sem resposta do usuário', 
        icon: 'Clock', 
        defaultConfig: { minutes: 5, maxAttempts: 3 } 
      },
      { 
        type: 'trigger', 
        subType: 'webhook', 
        label: 'Webhook', 
        description: 'Inicia quando receber chamada de API externa', 
        icon: 'Globe', 
        defaultConfig: { url: '' } 
      },
    ]
  },
  {
    id: 'messages',
    label: 'Mensagens',
    color: '#007DE3',
    blocks: [
      { 
        type: 'message', 
        subType: 'text', 
        label: 'Texto', 
        description: 'Envia uma mensagem de texto simples', 
        icon: 'MessageSquare', 
        defaultConfig: { content: '' } 
      },
      { 
        type: 'message', 
        subType: 'buttons', 
        label: 'Com Botões', 
        description: 'Envia mensagem com até 3 botões clicáveis', 
        icon: 'ToggleLeft', 
        defaultConfig: { content: '', buttons: [] } 
      },
      { 
        type: 'message', 
        subType: 'list', 
        label: 'Lista', 
        description: 'Envia um menu de opções (lista interativa)', 
        icon: 'List', 
        defaultConfig: { title: '', items: [] } 
      },
      { 
        type: 'message', 
        subType: 'image', 
        label: 'Imagem', 
        description: 'Envia uma foto ou ilustração com legenda', 
        icon: 'Image', 
        defaultConfig: { url: '', caption: '' } 
      },
      { 
        type: 'message', 
        subType: 'file', 
        label: 'Arquivo', 
        description: 'Envia um PDF, documento ou arquivo', 
        icon: 'FileText', 
        defaultConfig: { url: '', filename: '' } 
      },
    ]
  },
  {
    id: 'conditions',
    label: 'Condições',
    color: '#8B5CF6',
    blocks: [
      { 
        type: 'condition', 
        subType: 'if_else', 
        label: 'Se/Senão', 
        description: 'Divide o fluxo em "Sim" e "Não" baseado em condição', 
        icon: 'GitBranch', 
        defaultConfig: { conditionType: 'user_response', operator: 'contains', value: '' } 
      },
      { 
        type: 'condition', 
        subType: 'check_variable', 
        label: 'Verificar Variável', 
        description: 'Verifica o valor de uma variável salva', 
        icon: 'Database', 
        defaultConfig: { variable: '', operator: '==', value: '' } 
      },
      { 
        type: 'condition', 
        subType: 'check_time', 
        label: 'Verificar Horário', 
        description: 'Verifica se está dentro do horário comercial', 
        icon: 'Clock', 
        defaultConfig: { startHour: 9, endHour: 18 } 
      },
      { 
        type: 'condition', 
        subType: 'check_tag', 
        label: 'Verificar Tag', 
        description: 'Verifica se o contato possui determinada tag', 
        icon: 'Tag', 
        defaultConfig: { tag: '' } 
      },
    ]
  },
  {
    id: 'actions',
    label: 'Ações',
    color: '#00E371',
    blocks: [
      { 
        type: 'action', 
        subType: 'assign_tag', 
        label: 'Atribuir Tag', 
        description: 'Adiciona uma tag/etiqueta ao contato', 
        icon: 'Tag', 
        defaultConfig: { tag: '' } 
      },
      { 
        type: 'action', 
        subType: 'transfer_human', 
        label: 'Transferir para Humano', 
        description: 'Encerra o bot e transfere para atendimento manual', 
        icon: 'UserPlus', 
        defaultConfig: { departmentName: '' } 
      },
      { 
        type: 'action', 
        subType: 'save_crm', 
        label: 'Salvar no CRM', 
        description: 'Salva o contato como lead no CRM', 
        icon: 'Database', 
        defaultConfig: { nameField: '{{nome}}', emailField: '{{email}}' } 
      },
      { 
        type: 'action', 
        subType: 'send_email', 
        label: 'Enviar Email', 
        description: 'Envia um email de notificação', 
        icon: 'Send', 
        defaultConfig: { to: '', subject: '', body: '' } 
      },
      { 
        type: 'action', 
        subType: 'call_api', 
        label: 'Chamar API', 
        description: 'Faz uma requisição HTTP para sistema externo', 
        icon: 'Globe', 
        defaultConfig: { url: '', method: 'POST' } 
      },
      { 
        type: 'action', 
        subType: 'set_variable', 
        label: 'Definir Variável', 
        description: 'Salva um valor em variável para uso posterior', 
        icon: 'Database', 
        defaultConfig: { name: '', value: '' } 
      },
    ]
  },
  {
    id: 'delays',
    label: 'Delays / Esperas',
    color: '#EC4899',
    blocks: [
      { 
        type: 'delay', 
        subType: 'wait_seconds', 
        label: 'Aguardar Tempo', 
        description: 'Pausa o fluxo por X segundos', 
        icon: 'Clock', 
        defaultConfig: { seconds: 5 } 
      },
      { 
        type: 'delay', 
        subType: 'wait_response', 
        label: 'Aguardar Resposta', 
        description: 'Pausa e espera o usuário responder', 
        icon: 'MessageSquare', 
        defaultConfig: { timeout: 60, saveAs: '' } 
      },
      { 
        type: 'delay', 
        subType: 'wait_business_hours', 
        label: 'Horário Comercial', 
        description: 'Pausa até o próximo horário comercial', 
        icon: 'Clock', 
        defaultConfig: { startHour: 9, endHour: 18 } 
      },
    ]
  }
];

const iconMap: Record<string, React.ComponentType<any>> = {
  Phone, Mail, Hash, MessageSquare, Clock, Globe, ToggleLeft, 
  List, Image, FileText, GitBranch, Database, Tag, UserPlus, Send, Zap
};

interface ChatBotSidebarProps {
  onDragStart: (block: BlockDefinition) => void;
}

const ChatBotSidebar: React.FC<ChatBotSidebarProps> = ({ onDragStart }) => {
  return (
    <div className="w-72 bg-background border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-foreground">Blocos</h2>
        <p className="text-xs text-muted-foreground mt-1">Arraste para o canvas para criar seu fluxo</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-5">
          {BLOCK_CATEGORIES.map((category) => (
            <div key={category.id}>
              <div 
                className="flex items-center gap-2 mb-2 px-2"
                style={{ color: category.color }}
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {category.label}
                </span>
              </div>
              
              <div className="space-y-1.5">
                {category.blocks.map((block) => {
                  const Icon = iconMap[block.icon] || MessageSquare;
                  return (
                    <div
                      key={`${block.type}-${block.subType}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('block', JSON.stringify(block));
                        e.dataTransfer.effectAllowed = 'copy';
                        onDragStart(block);
                      }}
                      className="flex items-start gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:border-border hover:bg-muted/50 transition-all group"
                    >
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${category.color}15` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: category.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground block">
                          {block.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground block leading-snug mt-0.5">
                          {block.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Help footer */}
      <div className="p-3 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          💡 Dica: Comece com um gatilho, adicione mensagens, e conecte os blocos arrastando os círculos
        </p>
      </div>
    </div>
  );
};

export default ChatBotSidebar;
