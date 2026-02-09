import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Edit, Copy, Trash2, Eye,
  Mail, Loader2, Clock, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmailDesigns } from '@/hooks/useEmailDesigns';

const OMNI_COLOR = '#FF4500';

const EmailTemplatesManager: React.FC = () => {
  const navigate = useNavigate();
  const { designs, loading, deleteDesign } = useEmailDesigns();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDesigns, setSelectedDesigns] = useState<string[]>([]);

  const filteredDesigns = designs.filter(d => {
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

  const handleDeleteDesign = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este design?')) {
      await deleteDesign(id);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedDesigns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedDesigns.length === filteredDesigns.length) {
      setSelectedDesigns([]);
    } else {
      setSelectedDesigns(filteredDesigns.map(d => d.id));
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
          <div className="grid grid-cols-[40px_1fr_120px_140px_140px_120px] gap-4 px-4 py-3 border-t border-b border-gray-100 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <Checkbox 
                checked={selectedDesigns.length === filteredDesigns.length && filteredDesigns.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <div>Nome</div>
            <div>Status</div>
            <div>Criado em</div>
            <div>Atualizado em</div>
            <div className="text-right">Ações</div>
          </div>

          {/* List */}
          {filteredDesigns.length === 0 ? (
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
              {filteredDesigns.map(design => (
                <div 
                  key={design.id}
                  className="grid grid-cols-[40px_1fr_120px_140px_140px_120px] gap-4 px-4 py-4 items-center hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      checked={selectedDesigns.includes(design.id)}
                      onCheckedChange={() => toggleSelect(design.id)}
                    />
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {design.thumbnail_url ? (
                        <img 
                          src={design.thumbnail_url} 
                          alt={design.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <Mail className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900 truncate">{design.name}</span>
                  </div>

                  <div>
                    {design.is_published ? (
                      <Badge className="bg-green-50 text-green-700 border-0 text-[10px] px-2 py-0.5 dark:bg-green-900/20 dark:text-green-400">
                        Publicado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        Rascunho
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-gray-500">
                    {formatRelativeDate(design.created_at)}
                  </div>

                  <div className="text-sm text-gray-500">
                    {formatRelativeDate(design.updated_at)}
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => navigate(`/dashboard/email-builder?id=${design.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => navigate(`/dashboard/email-builder?id=${design.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                      onClick={() => handleDeleteDesign(design.id)}
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
    </div>
  );
};

export default EmailTemplatesManager;
