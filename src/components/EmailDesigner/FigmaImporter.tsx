
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Link, Download, ExternalLink, RefreshCw, 
  CheckCircle, AlertCircle, Figma 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdvancedDesignElement } from './AdvancedEmailDesigner';

interface FigmaImporterProps {
  onImportDesign: (elements: AdvancedDesignElement[]) => void;
}

export const FigmaImporter: React.FC<FigmaImporterProps> = ({ onImportDesign }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [figmaFiles, setFigmaFiles] = useState<any[]>([]);
  const { toast } = useToast();

  const connectToFigma = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('figma-integration', {
        body: { action: 'auth' }
      });

      if (error) throw error;

      // Open auth URL in new window
      const authWindow = window.open(data.authUrl, 'figma-auth', 'width=600,height=600');
      
      // Listen for auth completion
      const checkAuth = setInterval(async () => {
        if (authWindow?.closed) {
          clearInterval(checkAuth);
          // Check if connection was successful
          checkConnection();
        }
      }, 1000);

    } catch (error) {
      console.error('Figma connection error:', error);
      toast({
        title: "Erro",
        description: "Erro ao conectar com Figma",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const checkConnection = async () => {
    try {
      // Check if user has Figma integration
      const { data, error } = await supabase
        .from('figma_integrations')
        .select('*')
        .single();

      if (data && !error) {
        setIsConnected(true);
        toast({
          title: "Sucesso",
          description: "Conectado ao Figma com sucesso!"
        });
      }
    } catch (error) {
      console.error('Connection check error:', error);
    }
  };

  const extractFileKeyFromUrl = (url: string) => {
    const match = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const importFromFigma = async () => {
    if (!figmaUrl) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma URL do Figma",
        variant: "destructive"
      });
      return;
    }

    const fileKey = extractFileKeyFromUrl(figmaUrl);
    if (!fileKey) {
      toast({
        title: "Erro",
        description: "URL do Figma inválida",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('figma-integration', {
        body: { action: 'getFile', fileKey }
      });

      if (error) throw error;

      // Convert Figma nodes to design elements
      const elements = convertFigmaToElements(data.document);
      onImportDesign(elements);

      toast({
        title: "Sucesso",
        description: "Design importado do Figma com sucesso!"
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erro",
        description: "Erro ao importar design do Figma",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const convertFigmaToElements = (figmaNode: any): AdvancedDesignElement[] => {
    const elements: AdvancedDesignElement[] = [];

    const processNode = (node: any, parentX = 0, parentY = 0) => {
      if (!node) return;

      const element: AdvancedDesignElement = {
        id: `figma-${node.id}`,
        type: mapFigmaTypeToElementType(node.type),
        content: node.characters || node.name || '',
        styles: convertFigmaStylesToCSS(node),
        position: { 
          x: (node.absoluteBoundingBox?.x || 0) - parentX, 
          y: (node.absoluteBoundingBox?.y || 0) - parentY 
        },
        size: {
          width: node.absoluteBoundingBox?.width || 100,
          height: node.absoluteBoundingBox?.height || 50
        },
        name: node.name
      };

      elements.push(element);

      // Process children
      if (node.children) {
        node.children.forEach((child: any) => 
          processNode(child, node.absoluteBoundingBox?.x || 0, node.absoluteBoundingBox?.y || 0)
        );
      }
    };

    if (figmaNode.children) {
      figmaNode.children.forEach((child: any) => processNode(child));
    }

    return elements;
  };

  const mapFigmaTypeToElementType = (figmaType: string): AdvancedDesignElement['type'] => {
    switch (figmaType) {
      case 'TEXT': return 'text';
      case 'RECTANGLE': return 'container';
      case 'FRAME': return 'container';
      case 'GROUP': return 'container';
      default: return 'container';
    }
  };

  const convertFigmaStylesToCSS = (node: any) => {
    const styles: any = {};

    // Background color
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID') {
        const { r, g, b } = fill.color;
        styles.backgroundColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
      }
    }

    // Text styles
    if (node.style) {
      styles.fontSize = `${node.style.fontSize}px`;
      styles.fontWeight = node.style.fontWeight;
      styles.textAlign = node.style.textAlignHorizontal?.toLowerCase();
      
      if (node.style.fills && node.style.fills.length > 0) {
        const fill = node.style.fills[0];
        if (fill.type === 'SOLID') {
          const { r, g, b } = fill.color;
          styles.color = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
        }
      }
    }

    // Border radius
    if (node.cornerRadius) {
      styles.borderRadius = `${node.cornerRadius}px`;
    }

    return styles;
  };

  React.useEffect(() => {
    checkConnection();
  }, []);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Figma className="h-5 w-5 mr-2 text-purple-600" />
            Figma Import
          </h3>
          <p className="text-sm text-gray-600">
            Importe designs diretamente do Figma
          </p>
        </div>

        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Link className="h-4 w-4 mr-2" />
                Conectar ao Figma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Conecte sua conta do Figma para importar designs automaticamente.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={connectToFigma} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                {isConnecting ? 'Conectando...' : 'Conectar com Figma'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Figma Conectado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Sua conta Figma está conectada. Você pode importar designs agora.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    URL do Arquivo Figma
                  </label>
                  <Input
                    placeholder="https://www.figma.com/file/..."
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={importFromFigma} 
                  disabled={isImporting || !figmaUrl}
                  className="w-full"
                >
                  {isImporting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isImporting ? 'Importando...' : 'Importar Design'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="font-medium text-blue-600">1.</span>
              <span>Conecte sua conta do Figma</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium text-blue-600">2.</span>
              <span>Copie a URL do arquivo Figma que deseja importar</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium text-blue-600">3.</span>
              <span>Cole a URL e clique em "Importar Design"</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium text-blue-600">4.</span>
              <span>O design será convertido automaticamente para elementos editáveis</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
