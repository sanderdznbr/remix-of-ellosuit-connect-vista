
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MobileLayout from '@/components/Mobile/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, Eye, Edit, Copy, Trash2, Palette, 
  FileText, Sparkles, Layers, Grid, Figma, Zap,
  TrendingUp, Users, Heart, Star
} from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useEmailDesigns } from '@/hooks/useEmailDesigns';
import AdvancedEmailDesigner from '@/components/EmailDesigner/AdvancedEmailDesigner';

const AdvancedTemplates = () => {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('designs');
  const [showDesigner, setShowDesigner] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);

  const { templates, loading: templatesLoading } = useEmailTemplates();
  const { designs, loading: designsLoading, deleteDesign } = useEmailDesigns();

  if (!user) {
    return null;
  }

  if (showDesigner) {
    return (
      <AdvancedEmailDesigner
        onBack={() => {
          setShowDesigner(false);
          setSelectedDesign(null);
        }}
        existingDesign={selectedDesign}
      />
    );
  }

  const filteredDesigns = designs.filter(design =>
    design.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    design.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { name: 'Designs Criados', value: designs.length, icon: Palette, color: 'text-blue-600' },
    { name: 'Templates Ativos', value: templates.length, icon: FileText, color: 'text-green-600' },
    { name: 'Taxa de Conversão', value: '12.5%', icon: TrendingUp, color: 'text-purple-600' },
    { name: 'Visualizações', value: '1.2k', icon: Eye, color: 'text-orange-600' },
  ];

  const quickActions = [
    {
      title: 'Criar do Zero',
      description: 'Comece com um canvas em branco',
      icon: Plus,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      action: () => {
        setSelectedDesign(null);
        setShowDesigner(true);
      }
    },
    {
      title: 'Usar Template',
      description: 'Comece com um design pré-feito',
      icon: Sparkles,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      action: () => setActiveTab('templates')
    },
    {
      title: 'Importar do Figma',
      description: 'Traga designs do Figma',
      icon: Figma,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      action: () => {
        setSelectedDesign(null);
        setShowDesigner(true);
      }
    },
    {
      title: 'AI Assistant',
      description: 'Gere designs com IA',
      icon: Zap,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      action: () => {
        setSelectedDesign(null);
        setShowDesigner(true);
      }
    }
  ];

  const content = (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
            Design Studio
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Crie emails incríveis com nosso editor visual avançado, integração Figma e IA
          </p>
          
          <div className="flex items-center justify-center space-x-4 mt-8">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                onClick={action.action}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 ${action.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-100`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardHeader className="pb-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                <TabsList className="grid grid-cols-2 w-full lg:w-auto bg-gray-100/50">
                  <TabsTrigger value="designs" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline">Editor Visual</span>
                    <Badge variant="secondary" className="text-xs ml-1">
                      {designs.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Analytics</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar designs e templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200 bg-white/50"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <TabsContent value="designs" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDesigns.map((design) => (
                  <Card key={design.id} className="group hover:shadow-xl transition-all duration-300 border-gray-200 overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Layers className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                          <span className="text-sm text-blue-600 font-medium">Design Visual</span>
                        </div>
                      </div>
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            setSelectedDesign(design);
                            setShowDesigner(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {design.name}
                          </h3>
                          {design.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {design.description}
                            </p>
                          )}
                        </div>
                        {design.is_published && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 ml-2">
                            Publicado
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <span>Criado em {new Date(design.created_at).toLocaleDateString('pt-BR')}</span>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-3 w-3" />
                          <span>12</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => {
                            setSelectedDesign(design);
                            setShowDesigner(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="hover:bg-red-50 hover:border-red-300"
                          onClick={() => deleteDesign(design.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredDesigns.length === 0 && !designsLoading && (
                <div className="text-center py-16">
                  <div className="max-w-md mx-auto">
                    <Palette className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      {searchTerm ? 'Nenhum design encontrado' : 'Comece criando seu primeiro design'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {searchTerm 
                        ? 'Tente ajustar sua busca ou crie um novo design' 
                        : 'Use nosso editor visual avançado para criar emails incríveis'
                      }
                    </p>
                    <Button 
                      size="lg"
                      onClick={() => {
                        setSelectedDesign(null);
                        setShowDesigner(true);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Criar Primeiro Design
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Taxa de Abertura</span>
                        <span className="font-semibold">24.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Taxa de Clique</span>
                        <span className="font-semibold">3.2%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Conversões</span>
                        <span className="font-semibold">156</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Users className="h-5 w-5 mr-2 text-blue-600" />
                      Engagement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Visualizações</span>
                        <span className="font-semibold">1,234</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tempo Médio</span>
                        <span className="font-semibold">2m 15s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Compartilhamentos</span>
                        <span className="font-semibold">89</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Star className="h-5 w-5 mr-2 text-yellow-600" />
                      Top Designs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {designs.slice(0, 3).map((design, index) => (
                        <div key={design.id} className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {design.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {Math.floor(Math.random() * 500 + 100)} visualizações
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout 
        title="Design Studio" 
        activeItem="templates" 
        onItemClick={() => {}}
      >
        {content}
      </MobileLayout>
    );
  }

  return content;
};

export default AdvancedTemplates;
