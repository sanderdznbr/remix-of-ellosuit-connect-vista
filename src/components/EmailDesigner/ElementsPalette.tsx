
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Type, Image, Mouse, Minus, Space, Layout, 
  Navigation, SquareStack, Grid3X3, Container
} from 'lucide-react';

const elementCategories = [
  {
    name: 'Básicos',
    elements: [
      { id: 'text', label: 'Texto', icon: Type, type: 'text', description: 'Bloco de texto editável' },
      { id: 'image', label: 'Imagem', icon: Image, type: 'image', description: 'Imagem responsiva' },
      { id: 'button', label: 'Botão', icon: Mouse, type: 'button', description: 'Botão de ação' },
      { id: 'divider', label: 'Divisor', icon: Minus, type: 'divider', description: 'Linha divisória' },
      { id: 'spacer', label: 'Espaçador', icon: Space, type: 'spacer', description: 'Espaço em branco' },
    ]
  },
  {
    name: 'Layout',
    elements: [
      { id: 'container', label: 'Container', icon: Container, type: 'container', description: 'Container flexível' },
      { id: 'grid', label: 'Grid', icon: Grid3X3, type: 'grid', description: 'Layout em grade' },
      { id: 'header', label: 'Cabeçalho', icon: Navigation, type: 'header', description: 'Seção de cabeçalho' },
      { id: 'footer', label: 'Rodapé', icon: SquareStack, type: 'footer', description: 'Seção de rodapé' },
    ]
  }
];

interface DraggableElementProps {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  type: string;
  description: string;
}

const DraggableElement: React.FC<DraggableElementProps> = ({ 
  id, 
  label, 
  icon: Icon, 
  type, 
  description 
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: {
      type: 'palette-item',
      elementType: type,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        group flex flex-col items-center p-3 border-2 border-dashed border-gray-200 
        rounded-lg cursor-grab hover:border-blue-300 hover:bg-blue-50/50 
        transition-all duration-200 min-h-[80px] justify-center
        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-105'}
      `}
    >
      <Icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600 mb-2" />
      <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700 text-center">
        {label}
      </span>
      <span className="text-xs text-gray-500 group-hover:text-blue-500 text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {description}
      </span>
    </div>
  );
};

export const ElementsPalette: React.FC = () => {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Elementos</h3>
          <p className="text-sm text-gray-600 mb-4">
            Arraste os elementos para o canvas para construir seu design
          </p>
        </div>

        {elementCategories.map((category) => (
          <Card key={category.name} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">
                {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {category.elements.map((element) => (
                <DraggableElement
                  key={element.id}
                  id={element.id}
                  label={element.label}
                  icon={element.icon}
                  type={element.type}
                  description={element.description}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
