import React, { useEffect, useState } from 'react';
import { Plus, MoreHorizontal, Users, Calendar, Paperclip, MessageSquare, Tag, Zap, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
  low: { label: 'Baixa', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  medium: { label: 'Média', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  high: { label: 'Alta', color: 'bg-rose-100 text-rose-700 border-rose-200' }
};

const columnColors = [
  { name: 'Cinza', value: '#6B7280' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarelo', value: '#F59E0B' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
];

const SortableCard: React.FC<{ 
  card: WorkflowCard; 
  onEdit: () => void; 
}> = ({ card, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition,
    opacity: isDragging ? 0.5 : 1,
  } as React.CSSProperties;

  const priority = priorityConfig[card.priority as keyof typeof priorityConfig] || priorityConfig.medium;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="p-3" onClick={onEdit}>
        <div className="flex items-start gap-2">
          <div 
            {...attributes} 
            {...listeners}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing mt-0.5"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm leading-tight">{card.title}</p>
            {card.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          <Badge variant="outline" className={`text-xs ${priority.color}`}>
            {priority.label}
          </Badge>
          {card.due_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(card.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
        
        {card.tags && card.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {card.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {card.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                +{card.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CardDetailsModal: React.FC<{
  card: WorkflowCard | null;
  open: boolean;
  onClose: () => void;
  onSave: (cardData: Partial<WorkflowCard>) => void;
}> = ({ card, open, onClose, onSave }) => {
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
  }, [card]);

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
          <DialogTitle>{card ? 'Editar Card' : 'Novo Card'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título..."
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite a descrição..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Baixa</SelectItem>
                  <SelectItem value="medium">🟡 Média</SelectItem>
                  <SelectItem value="high">🔴 Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Data de Vencimento</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button onClick={addTag} size="sm" variant="secondary">
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setTags(tags.filter(t => t !== tag))}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {card ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FluxosBoard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }
  }));

  const [groups, setGroups] = useState<WorkflowGroup[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [columns, setColumns] = useState<WorkflowColumn[]>([]);
  const [cards, setCards] = useState<WorkflowCard[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<WorkflowCard | null>(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<WorkflowCard | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');

  const [groupName, setGroupName] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [columnName, setColumnName] = useState('');
  const [columnColor, setColumnColor] = useState('#6B7280');

  const [companyId, setCompanyId] = useState<string | null>(null);

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
    toast({ title: 'Quadro criado!' });
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
    toast({ title: 'Fluxo criado!' });
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
    setColumnColor('#6B7280');
    setShowColumnModal(false);
    loadColumns();
    toast({ title: 'Coluna criada!' });
  };

  const saveCard = async (cardData: Partial<WorkflowCard>) => {
    if (!companyId || !user?.id) return;
    
    if (selectedCard) {
      await supabase
        .from('workflow_cards')
        .update(cardData)
        .eq('id', selectedCard.id);
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
    }
    
    loadCards();
    toast({ title: selectedCard ? 'Card atualizado!' : 'Card criado!' });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find(c => c.id === event.active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeCard = cards.find(c => c.id === active.id);
    const overCard = cards.find(c => c.id === over.id);
    
    if (!activeCard || !overCard) return;

    await supabase
      .from('workflow_cards')
      .update({ column_id: overCard.column_id, position: overCard.position })
      .eq('id', activeCard.id);

    loadCards();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Fluxos de Trabalho</h1>
              <p className="text-sm text-muted-foreground">Organize projetos em quadros Kanban</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {groups.length > 0 && (
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecionar quadro..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button onClick={() => setShowGroupModal(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Novo Quadro
            </Button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {groups.length === 0 ? (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Bem-vindo aos Fluxos!</h2>
            <p className="text-muted-foreground mb-6">
              Crie seu primeiro quadro para organizar projetos, tarefas e fluxos de trabalho.
            </p>
            <Button onClick={() => setShowGroupModal(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Criar Primeiro Quadro
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Workflow Selector */}
          {selectedGroup && (
            <div className="border-b bg-muted/30 p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecionar fluxo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {workflows.map(workflow => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={() => setShowWorkflowModal(true)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Fluxo
                  </Button>
                  
                  {selectedWorkflow && (
                    <Button onClick={() => setShowColumnModal(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Coluna
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Kanban Board - Trello Style */}
          {selectedWorkflow && (
            <div className="p-4 overflow-x-auto">
              <DndContext 
                sensors={sensors} 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-4 min-w-max pb-4">
                  {columns.length === 0 ? (
                    <div className="flex items-center justify-center w-full min-h-[50vh]">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <MoreHorizontal className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Nenhuma coluna criada</h3>
                        <p className="text-muted-foreground mb-4">
                          Adicione colunas como "A Fazer", "Em Progresso", "Concluído"
                        </p>
                        <Button onClick={() => setShowColumnModal(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Primeira Coluna
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {columns.map(column => {
                        const columnCards = cards.filter(c => c.column_id === column.id);
                        
                        return (
                          <div 
                            key={column.id} 
                            className="w-72 flex-shrink-0 bg-muted/50 rounded-xl flex flex-col max-h-[calc(100vh-280px)]"
                          >
                            {/* Column Header */}
                            <div 
                              className="p-3 rounded-t-xl flex items-center justify-between"
                              style={{ backgroundColor: column.color + '15' }}
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: column.color }}
                                />
                                <h3 className="font-semibold text-sm">{column.name}</h3>
                                <Badge variant="secondary" className="text-xs">
                                  {columnCards.length}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 hover:bg-white/50"
                                onClick={() => {
                                  setSelectedColumnId(column.id);
                                  setSelectedCard(null);
                                  setShowCardModal(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Cards Container */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                              <SortableContext 
                                items={columnCards.map(c => c.id)} 
                                strategy={verticalListSortingStrategy}
                              >
                                {columnCards.map(card => (
                                  <SortableCard
                                    key={card.id}
                                    card={card}
                                    onEdit={() => {
                                      setSelectedCard(card);
                                      setShowCardModal(true);
                                    }}
                                  />
                                ))}
                              </SortableContext>
                              
                              {columnCards.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                  <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4">
                                    Arraste cards aqui
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Add Card Button */}
                            <div className="p-2 border-t border-muted-foreground/10">
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedColumnId(column.id);
                                  setSelectedCard(null);
                                  setShowCardModal(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar card
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Add Column Button */}
                      <div className="w-72 flex-shrink-0">
                        <Button 
                          variant="outline" 
                          className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5"
                          onClick={() => setShowColumnModal(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Coluna
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                
                <DragOverlay>
                  {activeCard && (
                    <div className="bg-card rounded-lg border shadow-lg p-3 w-72 opacity-90">
                      <p className="font-medium text-sm">{activeCard.title}</p>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          )}

          {/* No Workflow Selected */}
          {selectedGroup && workflows.length === 0 && (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhum fluxo criado</h3>
                <p className="text-muted-foreground mb-4">
                  Crie um fluxo para organizar suas tarefas
                </p>
                <Button onClick={() => setShowWorkflowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Fluxo
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Quadro de Trabalho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Quadro</label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Projeto Website, Marketing..."
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
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Nome do fluxo..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWorkflowModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createWorkflow} disabled={!workflowName.trim()}>
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showColumnModal} onOpenChange={setShowColumnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Coluna</label>
              <Input
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="Ex: A Fazer, Em Progresso, Concluído..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cor</label>
              <div className="flex gap-2 mt-2">
                {columnColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setColumnColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      columnColor === color.value ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowColumnModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createColumn} disabled={!columnName.trim()}>
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CardDetailsModal
        card={selectedCard}
        open={showCardModal}
        onClose={() => {
          setShowCardModal(false);
          setSelectedCard(null);
        }}
        onSave={saveCard}
      />
    </div>
  );
};

export default FluxosBoard;
