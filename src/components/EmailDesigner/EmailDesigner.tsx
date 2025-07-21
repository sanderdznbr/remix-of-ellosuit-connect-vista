import React, { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Eye, ArrowLeft, Undo, Redo } from 'lucide-react';
import { ElementsPalette } from './ElementsPalette';
import { DesignCanvas } from './DesignCanvas';
import { useEmailDesigns } from '@/hooks/useEmailDesigns';
import { useToast } from '@/hooks/use-toast';

interface DesignElement {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'container' | 'header' | 'footer' | 'grid' | 'quote' | 'rating' | 'testimonial' | 'address' | 'phone' | 'email' | 'calendar';
  content?: string;
  children?: DesignElement[];
  styles: {
    [key: string]: any;
  };
  position: { x: number; y: number };
  size: { width: number; height: number };
  locked?: boolean;
  visible?: boolean;
  name?: string;
}

interface EmailDesignerProps {
  onBack: () => void;
  existingDesign?: any;
}

const EmailDesigner: React.FC<EmailDesignerProps> = ({ onBack, existingDesign }) => {
  const [designName, setDesignName] = useState(existingDesign?.name || 'Novo Design');
  const [elements, setElements] = useState<DesignElement[]>(
    existingDesign?.design_data?.elements || []
  );
  const [selectedElement, setSelectedElement] = useState<DesignElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<DesignElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const { createDesign, updateDesign } = useEmailDesigns();
  const { toast } = useToast();

  const addToHistory = useCallback((newElements: DesignElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.data.current?.type === 'palette-item' && over.id === 'canvas') {
      const newElement: DesignElement = {
        id: `element-${Date.now()}`,
        type: active.data.current.elementType,
        content: getDefaultContent(active.data.current.elementType),
        styles: getDefaultStyles(active.data.current.elementType),
        position: { x: 50, y: 50 },
        size: { width: 200, height: 50 },
        name: `${active.data.current.elementType} ${elements.length + 1}`
      };
      
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
    }

    if (active.data.current?.type === 'canvas-item') {
      const activeIndex = elements.findIndex(el => el.id === active.id);
      const overIndex = elements.findIndex(el => el.id === over.id);

      if (activeIndex !== overIndex) {
        const newElements = arrayMove(elements, activeIndex, overIndex);
        setElements(newElements);
        addToHistory(newElements);
      }
    }
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'text': return 'Seu texto aqui';
      case 'button': return 'Clique aqui';
      case 'header': return 'Cabeçalho Principal';
      case 'footer': return 'Rodapé';
      case 'quote': return 'Citação inspiradora';
      case 'testimonial': return 'Depoimento do cliente';
      case 'address': return 'Endereço da empresa';
      case 'phone': return '(11) 99999-9999';
      case 'email': return 'contato@empresa.com';
      case 'calendar': return 'Data do evento';
      default: return '';
    }
  };

  const getDefaultStyles = (type: string) => {
    const baseStyles = {
      padding: '16px',
      margin: '8px',
      borderRadius: '4px',
    };

    switch (type) {
      case 'text':
        return { 
          ...baseStyles, 
          fontSize: '16px', 
          color: '#374151', 
          fontFamily: 'Inter, sans-serif',
          lineHeight: '1.5'
        };
      case 'button':
        return { 
          ...baseStyles, 
          backgroundColor: '#3B82F6', 
          color: '#ffffff', 
          border: 'none',
          cursor: 'pointer',
          fontWeight: '600',
          textAlign: 'center',
          padding: '12px 24px'
        };
      case 'header':
        return {
          ...baseStyles,
          backgroundColor: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
          padding: '24px 16px',
          fontSize: '24px',
          fontWeight: 'bold'
        };
      case 'footer':
        return {
          ...baseStyles,
          backgroundColor: '#374151',
          color: '#F9FAFB',
          padding: '24px 16px'
        };
      case 'container':
        return {
          ...baseStyles,
          backgroundColor: '#ffffff',
          border: '1px solid #E5E7EB',
          minHeight: '100px'
        };
      case 'quote':
        return {
          ...baseStyles,
          fontStyle: 'italic',
          borderLeft: '4px solid #3B82F6',
          paddingLeft: '24px',
          fontSize: '18px'
        };
      case 'testimonial':
        return {
          ...baseStyles,
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          fontStyle: 'italic'
        };
      default:
        return baseStyles;
    }
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements([...history[historyIndex - 1]]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements([...history[historyIndex + 1]]);
    }
  }, [history, historyIndex]);

  const updateElement = (elementId: string, updates: Partial<DesignElement>) => {
    const newElements = elements.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    );
    setElements(newElements);
    addToHistory(newElements);
  };

  const deleteElement = (elementId: string) => {
    const newElements = elements.filter(el => el.id !== elementId);
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(null);
  };

  const handleSave = async () => {
    if (!designName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um nome para o design",
        variant: "destructive"
      });
      return;
    }

    const designData = {
      name: designName,
      design_data: { elements },
      is_published: false
    };

    try {
      if (existingDesign) {
        await updateDesign(existingDesign.id, designData);
      } else {
        await createDesign(designData);
      }
      
      toast({
        title: "Sucesso",
        description: "Design salvo com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar design",
        variant: "destructive"
      });
    }
  };

  const generateHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${designName}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Inter, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="container">
          ${elements.map(el => renderElementToHTML(el)).join('')}
        </div>
      </body>
      </html>
    `;
  };

  const renderElementToHTML = (element: DesignElement): string => {
    const styles = Object.entries(element.styles)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ');

    switch (element.type) {
      case 'text':
        return `<div style="${styles}">${element.content}</div>`;
      case 'button':
        return `<button style="${styles}">${element.content}</button>`;
      case 'image':
        return `<img src="${element.content}" style="${styles}" alt="Image" />`;
      case 'header':
        return `<header style="${styles}">${element.content}</header>`;
      case 'footer':
        return `<footer style="${styles}">${element.content}</footer>`;
      case 'quote':
        return `<blockquote style="${styles}">${element.content}</blockquote>`;
      case 'testimonial':
        return `<div style="${styles}">${element.content}</div>`;
      default:
        return `<div style="${styles}">${element.content || ''}</div>`;
    }
  };

  if (showPreview) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Editor
          </Button>
          <h2 className="text-xl font-semibold">{designName}</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => {
              const html = generateHTML();
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${designName}.html`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
              Baixar HTML
            </Button>
          </div>
        </div>
        <div className="flex-1 p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
            <iframe
              srcDoc={generateHTML()}
              className="w-full h-full min-h-[600px] rounded-lg"
              title="Email Preview"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Input
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="w-64 font-semibold"
              placeholder="Nome do design"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-80 bg-white border-r overflow-y-auto">
            <Tabs defaultValue="elements" className="h-full">
              <TabsList className="grid w-full grid-cols-2 p-1 m-2">
                <TabsTrigger value="elements">Elementos</TabsTrigger>
                <TabsTrigger value="properties">Propriedades</TabsTrigger>
              </TabsList>

              <TabsContent value="elements" className="h-full mt-0">
                <ElementsPalette />
              </TabsContent>

              <TabsContent value="properties" className="h-full mt-0 p-4">
                {selectedElement ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Propriedades</h3>
                    <div>
                      <label className="block text-sm font-medium mb-1">Conteúdo</label>
                      <Input
                        value={selectedElement.content || ''}
                        onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Nome</label>
                      <Input
                        value={selectedElement.name || ''}
                        onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
                      />
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteElement(selectedElement.id)}
                    >
                      Excluir Elemento
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <p>Selecione um elemento para editar suas propriedades</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Canvas */}
          <div className="flex-1 p-6 overflow-auto">
            <DesignCanvas
              elements={elements}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onUpdateElement={updateElement}
              onDeleteElement={deleteElement}
            />
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="bg-blue-100 border-2 border-blue-300 p-3 rounded-lg shadow-lg opacity-90">
            <div className="text-sm font-medium text-blue-800">
              Arrastando elemento...
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default EmailDesigner;
