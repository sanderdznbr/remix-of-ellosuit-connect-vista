import React, { useState, useCallback, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, Eye, ArrowLeft, Undo, Redo, Copy, Trash2, 
  Layers, Grid, Palette, Type, Image, Mouse, Minus, 
  Space, Layout, Smartphone, Tablet, Monitor,
  Download, Share2, History, Settings
} from 'lucide-react';
import { AdvancedElementsPalette } from './AdvancedElementsPalette';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { ResponsiveCanvas } from './ResponsiveCanvas';
import { TemplateGallery } from './TemplateGallery';
import { FigmaImporter } from './FigmaImporter';
import { useEmailDesigns } from '@/hooks/useEmailDesigns';
import { useToast } from '@/hooks/use-toast';
import { DesignElement } from './types';

// Export the type for other components
export type AdvancedDesignElement = DesignElement;

interface AdvancedEmailDesignerProps {
  onBack: () => void;
  existingDesign?: any;
}

const AdvancedEmailDesigner: React.FC<AdvancedEmailDesignerProps> = ({ 
  onBack, 
  existingDesign 
}) => {
  const [designName, setDesignName] = useState(existingDesign?.name || 'Novo Design');
  const [elements, setElements] = useState<DesignElement[]>(
    existingDesign?.design_data?.elements || []
  );
  const [selectedElement, setSelectedElement] = useState<DesignElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState('design');
  const [history, setHistory] = useState<DesignElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  
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
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'text': return 'Seu texto aqui';
      case 'button': return 'Clique aqui';
      case 'header': return 'Cabeçalho Principal';
      case 'footer': return 'Rodapé';
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
          padding: '24px 16px'
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

  const duplicateElement = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const newElement: DesignElement = {
      ...element,
      id: `element-${Date.now()}`,
      position: { 
        x: element.position.x + 20, 
        y: element.position.y + 20 
      },
      name: `${element.name} (cópia)`
    };

    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
  };

  const deleteElement = (elementId: string) => {
    const newElements = elements.filter(el => el.id !== elementId);
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(null);
  };

  const updateElement = (elementId: string, updates: Partial<DesignElement>) => {
    const newElements = elements.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    );
    setElements(newElements);
    addToHistory(newElements);
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
      design_data: { 
        elements,
        version: '2.0',
        created_with: 'advanced-editor'
      },
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

  const exportDesign = () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${designName}.html`;
    a.click();
    URL.revokeObjectURL(url);
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
            <Button variant="outline" onClick={exportDesign}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
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
            
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('tablet')}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>

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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-4 p-1 m-2">
                <TabsTrigger value="design">
                  <Palette className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="layers">
                  <Layers className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="templates">
                  <Layout className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="figma">
                  <Image className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="design" className="h-full mt-0">
                <AdvancedElementsPalette />
              </TabsContent>

              <TabsContent value="layers" className="h-full mt-0">
                <LayersPanel 
                  elements={elements}
                  selectedElement={selectedElement}
                  onSelectElement={setSelectedElement}
                  onUpdateElement={updateElement}
                  onDeleteElement={deleteElement}
                  onDuplicateElement={duplicateElement}
                />
              </TabsContent>

              <TabsContent value="templates" className="h-full mt-0">
                <TemplateGallery onSelectTemplate={(template) => {
                  setElements(template.elements);
                  addToHistory(template.elements);
                }} />
              </TabsContent>

              <TabsContent value="figma" className="h-full mt-0">
                <FigmaImporter onImportDesign={(figmaElements) => {
                  setElements(figmaElements);
                  addToHistory(figmaElements);
                }} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Canvas */}
          <div className="flex-1 p-6 overflow-auto">
            <ResponsiveCanvas
              elements={elements}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onUpdateElement={updateElement}
              onDeleteElement={deleteElement}
              viewMode={viewMode}
              showGrid={showGrid}
            />
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-80 bg-white border-l overflow-y-auto">
            <PropertiesPanel
              selectedElement={selectedElement}
              onUpdateElement={updateElement}
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

export default AdvancedEmailDesigner;
