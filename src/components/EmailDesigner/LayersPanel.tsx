
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Eye, EyeOff, Lock, Unlock, Copy, Trash2, 
  ChevronDown, ChevronRight, MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AdvancedDesignElement } from './AdvancedEmailDesigner';

interface LayersPanelProps {
  elements: AdvancedDesignElement[];
  selectedElement: AdvancedDesignElement | null;
  onSelectElement: (element: AdvancedDesignElement | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<AdvancedDesignElement>) => void;
  onDeleteElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
}) => {
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState<string | null>(null);

  const toggleExpanded = (elementId: string) => {
    const newExpanded = new Set(expandedElements);
    if (newExpanded.has(elementId)) {
      newExpanded.delete(elementId);
    } else {
      newExpanded.add(elementId);
    }
    setExpandedElements(newExpanded);
  };

  const handleNameEdit = (elementId: string, newName: string) => {
    onUpdateElement(elementId, { name: newName });
    setEditingName(null);
  };

  const toggleVisibility = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (element) {
      onUpdateElement(elementId, { visible: !element.visible });
    }
  };

  const toggleLock = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (element) {
      onUpdateElement(elementId, { locked: !element.locked });
    }
  };

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'button': return '🔘';
      case 'container': return '📦';
      case 'header': return '🔝';
      case 'footer': return '🔚';
      default: return '🔹';
    }
  };

  const renderLayer = (element: AdvancedDesignElement, depth = 0) => {
    const isSelected = selectedElement?.id === element.id;
    const isExpanded = expandedElements.has(element.id);
    const hasChildren = element.children && element.children.length > 0;

    return (
      <div key={element.id} className="select-none">
        <div
          className={`
            flex items-center py-2 px-2 rounded-md cursor-pointer
            hover:bg-gray-100 transition-colors
            ${isSelected ? 'bg-blue-100 border border-blue-300' : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelectElement(element)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 mr-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(element.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}

          <span className="mr-2 text-sm">
            {getElementIcon(element.type)}
          </span>

          <div className="flex-1 min-w-0">
            {editingName === element.id ? (
              <Input
                value={element.name || element.type}
                onChange={(e) => handleNameEdit(element.id, e.target.value)}
                onBlur={() => setEditingName(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNameEdit(element.id, e.currentTarget.value);
                  }
                  if (e.key === 'Escape') {
                    setEditingName(null);
                  }
                }}
                className="h-6 text-xs"
                autoFocus
              />
            ) : (
              <span 
                className="text-sm truncate block"
                onDoubleClick={() => setEditingName(element.id)}
              >
                {element.name || element.type}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleVisibility(element.id);
              }}
            >
              {element.visible !== false ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3 text-gray-400" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleLock(element.id);
              }}
            >
              {element.locked ? (
                <Lock className="h-3 w-3 text-red-500" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDuplicateElement(element.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDeleteElement(element.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {element.children!.map(child => renderLayer(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full rounded-none border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Camadas</CardTitle>
        <p className="text-sm text-gray-600">
          Gerencie a hierarquia dos elementos
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-1">
            {elements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">Nenhuma camada</div>
                <div className="text-xs mt-1">
                  Adicione elementos para visualizar as camadas
                </div>
              </div>
            ) : (
              elements.map(element => renderLayer(element))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
