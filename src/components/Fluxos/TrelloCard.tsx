import React from 'react';
import { MoreHorizontal, GripVertical, Clock, CheckSquare, Paperclip, MessageSquare, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WorkflowCard, priorityConfig, labelColors } from './types';

interface TrelloCardProps {
  card: WorkflowCard;
  onEdit: () => void;
  onDelete: () => void;
  employees?: any[];
}

export const TrelloCard: React.FC<TrelloCardProps> = ({ card, onEdit, onDelete, employees = [] }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  const priority = priorityConfig[card.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const isOverdue = card.due_date && new Date(card.due_date) < new Date();
  const assignedUser = employees.find(e => e.user_id === card.assigned_user_id);

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="bg-primary/5 rounded-xl border-2 border-dashed border-primary/20 h-24" />
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="group bg-card hover:bg-muted/30 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-border/60 hover:border-primary/30">
      {card.tags && card.tags.length > 0 && (
        <div className="flex gap-1 p-2 pb-0">
          {card.tags.slice(0, 4).map((_, index) => (
            <div key={index} className="h-2 w-10 rounded-full" style={{ backgroundColor: labelColors[index % labelColors.length].value }} />
          ))}
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start gap-2">
          <div {...attributes} {...listeners} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing mt-0.5 -ml-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0" onClick={onEdit}>
            <p className="font-medium text-foreground text-sm leading-snug mb-2">{card.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {card.due_date && (
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                  <Clock className="h-3 w-3" />
                  {new Date(card.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              )}
              <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded-lg ${priority.bgLight} ${priority.textColor} border-0`}>
                {priority.label}
              </Badge>
              {assignedUser && (
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {assignedUser.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              {card.attachments && card.attachments.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" /> {card.attachments.length}
                </span>
              )}
              {card.comments && card.comments.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" /> {card.comments.length}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={onEdit} className="rounded-lg"><Edit2 className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive rounded-lg"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
