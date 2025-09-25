import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Edit3, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CardItem { id: string; title: string; description?: string }
interface Column { id: string; title: string; cards: CardItem[] }

const SortableCard: React.FC<{ card: CardItem; onEdit: () => void; onDelete: () => void }> = ({ card, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-white rounded-xl border p-3 shadow-sm flex items-start gap-3">
      <GripVertical className="h-4 w-4 text-gray-400 mt-1" />
      <div className="flex-1">
        <div className="font-medium text-gray-900">{card.title}</div>
        {card.description && <div className="text-sm text-gray-600 mt-1">{card.description}</div>}
      </div>
      <Button size="icon" variant="ghost" onClick={onEdit}><Edit3 className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-red-600" /></Button>
    </div>
  );
};

const SortableColumn: React.FC<{
  column: Column;
  onAddCard: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onEditColumn: (columnId: string, title: string) => void;
  onEditCard: (columnId: string, cardId: string, title: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
}> = ({ column, onAddCard, onDeleteColumn, onEditColumn, onEditCard, onDeleteCard }) => {
  const [newTitle, setNewTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <Card className="w-80 bg-gray-50 border-0 shadow-lg">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        {editingTitle ? (
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onBlur={() => { setEditingTitle(false); if (newTitle.trim()) onEditColumn(column.id, newTitle.trim()); }} autoFocus />
        ) : (
          <CardTitle className="text-base text-gray-900" onDoubleClick={() => { setNewTitle(column.title); setEditingTitle(true); }}>{column.title}</CardTitle>
        )}
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => { const title = prompt('Novo cartão'); if (title) onAddCard(column.id, title); }}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDeleteColumn(column.id)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {column.cards.map((card) => (
              <SortableCard key={card.id} card={card} onEdit={() => {
                const title = prompt('Editar título', card.title) || card.title;
                onEditCard(column.id, card.id, title);
              }} onDelete={() => onDeleteCard(column.id, card.id)} />
            ))}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
};

const FluxosBoard: React.FC = () => {
  const sensors = useSensors(useSensor(PointerSensor));
  const [columns, setColumns] = useState<Column[]>(() => {
    const saved = localStorage.getItem('fluxosData');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'col-1', title: 'A fazer', cards: [] },
      { id: 'col-2', title: 'Fazendo', cards: [] },
      { id: 'col-3', title: 'Concluído', cards: [] }
    ];
  });

  useEffect(() => { localStorage.setItem('fluxosData', JSON.stringify(columns)); }, [columns]);

  const addColumn = () => {
    const title = prompt('Nome da coluna');
    if (!title) return;
    setColumns(prev => [...prev, { id: `col-${Date.now()}`, title, cards: [] }]);
  };

  const addCard = (columnId: string, title: string) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, cards: [...c.cards, { id: `card-${Date.now()}`, title }] } : c));
  };

  const deleteColumn = (columnId: string) => {
    if (!confirm('Excluir coluna?')) return;
    setColumns(prev => prev.filter(c => c.id !== columnId));
  };

  const editColumn = (columnId: string, title: string) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, title } : c));
  };

  const editCard = (columnId: string, cardId: string, title: string) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, cards: c.cards.map(card => card.id === cardId ? { ...card, title } : card) } : c));
  };

  const deleteCard = (columnId: string, cardId: string) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, cards: c.cards.filter(card => card.id !== cardId) } : c));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find source column/card
    const sourceColIndex = columns.findIndex(c => c.cards.some(card => card.id === String(active.id)));
    const targetColIndex = columns.findIndex(c => c.cards.some(card => card.id === String(over.id)));
    if (sourceColIndex === -1 || targetColIndex === -1) return;

    const sourceCol = columns[sourceColIndex];
    const targetCol = columns[targetColIndex];

    const sourceIdx = sourceCol.cards.findIndex(card => card.id === String(active.id));
    const targetIdx = targetCol.cards.findIndex(card => card.id === String(over.id));

    const moving = sourceCol.cards[sourceIdx];
    const next = columns.map(c => ({ ...c, cards: [...c.cards] }));

    // Remove from source
    next[sourceColIndex].cards.splice(sourceIdx, 1);
    // Insert into target at position
    next[targetColIndex].cards.splice(targetIdx, 0, moving);

    setColumns(next);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fluxos</h1>
        <Button onClick={addColumn} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-2" />Nova Coluna</Button>
      </div>

      <ScrollArea className="w-full">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 pb-8 min-h-[70vh]">
            {columns.map((col) => (
              <SortableColumn
                key={col.id}
                column={col}
                onAddCard={addCard}
                onDeleteColumn={deleteColumn}
                onEditColumn={editColumn}
                onEditCard={editCard}
                onDeleteCard={deleteCard}
              />
            ))}
          </div>
        </DndContext>
      </ScrollArea>
    </div>
  );
};

export default FluxosBoard;
