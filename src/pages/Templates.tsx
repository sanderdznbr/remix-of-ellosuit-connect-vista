
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MobileLayout from '@/components/Mobile/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Eye, Edit, Copy, Trash2, Palette, FileText } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useEmailDesigns } from '@/hooks/useEmailDesigns';
import EmailDesigner from '@/components/EmailDesigner/EmailDesigner';

const Templates = () => {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('templates');
  const [showDesigner, setShowDesigner] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);

  const { 
    templates, 
    loading: templatesLoading, 
    duplicateTemplate, 
    deleteTemplate 
  } = useEmailTemplates();

  const { 
    designs, 
    loading: designsLoading, 
    deleteDesign 
  } = useEmailDesigns();

  if (!user) {
    return null;
  }

  if (showDesigner) {
    return (
      <EmailDesigner
        onBack={() => {
          setShowDesigner(false);
          setSelectedDesign(null);
        }}
        existingDesign={selectedDesign}
      />
    );
  }

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDesigns = designs.filter(design =>
    design.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    design.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'welcome': return 'bg-green-100 text-green-800';
      case 'promotion': return 'bg-red-100 text-red-800';
      case 'newsletter': return 'bg-blue-100 text-blue-800';
      case 'transactional': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'welcome': return 'Boas-vindas';
      case 'promotion': return 'Promocional';
      case 'newsletter': return 'Newsletter';
      case 'transactional': return 'Transacional';
      default: return category;
    }
  };

  const content = (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de Email</h1>
          <p className="text-gray-600 mt-2">Crie e gerencie seus templates de email</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedDesign(null);
              setShowDesigner(true);
            }}
          >
            <Palette className="h-4 w-4 mr-2" />
            Designer Visual
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates HTML
              <Badge variant="secondary" className="text-xs">
                {templates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="designs" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Designs Visuais
              <Badge variant="secondary" className="text-xs">
                {designs.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge className={getCategoryColor(template.category)}>
                      {getCategoryName(template.category)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.preview_text || template.html_content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => duplicateTemplate(template)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteTemplate(template.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredTemplates.length === 0 && !templatesLoading && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum template encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Tente ajustar sua busca' : 'Você ainda não criou templates HTML'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="designs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card para criar novo design */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group">
              <CardContent 
                className="flex flex-col items-center justify-center h-64 text-center"
                onClick={() => {
                  setSelectedDesign(null);
                  setShowDesigner(true);
                }}
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Plus className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Criar Novo Design</h3>
                <p className="text-gray-600 text-sm">
                  Use o designer visual para criar emails incríveis
                </p>
              </CardContent>
            </Card>

            {filteredDesigns.map((design) => (
              <Card key={design.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Palette className="h-5 w-5 text-purple-600" />
                        {design.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {design.description}
                      </CardDescription>
                    </div>
                    {design.is_published && (
                      <Badge className="bg-green-100 text-green-800">
                        Publicado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg border">
                    <div className="text-center text-sm text-gray-600">
                      <Palette className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      Design Visual
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Criado em {new Date(design.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedDesign(design);
                        setShowDesigner(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteDesign(design.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredDesigns.length === 0 && !designsLoading && searchTerm && (
            <div className="text-center py-12">
              <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum design encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                Tente ajustar sua busca
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout 
        title="Modelos" 
        activeItem="templates" 
        onItemClick={() => {}}
      >
        {content}
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {content}
    </div>
  );
};

export default Templates;
