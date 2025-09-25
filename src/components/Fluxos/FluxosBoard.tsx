import React, { useEffect, useState } from 'react';
import { Plus, MoreHorizontal, Users, Calendar, Paperclip, MessageSquare, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
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

const SortableCard: React.FC<{ 
  card: WorkflowCard; 
  onEdit: () => void; 
}> = ({ card, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className="bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onEdit}
    >
      <div className="space-y-2">
        <div className="font-medium text-gray-900">{card.title}</div>
        {card.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{card.description}</p>
        )}
        
        <div className="flex items-center justify-between text-xs">
          <Badge className={priorityColors[card.priority as keyof typeof priorityColors]}>
            {card.priority}
          </Badge>
          {card.due_date && (
            <span className="text-gray-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(card.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
        
        {card.tags && card.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {card.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {card.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
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

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{card ? 'Editar Card' : 'Novo Card'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do card..."
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
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
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
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <Button onClick={addTag} size="sm">
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>Atribuições</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Paperclip className="h-4 w-4" />
              <span>Anexos</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MessageSquare className="h-4 w-4" />
              <span>Comentários</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
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
  const sensors = useSensors(useSensor(PointerSensor));

  // State
  const [groups, setGroups] = useState<WorkflowGroup[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [columns, setColumns] = useState<WorkflowColumn[]>([]);
  const [cards, setCards] = useState<WorkflowCard[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<WorkflowCard | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');

  // Form states
  const [groupName, setGroupName] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [columnName, setColumnName] = useState('');

  const companyId = user?.user_metadata?.company_id;

  // Load data
  const loadGroups = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from('workflow_groups')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at');
    
    if (error) {
      console.error('Error loading groups:', error);
      return;
    }
    
    setGroups(data || []);
    if (data && data.length > 0 && !selectedGroup) {
      setSelectedGroup(data[0].id);
    }
  };

  const loadWorkflows = async () => {
    if (!selectedGroup) return;
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('group_id', selectedGroup)
      .order('created_at');
    
    if (error) {
      console.error('Error loading workflows:', error);
      return;
    }
    
    setWorkflows(data || []);
    if (data && data.length > 0 && !selectedWorkflow) {
      setSelectedWorkflow(data[0].id);
    }
  };

  const loadColumns = async () => {
    if (!selectedWorkflow) return;
    const { data, error } = await supabase
      .from('workflow_columns')
      .select('*')
      .eq('workflow_id', selectedWorkflow)
      .order('position');
    
    if (error) {
      console.error('Error loading columns:', error);
      return;
    }
    
    setColumns(data || []);
  };

  const loadCards = async () => {
    if (!selectedWorkflow) return;
    const { data, error } = await supabase
      .from('workflow_cards')
      .select(`
        *,
        workflow_columns!inner(workflow_id)
      `)
      .eq('workflow_columns.workflow_id', selectedWorkflow)
      .order('position');
    
    if (error) {
      console.error('Error loading cards:', error);
      return;
    }
    
    setCards(data || []);
  };

  useEffect(() => {
    loadGroups();
  }, [companyId]);

  useEffect(() => {
    if (selectedGroup) {
      loadWorkflows();
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedWorkflow) {
      loadColumns();
      loadCards();
    }
  }, [selectedWorkflow]);

  useEffect(() => {
    const loadData = async () => {
      await loadGroups();
      setLoading(false);
    };
    loadData();
  }, []);

  // CRUD operations
  const createGroup = async () => {
    if (!groupName || !companyId || !user?.id) return;
    
    const { error } = await supabase
      .from('workflow_groups')
      .insert({
        name: groupName,
        company_id: companyId,
        created_by: user.id,
        color: '#3B82F6'
      });
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao criar grupo', variant: 'destructive' });
      return;
    }
    
    setGroupName('');
    setShowGroupModal(false);
    loadGroups();
    toast({ title: 'Sucesso', description: 'Grupo criado com sucesso!' });
  };

  const createWorkflow = async () => {
    if (!workflowName || !selectedGroup || !companyId || !user?.id) return;
    
    const { error } = await supabase
      .from('workflows')
      .insert({
        name: workflowName,
        group_id: selectedGroup,
        company_id: companyId,
        created_by: user.id
      });
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao criar fluxo', variant: 'destructive' });
      return;
    }
    
    setWorkflowName('');
    setShowWorkflowModal(false);
    loadWorkflows();
    toast({ title: 'Sucesso', description: 'Fluxo criado com sucesso!' });
  };

  const createColumn = async () => {
    if (!columnName || !selectedWorkflow || !companyId) return;
    
    const { error } = await supabase
      .from('workflow_columns')
      .insert({
        name: columnName,
        workflow_id: selectedWorkflow,
        company_id: companyId,
        position: columns.length,
        color: '#6B7280'
      });
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao criar coluna', variant: 'destructive' });
      return;
    }
    
    setColumnName('');
    setShowColumnModal(false);
    loadColumns();
    toast({ title: 'Sucesso', description: 'Coluna criada com sucesso!' });
  };

  const saveCard = async (cardData: Partial<WorkflowCard>) => {
    if (!companyId || !user?.id) return;
    
    if (selectedCard) {
      // Update existing card
      const { error } = await supabase
        .from('workflow_cards')
        .update(cardData)
        .eq('id', selectedCard.id);
      
      if (error) {
        toast({ title: 'Erro', description: 'Erro ao atualizar card', variant: 'destructive' });
        return;
      }
    } else {
      // Create new card
      const { error } = await supabase
        .from('workflow_cards')
        .insert({
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
      
      if (error) {
        toast({ title: 'Erro', description: 'Erro ao criar card', variant: 'destructive' });
        return;
      }
    }
    
    loadCards();
    toast({ title: 'Sucesso', description: selectedCard ? 'Card atualizado!' : 'Card criado!' });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeCard = cards.find(c => c.id === active.id);
    const overCard = cards.find(c => c.id === over.id);
    
    if (!activeCard || !overCard) return;

    // Update card position/column
    const { error } = await supabase
      .from('workflow_cards')
      .update({ 
        column_id: overCard.column_id,
        position: overCard.position 
      })
      .eq('id', activeCard.id);

    if (!error) {
      loadCards();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando fluxos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fluxos</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar grupo..." />
            </SelectTrigger>
            <SelectContent>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={() => setShowGroupModal(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>
      </div>

      {/* Workflow Selection */}
      {selectedGroup && (
        <div className="flex items-center gap-3 mb-6">
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
          
          <Button onClick={() => setShowWorkflowModal(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Novo Fluxo
          </Button>
          
          <Button onClick={() => setShowColumnModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Coluna
          </Button>
        </div>
      )}

      {/* Kanban Board */}
      {selectedWorkflow && (
        <ScrollArea className="w-full">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 pb-8 min-h-[70vh]">
              {columns.map(column => (
                <Card key={column.id} className="w-80 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium" style={{ color: column.color }}>
                        {column.name}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedColumnId(column.id);
                          setSelectedCard(null);
                          setShowCardModal(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <SortableContext 
                      items={cards.filter(c => c.column_id === column.id).map(c => c.id)} 
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {cards
                          .filter(card => card.column_id === column.id)
                          .map(card => (
                            <SortableCard
                              key={card.id}
                              card={card}
                              onEdit={() => {
                                setSelectedCard(card);
                                setShowCardModal(true);
                              }}
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DndContext>
        </ScrollArea>
      )}

      {/* Modals */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Grupo de Fluxo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nome do grupo..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGroupModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createGroup}>Criar</Button>
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
              <Button onClick={createWorkflow}>Criar</Button>
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
            <Input
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Nome da coluna..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowColumnModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createColumn}>Criar</Button>
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