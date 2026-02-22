import React, { useEffect, useState } from 'react';
import { Plus, MoreHorizontal, Calendar, GripVertical, X, Trash2, Edit2, Clock, CheckSquare, Star, Filter, Paperclip, MessageSquare, Link2, Users, Share2, Copy, ExternalLink, Image, FileText, Tag, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, DragOverEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCompanyEmployees } from '@/hooks/useCompanyEmployees';

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
  attachments?: string[];
  links?: string[];
  comments?: { author: string; text: string; date: string }[];
  assigned_user_id?: string;
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-emerald-500', bgLight: 'bg-emerald-50', textColor: 'text-emerald-700' },
  medium: { label: 'Média', color: 'bg-amber-500', bgLight: 'bg-amber-50', textColor: 'text-amber-700' },
  high: { label: 'Alta', color: 'bg-rose-500', bgLight: 'bg-rose-50', textColor: 'text-rose-700' }
};

const labelColors = [
  { name: 'Verde', value: '#22c55e' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Roxo', value: '#a855f7' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Rosa', value: '#ec4899' },
];

const TrelloCard: React.FC<{ 
  card: WorkflowCard; 
  onEdit: () => void;
  onDelete: () => void;
  employees?: any[];
}> = ({ card, onEdit, onDelete, employees = [] }) => {
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
      <div 
        ref={setNodeRef} 
        style={style}
        className="bg-primary/5 rounded-xl border-2 border-dashed border-primary/20 h-24"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="group bg-card hover:bg-muted/30 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-border/60 hover:border-primary/30"
    >
      {/* Color Labels Bar */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex gap-1 p-2 pb-0">
          {card.tags.slice(0, 4).map((_, index) => (
            <div 
              key={index}
              className="h-2 w-10 rounded-full"
              style={{ backgroundColor: labelColors[index % labelColors.length].value }}
            />
          ))}
        </div>
      )}
      
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
            <p className="font-medium text-foreground text-sm leading-snug mb-2">{card.title}</p>
            
            {/* Footer with metadata */}
            <div className="flex items-center gap-2 flex-wrap">
              {card.due_date && (
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                  isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                }`}>
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
                  <Paperclip className="h-3 w-3" />
                  {card.attachments.length}
                </span>
              )}
              
              {card.comments && card.comments.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {card.comments.length}
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
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive rounded-lg">
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
  employees?: any[];
}> = ({ column, cards, onAddCard, onEditCard, onDeleteCard, onDeleteColumn, onEditColumn, employees = [] }) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  // Make the column a droppable area
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 flex flex-col bg-gray-50 rounded-2xl max-h-[calc(100vh-180px)] border transition-all ${
        isOver ? 'border-blue-300 bg-blue-50/50 scale-[1.01]' : 'border-gray-100'
      }`}
    >
      {/* Column Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-sm text-foreground truncate">{column.name}</h3>
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full font-medium">
            {cards.length}
          </span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={onAddCard} className="rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEditColumn} className="rounded-lg">
              <Edit2 className="h-4 w-4 mr-2" />
              Editar lista
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteColumn} className="text-destructive rounded-lg">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Cards Container */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 pb-3">
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
                employees={employees}
              />
            ))}
          </SortableContext>
          
          {cards.length === 0 && !isAddingCard && (
            <div className={`text-center py-6 text-xs transition-all ${isOver ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${
                isOver ? 'border-primary bg-primary/10 scale-105' : 'border-muted-foreground/20'
              }`}>
                {isOver ? '📥 Solte o card aqui!' : 'Arraste cards aqui'}
              </div>
            </div>
          )}
          
          {/* Quick Add Card */}
          {isAddingCard && (
            <div className="bg-card rounded-xl shadow-sm border p-3 space-y-2">
              <Textarea
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Digite o título do card..."
                className="min-h-[60px] text-sm resize-none rounded-lg border-muted"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { onAddCard(); setIsAddingCard(false); }} className="rounded-lg">
                  Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingCard(false)} className="rounded-lg">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Add Card Button */}
      {!isAddingCard && (
        <div className="p-3 pt-0">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-background/80 h-9 rounded-xl"
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

// Enhanced Card Modal with all features
const EnhancedCardModal: React.FC<{
  card: WorkflowCard | null;
  open: boolean;
  onClose: () => void;
  onSave: (cardData: Partial<WorkflowCard>) => void;
  onDelete?: () => void;
  employees?: any[];
}> = ({ card, open, onClose, onSave, onDelete, employees = [] }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [comments, setComments] = useState<{ author: string; text: string; date: string }[]>([]);
  const [newComment, setNewComment] = useState('');
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [assignedUserId, setAssignedUserId] = useState<string>('');

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setPriority(card.priority);
      setDueDate(card.due_date ? new Date(card.due_date).toISOString().split('T')[0] : '');
      setTags(card.tags || []);
      setLinks(card.links || []);
      setComments(card.comments || []);
      setAssignedUserId(card.assigned_user_id || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setTags([]);
      setLinks([]);
      setComments([]);
      setAssignedUserId('');
    }
    setActiveTab('details');
  }, [card, open]);

  const handleSave = () => {
    onSave({
      title,
      description,
      priority,
      due_date: dueDate || undefined,
      tags: tags.length > 0 ? tags : undefined,
      links: links.length > 0 ? links : undefined,
      comments: comments.length > 0 ? comments : undefined,
      assigned_user_id: assignedUserId || undefined,
    });
    onClose();
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const addLink = () => {
    if (newLink && !links.includes(newLink)) {
      setLinks([...links, newLink]);
      setNewLink('');
    }
  };

  const addComment = () => {
    if (newComment.trim()) {
      setComments([...comments, {
        author: 'Você',
        text: newComment,
        date: new Date().toISOString()
      }]);
      setNewComment('');
    }
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/card/${card?.id || 'new'}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copiado!', description: 'O link foi copiado para a área de transferência.' });
  };

  const inviteCollaborator = () => {
    if (collaboratorEmail) {
      toast({ title: 'Convite enviado!', description: `Um convite foi enviado para ${collaboratorEmail}` });
      setCollaboratorEmail('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <span>{card ? 'Editar Card' : 'Novo Card'}</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="details" className="rounded-lg text-xs">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments" className="rounded-lg text-xs">Anexos</TabsTrigger>
            <TabsTrigger value="comments" className="rounded-lg text-xs">Comentários</TabsTrigger>
            <TabsTrigger value="share" className="rounded-lg text-xs">Compartilhar</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 mt-4">
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-0 pr-2">
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Digite o título do card..."
                  className="font-medium rounded-xl h-11"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Descrição</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Adicione uma descrição detalhada..."
                  rows={4}
                  className="rounded-xl resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">Prioridade</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          Baixa
                        </div>
                      </SelectItem>
                      <SelectItem value="medium" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          Média
                        </div>
                      </SelectItem>
                      <SelectItem value="high" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          Alta
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">Data Limite</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              {/* Atribuir a */}
              {employees.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">
                    <User className="h-4 w-4 inline mr-1" />
                    Atribuir a
                  </label>
                  <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Selecione um membro" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="" className="rounded-lg">Nenhum</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.user_id} value={emp.user_id} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {emp.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {emp.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Labels/Tags */}
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">
                  <Tag className="h-4 w-4 inline mr-1" />
                  Etiquetas
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Nova etiqueta..."
                    className="flex-1 rounded-xl h-10"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button onClick={addTag} size="icon" variant="secondary" className="rounded-xl h-10 w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5"
                      style={{ 
                        backgroundColor: labelColors[index % labelColors.length].value + '20',
                        color: labelColors[index % labelColors.length].value
                      }}
                      onClick={() => setTags(tags.filter(t => t !== tag))}
                    >
                      {tag}
                      <X className="h-3 w-3" />
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">
                  <Link2 className="h-4 w-4 inline mr-1" />
                  Links
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://exemplo.com"
                    className="flex-1 rounded-xl h-10"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                  />
                  <Button onClick={addLink} size="icon" variant="secondary" className="rounded-xl h-10 w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl group">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                        {link}
                      </a>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 rounded-lg"
                        onClick={() => setLinks(links.filter(l => l !== link))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            {/* Attachments Tab */}
            <TabsContent value="attachments" className="space-y-4 mt-0 pr-2">
              <div className="border-2 border-dashed border-muted-foreground/20 rounded-2xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Paperclip className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">Arraste arquivos aqui</h3>
                <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Image className="h-4 w-4 mr-2" />
                    Imagens
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <FileText className="h-4 w-4 mr-2" />
                    Documentos
                  </Button>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Tipos suportados: PDF, DOC, XLS, PNG, JPG (máx. 10MB)
              </div>
            </TabsContent>
            
            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4 mt-0 pr-2">
              <div className="flex gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">VC</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escreva um comentário..."
                    rows={2}
                    className="rounded-xl resize-none mb-2"
                  />
                  <Button size="sm" onClick={addComment} disabled={!newComment.trim()} className="rounded-xl">
                    Comentar
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Nenhum comentário ainda</p>
                  </div>
                ) : (
                  comments.map((comment, index) => (
                    <div key={index} className="flex gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-muted text-sm">
                          {comment.author.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            
            {/* Share Tab */}
            <TabsContent value="share" className="space-y-4 mt-0 pr-2">
              {/* Invite Collaborator */}
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">
                  <Users className="h-4 w-4 inline mr-1" />
                  Convidar Colaborador
                </label>
                <div className="flex gap-2">
                  <Input
                    value={collaboratorEmail}
                    onChange={(e) => setCollaboratorEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    type="email"
                    className="flex-1 rounded-xl h-11"
                  />
                  <Button onClick={inviteCollaborator} className="rounded-xl h-11">
                    Convidar
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              {/* Share Link */}
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">
                  <Share2 className="h-4 w-4 inline mr-1" />
                  Link Público
                </label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/card/${card?.id || 'preview'}`}
                    readOnly
                    className="flex-1 rounded-xl h-11 bg-muted/50"
                  />
                  <Button variant="outline" onClick={copyShareLink} className="rounded-xl h-11">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Qualquer pessoa com este link pode visualizar o card
                </p>
              </div>
              
              <Separator />
              
              {/* Assigned Members */}
              <div>
                <label className="text-sm font-medium mb-3 block text-muted-foreground">
                  Membros Atribuídos
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <Avatar className="h-9 w-9 border-2 border-background">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">VC</AvatarFallback>
                    </Avatar>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <Separator className="my-4" />
        
        <div className="flex justify-between">
          {card && onDelete && (
            <Button variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive rounded-xl">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()} className="rounded-xl">
              {card ? 'Salvar Alterações' : 'Criar Card'}
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
  const { employees } = useCompanyEmployees();
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

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedBoardColor, setSelectedBoardColor] = useState('#0079BF');
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
      color: selectedBoardColor || '#3B82F6'
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
    toast({ title: 'Lista criada!' });
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
    toast({ title: 'Lista atualizada!' });
  };

  const deleteColumn = async (columnId: string) => {
    await supabase.from('workflow_columns').delete().eq('id', columnId);
    loadColumns();
    loadCards();
    toast({ title: 'Lista excluída!' });
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

    let targetColumnId = activeCard.column_id;
    const overCard = cards.find(c => c.id === over.id);
    const overColumn = columns.find(col => col.id === over.id);
    
    if (overCard) {
      targetColumnId = overCard.column_id;
    } else if (overColumn) {
      targetColumnId = overColumn.id;
    }

    await supabase
      .from('workflow_cards')
      .update({ column_id: targetColumnId })
      .eq('id', activeCard.id);

    loadCards();
  };

  const currentWorkflow = workflows.find(w => w.id === selectedWorkflow);

  // Board background colors for Trello-style gallery
  const boardColors = [
    { value: '#0079BF', label: 'Azul' },
    { value: '#D29034', label: 'Dourado' },
    { value: '#519839', label: 'Verde' },
    { value: '#B04632', label: 'Vermelho' },
    { value: '#89609E', label: 'Roxo' },
    { value: '#CD5A91', label: 'Rosa' },
    { value: '#4BBF6B', label: 'Lima' },
    { value: '#00AECC', label: 'Ciano' },
    { value: '#838C91', label: 'Cinza' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Carregando quadros...</p>
        </div>
      </div>
    );
  }

  // Empty state - no boards (Trello-inspired)
  if (groups.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-indigo-50/30">
        {/* Hero section */}
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 mb-6">
              <CheckSquare className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
              Ello Flows
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Organize projetos, tarefas e equipes em quadros Kanban intuitivos.
            </p>
          </div>

          {/* Create board card - Trello style */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Criar seu primeiro quadro</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Um quadro é feito de listas e cartões. Use-o para gerenciar projetos, acompanhar tarefas ou organizar qualquer coisa.
                </p>

                {/* Board name input */}
                <div className="mb-5">
                  <label className="text-sm font-medium mb-2 block text-foreground/70">Título do quadro</label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ex: Marketing, Desenvolvimento, Sprint..."
                    className="rounded-xl h-11 text-sm"
                    autoFocus
                  />
                </div>

                {/* Color picker - Trello style */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-3 block text-foreground/70">Cor de fundo</label>
                  <div className="flex gap-2 flex-wrap">
                    {boardColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setSelectedBoardColor(color.value)}
                        className={`w-12 h-9 rounded-lg transition-all hover:opacity-90 hover:ring-2 hover:ring-offset-2 hover:ring-foreground/20 ${
                          selectedBoardColor === color.value ? 'ring-2 ring-offset-2 ring-foreground/40 scale-105' : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="mb-6 rounded-xl overflow-hidden" style={{ backgroundColor: selectedBoardColor }}>
                  <div className="p-4">
                    <div className="flex gap-2">
                      {['A Fazer', 'Em Progresso', 'Concluído'].map((col) => (
                        <div key={col} className="flex-1 bg-black/15 backdrop-blur-sm rounded-lg p-2">
                          <div className="text-white/90 text-xs font-semibold mb-2">{col}</div>
                          <div className="space-y-1.5">
                            <div className="bg-white rounded-md shadow-sm p-1.5">
                              <div className="h-1.5 bg-gray-200 rounded w-3/4" />
                            </div>
                            <div className="bg-white rounded-md shadow-sm p-1.5">
                              <div className="h-1.5 bg-gray-200 rounded w-1/2" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => { setShowGroupModal(false); createGroup(); }}
                  disabled={!groupName.trim()} 
                  size="lg"
                  className="w-full rounded-xl gap-2 text-base font-semibold h-12"
                  style={{ 
                    backgroundColor: selectedBoardColor, 
                    color: 'white',
                  }}
                >
                  <Plus className="h-5 w-5" />
                  Criar Quadro
                </Button>
              </div>
            </div>
          </div>

          {/* Template suggestions */}
          <div className="max-w-2xl mx-auto mt-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Comece com um template</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { name: 'Gestão de Projeto', color: '#0079BF', icon: '📋' },
                { name: 'Marketing', color: '#519839', icon: '📢' },
                { name: 'Vendas CRM', color: '#D29034', icon: '💰' },
                { name: 'Sprint Ágil', color: '#B04632', icon: '🚀' },
                { name: 'Onboarding', color: '#89609E', icon: '👋' },
                { name: 'Suporte', color: '#00AECC', icon: '🎧' },
              ].map((template) => (
                <button
                  key={template.name}
                  onClick={() => { setGroupName(template.name); setSelectedBoardColor(template.color); }}
                  className="group text-left rounded-xl overflow-hidden border border-border/50 hover:border-border hover:shadow-md transition-all"
                >
                  <div className="h-16 flex items-end p-3" style={{ backgroundColor: template.color }}>
                    <span className="text-white font-semibold text-sm drop-shadow-sm flex items-center gap-1.5">
                      <span className="text-base">{template.icon}</span>
                      {template.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Tem certeza que deseja excluir este quadro e todos seus fluxos?')) return;
    // Delete all workflows in this group first
    const groupWorkflows = workflows.filter(w => w.group_id === groupId);
    for (const wf of groupWorkflows) {
      await supabase.from('workflow_cards').delete().eq('column_id', columns.filter(c => c.workflow_id === wf.id).map(c => c.id)[0] || '');
      await supabase.from('workflow_columns').delete().eq('workflow_id', wf.id);
    }
    await supabase.from('workflows').delete().eq('group_id', groupId);
    await supabase.from('workflow_groups').delete().eq('id', groupId);
    setSelectedGroup('');
    setSelectedWorkflow('');
    loadGroups();
    toast({ title: 'Quadro excluído!' });
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Tem certeza que deseja excluir este fluxo e todos seus cards?')) return;
    const wfColumns = columns.filter(c => c.workflow_id === workflowId);
    for (const col of wfColumns) {
      await supabase.from('workflow_cards').delete().eq('column_id', col.id);
    }
    await supabase.from('workflow_columns').delete().eq('workflow_id', workflowId);
    await supabase.from('workflows').delete().eq('id', workflowId);
    setSelectedWorkflow('');
    loadWorkflows();
    toast({ title: 'Fluxo excluído!' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fluxos de Trabalho</h1>
              <p className="text-sm text-gray-500">Kanban para gerenciar projetos e processos</p>
            </div>
            <div className="flex items-center gap-2">
              {currentWorkflow && (
                <Badge variant="secondary" className="rounded-xl text-xs px-3 py-1">
                  {columns.length} listas • {cards.length} cards
                </Badge>
              )}
            </div>
          </div>
          
          {/* Board & Flow Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-48 rounded-xl border-gray-200 bg-white h-10">
                  <SelectValue placeholder="Selecione um quadro..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-amber-500" />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" onClick={() => setShowGroupModal(true)} className="rounded-xl border-gray-200 h-10 w-10" title="Novo quadro">
                <Plus className="h-4 w-4" />
              </Button>

              {selectedGroup && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl border-gray-200 h-10 w-10" title="Opções do quadro">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-xl w-48">
                    <DropdownMenuItem onClick={() => setShowGroupModal(true)} className="rounded-lg">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Novo Quadro
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => deleteGroup(selectedGroup)} className="text-destructive rounded-lg">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Quadro
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <Separator orientation="vertical" className="h-8 hidden sm:block" />
            
            {selectedGroup && (
              <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
                {workflows.map(workflow => (
                  <div key={workflow.id} className="flex items-center group">
                    <button
                      onClick={() => setSelectedWorkflow(workflow.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedWorkflow === workflow.id
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {workflow.name}
                    </button>
                    {selectedWorkflow === workflow.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-md hover:bg-gray-200 transition-colors ml-0.5">
                            <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl w-44">
                          <DropdownMenuItem onClick={() => deleteWorkflow(workflow.id)} className="text-destructive rounded-lg">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Fluxo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setShowWorkflowModal(true)}
                  className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {selectedWorkflow ? (
        <div className="px-6 pb-6 overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300" style={{ height: 'calc(100vh - 160px)' }}>
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-w-max">
              {columns.map(column => {
                const columnCards = cards.filter(c => c.column_id === column.id);
                
                return (
                  <TrelloColumn
                    key={column.id}
                    column={column}
                    cards={columnCards}
                    employees={employees}
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
              <div className="w-80 flex-shrink-0">
                <Button 
                  variant="outline"
                  className="w-full h-12 border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 text-muted-foreground hover:text-foreground rounded-2xl bg-muted/20"
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
                <div className="bg-card rounded-xl shadow-2xl border p-3 w-80 rotate-2">
                  <p className="font-medium text-sm">{activeCard.title}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      ) : workflows.length === 0 && selectedGroup ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum fluxo criado</h3>
            <p className="text-muted-foreground mb-4">Crie um fluxo para começar</p>
            <Button onClick={() => setShowWorkflowModal(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Criar Fluxo
            </Button>
          </div>
        </div>
      ) : null}

      {/* Modals */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Criar Quadro</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Board preview */}
            <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: selectedBoardColor }}>
              <div className="p-3 flex gap-2">
                {['Lista 1', 'Lista 2', 'Lista 3'].map((col) => (
                  <div key={col} className="flex-1 bg-black/15 backdrop-blur-sm rounded-md p-1.5">
                    <div className="text-white/80 text-[10px] font-medium mb-1">{col}</div>
                    <div className="space-y-1">
                      <div className="bg-white rounded shadow-sm p-1"><div className="h-1 bg-gray-200 rounded w-3/4" /></div>
                      <div className="bg-white rounded shadow-sm p-1"><div className="h-1 bg-gray-200 rounded w-1/2" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-sm font-medium mb-2.5 block text-foreground/70">Cor de fundo</label>
              <div className="flex gap-2 flex-wrap">
                {boardColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedBoardColor(color.value)}
                    className={`w-10 h-8 rounded-lg transition-all hover:opacity-90 ${
                      selectedBoardColor === color.value ? 'ring-2 ring-offset-2 ring-foreground/40 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground/70">Título do quadro <span className="text-destructive">*</span></label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Marketing, Desenvolvimento..."
                className="rounded-xl h-11"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowGroupModal(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button 
                onClick={createGroup} 
                disabled={!groupName.trim()} 
                className="rounded-xl text-white"
                style={{ backgroundColor: selectedBoardColor }}
              >
                Criar Quadro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkflowModal} onOpenChange={setShowWorkflowModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Novo Fluxo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Nome do Fluxo</label>
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Ex: Sprint 1, Campanha Q1..."
                className="rounded-xl h-11"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWorkflowModal(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button onClick={createWorkflow} disabled={!workflowName.trim()} className="rounded-xl">
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
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingColumn ? 'Editar Lista' : 'Nova Lista'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Nome da Lista</label>
              <Input
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="Ex: A Fazer, Em Progresso..."
                className="rounded-xl h-11"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-3 block text-muted-foreground">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {columnColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setColumnColor(color)}
                    className={`w-9 h-9 rounded-xl border-2 transition-all hover:scale-110 ${
                      columnColor === color ? 'border-foreground scale-110 shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowColumnModal(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button 
                onClick={editingColumn ? updateColumn : createColumn} 
                disabled={!columnName.trim()}
                className="rounded-xl"
              >
                {editingColumn ? 'Salvar' : 'Criar Lista'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EnhancedCardModal
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
        employees={employees}
      />
    </div>
  );
};

export default FluxosBoard;
