
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, Move } from 'lucide-react';
import { AdvancedDesignElement } from './AdvancedEmailDesigner';

interface ResponsiveCanvasProps {
  elements: AdvancedDesignElement[];
  selectedElement: AdvancedDesignElement | null;
  onSelectElement: (element: AdvancedDesignElement | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<AdvancedDesignElement>) => void;
  onDeleteElement: (elementId: string) => void;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  showGrid: boolean;
}

export const ResponsiveCanvas: React.FC<ResponsiveCanvasProps> = ({
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  viewMode,
  showGrid,
}) => {
  const { setNodeRef } = useDroppable({ id: 'canvas' });

  const getCanvasWidth = () => {
    switch (viewMode) {
      case 'mobile': return 375;
      case 'tablet': return 768;
      case 'desktop': return 1200;
    }
  };

  const renderElement = (element: AdvancedDesignElement) => {
    if (element.visible === false) return null;

    const isSelected = selectedElement?.id === element.id;
    const isLocked = element.locked;

    const baseStyles: React.CSSProperties = {
      ...element.styles,
      position: 'absolute',
      left: element.position.x,
      top: element.position.y,
      width: element.size?.width || 'auto',
      height: element.size?.height || 'auto',
      cursor: isLocked ? 'not-allowed' : 'pointer',
      opacity: isLocked ? 0.7 : 1,
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isLocked) {
        onSelectElement(element);
      }
    };

    const content = (() => {
      switch (element.type) {
        case 'text':
          return (
            <div style={baseStyles} onClick={handleClick}>
              {element.content || 'Texto'}
            </div>
          );
        case 'button':
          return (
            <button style={baseStyles} onClick={handleClick}>
              {element.content || 'Botão'}
            </button>
          );
        case 'image':
          return (
            <img
              src={element.content || 'https://via.placeholder.com/200x150?text=Imagem'}
              alt="Design element"
              style={baseStyles}
              onClick={handleClick}
            />
          );
        case 'header':
          return (
            <header style={baseStyles} onClick={handleClick}>
              {element.content || 'Cabeçalho'}
            </header>
          );
        case 'footer':
          return (
            <footer style={baseStyles} onClick={handleClick}>
              {element.content || 'Rodapé'}
            </footer>
          );
        case 'container':
          return (
            <div style={baseStyles} onClick={handleClick}>
              <div className="w-full h-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm">
                {element.content || 'Container'}
              </div>
            </div>
          );
        case 'divider':
          return (
            <hr style={{ ...baseStyles, border: 'none' }} onClick={handleClick} />
          );
        case 'spacer':
          return (
            <div 
              style={baseStyles} 
              onClick={handleClick}
              className="border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs"
            >
              Espaçador
            </div>
          );
        default:
          return (
            <div style={baseStyles} onClick={handleClick}>
              {element.content || element.type}
            </div>
          );
      }
    })();

    return (
      <div key={element.id} className="relative group">
        {content}
        
        {isSelected && (
          <>
            {/* Selection outline */}
            <div 
              className="absolute inset-0 border-2 border-blue-500 pointer-events-none"
              style={{
                left: element.position.x - 2,
                top: element.position.y - 2,
                width: (element.size?.width || 200) + 4,
                height: (element.size?.height || 50) + 4,
              }}
            />
            
            {/* Toolbar */}
            <div 
              className="absolute flex items-center space-x-1 bg-blue-500 text-white px-2 py-1 rounded text-xs"
              style={{
                left: element.position.x,
                top: element.position.y - 32,
                zIndex: 1000,
              }}
            >
              <span className="font-medium">{element.name || element.type}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 text-white hover:bg-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteElement(element.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Resize handles */}
            <div 
              className="absolute w-2 h-2 bg-blue-500 border border-white cursor-se-resize"
              style={{
                right: element.position.x - (element.size?.width || 200) - 4,
                bottom: element.position.y - (element.size?.height || 50) - 4,
              }}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex justify-center">
      <Card 
        className="bg-white shadow-lg relative overflow-hidden"
        style={{ width: getCanvasWidth(), minHeight: 800 }}
      >
        <div
          ref={setNodeRef}
          className={`relative w-full min-h-full ${showGrid ? 'bg-grid' : ''}`}
          onClick={() => onSelectElement(null)}
          style={{
            backgroundImage: showGrid ? 
              'radial-gradient(circle, #e5e7eb 1px, transparent 1px)' : 'none',
            backgroundSize: showGrid ? '20px 20px' : 'none',
          }}
        >
          {elements.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">Canvas Vazio</div>
                <div className="text-sm">
                  Arraste elementos da paleta para começar seu design
                </div>
              </div>
            </div>
          ) : (
            elements.map(renderElement)
          )}
        </div>
      </Card>
    </div>
  );
};
