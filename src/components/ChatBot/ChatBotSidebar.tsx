import React, { useState } from 'react';
import { 
  MessageSquare, Zap, GitBranch, Clock, Mail, Hash, 
  UserPlus, Database, Send, Globe, 
  Tag, Phone, Image, FileText, List, ToggleLeft, Search, X
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { BlockCategory, BlockDefinition } from './types';

const OMNI_COLOR = '#FF4500';

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: 'start',
    label: 'INÍCIO',
    color: OMNI_COLOR,
    blocks: [
      { 
        type: 'trigger', 
        subType: 'whatsapp_channel', 
        label: 'Iniciar por um canal', 
        description: 'Inicia quando o contato entra através de um canal.', 
        icon: 'Phone', 
        defaultConfig: { sessionId: '', triggerWhen: 'any_message' } 
      },
      { 
        type: 'trigger', 
        subType: 'manual', 
        label: 'Iniciar manualmente', 
        description: 'Inicia quando o atendente ativa o fluxo manualmente.', 
        icon: 'Zap', 
        defaultConfig: {} 
      },
    ]
  },
  {
    id: 'conditions',
    label: 'CONDIÇÃO',
    color: OMNI_COLOR,
    blocks: [
      { 
        type: 'condition', 
        subType: 'weekday', 
        label: 'Dias da semana', 
        description: 'Defina ações a partir de cada dia da semana.', 
        icon: 'Clock', 
        defaultConfig: { days: [] },
        locked: false
      },
      { 
        type: 'condition', 
        subType: 'time', 
        label: 'Horários', 
        description: 'Defina ações a partir de intervalos de horários.', 
        icon: 'Clock', 
        defaultConfig: { startHour: 9, endHour: 18 },
        locked: false
      },
      { 
        type: 'condition', 
        subType: 'if_else', 
        label: 'Definir condição', 
        description: 'Defina regras específicas para o seu fluxo.', 
        icon: 'GitBranch', 
        defaultConfig: { conditionType: 'user_response', operator: 'contains', value: '' },
        locked: true
      },
      { 
        type: 'condition', 
        subType: 'multi', 
        label: 'Multi-condicional', 
        description: 'Defina múltiplas regras e múltiplos fluxo de saída.', 
        icon: 'GitBranch', 
        defaultConfig: { conditions: [] },
        locked: true
      },
    ]
  },
  {
    id: 'delays',
    label: 'DELAYS',
    color: OMNI_COLOR,
    blocks: [
      { 
        type: 'delay', 
        subType: 'wait_interval', 
        label: 'Aguardar intervalo', 
        description: 'Pausa o fluxo por um tempo específico.', 
        icon: 'Clock', 
        defaultConfig: { seconds: 5 } 
      },
      { 
        type: 'delay', 
        subType: 'wait_until', 
        label: 'Aguardar até', 
        description: 'Pausa até uma data/hora específica.', 
        icon: 'Clock', 
        defaultConfig: { datetime: '' } 
      },
    ]
  },
  {
    id: 'messages',
    label: 'MENSAGENS',
    color: OMNI_COLOR,
    blocks: [
      { 
        type: 'message', 
        subType: 'text', 
        label: 'Enviar mensagem', 
        description: 'Envia uma mensagem de texto.', 
        icon: 'MessageSquare', 
        defaultConfig: { content: '' } 
      },
      { 
        type: 'message', 
        subType: 'buttons', 
        label: 'Pedir para escolher', 
        description: 'Envia opções para o usuário escolher.', 
        icon: 'List', 
        defaultConfig: { content: '', buttons: [] } 
      },
      { 
        type: 'message', 
        subType: 'image', 
        label: 'Enviar mídia', 
        description: 'Envia imagem, vídeo ou arquivo.', 
        icon: 'Image', 
        defaultConfig: { url: '', caption: '' } 
      },
    ]
  },
  {
    id: 'actions',
    label: 'AÇÕES',
    color: OMNI_COLOR,
    blocks: [
      { 
        type: 'action', 
        subType: 'assign_tag', 
        label: 'Atribuir Tag', 
        description: 'Adiciona uma etiqueta ao contato.', 
        icon: 'Tag', 
        defaultConfig: { tag: '' } 
      },
      { 
        type: 'action', 
        subType: 'transfer_human', 
        label: 'Transferir para Humano', 
        description: 'Encerra o bot e transfere para atendimento.', 
        icon: 'UserPlus', 
        defaultConfig: { departmentName: '' } 
      },
      { 
        type: 'action', 
        subType: 'save_crm', 
        label: 'Salvar no CRM', 
        description: 'Salva o contato como lead.', 
        icon: 'Database', 
        defaultConfig: { nameField: '{{nome}}' } 
      },
      { 
        type: 'action', 
        subType: 'call_api', 
        label: 'Chamar API', 
        description: 'Faz requisição para sistema externo.', 
        icon: 'Globe', 
        defaultConfig: { url: '', method: 'POST' } 
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  const filteredCategories = BLOCK_CATEGORIES.map(category => ({
    ...category,
    blocks: category.blocks.filter(block => 
      block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.blocks.length > 0);

  if (!isOpen) {
    return (
      <div 
        className="w-12 bg-white border-r flex flex-col items-center py-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsOpen(true)}
      >
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${OMNI_COLOR}15` }}
        >
          <Zap className="h-4 w-4" style={{ color: OMNI_COLOR }} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">👋</span>
            <span className="font-semibold text-gray-900">Clique ou arrastes</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Pesquisar passo"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200 rounded-xl"
          />
        </div>
      </div>
      
      {/* Blocks */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {filteredCategories.map((category) => (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-3">
                {category.id === 'start' && <span className="text-gray-600">▶</span>}
                {category.id === 'conditions' && <span className="text-gray-600">⚙️</span>}
                {category.id === 'delays' && <Clock className="h-4 w-4 text-gray-500" />}
                {category.id === 'messages' && <MessageSquare className="h-4 w-4 text-gray-500" />}
                {category.id === 'actions' && <Zap className="h-4 w-4 text-gray-500" />}
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {category.label}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {category.blocks.map((block) => {
                  const Icon = iconMap[block.icon] || MessageSquare;
                  const isLocked = (block as any).locked;
                  
                  return (
                    <div
                      key={`${block.type}-${block.subType}`}
                      draggable={!isLocked}
                      onDragStart={(e) => {
                        if (isLocked) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData('block', JSON.stringify(block));
                        e.dataTransfer.effectAllowed = 'copy';
                        onDragStart(block);
                      }}
                      className={`
                        relative p-3 rounded-xl border transition-all
                        ${isLocked 
                          ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
                          : 'bg-white border-gray-200 cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-sm'
                        }
                      `}
                    >
                      {isLocked && (
                        <div className="absolute top-2 right-2 text-gray-400">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <div 
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: isLocked ? '#f3f4f6' : `${OMNI_COLOR}15`,
                            color: isLocked ? '#9ca3af' : OMNI_COLOR 
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-gray-900 block leading-tight">
                            {block.label}
                          </span>
                          <span className="text-[10px] text-gray-500 block leading-snug mt-0.5 line-clamp-2">
                            {block.description}
                          </span>
                        </div>
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
