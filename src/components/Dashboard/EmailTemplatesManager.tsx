import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Edit, Copy, Trash2, Eye,
  Mail, Loader2, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEmailDesigns } from '@/hooks/useEmailDesigns';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';

const OMNI_COLOR = '#FF4500';

interface UnifiedTemplate {
  id: string;
  name: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
  source: 'design' | 'template';
  html_content?: string;
  category?: string;
}

const EmailTemplatesManager: React.FC = () => {
  const navigate = useNavigate();
  const { designs, loading: loadingDesigns, deleteDesign, refetch: refetchDesigns } = useEmailDesigns();
  const { templates, loading: loadingTemplates, deleteTemplate, duplicateTemplate, refetch: refetchTemplates } = useEmailTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const loading = loadingDesigns || loadingTemplates;

  // Refetch when page regains focus (e.g., returning from builder)
  useEffect(() => {
    const handleFocus = () => {
      refetchDesigns();
      refetchTemplates();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchDesigns, refetchTemplates]);

  // Merge both sources into a unified list
  const unifiedList: UnifiedTemplate[] = [
    ...designs.map(d => ({
      id: d.id,
      name: d.name,
      is_published: d.is_published,
      created_at: d.created_at,
      updated_at: d.updated_at,
      thumbnail_url: d.thumbnail_url,
      source: 'design' as const,
    })),
    ...templates.map(t => ({
      id: t.id,
      name: t.name,
      is_published: t.is_active,
      created_at: t.created_at,
      updated_at: t.updated_at,
      source: 'template' as const,
      html_content: t.html_content,
      category: t.category,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredItems = unifiedList.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'published' && d.is_published) ||
      (filterStatus === 'draft' && !d.is_published);
    return matchesSearch && matchesFilter;
  });

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    return `${Math.floor(diffDays / 30)} meses atrás`;
  };

  const handleDelete = async (item: UnifiedTemplate) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    if (item.source === 'design') {
      await deleteDesign(item.id);
    } else {
      await deleteTemplate(item.id);
    }
  };

  const handleEdit = (item: UnifiedTemplate) => {
    if (item.source === 'design') {
      navigate(`/dashboard/email-builder?id=${item.id}`);
    } else {
      navigate(`/dashboard/email-builder?templateId=${item.id}`);
    }
  };

  const handleDuplicate = async (item: UnifiedTemplate) => {
    if (item.source === 'template') {
      const tpl = templates.find(t => t.id === item.id);
      if (tpl) await duplicateTemplate(tpl);
    }
  };

  const handlePreview = (item: UnifiedTemplate) => {
    if (item.source === 'design') {
      navigate(`/dashboard/email-builder?id=${item.id}`);
    } else if (item.html_content) {
      setPreviewHtml(item.html_content);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(d => d.id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: OMNI_COLOR }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Templates de Email</h1>
          <p className="text-gray-500 mt-1">
            Aqui você consegue criar e gerenciar os templates de email da sua organização.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Search + Actions */}
          <div className="p-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-gray-200 bg-gray-50 rounded-xl focus:bg-white"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] rounded-xl border-gray-200">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button 
              onClick={() => navigate('/dashboard/email-builder')}
              className="rounded-xl gap-2 text-white"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              <Plus className="h-4 w-4" />
              Novo template
            </Button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_100px_120px_140px_140px_120px] gap-4 px-4 py-3 border-t border-b border-gray-100 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <Checkbox 
                checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <div>Nome</div>
            <div>Tipo</div>
            <div>Status</div>
            <div>Criado em</div>
            <div>Atualizado em</div>
            <div className="text-right">Ações</div>
          </div>

          {/* List */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <Palette className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum template encontrado</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Tente uma busca diferente' : 'Crie seu primeiro template para começar'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => navigate('/dashboard/email-builder')}
                  style={{ backgroundColor: OMNI_COLOR }}
                  className="text-white rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Template
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredItems.map(item => (
                <div 
                  key={`${item.source}-${item.id}`}
                  className="grid grid-cols-[40px_1fr_100px_120px_140px_140px_120px] gap-4 px-4 py-4 items-center hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {item.thumbnail_url ? (
                        <img 
                          src={item.thumbnail_url} 
                          alt={item.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <Mail className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900 truncate">{item.name}</span>
                  </div>

                  <div>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                      {item.source === 'design' ? 'Design' : item.category || 'Template'}
                    </Badge>
                  </div>

                  <div>
                    {item.is_published ? (
                      <Badge className="bg-green-50 text-green-700 border-0 text-[10px] px-2 py-0.5 dark:bg-green-900/20 dark:text-green-400">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        Rascunho
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-gray-500">
                    {formatRelativeDate(item.created_at)}
                  </div>

                  <div className="text-sm text-gray-500">
                    {formatRelativeDate(item.updated_at)}
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => handlePreview(item)}
                      title="Pré-visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => handleEdit(item)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => handleDuplicate(item)}
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                      onClick={() => handleDelete(item)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* HTML Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={(open) => !open && setPreviewHtml(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Pré-visualização do Template</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            {previewHtml && (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[60vh] border-0"
                title="Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplatesManager;
