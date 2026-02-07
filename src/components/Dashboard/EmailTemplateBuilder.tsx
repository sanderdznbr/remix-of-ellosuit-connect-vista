import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Smartphone, 
  Monitor,
  Type,
  Image,
  Square,
  AlignLeft,
  List,
  Link2,
  Mail,
  Columns,
  Trash2,
  Copy,
  GripVertical,
  Settings2,
  Palette,
  Code,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface EmailElement {
  id: string;
  type: 'header' | 'paragraph' | 'button' | 'image' | 'divider' | 'spacer' | 'columns' | 'list' | 'social' | 'footer';
  content: any;
  styles: any;
}

const ELEMENT_TYPES = [
  { type: 'header', label: 'Título', icon: Type },
  { type: 'paragraph', label: 'Parágrafo', icon: AlignLeft },
  { type: 'button', label: 'Botão', icon: Square },
  { type: 'image', label: 'Imagem', icon: Image },
  { type: 'divider', label: 'Divisor', icon: AlignLeft },
  { type: 'spacer', label: 'Espaço', icon: Square },
  { type: 'columns', label: '2 Colunas', icon: Columns },
  { type: 'list', label: 'Lista', icon: List },
  { type: 'social', label: 'Redes Sociais', icon: Link2 },
  { type: 'footer', label: 'Rodapé', icon: Mail },
];

const createDefaultElement = (type: string): EmailElement => {
  const id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const defaults: Record<string, any> = {
    header: { content: { text: 'Título do Email', level: 'h1' }, styles: { color: '#1a1a1a', fontSize: '28px', textAlign: 'center' } },
    paragraph: { content: { text: 'Seu texto aqui. Clique para editar.' }, styles: { color: '#4a4a4a', fontSize: '16px', lineHeight: '1.6' } },
    button: { content: { text: 'Clique Aqui', url: '#' }, styles: { backgroundColor: '#3000E3', color: '#ffffff', padding: '14px 28px', borderRadius: '8px' } },
    image: { content: { src: '', alt: 'Imagem' }, styles: { width: '100%', maxWidth: '500px' } },
    divider: { content: {}, styles: { borderColor: '#e0e0e0', borderWidth: '1px' } },
    spacer: { content: {}, styles: { height: '32px' } },
    columns: { content: { left: 'Coluna Esquerda', right: 'Coluna Direita' }, styles: {} },
    list: { content: { items: ['Item 1', 'Item 2', 'Item 3'] }, styles: { color: '#4a4a4a' } },
    social: { content: { facebook: '#', instagram: '#', linkedin: '#', whatsapp: '#' }, styles: {} },
    footer: { content: { text: '© 2024 Sua Empresa. Todos os direitos reservados.', unsubscribe: '#' }, styles: { color: '#888888', fontSize: '12px' } },
  };

  return { id, type: type as any, ...defaults[type] };
};

