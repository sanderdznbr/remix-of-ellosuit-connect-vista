import React from 'react';
import { 
  MessageSquare, Zap, GitBranch, Clock, Mail, Hash, 
  UserPlus, ArrowRightLeft, Database, Send, Globe, 
  Tag, Phone, Image, FileText, List, ToggleLeft
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlockCategory, BlockDefinition, NodeType } from './types';

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: 'triggers',
    label: 'Gatilhos',
    color: '#E34800',
    blocks: [
      { type: 'trigger', subType: 'whatsapp_channel', label: 'Canal WhatsApp', description: 'Número conectado', icon: 'Phone', defaultConfig: { sessionId: '' } },
      { type: 'trigger', subType: 'email_channel', label: 'Canal Email', description: 'Receber emails', icon: 'Mail', defaultConfig: {} },
      { type: 'trigger', subType: 'keyword', label: 'Palavra-chave', description: 'Detectar termos', icon: 'Hash', defaultConfig: { keywords: [] } },
      { type: 'trigger', subType: 'conversation_start', label: 'Início de Conversa', description: 'Nova conversa', icon: 'MessageSquare', defaultConfig: {} },
      { type: 'trigger', subType: 'inactivity', label: 'Inatividade', description: 'Sem resposta', icon: 'Clock', defaultConfig: { minutes: 5 } },
      { type: 'trigger', subType: 'webhook', label: 'Webhook', description: 'API externa', icon: 'Globe', defaultConfig: { url: '' } },
    ]
  },
  {
    id: 'messages',
    label: 'Mensagens',
    color: '#007DE3',
    blocks: [
      { type: 'message', subType: 'text', label: 'Texto', description: 'Mensagem simples', icon: 'MessageSquare', defaultConfig: { content: '' } },
      { type: 'message', subType: 'buttons', label: 'Com Botões', description: 'Opções clicáveis', icon: 'ToggleLeft', defaultConfig: { content: '', buttons: [] } },
      { type: 'message', subType: 'list', label: 'Lista', description: 'Menu de opções', icon: 'List', defaultConfig: { title: '', items: [] } },
      { type: 'message', subType: 'image', label: 'Imagem', description: 'Foto ou ilustração', icon: 'Image', defaultConfig: { url: '', caption: '' } },
      { type: 'message', subType: 'file', label: 'Arquivo', description: 'PDF ou documento', icon: 'FileText', defaultConfig: { url: '', filename: '' } },
    ]
  },
  {
    id: 'conditions',
    label: 'Condições',
    color: '#8B5CF6',
    blocks: [
      { type: 'condition', subType: 'if_else', label: 'Se/Senão', description: 'Bifurcar fluxo', icon: 'GitBranch', defaultConfig: { condition: '' } },
      { type: 'condition', subType: 'check_variable', label: 'Verificar Variável', description: 'Checar valor', icon: 'Database', defaultConfig: { variable: '', operator: '==', value: '' } },
      { type: 'condition', subType: 'check_time', label: 'Verificar Horário', description: 'Horário comercial', icon: 'Clock', defaultConfig: { startHour: 9, endHour: 18 } },
      { type: 'condition', subType: 'check_tag', label: 'Verificar Tag', description: 'Tag do contato', icon: 'Tag', defaultConfig: { tag: '' } },
    ]
  },
  {
    id: 'actions',
    label: 'Ações',
    color: '#00E371',
    blocks: [
      { type: 'action', subType: 'assign_tag', label: 'Atribuir Tag', description: 'Marcar contato', icon: 'Tag', defaultConfig: { tag: '' } },
      { type: 'action', subType: 'transfer_human', label: 'Transferir Humano', description: 'Atendimento manual', icon: 'UserPlus', defaultConfig: { departmentId: '' } },
      { type: 'action', subType: 'save_crm', label: 'Salvar no CRM', description: 'Criar lead', icon: 'Database', defaultConfig: { fields: {} } },
      { type: 'action', subType: 'send_email', label: 'Enviar Email', description: 'Notificação', icon: 'Send', defaultConfig: { to: '', subject: '', body: '' } },
      { type: 'action', subType: 'call_api', label: 'Chamar API', description: 'Webhook externo', icon: 'Globe', defaultConfig: { url: '', method: 'POST', body: {} } },
      { type: 'action', subType: 'set_variable', label: 'Definir Variável', description: 'Guardar valor', icon: 'Database', defaultConfig: { name: '', value: '' } },
    ]
  },
  {
    id: 'delays',
    label: 'Delays',
    color: '#EC4899',
    blocks: [
      { type: 'delay', subType: 'wait_seconds', label: 'Aguardar', description: 'X segundos', icon: 'Clock', defaultConfig: { seconds: 5 } },
      { type: 'delay', subType: 'wait_response', label: 'Aguardar Resposta', description: 'Input do usuário', icon: 'MessageSquare', defaultConfig: { timeout: 60 } },
      { type: 'delay', subType: 'wait_business_hours', label: 'Horário Comercial', description: 'Próximo horário', icon: 'Clock', defaultConfig: {} },
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
    <div className="w-64 bg-white border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-900">Blocos</h2>
        <p className="text-xs text-gray-500 mt-1">Arraste para o canvas</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
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
              
              <div className="space-y-1">
                {category.blocks.map((block) => {
                  const Icon = iconMap[block.icon] || MessageSquare;
                  return (
                    <div
                      key={`${block.type}-${block.subType}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('block', JSON.stringify(block));
                        onDragStart(block);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all group"
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${category.color}15` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: category.color }} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-800 block truncate">
                          {block.label}
                        </span>
                        <span className="text-[10px] text-gray-400 block truncate">
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
    </div>
  );
};

export default ChatBotSidebar;
