import React, { useState } from 'react';
import { DndContext, DragEndEvent, closestCorners, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock, Tag, UserPlus, Settings, MoreHorizontal, GripVertical, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import KanbanChatSidebar from './KanbanChatSidebar';

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
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const conversationLabels = labels.filter(l => 
    conversation.labels?.includes(l.id)
  );

  const hasUnread = (conversation.unread_count || 0) > 0;

  const handleInteractiveClick = (e: React.MouseEvent | React.PointerEvent, callback: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    callback();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group bg-card rounded-2xl border transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20",
        hasUnread && "ring-2 ring-primary/20 border-primary/30",
        isDragging && "opacity-40 rotate-2 scale-105 shadow-2xl"
      )}
    >
      {/* Color accent top bar */}
      {hasUnread && (
        <div className="h-0.5 rounded-t-2xl bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
      )}

      {/* Drag handle + content */}
      <div 
        {...listeners}
        className="p-3 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start gap-3">
          {/* Drag indicator */}
          <div className="opacity-0 group-hover:opacity-40 transition-opacity mt-1 flex-shrink-0">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Avatar with online indicator */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
              <AvatarImage src={conversation.profile_picture} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                {(conversation.contact_name || conversation.contact_phone).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {hasUnread && (
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-card flex items-center justify-center">
                <span className="text-[7px] text-primary-foreground font-bold">{conversation.unread_count}</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Name + time */}
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className={cn(
                "text-sm truncate",
                hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"
              )}>
                {conversation.contact_name || conversation.contact_phone}
              </span>
              <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 tabular-nums">
                {formatTime(conversation.last_message_at)}
              </span>
            </div>
            
            {/* Last message */}
            <p className={cn(
              "text-xs line-clamp-2 leading-relaxed",
              hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"
            )}>
              {conversation.last_message || 'Nova conversa'}
            </p>
          </div>
        </div>
      </div>

      {/* Labels */}
      {conversationLabels.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {conversationLabels.map(label => (
            <span
              key={label.id}
              className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${label.color}18`,
                color: label.color,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: label.color }} />
              {label.name}
            </span>
          ))}
        </div>
      )}
      
      {/* Action bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <div className="flex items-center gap-0.5">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => handleInteractiveClick(e, () => onSelect(conversation))}
            className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-primary"
            title="Abrir chat"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => handleInteractiveClick(e, () => onManageLabels(conversation))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Etiquetas"
          >
            <Tag className="h-3.5 w-3.5" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => handleInteractiveClick(e, () => onSaveLead(conversation))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Salvar como lead"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => handleInteractiveClick(e, () => onSelect(conversation))}
          className="text-[10px] text-primary font-semibold px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
        >
          Abrir →
        </button>
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
        "space-y-3 min-h-[200px] transition-all duration-300 rounded-xl p-2",
        isOver && "bg-primary/5 ring-2 ring-primary/20 ring-offset-2 ring-offset-background scale-[1.01]"
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
  companyId: string | null;
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
  companyId,
  onSelectConversation,
  onSaveLead,
  onManageLabels,
  onUpdateStage,
  onConfigureColumns,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [selectedChatConversation, setSelectedChatConversation] = useState<WhatsAppConversationData | null>(null);

  const handleCardClick = (conv: WhatsAppConversationData) => {
    setSelectedChatConversation(conv);
    setChatSidebarOpen(true);
  };

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
    
    if (columns.some(col => col.id === newStage)) {
      const currentConversation = conversations.find(c => c.id === conversationId);
      if (currentConversation?.pipeline_stage !== newStage) {
        onUpdateStage(conversationId, newStage);
      }
    }
  };

  const activeConversation = conversations.find(c => c.id === activeId);
  const totalConversations = conversations.length;

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Sleek toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground/80">Pipeline</h2>
            <Badge variant="secondary" className="text-xs font-medium rounded-full">
              {totalConversations} conversas
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onConfigureColumns}
            className="gap-2 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Colunas</span>
          </Button>
        </div>

        {/* Kanban board */}
        <div className="flex gap-5 h-full overflow-x-auto p-5 bg-gradient-to-br from-muted/20 via-background to-muted/30">
          {columns.map(column => {
            const columnConversations = getConversationsByStage(column.id);
            
            return (
              <div 
                key={column.id}
                className="flex-shrink-0 w-[320px] flex flex-col rounded-2xl bg-muted/40 border border-border/50"
              >
                {/* Column Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: column.color, boxShadow: `0 0 0 3px ${column.color}25` }}
                    />
                    <h3 className="font-semibold text-sm text-foreground tracking-tight">
                      {column.title}
                    </h3>
                    <span 
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${column.color}15`,
                        color: column.color 
                      }}
                    >
                      {columnConversations.length}
                    </span>
                  </div>
                  <button className="p-1 rounded-lg hover:bg-background/80 transition-colors text-muted-foreground/50 hover:text-muted-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Column Content */}
                <ScrollArea className="flex-1 px-2 pb-3">
                  <SortableContext
                    items={columnConversations.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn column={column}>
                      {columnConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border/40 rounded-2xl text-muted-foreground/50 bg-background/30">
                          <Inbox className="h-8 w-8 mb-3 opacity-40" />
                          <span className="text-xs font-medium">Nenhuma conversa</span>
                          <span className="text-[10px] mt-0.5">Arraste para cá</span>
                        </div>
                      ) : (
                        columnConversations.map(conversation => (
                          <KanbanCard
                            key={conversation.id}
                            conversation={conversation}
                            labels={labels}
                            onSelect={handleCardClick}
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

      {/* Drag overlay */}
      <DragOverlay>
        {activeConversation ? (
          <div className="bg-card rounded-2xl border-2 border-primary/30 shadow-2xl p-3.5 w-[300px] rotate-2 scale-105">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={activeConversation.profile_picture} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                  {(activeConversation.contact_name || activeConversation.contact_phone).substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
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

      {/* Chat Sidebar */}
      <KanbanChatSidebar
        isOpen={chatSidebarOpen}
        onClose={() => setChatSidebarOpen(false)}
        conversation={selectedChatConversation}
        companyId={companyId}
      />
    </DndContext>
  );
};

export default WhatsAppKanbanView;
