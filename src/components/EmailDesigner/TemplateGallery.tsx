
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Eye, Download } from 'lucide-react';
import { AdvancedDesignElement } from './AdvancedEmailDesigner';

interface Template {
  id: string;
  name: string;
  category: string;
  preview: string;
  elements: AdvancedDesignElement[];
}

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
}

const templates: Template[] = [
  {
    id: 'welcome-email',
    name: 'Email de Boas-vindas',
    category: 'Welcome',
    preview: '/api/placeholder/300/200',
    elements: [
      {
        id: 'header-1',
        type: 'header',
        content: 'Bem-vindo!',
        styles: {
          backgroundColor: '#3B82F6',
          color: '#ffffff',
          padding: '32px 24px',
          textAlign: 'center',
          fontSize: '28px',
          fontWeight: 'bold'
        },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 100 }
      },
      {
        id: 'content-1',
        type: 'text',
        content: 'Obrigado por se juntar a nós! Estamos animados para tê-lo conosco.',
        styles: {
          padding: '24px',
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#374151'
        },
        position: { x: 0, y: 100 },
        size: { width: 600, height: 80 }
      },
      {
        id: 'cta-1',
        type: 'button',
        content: 'Começar Agora',
        styles: {
          backgroundColor: '#10B981',
          color: '#ffffff',
          padding: '12px 32px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          margin: '24px auto',
          display: 'block'
        },
        position: { x: 200, y: 200 },
        size: { width: 200, height: 50 }
      }
    ]
  },
  {
    id: 'newsletter',
    name: 'Newsletter Moderna',
    category: 'Newsletter',
    preview: '/api/placeholder/300/200',
    elements: [
      {
        id: 'header-2',
        type: 'header',
        content: 'Newsletter Semanal',
        styles: {
          backgroundColor: '#F9FAFB',
          padding: '24px',
          borderBottom: '1px solid #E5E7EB',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#111827'
        },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 80 }
      },
      {
        id: 'content-2',
        type: 'text',
        content: 'Confira as últimas novidades e atualizações desta semana.',
        styles: {
          padding: '24px',
          fontSize: '16px',
          color: '#6B7280'
        },
        position: { x: 0, y: 80 },
        size: { width: 600, height: 60 }
      }
    ]
  },
  {
    id: 'promotion',
    name: 'Email Promocional',
    category: 'Promotion',
    preview: '/api/placeholder/300/200',
    elements: [
      {
        id: 'header-3',
        type: 'header',
        content: 'OFERTA ESPECIAL',
        styles: {
          backgroundColor: '#DC2626',
          color: '#ffffff',
          padding: '32px 24px',
          textAlign: 'center',
          fontSize: '32px',
          fontWeight: 'bold',
          letterSpacing: '2px'
        },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 120 }
      },
      {
        id: 'discount-badge',
        type: 'text',
        content: '50% OFF',
        styles: {
          backgroundColor: '#FCD34D',
          color: '#92400E',
          padding: '16px 32px',
          borderRadius: '50px',
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          margin: '24px auto',
          display: 'block',
          width: 'fit-content'
        },
        position: { x: 225, y: 140 },
        size: { width: 150, height: 60 }
      }
    ]
  }
];

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate }) => {
  const categories = Array.from(new Set(templates.map(t => t.category)));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Galeria de Templates</h3>
          <p className="text-sm text-gray-600">
            Escolha um template para começar rapidamente
          </p>
        </div>

        {categories.map(category => (
          <div key={category} className="space-y-3">
            <h4 className="font-medium text-gray-800">{category}</h4>
            <div className="space-y-3">
              {templates
                .filter(template => template.category === category)
                .map(template => (
                  <Card key={template.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Eye className="h-8 w-8 mx-auto mb-2" />
                        <span className="text-sm">Preview</span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-sm">{template.name}</h5>
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => onSelectTemplate(template)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Usar Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
