import React, { useState } from 'react';
import { Plus, MoreHorizontal, X, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrelloCard } from './TrelloCard';
import { WorkflowColumn, WorkflowCard } from './types';

interface TrelloColumnProps {
  column: WorkflowColumn;
  cards: WorkflowCard[];
  onAddCard: () => void;
  onEditCard: (card: WorkflowCard) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteColumn: () => void;
  onEditColumn: () => void;
  employees?: any[];
}

export const TrelloColumnComponent: React.FC<TrelloColumnProps> = ({ column, cards, onAddCard, onEditCard, onDeleteCard, onDeleteColumn, onEditColumn, employees = [] }) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column }
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 flex flex-col bg-muted/50 rounded-2xl max-h-[calc(100vh-180px)] border transition-all ${isOver ? 'border-primary/30 bg-primary/5 scale-[1.01]' : 'border-border/40'}`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
          <h3 className="font-semibold text-sm text-foreground truncate">{column.name}</h3>
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full font-medium">{cards.length}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={onAddCard} className="rounded-lg"><Plus className="h-4 w-4 mr-2" />Adicionar card</DropdownMenuItem>
            <DropdownMenuItem onClick={onEditColumn} className="rounded-lg"><Edit2 className="h-4 w-4 mr-2" />Editar lista</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteColumn} className="text-destructive rounded-lg"><Trash2 className="h-4 w-4 mr-2" />Excluir lista</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 pb-3">
          <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map(card => (
              <TrelloCard key={card.id} card={card} onEdit={() => onEditCard(card)} onDelete={() => onDeleteCard(card.id)} employees={employees} />
            ))}
          </SortableContext>
          {cards.length === 0 && !isAddingCard && (
            <div className={`text-center py-6 text-xs transition-all ${isOver ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${isOver ? 'border-primary bg-primary/10 scale-105' : 'border-muted-foreground/20'}`}>
                {isOver ? '📥 Solte o card aqui!' : 'Arraste cards aqui'}
              </div>
            </div>
          )}
          {isAddingCard && (
            <div className="bg-card rounded-xl shadow-sm border p-3 space-y-2">
              <Textarea value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} placeholder="Digite o título do card..." className="min-h-[60px] text-sm resize-none rounded-lg border-muted" autoFocus />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { onAddCard(); setIsAddingCard(false); }} className="rounded-lg">Adicionar</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingCard(false)} className="rounded-lg"><X className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {!isAddingCard && (
        <div className="p-3 pt-0">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-background/80 h-9 rounded-xl" onClick={() => setIsAddingCard(true)}>
            <Plus className="h-4 w-4 mr-2" />Adicionar card
          </Button>
        </div>
      )}
    </div>
  );
};
