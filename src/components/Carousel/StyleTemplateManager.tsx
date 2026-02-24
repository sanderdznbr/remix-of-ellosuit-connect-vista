import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Palette, Upload, X, Plus, Trash2, Check, Loader2, FolderOpen, Save, ChevronDown, ChevronUp, Image as ImageIcon,
} from 'lucide-react';

interface ReferenceImage {
  url: string;
  thumb: string;
  label: string;
  source: 'upload' | 'web';
}

interface StyleTemplate {
  id: string;
  name: string;
  description: string | null;
  images: ReferenceImage[];
  created_at: string;
}

interface StyleTemplateManagerProps {
  selectedImages: ReferenceImage[];
  onImagesChange: (images: ReferenceImage[]) => void;
  flowColor: string;
}

const StyleTemplateManager: React.FC<StyleTemplateManagerProps> = ({
  selectedImages,
  onImagesChange,
  flowColor,
}) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<StyleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Create template state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImages, setNewImages] = useState<ReferenceImage[]>([]);
  const [saving, setSaving] = useState(false);

  // Selected template
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: cu } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle();
      if (!cu) return;
      const { data, error } = await supabase
        .from('carousel_style_templates')
        .select('*')
        .eq('company_id', cu.company_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates(
        (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          images: (t.images || []) as ReferenceImage[],
          created_at: t.created_at,
        })),
      );
    } catch (err) {
      console.error('Fetch templates error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleImageUpload = (files: FileList | null, target: 'new' | 'inline') => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!e.target?.result) return;
        const img: ReferenceImage = {
          url: e.target.result as string,
          thumb: e.target.result as string,
          label: file.name,
          source: 'upload',
        };
        if (target === 'new') {
          setNewImages((prev) => [...prev, img]);
        } else {
          onImagesChange([...selectedImages, img]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const saveTemplate = async () => {
    if (!newName.trim()) {
      toast({ title: 'Insira um nome para o template', variant: 'destructive' });
      return;
    }
    if (newImages.length === 0) {
      toast({ title: 'Adicione pelo menos 1 imagem', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Não autenticado');
      const { data: cu } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .single();
      if (!cu) throw new Error('Empresa não encontrada');

      const { error } = await supabase.from('carousel_style_templates').insert({
        company_id: cu.company_id,
        user_id: userData.user.id,
        name: newName.trim(),
        description: newDescription.trim() || null,
        images: newImages as any,
      });
      if (error) throw error;

      toast({ title: 'Template salvo!' });
      setNewName('');
      setNewDescription('');
      setNewImages([]);
      setCreating(false);
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await supabase.from('carousel_style_templates').delete().eq('id', id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (activeTemplateId === id) {
        setActiveTemplateId(null);
        onImagesChange([]);
      }
      toast({ title: 'Template removido' });
    } catch (err) {
      console.error(err);
    }
  };

  const selectTemplate = (template: StyleTemplate) => {
    if (activeTemplateId === template.id) {
      setActiveTemplateId(null);
      onImagesChange([]);
    } else {
      setActiveTemplateId(template.id);
      onImagesChange(template.images);
    }
  };

  return (
    <div className="p-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4" style={{ color: flowColor }} />
          <span className="text-sm font-semibold text-foreground">Referência de Estilo/Design (opcional)</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedImages.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {selectedImages.length} ativas
            </span>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Crie templates de estilo com imagens de referência para a IA replicar o design visual (layout, cores, composição).
      </p>

      {/* Quick inline upload (always visible) */}
      <div className="flex gap-2 items-center flex-wrap">
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border cursor-pointer hover:bg-muted/50 text-xs font-medium text-muted-foreground">
          <Upload className="h-3.5 w-3.5" /> Anexar avulso
          <input
            type="file"
            accept="image/*"
            className="hidden"
            multiple
            onChange={(e) => handleImageUpload(e.target.files, 'inline')}
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl text-xs"
          onClick={() => { setCreating(!creating); setExpanded(true); }}
        >
          <Plus className="h-3.5 w-3.5" /> Criar Template
        </Button>
        {templates.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            <FolderOpen className="h-3.5 w-3.5" /> {templates.length} template{templates.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Active inline images */}
      {selectedImages.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {selectedImages.map((ref, i) => (
            <div key={i} className="relative group">
              <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-accent/30">
                <img src={ref.thumb} alt={ref.label} className="w-full h-full object-cover" />
              </div>
              <button
                onClick={() => onImagesChange(selectedImages.filter((_, idx) => idx !== i))}
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Create new template */}
          {creating && (
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
              <p className="text-sm font-semibold text-foreground">Novo Template de Estilo</p>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do template (ex: Estilo Editorial Premium)"
                className="rounded-xl"
              />
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descrição (opcional)"
                className="rounded-xl"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/50 text-xs font-medium text-muted-foreground w-full justify-center">
                <Upload className="h-4 w-4" /> Adicionar imagens de referência ao template
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files, 'new')}
                />
              </label>
              {newImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {newImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <div className="w-16 h-16 rounded-xl overflow-hidden ring-1 ring-border">
                        <img src={img.thumb} alt={img.label} className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => setNewImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 rounded-xl flex-1"
                  style={{ backgroundColor: flowColor }}
                  onClick={saveTemplate}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => { setCreating(false); setNewImages([]); setNewName(''); setNewDescription(''); }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Template list */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum template criado ainda</p>
              <p className="mt-0.5">Crie templates com imagens de posts que você gosta para a IA replicar o estilo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => {
                const isActive = activeTemplateId === template.id;
                return (
                  <div
                    key={template.id}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:bg-muted/30'
                    }`}
                    onClick={() => selectTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Preview thumbnails */}
                      <div className="flex -space-x-2 flex-shrink-0">
                        {template.images.slice(0, 3).map((img, i) => (
                          <div
                            key={i}
                            className="w-10 h-10 rounded-lg overflow-hidden ring-2 ring-background border border-border"
                            style={{ zIndex: 3 - i }}
                          >
                            <img src={img.thumb} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {template.images.length > 3 && (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center ring-2 ring-background border border-border text-[10px] font-bold text-muted-foreground">
                            +{template.images.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{template.name}</p>
                          {isActive && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{template.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {template.images.length} imagem{template.images.length !== 1 ? 'ns' : ''} · {new Date(template.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StyleTemplateManager;
