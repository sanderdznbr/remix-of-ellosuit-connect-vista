import React, { useEffect, useState } from 'react';
import { Plus, MoreHorizontal, Calendar, Tag, GripVertical, X, Trash2, Edit2, Clock, CheckSquare, Star, Search, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkflowGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_by: string;
}

interface Workflow {
  id: string;
  group_id: string;
  name: string;
  description?: string;
}

interface WorkflowColumn {
  id: string;
  workflow_id: string;
  name: string;
  position: number;
  color: string;
}

interface WorkflowCard {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  position: number;
  priority: string;
  due_date?: string;
  tags?: string[];
  created_by: string;
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  medium: { label: 'Média', color: 'bg-amber-500', textColor: 'text-amber-600' },
  high: { label: 'Alta', color: 'bg-rose-500', textColor: 'text-rose-600' }
};

const labelColors = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0', 
  '#0079bf', '#00c2e0', '#51e898', '#ff78cb', '#344563'
];

const boardBackgrounds = [
  { name: 'Azul', value: 'from-blue-600 to-blue-800' },
  { name: 'Verde', value: 'from-emerald-600 to-emerald-800' },
  { name: 'Roxo', value: 'from-purple-600 to-purple-800' },
  { name: 'Rosa', value: 'from-pink-600 to-pink-800' },
  { name: 'Laranja', value: 'from-orange-500 to-red-600' },
  { name: 'Cinza', value: 'from-slate-600 to-slate-800' },
];