// Sortable Element Component
const SortableElement: React.FC<{ 
  element: EmailElement; 
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}> = ({ element, isSelected, onSelect, onDelete, onDuplicate }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderElement = () => {
    switch (element.type) {
      case 'header':
        return (
          <div style={{ ...element.styles, textAlign: element.styles.textAlign }}>
            {element.content.level === 'h1' && <h1 style={{ fontSize: element.styles.fontSize, color: element.styles.color, margin: 0 }}>{element.content.text}</h1>}
            {element.content.level === 'h2' && <h2 style={{ fontSize: element.styles.fontSize, color: element.styles.color, margin: 0 }}>{element.content.text}</h2>}
            {element.content.level === 'h3' && <h3 style={{ fontSize: element.styles.fontSize, color: element.styles.color, margin: 0 }}>{element.content.text}</h3>}
          </div>
        );
      case 'paragraph':
        return <p style={{ ...element.styles, margin: 0 }}>{element.content.text}</p>;
      case 'button':
        return (
          <div style={{ textAlign: 'center' }}>
            <a 
              href={element.content.url} 
              style={{ 
                display: 'inline-block',
                backgroundColor: element.styles.backgroundColor,
                color: element.styles.color,
                padding: element.styles.padding,
                borderRadius: element.styles.borderRadius,
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              {element.content.text}
            </a>
          </div>
        );
      case 'image':
        return (
          <div style={{ textAlign: 'center' }}>
            {element.content.src ? (
              <img src={element.content.src} alt={element.content.alt} style={{ maxWidth: element.styles.maxWidth, width: element.styles.width }} />
            ) : (
              <div className="bg-muted h-32 flex items-center justify-center rounded-lg border-2 border-dashed">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        );
      case 'divider':
        return <hr style={{ border: 'none', borderTop: `${element.styles.borderWidth} solid ${element.styles.borderColor}`, margin: '16px 0' }} />;
      case 'spacer':
        return <div style={{ height: element.styles.height }} />;
      case 'columns':
        return (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>{element.content.left}</div>
            <div style={{ flex: 1, padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>{element.content.right}</div>
          </div>
        );
      case 'list':
        return (
          <ul style={{ ...element.styles, paddingLeft: '20px', margin: 0 }}>
            {element.content.items.map((item: string, i: number) => (
              <li key={i} style={{ marginBottom: '8px' }}>{item}</li>
            ))}
          </ul>
        );
      case 'social':
        return (
          <div style={{ textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {element.content.facebook && <Badge variant="outline">Facebook</Badge>}
            {element.content.instagram && <Badge variant="outline">Instagram</Badge>}
            {element.content.linkedin && <Badge variant="outline">LinkedIn</Badge>}
            {element.content.whatsapp && <Badge variant="outline">WhatsApp</Badge>}
          </div>
        );
      case 'footer':
        return (
          <div style={{ textAlign: 'center', ...element.styles }}>
            <p style={{ margin: 0 }}>{element.content.text}</p>
            <a href={element.content.unsubscribe} style={{ color: '#888', fontSize: '11px' }}>Cancelar inscrição</a>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 rounded-lg p-4 transition-all cursor-pointer ${
        isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted-foreground/30'
      }`}
      onClick={onSelect}
    >
      {/* Drag Handle & Actions */}
      <div className={`absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
        <button 
          {...attributes} 
          {...listeners}
          className="p-1.5 bg-muted rounded-md hover:bg-muted-foreground/20 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      
      <div className={`absolute -right-3 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
        <button 
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="p-1.5 bg-muted rounded-md hover:bg-muted-foreground/20"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 bg-destructive/10 rounded-md hover:bg-destructive/20"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>

      {renderElement()}
    </div>
  );
};

const EmailTemplateBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [elements, setElements] = useState<EmailElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'elements' | 'style' | 'code'>('elements');
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Fetch company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (data) setCompanyId(data.company_id);
    };
    fetchCompanyId();
  }, [user]);

  const addElement = (type: string) => {
    const newElement = createDefaultElement(type);
    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  const duplicateElement = (id: string) => {
    const elementToDuplicate = elements.find(el => el.id === id);
    if (!elementToDuplicate) return;
    
    const newElement = { 
      ...elementToDuplicate, 
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: { ...elementToDuplicate.content },
      styles: { ...elementToDuplicate.styles }
    };
    
    const index = elements.findIndex(el => el.id === id);
    const newElements = [...elements];
    newElements.splice(index + 1, 0, newElement);
    setElements(newElements);
  };

  const updateElement = (id: string, updates: Partial<EmailElement>) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      setElements(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const generateHTML = (): string => {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
  </style>
</head>
<body>
  <div class="email-container">`;

    elements.forEach(el => {
      switch (el.type) {
        case 'header':
          html += `<${el.content.level} style="color: ${el.styles.color}; font-size: ${el.styles.fontSize}; text-align: ${el.styles.textAlign}; margin: 16px 0;">${el.content.text}</${el.content.level}>`;
          break;
        case 'paragraph':
          html += `<p style="color: ${el.styles.color}; font-size: ${el.styles.fontSize}; line-height: ${el.styles.lineHeight}; margin: 16px 0;">${el.content.text}</p>`;
          break;
        case 'button':
          html += `<div style="text-align: center; margin: 24px 0;"><a href="${el.content.url}" style="display: inline-block; background-color: ${el.styles.backgroundColor}; color: ${el.styles.color}; padding: ${el.styles.padding}; border-radius: ${el.styles.borderRadius}; text-decoration: none; font-weight: 600;">${el.content.text}</a></div>`;
          break;
        case 'image':
          if (el.content.src) {
            html += `<div style="text-align: center; margin: 16px 0;"><img src="${el.content.src}" alt="${el.content.alt}" style="max-width: ${el.styles.maxWidth}; width: ${el.styles.width}; height: auto;"></div>`;
          }
          break;
        case 'divider':
          html += `<hr style="border: none; border-top: ${el.styles.borderWidth} solid ${el.styles.borderColor}; margin: 24px 0;">`;
          break;
        case 'spacer':
          html += `<div style="height: ${el.styles.height};"></div>`;
          break;
        case 'list':
          html += `<ul style="color: ${el.styles.color}; padding-left: 20px; margin: 16px 0;">${el.content.items.map((item: string) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}</ul>`;
          break;
        case 'footer':
          html += `<div style="text-align: center; color: ${el.styles.color}; font-size: ${el.styles.fontSize}; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;"><p style="margin: 0 0 8px 0;">${el.content.text}</p><a href="${el.content.unsubscribe}" style="color: #888; font-size: 11px;">Cancelar inscrição</a></div>`;
          break;
      }
    });

    html += `
  </div>
</body>
</html>`;

    return html;
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast({ title: "Nome obrigatório", description: "Digite um nome para o template", variant: "destructive" });
      return;
    }

    if (!user || !companyId) {
      toast({ title: "Erro", description: "Usuário não autenticado", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const htmlContent = generateHTML();
      
      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: templateName,
          description: templateDescription,
          html_content: htmlContent,
          category: 'custom',
          user_id: user.id,
          company_id: companyId
        });

      if (error) throw error;

      toast({ title: "Template salvo!", description: "Seu template foi salvo com sucesso" });
      navigate('/dashboard/email');
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/email')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <Input 
                placeholder="Nome do Template"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="text-lg font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0"
              />
              <Input 
                placeholder="Descrição (opcional)"
                value={templateDescription}
                onChange={e => setTemplateDescription(e.target.value)}
                className="text-sm text-muted-foreground border-none shadow-none px-0 h-auto focus-visible:ring-0"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Preview Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            
            <Button onClick={saveTemplate} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Template
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Elements & Properties */}
        <div className="w-80 border-r bg-card flex flex-col">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b h-12 px-4">
              <TabsTrigger value="elements" className="gap-2">
                <Palette className="h-4 w-4" />
                Elementos
              </TabsTrigger>
              <TabsTrigger value="style" className="gap-2" disabled={!selectedElement}>
                <Settings2 className="h-4 w-4" />
                Estilo
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-2">
                <Code className="h-4 w-4" />
                HTML
              </TabsTrigger>
            </TabsList>

            <TabsContent value="elements" className="flex-1 p-4 mt-0 overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-4">Clique para adicionar ao email:</p>
              <div className="grid grid-cols-2 gap-2">
                {ELEMENT_TYPES.map(({ type, label, icon: Icon }) => (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-auto py-3 flex-col gap-2 hover:border-primary hover:bg-primary/5"
                    onClick={() => addElement(type)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="style" className="flex-1 p-4 mt-0 overflow-y-auto">
              {selectedElementData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge>{selectedElementData.type}</Badge>
                  </div>
                  
                  {/* Content editing based on type */}
                  {selectedElementData.type === 'header' && (
                    <div className="space-y-3">
                      <div>
                        <Label>Texto</Label>
                        <Input 
                          value={selectedElementData.content.text}
                          onChange={e => updateElement(selectedElementData.id, { content: { ...selectedElementData.content, text: e.target.value }})}
                        />
                      </div>
                      <div>
                        <Label>Nível</Label>
                        <div className="flex gap-2">
                          {['h1', 'h2', 'h3'].map(level => (
                            <Button
                              key={level}
                              variant={selectedElementData.content.level === level ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(selectedElementData.id, { content: { ...selectedElementData.content, level }})}
                            >
                              {level.toUpperCase()}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Cor</Label>
                        <Input 
                          type="color"
                          value={selectedElementData.styles.color}
                          onChange={e => updateElement(selectedElementData.id, { styles: { ...selectedElementData.styles, color: e.target.value }})}
                        />
                      </div>
                    </div>
                  )}

                  {selectedElementData.type === 'paragraph' && (
                    <div className="space-y-3">
                      <div>
                        <Label>Texto</Label>
                        <Textarea 
                          value={selectedElementData.content.text}
                          onChange={e => updateElement(selectedElementData.id, { content: { ...selectedElementData.content, text: e.target.value }})}
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label>Cor</Label>
                        <Input 
                          type="color"
                          value={selectedElementData.styles.color}
                          onChange={e => updateElement(selectedElementData.id, { styles: { ...selectedElementData.styles, color: e.target.value }})}
                        />
                      </div>
                    </div>
                  )}

                  {selectedElementData.type === 'button' && (
                    <div className="space-y-3">
                      <div>
                        <Label>Texto</Label>
                        <Input 
                          value={selectedElementData.content.text}
                          onChange={e => updateElement(selectedElementData.id, { content: { ...selectedElementData.content, text: e.target.value }})}
                        />
                      </div>
                      <div>
                        <Label>URL</Label>
                        <Input 
                          value={selectedElementData.content.url}
                          onChange={e => updateElement(selectedElementData.id, { content: { ...selectedElementData.content, url: e.target.value }})}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label>Cor do Fundo</Label>
                        <Input 
                          type="color"
                          value={selectedElementData.styles.backgroundColor}
                          onChange={e => updateElement(selectedElementData.id, { styles: { ...selectedElementData.styles, backgroundColor: e.target.value }})}
                        />
                      </div>
                      <div>
                        <Label>Cor do Texto</Label>
                        <Input 
                          type="color"
                          value={selectedElementData.styles.color}
                          onChange={e => updateElement(selectedElementData.id, { styles: { ...selectedElementData.styles, color: e.target.value }})}
                        />
                      </div>
                    </div>
                  )}

                  {selectedElementData.type === 'image' && (
                    <div className="space-y-3">
                      <div>
                        <Label>URL da Imagem</Label>
                        <Input 
                          value={selectedElementData.content.src}
                          onChange={e => updateElement(selectedElementData.id, { content: { ...selectedElementData.content, src: e.target.value }})}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label>Texto alternativo</Label>
                        <Input 
                          value={selectedElementData.content.alt}
                          onChange={e => updateElement(selectedElementData.id, { content: { ...selectedElementData.content, alt: e.target.value }})}
                        />
                      </div>
                    </div>
                  )}

                  {selectedElementData.type === 'footer' && (
                    <div className="space-y-3">
                      <div>
                        <Label>Texto</Label>
                        <Textarea 
                          value={selectedElementData.content.text}
                          onChange={e => updateElement(selectedElementData.id, { content: { ...selectedElementData.content, text: e.target.value }})}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Link de cancelamento</Label>
                        <Input 
                          value={selectedElementData.content.unsubscribe}
                          onChange={e => updateElement(selectedElementData.id, { content: { ...selectedElementData.content, unsubscribe: e.target.value }})}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Selecione um elemento para editar</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="code" className="flex-1 p-4 mt-0 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>HTML Gerado</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generateHTML());
                      toast({ title: "Copiado!" });
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                </div>
                <Textarea 
                  value={generateHTML()}
                  readOnly
                  className="font-mono text-xs h-[400px]"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-muted/30 p-8 overflow-y-auto">
          <div 
            className={`mx-auto bg-white shadow-xl rounded-lg transition-all ${
              previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]'
            }`}
          >
            <div className="p-6 min-h-[500px]">
              {elements.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <Palette className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Comece a construir seu email</p>
                  <p className="text-sm">Adicione elementos do painel esquerdo</p>
                </div>
              ) : (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {elements.map(element => (
                        <SortableElement
                          key={element.id}
                          element={element}
                          isSelected={selectedElement === element.id}
                          onSelect={() => setSelectedElement(element.id)}
                          onDelete={() => deleteElement(element.id)}
                          onDuplicate={() => duplicateElement(element.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateBuilder;
