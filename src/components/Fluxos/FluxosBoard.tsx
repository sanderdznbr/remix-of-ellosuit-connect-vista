import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, MoreHorizontal, Calendar, GripVertical, X, Trash2, Edit2, Clock, CheckSquare, Star, Filter, Paperclip, MessageSquare, Link2, Users, Share2, Copy, ExternalLink, Image, FileText, Tag, User, FolderOpen, Upload, HardDrive, Loader2, Download, Eye } from 'lucide-react';
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
      className={`w-72 flex-shrink-0 flex flex-col bg-muted/50 rounded-2xl max-h-[calc(100vh-180px)] border transition-all ${
        isOver ? 'border-primary/30 bg-primary/5 scale-[1.01]' : 'border-border/40'
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
  companyId?: string | null;
  userId?: string;
}> = ({ card, open, onClose, onSave, onDelete, employees = [], companyId, userId }) => {
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
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size?: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setAttachments(card.attachments ? card.attachments.map(url => {
        const name = url.split('/').pop() || 'arquivo';
        const ext = name.split('.').pop()?.toLowerCase() || '';
        return { name: decodeURIComponent(name), url, type: ext };
      }) : []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setTags([]);
      setLinks([]);
      setComments([]);
      setAssignedUserId('');
      setAttachments([]);
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
      attachments: attachments.length > 0 ? attachments.map(a => a.url) : undefined,
    });
    onClose();
  };

  const getOrCreateDriveFolder = async (parentId: string | null, folderName: string): Promise<string | null> => {
    if (!companyId || !userId) return null;
    const query = supabase.from('document_folders').select('id').eq('company_id', companyId).eq('name', folderName);
    if (parentId) query.eq('parent_folder_id', parentId);
    else query.is('parent_folder_id', null);
    const { data } = await query.single();
    if (data) return data.id;
    const { data: newFolder, error } = await supabase.from('document_folders').insert({
      company_id: companyId, created_by: userId, name: folderName, parent_folder_id: parentId,
    }).select('id').single();
    if (error || !newFolder) return null;
    return newFolder.id;
  };

  const uploadFileToDrive = async (file: File, cardTitle: string) => {
    if (!companyId || !userId) return null;
    // Create folder structure: Fluxos / cardTitle
    const fluxosFolderId = await getOrCreateDriveFolder(null, 'Fluxos');
    if (!fluxosFolderId) return null;
    const safeName = cardTitle.trim() || 'Sem Título';
    const cardFolderId = await getOrCreateDriveFolder(fluxosFolderId, safeName);
    if (!cardFolderId) return null;

    const filePath = `${companyId}/fluxos/${safeName}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) { toast({ title: 'Erro ao enviar', description: uploadError.message, variant: 'destructive' }); return null; }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

    // Save reference in documents table
    await supabase.from('documents').insert({
      company_id: companyId, created_by: userId, name: file.name, file_type: file.type || 'application/octet-stream',
      file_url: urlData.publicUrl, file_size: file.size, folder_id: cardFolderId,
    });

    return { name: file.name, url: urlData.publicUrl, type: file.name.split('.').pop()?.toLowerCase() || '', size: file.size };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const cardName = title || card?.title || 'Sem Título';
    const newAttachments: typeof attachments = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast({ title: 'Arquivo muito grande', description: `${file.name} excede 10MB`, variant: 'destructive' }); continue; }
      const result = await uploadFileToDrive(file, cardName);
      if (result) newAttachments.push(result);
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (newAttachments.length > 0) toast({ title: `${newAttachments.length} arquivo(s) enviado(s)`, description: 'Salvo automaticamente no ElloDrive' });
  };

  const loadDriveFiles = async () => {
    if (!companyId) return;
    setLoadingDrive(true);
    const { data } = await supabase.from('documents').select('id, name, file_url, file_type, file_size')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(50);
    setDriveFiles(data || []);
    setLoadingDrive(false);
  };

  const addFromDrive = (doc: any) => {
    if (attachments.some(a => a.url === doc.file_url)) { toast({ title: 'Já adicionado' }); return; }
    setAttachments(prev => [...prev, { name: doc.name, url: doc.file_url, type: doc.file_type, size: doc.file_size }]);
    setShowDrivePicker(false);
    toast({ title: 'Arquivo adicionado do ElloDrive' });
  };

  const removeAttachment = (url: string) => {
    setAttachments(prev => prev.filter(a => a.url !== url));
  };

  const getFileIcon = (type: string) => {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'image'].some(t => type.includes(t))) return <Image className="h-4 w-4 text-primary" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
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
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.svg" />

              {/* Upload area */}
              <div
                className="border-2 border-dashed border-muted-foreground/20 rounded-2xl p-6 text-center hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Enviando e salvando no ElloDrive...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1 text-sm">Arraste arquivos ou clique para enviar</h3>
                    <p className="text-xs text-muted-foreground">PDF, DOC, XLS, PNG, JPG (máx. 10MB) • Salva automaticamente no ElloDrive</p>
                  </>
                )}
              </div>

              {/* Drive picker button */}
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={(e) => { e.stopPropagation(); setShowDrivePicker(true); loadDriveFiles(); }}
              >
                <HardDrive className="h-4 w-4" />
                Puxar do ElloDrive
              </Button>

              {/* Drive picker modal */}
              {showDrivePicker && (
                <div className="border border-border rounded-xl bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      Selecionar do ElloDrive
                    </h4>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowDrivePicker(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {loadingDrive ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum arquivo encontrado no Drive</p>
                  ) : (
                    <ScrollArea className="max-h-48">
                      <div className="space-y-1">
                        {driveFiles.map((doc: any) => (
                          <button
                            key={doc.id}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm hover:bg-muted transition-colors"
                            onClick={() => addFromDrive(doc)}
                          >
                            {getFileIcon(doc.file_type || '')}
                            <span className="truncate flex-1">{doc.name}</span>
                            {doc.file_size && <span className="text-[10px] text-muted-foreground">{formatSize(doc.file_size)}</span>}
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Attached files list */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Arquivos anexados ({attachments.length})</label>
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-muted/50 rounded-xl group">
                      {getFileIcon(att.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{att.name}</p>
                        {att.size && <p className="text-[10px] text-muted-foreground">{formatSize(att.size)}</p>}
                      </div>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </a>
                      <button onClick={() => removeAttachment(att.url)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                 <div className="flex items-center gap-2 flex-wrap">
                   {assignedUserId && employees.length > 0 && (() => {
                     const member = employees.find((e: any) => e.user_id === assignedUserId);
                     const initials = member?.name ? member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'VC';
                     return (
                       <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-1.5">
                         <Avatar className="h-7 w-7 border-2 border-background">
                           <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">{initials}</AvatarFallback>
                         </Avatar>
                         <span className="text-sm">{member?.name || 'Membro'}</span>
                         <button onClick={() => setAssignedUserId('')} className="ml-1 text-muted-foreground hover:text-foreground">
                           <X className="h-3 w-3" />
                         </button>
                       </div>
                     );
                   })()}
                   {!assignedUserId && (
                     <Avatar className="h-9 w-9 border-2 border-background">
                       <AvatarFallback className="bg-muted text-muted-foreground text-xs">VC</AvatarFallback>
                     </Avatar>
                   )}
                   <div className="relative">
                     <Button
                       variant="outline"
                       size="sm"
                       className="rounded-xl"
                       onClick={(e) => {
                         e.stopPropagation();
                         setShowMemberPicker(!showMemberPicker);
                       }}
                     >
                       <Plus className="h-4 w-4 mr-1" />
                       Adicionar
                     </Button>
                     {showMemberPicker && (
                       <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-popover border border-border rounded-xl shadow-lg p-2 space-y-1">
                         <p className="text-xs font-medium text-muted-foreground px-2 py-1">Selecionar membro</p>
                         {employees.length === 0 && (
                           <p className="text-xs text-muted-foreground px-2 py-2">Nenhum membro encontrado</p>
                         )}
                         {employees.map((emp: any) => {
                           const initials = emp.name ? emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '??';
                           const isSelected = assignedUserId === emp.user_id;
                           return (
                             <button
                               key={emp.user_id}
                               className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left text-sm transition-colors ${
                                 isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                               }`}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setAssignedUserId(isSelected ? '' : emp.user_id);
                                 setShowMemberPicker(false);
                               }}
                             >
                               <Avatar className="h-7 w-7">
                                 <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials}</AvatarFallback>
                               </Avatar>
                               <div className="flex-1 truncate">
                                 <span className="font-medium">{emp.name}</span>
                                 {emp.email && <p className="text-[10px] text-muted-foreground truncate">{emp.email}</p>}
                               </div>
                               {isSelected && <CheckSquare className="h-4 w-4 text-primary" />}
                             </button>
                           );
                         })}
                       </div>
                     )}
                   </div>
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
    
    setCards((data || []).map((d: any) => ({
      id: d.id,
      column_id: d.column_id,
      title: d.title,
      description: d.description,
      position: d.position,
      priority: d.priority,
      due_date: d.due_date,
      tags: d.tags,
      created_by: d.created_by,
      attachments: d.attachments,
      links: d.links,
      comments: d.comments as any,
      assigned_user_id: d.assigned_user_id,
    })));
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
        .update({ ...cardData, attachments: cardData.attachments || [] })
        .eq('id', selectedCard.id);
      toast({ title: 'Card atualizado!' });
    } else {
      await supabase.from('workflow_cards').insert({
        title: cardData.title || 'Novo Card',
        description: cardData.description,
        priority: cardData.priority || 'medium',
        due_date: cardData.due_date,
        tags: cardData.tags,
        attachments: cardData.attachments || [],
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

  // Track recently viewed workflows
  const [recentWorkflows, setRecentWorkflows] = useState<string[]>([]);
  const [showBoardHome, setShowBoardHome] = useState(!selectedWorkflow);
  const [allWorkflows, setAllWorkflows] = useState<(Workflow & { group_name: string; group_color: string })[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('fluxos_recent');
    if (stored) setRecentWorkflows(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const loadAllWorkflows = async () => {
      if (!companyId) return;
      const { data: wfs } = await supabase.from('workflows').select('*').eq('company_id', companyId);
      if (wfs) {
        const enriched = wfs.map(wf => {
          const grp = groups.find(g => g.id === wf.group_id);
          return { ...wf, group_name: grp?.name || '', group_color: grp?.color || '#6B7280' };
        });
        setAllWorkflows(enriched);
      }
    };
    if (groups.length > 0) loadAllWorkflows();
  }, [groups, companyId]);

  const openWorkflow = (workflowId: string, groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedWorkflow(workflowId);
    setShowBoardHome(false);
    const updated = [workflowId, ...recentWorkflows.filter(id => id !== workflowId)].slice(0, 6);
    setRecentWorkflows(updated);
    localStorage.setItem('fluxos_recent', JSON.stringify(updated));
  };

  const goHome = () => {
    setSelectedWorkflow('');
    setShowBoardHome(true);
  };

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

  // No separate empty state - always show gallery view

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

  const recentBoards = recentWorkflows
    .map(id => allWorkflows.find(w => w.id === id))
    .filter(Boolean) as (Workflow & { group_name: string; group_color: string })[];

  const renderModals = () => (
    <>
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Área de Trabalho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Nome</label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex: Marketing, Desenvolvimento..." className="rounded-xl h-11" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGroupModal(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={createGroup} disabled={!groupName.trim()} className="rounded-xl">Criar Área</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showWorkflowModal} onOpenChange={setShowWorkflowModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Novo Quadro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Nome do Quadro</label>
              <Input value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} placeholder="Ex: Sprint 1, Campanha Q1..." className="rounded-xl h-11" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWorkflowModal(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={createWorkflow} disabled={!workflowName.trim()} className="rounded-xl">Criar Quadro</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showColumnModal} onOpenChange={(open) => {
        setShowColumnModal(open);
        if (!open) { setEditingColumn(null); setColumnName(''); setColumnColor('#3B82F6'); }
      }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingColumn ? 'Editar Lista' : 'Nova Lista'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Nome da Lista</label>
              <Input value={columnName} onChange={(e) => setColumnName(e.target.value)} placeholder="Ex: A Fazer, Em Progresso..." className="rounded-xl h-11" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-3 block text-muted-foreground">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {columnColors.map((color) => (
                  <button key={color} onClick={() => setColumnColor(color)}
                    className={`w-9 h-9 rounded-xl border-2 transition-all hover:scale-110 ${columnColor === color ? 'border-foreground scale-110 shadow-md' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowColumnModal(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={editingColumn ? updateColumn : createColumn} disabled={!columnName.trim()} className="rounded-xl">
                {editingColumn ? 'Salvar' : 'Criar Lista'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <EnhancedCardModal
        card={selectedCard}
        open={showCardModal}
        onClose={() => { setShowCardModal(false); setSelectedCard(null); }}
        onSave={saveCard}
        onDelete={selectedCard ? () => { deleteCard(selectedCard.id); setShowCardModal(false); setSelectedCard(null); } : undefined}
        employees={employees}
        companyId={companyId}
        userId={user?.id}
      />
    </>
  );

  // Board Home View (Trello-style gallery)
  if (showBoardHome || !selectedWorkflow) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border/60 bg-background sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Fluxos de Trabalho</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Organize projetos, tarefas e equipes em quadros Kanban</p>
            </div>
            <Button onClick={() => setShowGroupModal(true)} className="rounded-2xl h-10 px-5 gap-2 font-semibold shadow-sm">
              <Plus className="h-4 w-4" />
              Nova Área de Trabalho
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
          {/* Recently Viewed */}
          {recentBoards.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Visualizado recentemente</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {recentBoards.map(board => (
                  <button
                    key={board.id}
                    onClick={() => openWorkflow(board.id, board.group_id)}
                    className="group text-left rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border border-border/40 hover:border-border"
                  >
                    <div className="h-24 relative" style={{ backgroundColor: board.group_color }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="font-bold text-white text-sm truncate drop-shadow-sm">{board.name}</h3>
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-card">
                      <span className="text-xs text-muted-foreground">{board.group_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Workspaces */}
          <section className="space-y-8">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Suas Áreas de Trabalho</h2>

            {groups.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                  <CheckSquare className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma área de trabalho ainda</h3>
                <p className="text-sm text-muted-foreground mb-5">Crie sua primeira área de trabalho para começar a organizar seus projetos.</p>
                <Button onClick={() => setShowGroupModal(true)} className="rounded-xl gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Área de Trabalho
                </Button>
              </div>
            )}

            {groups.map(group => {
              const groupWorkflows = allWorkflows.filter(w => w.group_id === group.id);
              return (
                <div key={group.id} className="space-y-4">
                  {/* Workspace Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-sm"
                        style={{ backgroundColor: group.color }}
                      >
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-semibold text-foreground text-base">{group.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs h-8 gap-1.5 border-border/60"
                        onClick={() => { setSelectedGroup(group.id); setShowWorkflowModal(true); }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Novo Quadro
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-48">
                          <DropdownMenuItem onClick={() => deleteGroup(group.id)} className="text-destructive rounded-lg">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Área
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Board Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {groupWorkflows.map(workflow => (
                      <button
                        key={workflow.id}
                        onClick={() => openWorkflow(workflow.id, group.id)}
                        className="group text-left rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border border-border/40 hover:border-border"
                      >
                        <div className="h-24 relative" style={{ backgroundColor: group.color }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Star className="h-4 w-4 text-white/80 hover:text-amber-300 transition-colors" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="font-bold text-white text-sm truncate drop-shadow-sm">{workflow.name}</h3>
                          </div>
                        </div>
                      </button>
                    ))}

                    {/* Create New Board Card */}
                    <button
                      onClick={() => { setSelectedGroup(group.id); setShowWorkflowModal(true); }}
                      className="h-24 rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 bg-muted/30 hover:bg-muted/50 flex items-center justify-center transition-all duration-200 group"
                    >
                      <span className="text-sm text-muted-foreground group-hover:text-foreground font-medium transition-colors">
                        Criar novo quadro
                      </span>
                    </button>
                  </div>

                  {/* Delete workflow action per board (via dropdown on hover, already in card) */}
                </div>
              );
            })}
          </section>
        </div>

        {/* Modals rendered below */}
        {renderModals()}
      </div>
    );
  }

  // Kanban Board View (when a workflow is selected)
  return (
    <div className="min-h-screen bg-background">
      {/* Kanban Header */}
      <div className="border-b border-border/60 bg-background sticky top-0 z-10">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={goHome} className="rounded-xl h-9 px-3 text-muted-foreground hover:text-foreground">
                ← Quadros
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                {(() => {
                  const currentGroup = groups.find(g => g.id === selectedGroup);
                  return currentGroup ? (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: currentGroup.color }}>
                      {currentGroup.name.charAt(0)}
                    </div>
                  ) : null;
                })()}
                <h1 className="text-lg font-bold text-foreground">{currentWorkflow?.name || 'Fluxo'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-xl text-xs px-3 py-1">
                {columns.length} listas • {cards.length} cards
              </Badge>
              {selectedGroup && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl h-9 w-9">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl w-48">
                    <DropdownMenuItem onClick={() => setShowWorkflowModal(true)} className="rounded-lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Quadro
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { deleteWorkflow(selectedWorkflow); goHome(); }} className="text-destructive rounded-lg">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Quadro
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {/* Workflow tabs */}
          {selectedGroup && workflows.length > 1 && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit">
              {workflows.map(wf => (
                <button
                  key={wf.id}
                  onClick={() => openWorkflow(wf.id, selectedGroup)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedWorkflow === wf.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {wf.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="px-6 pb-6 pt-4 overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30" style={{ height: 'calc(100vh - 140px)' }}>
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
            <div className="w-72 flex-shrink-0">
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
              <div className="bg-card rounded-xl shadow-2xl border p-3 w-72 rotate-2">
                <p className="font-medium text-sm">{activeCard.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {renderModals()}
    </div>
  );
};

export default FluxosBoard;