const TrelloCard: React.FC<{ 
  card: WorkflowCard; 
  onEdit: () => void;
  onDelete: () => void;
}> = ({ card, onEdit, onDelete }) => {
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

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className="bg-muted/50 rounded-lg border-2 border-dashed border-primary/30 h-20"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="group bg-card hover:bg-card/90 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border border-border/50 hover:border-primary/30"
    >
      {/* Color bar for priority */}
      <div className={`h-1 rounded-t-lg ${priority.color}`} />
      
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div 
            {...attributes} 
            {...listeners}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing mt-0.5 -ml-1"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0" onClick={onEdit}>
            <p className="font-medium text-foreground text-sm leading-snug mb-1">{card.title}</p>
            
            {card.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{card.description}</p>
            )}
            
            {/* Tags */}
            {card.tags && card.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-2">
                {card.tags.slice(0, 4).map((tag, index) => (
                  <span 
                    key={index} 
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ 
                      backgroundColor: labelColors[index % labelColors.length] + '20',
                      color: labelColors[index % labelColors.length]
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Footer with metadata */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {card.due_date && (
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                  isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted'
                }`}>
                  <Clock className="h-3 w-3" />
                  {new Date(card.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              )}
              
              {card.description && (
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
          
          {/* Quick actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

const TrelloColumn: React.FC<{
  column: WorkflowColumn;
  cards: WorkflowCard[];
  onAddCard: () => void;
  onEditCard: (card: WorkflowCard) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteColumn: () => void;
  onEditColumn: () => void;
}> = ({ column, cards, onAddCard, onEditCard, onDeleteCard, onDeleteColumn, onEditColumn }) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const handleQuickAdd = () => {
    if (newCardTitle.trim()) {
      // Call parent's add card logic with title
      setNewCardTitle('');
      setIsAddingCard(false);
      onAddCard();
    }
  };

  return (
    <div className="w-72 flex-shrink-0 flex flex-col bg-muted/80 backdrop-blur-sm rounded-xl max-h-[calc(100vh-200px)] shadow-sm">
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-sm text-foreground truncate">{column.name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {cards.length}
          </span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddCard}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEditColumn}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar coluna
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteColumn} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir coluna
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Cards Container */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-2 pb-2">
          <SortableContext 
            items={cards.map(c => c.id)} 
            strategy={verticalListSortingStrategy}
          >
            {cards.map(card => (
              <TrelloCard
                key={card.id}
                card={card}
                onEdit={() => onEditCard(card)}
                onDelete={() => onDeleteCard(card.id)}
              />
            ))}
          </SortableContext>
          
          {cards.length === 0 && !isAddingCard && (
            <div className="text-center py-4 text-muted-foreground text-xs">
              Nenhum card
            </div>
          )}
          
          {/* Quick Add Card */}
          {isAddingCard && (
            <div className="bg-card rounded-lg shadow-sm border p-2 space-y-2">
              <Textarea
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Digite o título do card..."
                className="min-h-[60px] text-sm resize-none"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleQuickAdd} disabled={!newCardTitle.trim()}>
                  Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingCard(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Add Card Button */}
      {!isAddingCard && (
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-background/50 h-8"
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar card
          </Button>
        </div>
      )}
    </div>
  );
};

const CardModal: React.FC<{
  card: WorkflowCard | null;
  open: boolean;
  onClose: () => void;
  onSave: (cardData: Partial<WorkflowCard>) => void;
  onDelete?: () => void;
}> = ({ card, open, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setPriority(card.priority);
      setDueDate(card.due_date ? new Date(card.due_date).toISOString().split('T')[0] : '');
      setTags(card.tags || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setTags([]);
    }
  }, [card, open]);

  const handleSave = () => {
    onSave({
      title,
      description,
      priority,
      due_date: dueDate || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    onClose();
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            {card ? 'Editar Card' : 'Novo Card'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Título</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título..."
              className="font-medium"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descrição mais detalhada..."
              rows={4}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Prioridade</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Baixa
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Média
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      Alta
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Data Limite</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">Etiquetas</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova etiqueta..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button onClick={addTag} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="text-xs px-2 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
                  style={{ 
                    backgroundColor: labelColors[index % labelColors.length] + '20',
                    color: labelColors[index % labelColors.length]
                  }}
                  onClick={() => setTags(tags.filter(t => t !== tag))}
                >
                  {tag}
                  <X className="h-3 w-3" />
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between pt-4 border-t">
          {card && onDelete && (
            <Button variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {card ? 'Salvar' : 'Criar Card'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FluxosBoard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 }
  }));

  const [groups, setGroups] = useState<WorkflowGroup[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [columns, setColumns] = useState<WorkflowColumn[]>([]);
  const [cards, setCards] = useState<WorkflowCard[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<WorkflowCard | null>(null);
  const [boardBackground, setBoardBackground] = useState(boardBackgrounds[0].value);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<WorkflowCard | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [editingColumn, setEditingColumn] = useState<WorkflowColumn | null>(null);

  const [groupName, setGroupName] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [columnName, setColumnName] = useState('');
  const [columnColor, setColumnColor] = useState('#3B82F6');

  const [companyId, setCompanyId] = useState<string | null>(null);

  const columnColors = [
    '#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'
  ];

  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };
    
    fetchCompanyId();
  }, [user?.id]);

  const loadGroups = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('workflow_groups')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at');
    
    setGroups(data || []);
    if (data && data.length > 0 && !selectedGroup) {
      setSelectedGroup(data[0].id);
    }
  };

  const loadWorkflows = async () => {
    if (!selectedGroup) return;
    const { data } = await supabase
      .from('workflows')
      .select('*')
      .eq('group_id', selectedGroup)
      .order('created_at');
    
    setWorkflows(data || []);
    if (data && data.length > 0 && !selectedWorkflow) {
      setSelectedWorkflow(data[0].id);
    }
  };

  const loadColumns = async () => {
    if (!selectedWorkflow) return;
    const { data } = await supabase
      .from('workflow_columns')
      .select('*')
      .eq('workflow_id', selectedWorkflow)
      .order('position');
    
    setColumns(data || []);
  };

  const loadCards = async () => {
    if (!selectedWorkflow) return;
    const { data } = await supabase
      .from('workflow_cards')
      .select(`*, workflow_columns!inner(workflow_id)`)
      .eq('workflow_columns.workflow_id', selectedWorkflow)
      .order('position');
    
    setCards(data || []);
  };

  useEffect(() => {
    if (companyId) {
      loadGroups();
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (selectedGroup) {
      setSelectedWorkflow('');
      loadWorkflows();
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedWorkflow) {
      loadColumns();
      loadCards();
    }
  }, [selectedWorkflow]);

  const createGroup = async () => {
    if (!groupName || !companyId || !user?.id) return;
    
    await supabase.from('workflow_groups').insert({
      name: groupName,
      company_id: companyId,
      created_by: user.id,
      color: '#3B82F6'
    });
    
    setGroupName('');
    setShowGroupModal(false);
    loadGroups();
    toast({ title: 'Quadro criado com sucesso!' });
  };

  const createWorkflow = async () => {
    if (!workflowName || !selectedGroup || !companyId || !user?.id) return;
    
    await supabase.from('workflows').insert({
      name: workflowName,
      group_id: selectedGroup,
      company_id: companyId,
      created_by: user.id
    });
    
    setWorkflowName('');
    setShowWorkflowModal(false);
    loadWorkflows();
    toast({ title: 'Fluxo criado com sucesso!' });
  };

  const createColumn = async () => {
    if (!columnName || !selectedWorkflow || !companyId) return;
    
    await supabase.from('workflow_columns').insert({
      name: columnName,
      workflow_id: selectedWorkflow,
      company_id: companyId,
      position: columns.length,
      color: columnColor
    });
    
    setColumnName('');
    setColumnColor('#3B82F6');
    setShowColumnModal(false);
    setEditingColumn(null);
    loadColumns();
    toast({ title: 'Coluna criada com sucesso!' });
  };

  const updateColumn = async () => {
    if (!columnName || !editingColumn) return;
    
    await supabase
      .from('workflow_columns')
      .update({ name: columnName, color: columnColor })
      .eq('id', editingColumn.id);
    
    setColumnName('');
    setColumnColor('#3B82F6');
    setShowColumnModal(false);
    setEditingColumn(null);
    loadColumns();
    toast({ title: 'Coluna atualizada!' });
  };

  const deleteColumn = async (columnId: string) => {
    await supabase.from('workflow_columns').delete().eq('id', columnId);
    loadColumns();
    loadCards();
    toast({ title: 'Coluna excluída!' });
  };

  const saveCard = async (cardData: Partial<WorkflowCard>) => {
    if (!companyId || !user?.id) return;
    
    if (selectedCard) {
      await supabase
        .from('workflow_cards')
        .update(cardData)
        .eq('id', selectedCard.id);
      toast({ title: 'Card atualizado!' });
    } else {
      await supabase.from('workflow_cards').insert({
        title: cardData.title || 'Novo Card',
        description: cardData.description,
        priority: cardData.priority || 'medium',
        due_date: cardData.due_date,
        tags: cardData.tags,
        column_id: selectedColumnId,
        company_id: companyId,
        created_by: user.id,
        position: cards.filter(c => c.column_id === selectedColumnId).length
      });
      toast({ title: 'Card criado!' });
    }
    
    loadCards();
  };

  const deleteCard = async (cardId: string) => {
    await supabase.from('workflow_cards').delete().eq('id', cardId);
    loadCards();
    toast({ title: 'Card excluído!' });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find(c => c.id === event.active.id);
    setActiveCard(card || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCard = cards.find(c => c.id === active.id);
    if (!activeCard) return;

    // Check if dropping over a column
    const overColumn = columns.find(col => col.id === over.id);
    if (overColumn && activeCard.column_id !== overColumn.id) {
      setCards(prev => prev.map(card => 
        card.id === activeCard.id 
          ? { ...card, column_id: overColumn.id }
          : card
      ));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeCard = cards.find(c => c.id === active.id);
    if (!activeCard) return;

    // Find target column
    let targetColumnId = activeCard.column_id;
    const overCard = cards.find(c => c.id === over.id);
    const overColumn = columns.find(col => col.id === over.id);
    
    if (overCard) {
      targetColumnId = overCard.column_id;
    } else if (overColumn) {
      targetColumnId = overColumn.id;
    }

    // Update in database
    await supabase
      .from('workflow_cards')
      .update({ column_id: targetColumnId })
      .eq('id', activeCard.id);

    loadCards();
  };

  const currentGroup = groups.find(g => g.id === selectedGroup);
  const currentWorkflow = workflows.find(w => w.id === selectedWorkflow);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Carregando quadros...</p>
        </div>
      </div>
    );
  }

  // Empty state - no boards
  if (groups.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <CheckSquare className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Ello Flows</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Organize projetos, tarefas e equipes em quadros Kanban intuitivos.
          </p>
          <Button onClick={() => setShowGroupModal(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Criar Primeiro Quadro
          </Button>
        </div>
        
        {/* Group Modal */}
        <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Quadro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome do Quadro</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Marketing, Desenvolvimento, Vendas..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowGroupModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={createGroup} disabled={!groupName.trim()}>
                  Criar Quadro
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${boardBackground}`}>
      {/* Top Header Bar */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 py-2 flex items-center justify-between gap-4">
          {/* Left: Board selector */}
          <div className="flex items-center gap-3">
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-44 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SelectValue placeholder="Quadro..." />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <Star className="h-3 w-3 text-amber-500" />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowGroupModal(true)}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Center: Workflow tabs */}
          {selectedGroup && (
            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
              {workflows.map(workflow => (
                <Button
                  key={workflow.id}
                  variant={selectedWorkflow === workflow.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedWorkflow(workflow.id)}
                  className={selectedWorkflow === workflow.id 
                    ? "bg-white/20 text-white" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                  }
                >
                  {workflow.name}
                </Button>
              ))}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowWorkflowModal(true)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Fluxo
              </Button>
            </div>
          )}
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                  <Filter className="h-4 w-4 mr-2" />
                  Fundo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {boardBackgrounds.map(bg => (
                  <DropdownMenuItem 
                    key={bg.value} 
                    onClick={() => setBoardBackground(bg.value)}
                  >
                    <div className={`w-6 h-4 rounded mr-2 bg-gradient-to-r ${bg.value}`} />
                    {bg.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Board Title Bar */}
      {currentWorkflow && (
        <div className="px-4 py-3 flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">{currentWorkflow.name}</h1>
          <Badge className="bg-white/20 text-white border-0">
            {columns.length} colunas • {cards.length} cards
          </Badge>
        </div>
      )}

      {/* Kanban Board */}
      {selectedWorkflow ? (
        <div className="px-4 pb-4 overflow-x-auto">
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 min-w-max">
              {columns.map(column => {
                const columnCards = cards.filter(c => c.column_id === column.id);
                
                return (
                  <TrelloColumn
                    key={column.id}
                    column={column}
                    cards={columnCards}
                    onAddCard={() => {
                      setSelectedColumnId(column.id);
                      setSelectedCard(null);
                      setShowCardModal(true);
                    }}
                    onEditCard={(card) => {
                      setSelectedCard(card);
                      setShowCardModal(true);
                    }}
                    onDeleteCard={deleteCard}
                    onDeleteColumn={() => deleteColumn(column.id)}
                    onEditColumn={() => {
                      setEditingColumn(column);
                      setColumnName(column.name);
                      setColumnColor(column.color);
                      setShowColumnModal(true);
                    }}
                  />
                );
              })}
              
              {/* Add Column */}
              <div className="w-72 flex-shrink-0">
                <Button 
                  variant="ghost"
                  className="w-full h-12 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-2 border-dashed border-white/20 hover:border-white/40 rounded-xl"
                  onClick={() => {
                    setEditingColumn(null);
                    setColumnName('');
                    setColumnColor('#3B82F6');
                    setShowColumnModal(true);
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Adicionar Lista
                </Button>
              </div>
            </div>
            
            <DragOverlay>
              {activeCard && (
                <div className="bg-card rounded-lg shadow-2xl border p-3 w-72 rotate-3">
                  <div className={`h-1 rounded-t-lg mb-2 ${priorityConfig[activeCard.priority as keyof typeof priorityConfig]?.color || 'bg-amber-500'}`} />
                  <p className="font-medium text-sm">{activeCard.title}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      ) : workflows.length === 0 && selectedGroup ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhum fluxo criado</h3>
            <p className="text-white/70 mb-4">Crie um fluxo para começar a organizar suas tarefas</p>
            <Button onClick={() => setShowWorkflowModal(true)} className="bg-white text-primary hover:bg-white/90">
              <Plus className="h-4 w-4 mr-2" />
              Criar Fluxo
            </Button>
          </div>
        </div>
      ) : null}

      {/* Modals */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Quadro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome do Quadro</label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Marketing, Desenvolvimento..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGroupModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createGroup} disabled={!groupName.trim()}>
                Criar Quadro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkflowModal} onOpenChange={setShowWorkflowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fluxo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome do Fluxo</label>
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Ex: Sprint 1, Campanha Q1..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWorkflowModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createWorkflow} disabled={!workflowName.trim()}>
                Criar Fluxo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showColumnModal} onOpenChange={(open) => {
        setShowColumnModal(open);
        if (!open) {
          setEditingColumn(null);
          setColumnName('');
          setColumnColor('#3B82F6');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColumn ? 'Editar Lista' : 'Nova Lista'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome da Lista</label>
              <Input
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="Ex: A Fazer, Em Progresso, Concluído..."
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {columnColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setColumnColor(color)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                      columnColor === color ? 'border-foreground scale-110 shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowColumnModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={editingColumn ? updateColumn : createColumn} 
                disabled={!columnName.trim()}
              >
                {editingColumn ? 'Salvar' : 'Criar Lista'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CardModal
        card={selectedCard}
        open={showCardModal}
        onClose={() => {
          setShowCardModal(false);
          setSelectedCard(null);
        }}
        onSave={saveCard}
        onDelete={selectedCard ? () => {
          deleteCard(selectedCard.id);
          setShowCardModal(false);
          setSelectedCard(null);
        } : undefined}
      />
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default FluxosBoard;
