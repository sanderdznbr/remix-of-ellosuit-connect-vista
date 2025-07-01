
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, Search, Eye, Edit, Copy, Trash2 } from 'lucide-react';

const EmailTemplates = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data para demonstração
  const templates = [
    {
      id: 1,
      name: 'Boas-vindas',
      description: 'Template de boas-vindas para novos clientes',
      category: 'welcome',
      preview: 'Bem-vindo à nossa plataforma! Estamos felizes em tê-lo conosco...',
      created_at: '2024-01-15'
    },
    {
      id: 2,
      name: 'Promoção Black Friday',
      description: 'Template promocional para Black Friday',
      category: 'promotion',
      preview: '🔥 BLACK FRIDAY - 50% OFF em todos os produtos...',
      created_at: '2024-01-10'
    },
    {
      id: 3,
      name: 'Newsletter Mensal',
      description: 'Template para newsletter mensal',
      category: 'newsletter', 
      preview: 'Confira as novidades deste mês e as principais atualizações...',
      created_at: '2024-01-05'
    }
  ];

  const templateCategories = [
    { id: 'all', name: 'Todos', count: templates.length },
    { id: 'welcome', name: 'Boas-vindas', count: 1 },
    { id: 'promotion', name: 'Promocional', count: 1 },
    { id: 'newsletter', name: 'Newsletter', count: 1 },
    { id: 'transactional', name: 'Transacional', count: 0 }
  ];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates de Email</h2>
          <p className="text-gray-600">Gerencie seus templates de email marketing</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            {templateCategories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
                {category.name}
                <Badge variant="secondary" className="text-xs">
                  {category.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-80"
            />
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
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
                      {template.preview}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Criado em {new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Adicionar outras TabsContent para cada categoria */}
        <TabsContent value="welcome">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Templates de Boas-vindas
            </h3>
            <p className="text-gray-500">
              Visualize apenas os templates de boas-vindas
            </p>
          </div>
        </TabsContent>

        <TabsContent value="promotion">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Templates Promocionais
            </h3>
            <p className="text-gray-500">
              Visualize apenas os templates promocionais
            </p>
          </div>
        </TabsContent>

        <TabsContent value="newsletter">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Templates de Newsletter
            </h3>
            <p className="text-gray-500">
              Visualize apenas os templates de newsletter
            </p>
          </div>
        </TabsContent>

        <TabsContent value="transactional">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Templates Transacionais
            </h3>
            <p className="text-gray-500 mb-4">
              Nenhum template transacional encontrado
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Template Transacional
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailTemplates;
