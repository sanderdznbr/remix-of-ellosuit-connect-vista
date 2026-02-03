import React from 'react';
import { DndContext, DragEndEvent, closestCorners, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock, Tag, UserPlus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConversationLabel {
  id: string;
  name: string;
  color: string;
}

interface WhatsAppConversationData {
  id: string;
  contact_phone: string;
  contact_name?: string;
  last_message_at: string;
  last_message?: string;
  status: string;
  unread_count?: number;
  profile_picture?: string;
  pipeline_stage?: string;
  labels?: string[];
  is_demo?: boolean;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'novo', title: 'Novos', color: '#3B82F6' },
  { id: 'em_atendimento', title: 'Em Atendimento', color: '#F59E0B' },
  { id: 'aguardando', title: 'Aguardando', color: '#8B5CF6' },
  { id: 'qualificado', title: 'Qualificados', color: '#10B981' },
  { id: 'finalizado', title: 'Finalizados', color: '#6B7280' },
];

interface KanbanCardProps {
  conversation: WhatsAppConversationData;
  labels: ConversationLabel[];
  onSelect: (conv: WhatsAppConversationData) => void;
  onSaveLead: (conv: WhatsAppConversationData) => void;
  onManageLabels: (conv: WhatsAppConversationData) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ 
  conversation, 
  labels, 
  onSelect,
  onSaveLead,
  onManageLabels
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: conversation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const conversationLabels = labels.filter(l => 
    conversation.labels?.includes(l.id)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-card rounded-xl border shadow-sm p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-primary/30",
        isDragging && "opacity-50 rotate-2 scale-105"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(conversation);
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={conversation.profile_picture} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {(conversation.contact_name || conversation.contact_phone).substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium text-sm truncate">
              {conversation.contact_name || conversation.contact_phone}
            </span>
            {(conversation.unread_count || 0) > 0 && (
              <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {conversation.last_message || 'Nova conversa'}
          </p>
          
          {/* Labels */}
          {conversationLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {conversationLabels.map(label => (
                <Badge 
                  key={label.id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{ 
                    borderColor: label.color,
                    color: label.color,
                    backgroundColor: `${label.color}10`
                  }}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-[10px]">{formatTime(conversation.last_message_at)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onManageLabels(conversation);
                }}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="Gerenciar etiquetas"
              >
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveLead(conversation);
                }}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="Salvar como lead"
              >
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Droppable Column Component
const DroppableColumn: React.FC<{
  column: KanbanColumn;
  children: React.ReactNode;
}> = ({ column, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "space-y-2 min-h-[200px] transition-colors rounded-lg p-1",
        isOver && "bg-primary/5 ring-2 ring-primary/20"
      )}
    >
      {children}
    </div>
  );
};

interface WhatsAppKanbanViewProps {
  conversations: WhatsAppConversationData[];
  labels: ConversationLabel[];
  columns: KanbanColumn[];
  onSelectConversation: (conv: WhatsAppConversationData) => void;
  onSaveLead: (conv: WhatsAppConversationData) => void;
  onManageLabels: (conv: WhatsAppConversationData) => void;
  onUpdateStage: (conversationId: string, newStage: string) => void;
  onConfigureColumns: () => void;
}

const WhatsAppKanbanView: React.FC<WhatsAppKanbanViewProps> = ({
  conversations,
  labels,
  columns,
  onSelectConversation,
  onSaveLead,
  onManageLabels,
  onUpdateStage,
  onConfigureColumns,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const getConversationsByStage = (stage: string) => {
    return conversations.filter(c => (c.pipeline_stage || 'novo') === stage);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;
    
    const conversationId = active.id as string;
    const newStage = over.id as string;
    
    // Check if dropped on a column
    if (columns.some(col => col.id === newStage)) {
      const currentConversation = conversations.find(c => c.id === conversationId);
      if (currentConversation?.pipeline_stage !== newStage) {
        onUpdateStage(conversationId, newStage);
      }
    }
  };

  const activeConversation = conversations.find(c => c.id === activeId);

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Config button */}
        <div className="flex justify-end p-2 border-b bg-background">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onConfigureColumns}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurar Colunas
          </Button>
        </div>

        {/* Kanban board */}
        <div className="flex gap-4 h-full overflow-x-auto p-4 bg-muted/30">
          {columns.map(column => {
            const columnConversations = getConversationsByStage(column.id);
            
            return (
              <div 
                key={column.id}
                className="flex-shrink-0 w-80 flex flex-col bg-background rounded-xl border shadow-sm"
              >
                {/* Column Header - Fixed styling */}
                <div 
                  className="p-3 rounded-t-xl"
                  style={{ backgroundColor: column.color }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-white drop-shadow-sm">
                        {column.title}
                      </h3>
                    </div>
                    <Badge 
                      className="text-xs font-medium"
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: column.color 
                      }}
                    >
                      {columnConversations.length}
                    </Badge>
                  </div>
                </div>
                
                {/* Column Content */}
                <ScrollArea className="flex-1 p-2">
                  <SortableContext
                    items={columnConversations.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn column={column}>
                      {columnConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg text-muted-foreground">
                          <MessageSquare className="h-6 w-6 mb-2 opacity-50" />
                          <span className="text-xs">Arraste conversas aqui</span>
                        </div>
                      ) : (
                        columnConversations.map(conversation => (
                          <KanbanCard
                            key={conversation.id}
                            conversation={conversation}
                            labels={labels}
                            onSelect={onSelectConversation}
                            onSaveLead={onSaveLead}
                            onManageLabels={onManageLabels}
                          />
                        ))
                      )}
                    </DroppableColumn>
                  </SortableContext>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeConversation ? (
          <div className="bg-card rounded-xl border shadow-lg p-3 w-72 rotate-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {(activeConversation.contact_name || activeConversation.contact_phone).substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {activeConversation.contact_name || activeConversation.contact_phone}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activeConversation.last_message}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default WhatsAppKanbanView;
