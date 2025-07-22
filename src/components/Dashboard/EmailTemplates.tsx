import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Search, Eye, Edit, Copy, Trash2, Mail, Sparkles } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';

const EmailTemplates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'general',
    html_content: '',
    preview_text: '',
    is_active: true
  });

  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = useEmailTemplates();

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const templateCategories = [
    { id: 'all', name: 'Todos', count: templates.length, color: 'bg-gray-100 text-gray-800' },
    { id: 'general', name: 'Geral', count: templates.filter(t => t.category === 'general').length, color: 'bg-blue-100 text-blue-800' },
    { id: 'welcome', name: 'Boas-vindas', count: templates.filter(t => t.category === 'welcome').length, color: 'bg-green-100 text-green-800' },
    { id: 'promotion', name: 'Promocional', count: templates.filter(t => t.category === 'promotion').length, color: 'bg-red-100 text-red-800' },
    { id: 'newsletter', name: 'Newsletter', count: templates.filter(t => t.category === 'newsletter').length, color: 'bg-purple-100 text-purple-800' },
    { id: 'transactional', name: 'Transacional', count: templates.filter(t => t.category === 'transactional').length, color: 'bg-orange-100 text-orange-800' }
  ];

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.html_content) {
      return;
    }
    
    await createTemplate(newTemplate);
    setIsCreateModalOpen(false);
    setNewTemplate({
      name: '',
      description: '',
      category: 'general',
      html_content: '',
      preview_text: '',
      is_active: true
    });
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate || !selectedTemplate.name || !selectedTemplate.html_content) {
      return;
    }
    
    await updateTemplate(selectedTemplate.id, selectedTemplate);
    setIsEditModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleDuplicateTemplate = async (template: any) => {
    await duplicateTemplate(template);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      await deleteTemplate(templateId);
    }
  };

  const openEditModal = (template: any) => {
    setSelectedTemplate({...template});
    setIsEditModalOpen(true);
  };

  const openPreviewModal = (template: any) => {
    setSelectedTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'welcome': return 'bg-green-100 text-green-800';
      case 'promotion': return 'bg-red-100 text-red-800';
      case 'newsletter': return 'bg-purple-100 text-purple-800';
      case 'transactional': return 'bg-orange-100 text-orange-800';
      case 'general': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'welcome': return 'Boas-vindas';
      case 'promotion': return 'Promocional';
      case 'newsletter': return 'Newsletter';
      case 'transactional': return 'Transacional';
      default: return 'Geral';
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-gray-50 min-h-screen ml-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-4xl font-bold text-gray-900">Carregando Templates...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen ml-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-bold mb-4 text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📧 Templates de Email
          </h1>
          <p className="text-gray-600 text-xl">Crie e gerencie templates profissionais para suas campanhas</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-2xl px-8 py-3 text-white font-medium shadow-lg">
          <Plus className="h-5 w-5 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-3">
        {templateCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-[#3600FF] text-white shadow-lg transform scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
            }`}
          >
            {category.name}
            <Badge className={`${selectedCategory === category.id ? 'bg-white/20 text-white' : category.color} rounded-full px-2 py-1 text-xs`}>
              {category.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Search */}
      <Card className="border-none shadow-xl rounded-3xl bg-white">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Buscar templates por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 rounded-2xl border-gray-200 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="border-none shadow-xl rounded-3xl bg-white">
          <CardContent className="p-16">
            <div className="text-center">
              <div className="p-6 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 w-fit mx-auto mb-6">
                <Sparkles className="h-16 w-16 text-[#3600FF]" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                {searchTerm ? 'Nenhum template encontrado' : 'Seus primeiros templates estão esperando'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchTerm 
                  ? 'Tente ajustar sua busca ou criar um novo template' 
                  : 'Crie templates profissionais para acelerar suas campanhas de email marketing'
                }
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-2xl px-8 py-3">
                <Plus className="h-5 w-5 mr-2" />
                Criar Primeiro Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-100 to-purple-100">
                    <FileText className="h-6 w-6 text-[#3600FF]" />
                  </div>
                  <Badge className={`${getCategoryColor(template.category)} rounded-full px-3 py-1 text-xs font-medium`}>
                    {getCategoryName(template.category)}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 line-clamp-1">
                  {template.name}
                </CardTitle>
                <CardDescription className="text-gray-600 line-clamp-2 h-12">
                  {template.description || 'Sem descrição'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-sm text-gray-600 line-clamp-3 h-16">
                    {template.preview_text || template.html_content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'}
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}</span>
                  <div className={`w-2 h-2 rounded-full ${template.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl border-gray-200 hover:bg-gray-50" onClick={() => openPreviewModal(template)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Visualizar
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl border-gray-200 hover:bg-gray-50" onClick={() => openEditModal(template)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl border-gray-200 hover:bg-blue-50 hover:border-blue-300" onClick={() => handleDuplicateTemplate(template)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl border-gray-200 hover:bg-red-50 hover:border-red-300 text-red-600" onClick={() => handleDeleteTemplate(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">✨ Criar Novo Template</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-2">
            <div className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nome do Template *</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="Ex: Email de Boas-vindas"
                  className="mt-2 rounded-xl border-gray-200"
                />
              </div>
              
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Descrição</Label>
                <Textarea
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Descreva o propósito deste template..."
                  rows={3}
                  className="mt-2 rounded-xl border-gray-200"
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">Categoria</Label>
                <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({...newTemplate, category: value})}>
                  <SelectTrigger className="mt-2 rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="welcome">Boas-vindas</SelectItem>
                    <SelectItem value="promotion">Promocional</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="transactional">Transacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="preview_text" className="text-sm font-medium text-gray-700">Texto de Preview</Label>
                <Textarea
                  id="preview_text"
                  value={newTemplate.preview_text}
                  onChange={(e) => setNewTemplate({...newTemplate, preview_text: e.target.value})}
                  placeholder="Texto que aparece no preview do email..."
                  rows={2}
                  className="mt-2 rounded-xl border-gray-200"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="html_content" className="text-sm font-medium text-gray-700">Conteúdo HTML *</Label>
                <Textarea
                  id="html_content"
                  value={newTemplate.html_content}
                  onChange={(e) => setNewTemplate({...newTemplate, html_content: e.target.value})}
                  placeholder="<html><body><h1>Seu HTML aqui...</h1></body></html>"
                  rows={20}
                  className="mt-2 font-mono text-sm rounded-xl border-gray-200"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleCreateTemplate} className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Criar Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Nome do Template *</Label>
                  <Input
                    id="edit-name"
                    value={selectedTemplate.name}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    value={selectedTemplate.description || ''}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select value={selectedTemplate.category} onValueChange={(value) => setSelectedTemplate({...selectedTemplate, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Geral</SelectItem>
                      <SelectItem value="welcome">Boas-vindas</SelectItem>
                      <SelectItem value="promotion">Promocional</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="transactional">Transacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-preview_text">Texto de Preview</Label>
                  <Textarea
                    id="edit-preview_text"
                    value={selectedTemplate.preview_text || ''}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, preview_text: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-html_content">Conteúdo HTML *</Label>
                  <Textarea
                    id="edit-html_content"
                    value={selectedTemplate.html_content}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, html_content: e.target.value})}
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTemplate}>
              <Edit className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Template Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Preview: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Informações do Template</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Categoria:</span> {getCategoryName(selectedTemplate.category)}
                  </div>
                  <div>
                    <span className="font-medium">Criado em:</span> {new Date(selectedTemplate.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                {selectedTemplate.preview_text && (
                  <div className="mt-2">
                    <span className="font-medium">Preview:</span> {selectedTemplate.preview_text}
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg p-4 bg-white" style={{ minHeight: '400px' }}>
                <div dangerouslySetInnerHTML={{ __html: selectedTemplate.html_content }} />
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => openEditModal(selectedTemplate)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplates;
