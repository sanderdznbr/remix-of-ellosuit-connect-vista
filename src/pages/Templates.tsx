
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MobileLayout from '@/components/Mobile/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Eye, Edit, Copy, Trash2, Palette, FileText, Sparkles, Filter, Star } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useEmailDesigns } from '@/hooks/useEmailDesigns';
import EmailDesigner from '@/components/EmailDesigner/EmailDesigner';

const Templates = () => {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('designs');
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
      case 'welcome': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'promotion': return 'bg-red-100 text-red-800 border-red-200';
      case 'newsletter': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'transactional': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Modern Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-white/20">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-medium text-gray-700">Templates de Email</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 max-w-2xl mx-auto leading-tight">
            Crie designs incríveis com nosso editor visual
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Escolha entre templates prontos ou crie do zero com nossa ferramenta drag-and-drop
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="rounded-xl bg-white/80 backdrop-blur-sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <Button 
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
            onClick={() => {
              setSelectedDesign(null);
              setShowDesigner(true);
            }}
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Template
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
            <TabsList className="grid grid-cols-2 w-full bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <TabsTrigger value="designs" className="flex items-center gap-2 data-[state=active]:bg-white rounded-xl">
                <Palette className="h-4 w-4" />
                Editor Visual
                <Badge variant="secondary" className="text-xs ml-1 bg-blue-100 text-blue-800">
                  {designs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2 data-[state=active]:bg-white rounded-xl">
                <FileText className="h-4 w-4" />
                Templates HTML
                <Badge variant="secondary" className="text-xs ml-1 bg-purple-100 text-purple-800">
                  {templates.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Tabs */}
        <TabsContent value="designs" className="space-y-6 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Create New Card */}
            <Card className="group border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 transition-all cursor-pointer min-h-[320px] rounded-2xl">
              <CardContent 
                className="flex flex-col items-center justify-center h-full text-center p-6"
                onClick={() => {
                  setSelectedDesign(null);
                  setShowDesigner(true);
                }}
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Plus className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900">Criar Novo Design</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Use o editor visual drag-and-drop para criar emails únicos
                </p>
              </CardContent>
            </Card>

            {filteredDesigns.map((design) => (
              <Card key={design.id} className="group hover:shadow-2xl transition-all duration-300 border-gray-100 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                        <Palette className="h-5 w-5 text-purple-600" />
                        {design.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {design.description}
                      </CardDescription>
                    </div>
                    {design.is_published && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 rounded-full">
                        <Star className="h-3 w-3 mr-1" />
                        Publicado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100 min-h-[140px] flex items-center justify-center">
                    <div className="text-center text-sm text-gray-600">
                      <Palette className="h-16 w-16 text-purple-400 mx-auto mb-3" />
                      <span className="font-medium">Design Visual</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Criado em {new Date(design.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 hover:bg-blue-50 rounded-xl"
                      onClick={() => {
                        setSelectedDesign(design);
                        setShowDesigner(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="hover:bg-green-50 rounded-xl">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-red-50 rounded-xl"
                      onClick={() => deleteDesign(design.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredDesigns.length === 0 && !designsLoading && searchTerm && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Palette className="h-12 w-12 text-gray-300" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Nenhum design encontrado
              </h3>
              <p className="text-gray-500 mb-6">
                Tente ajustar sua busca ou criar um novo design
              </p>
              <Button onClick={() => setShowDesigner(true)} className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Design
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="group hover:shadow-2xl transition-all duration-300 border-gray-100 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                        <FileText className="h-5 w-5 text-blue-600" />
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge className={`${getCategoryColor(template.category)} rounded-full`}>
                      {getCategoryName(template.category)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border min-h-[120px] flex items-center">
                    <p className="text-sm text-gray-600 line-clamp-4 leading-relaxed">
                      {template.preview_text || template.html_content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl hover:bg-blue-50">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl hover:bg-green-50">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => duplicateTemplate(template)} className="rounded-xl hover:bg-purple-50">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteTemplate(template.id)} className="rounded-xl hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredTemplates.length === 0 && !templatesLoading && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-12 w-12 text-gray-300" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum template encontrado' : 'Nenhum template HTML ainda'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Tente ajustar sua busca' : 'Comece criando seu primeiro template HTML personalizado'}
              </p>
              <Button className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Criar Template HTML
              </Button>
            </div>
          )}
        </TabsContent>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout 
        title="Templates" 
        activeItem="templates" 
        onItemClick={() => {}}
      >
        {content}
      </MobileLayout>
    );
  }

  return content;
};

export default Templates;
