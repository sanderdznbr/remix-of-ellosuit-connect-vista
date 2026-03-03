import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Trash2, Upload, Save, Loader2, X, Image as ImageIcon,
  Eye, EyeOff, Star, StarOff, Pencil, ChevronDown, ChevronUp, Download,
} from 'lucide-react';

interface MarketplaceStyleRow {
  id: string;
  name: string;
  description: string | null;
  preview_images: string[];
  price_credits: number;
  price_brl: number;
  category: string;
  style_config: any;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  tags: string[];
}

const ADMIN_EMAIL = 'admin@gmail.com';

const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';

const AdminStyleCreator: React.FC<{ onStylesChanged?: () => void }> = ({ onStylesChanged }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [styles, setStyles] = useState<MarketplaceStyleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // New style form
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'editorial',
    price_credits: 50,
    price_brl: 9.90,
    tags: '',
    is_featured: false,
    strict_instructions: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]); // URLs already saved

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      fetchStyles();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchStyles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketplace_styles')
      .select('*')
      .order('sort_order', { ascending: true });
    setStyles((data as any[]) || []);
    setLoading(false);
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const { error } = await supabase.storage
      .from('marketplace-assets')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/marketplace-assets/${path}`;
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRefFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setRefFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setRefPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeRefFile = (index: number) => {
    setRefFiles(prev => prev.filter((_, i) => i !== index));
    setRefPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const buildStyleConfig = (previewUrls: string[]) => {
    // Build a style_config that instructs the AI to replicate the uploaded references 100%
    const promptStyle = `Create an Instagram carousel post that EXACTLY replicates the visual style shown in the reference images. Follow these rules STRICTLY:

1. COPY THE EXACT VISUAL DNA: Replicate the same color palette, typography style, layout composition, decorative elements, and overall aesthetic from the reference images. The result should look like it was made by the same designer.

2. TYPOGRAPHY: Match the exact font styles, sizes, weights, and placement patterns from the references. If the references use bold condensed fonts, use bold condensed fonts. If they use mixed serif/sans-serif, do the same.

3. COLOR PALETTE: Extract and use the EXACT same colors from the reference images. Do not introduce new colors.

4. LAYOUT & COMPOSITION: Follow the same grid, spacing, alignment, and element placement as the references.

5. DECORATIVE ELEMENTS: Reproduce the same types of decorative elements (lines, shapes, icons, textures, overlays) seen in the references.

6. PHOTOGRAPHY STYLE: Match the same photo treatment (B&W, color grading, filters, overlays) from the references.

7. PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas, logos ou informações pessoais das referências. Use APENAS o estilo visual.

8. IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.

9. SEM BORDAS: Full bleed, sem barras ou bordas.`;

    return {
      description: 'Estilo customizado baseado em referências visuais.',
      colors: {
        primary: '#8FA9A0',
        secondary: '#1A1A1A',
        accent: '#F5F0E8',
        text: '#FFFFFF',
        textDark: '#1A1A1A',
        background_dark: '#0D0D0D',
        background_light: '#F5F0E8',
        highlight: '#8FA9A0',
      },
      imageGeneration: {
        prompt_style: promptStyle,
        prompt_prefix: 'Social media carousel post matching the exact visual style of the reference images. 1080x1350 portrait format.',
        negative_prompt: 'cartoon, anime, illustration, 3d render, stock photo, generic corporate, gradient background, minimalist flat design',
        imageType: 'photo',
        lightingStyle: 'cinematic',
        cameraAngle: 'front',
        fidelity: 'high',
      },
      cardVariations: [
        { type: 'hero_photo', description: 'Bold cover card matching reference style' },
        { type: 'content', description: 'Content card with editorial layout from references' },
        { type: 'dark_typography', description: 'Dark background card with dramatic typography' },
        { type: 'light_editorial', description: 'Light background variation with editorial elements' },
      ],
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!coverFile && !editingId) { toast.error('Adicione uma capa'); return; }
    if (refFiles.length === 0 && !editingId) { toast.error('Adicione pelo menos 1 foto de referência'); return; }

    setSaving(true);
    try {
      const timestamp = Date.now();
      const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const uploadedUrls: string[] = [];

      // Upload cover
      if (coverFile) {
        const coverPath = `styles/${slug}/cover-${timestamp}.${coverFile.name.split('.').pop()}`;
        const coverUrl = await uploadImage(coverFile, coverPath);
        uploadedUrls.push(coverUrl);
      }

      // Upload ref images
      for (let i = 0; i < refFiles.length; i++) {
        const refPath = `styles/${slug}/ref-${i + 1}-${timestamp}.${refFiles[i].name.split('.').pop()}`;
        const refUrl = await uploadImage(refFiles[i], refPath);
        uploadedUrls.push(refUrl);
      }

      const allImages = uploadedUrls;
      const styleConfig = buildStyleConfig(allImages);
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);

      if (editingId) {
        // Update existing style
        const updateData: any = {
          name: form.name,
          description: form.description || null,
          category: form.category,
          price_credits: form.price_credits,
          price_brl: form.price_brl,
          is_featured: form.is_featured,
          tags,
          style_config: styleConfig,
          strict_instructions: form.strict_instructions || null,
        };
        // Combine remaining existing images with newly uploaded ones
        updateData.preview_images = [...existingImages, ...allImages];
        const { error } = await supabase.from('marketplace_styles').update(updateData).eq('id', editingId);
        if (error) throw error;
        toast.success('Estilo atualizado!');
        setEditingId(null);
      } else {
        // Insert new
        const { error } = await supabase.from('marketplace_styles').insert({
          name: form.name,
          description: form.description || null,
          preview_images: allImages,
          price_credits: form.price_credits,
          price_brl: form.price_brl,
          category: form.category,
          style_config: styleConfig,
          is_featured: form.is_featured,
          tags,
          sort_order: styles.length + 1,
          strict_instructions: form.strict_instructions || null,
        } as any);
        if (error) throw error;
        toast.success('Estilo criado com sucesso!');
      }

      // Reset form
      setForm({ name: '', description: '', category: 'editorial', price_credits: 50, price_brl: 9.90, tags: '', is_featured: false, strict_instructions: '' });
      setCoverFile(null); setCoverPreview(null);
      setRefFiles([]); setRefPreviews([]);
      setExistingImages([]);
      setCreating(false);
      fetchStyles();
      onStylesChanged?.();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from('marketplace_styles').update({ is_active: !currentActive } as any).eq('id', id);
    fetchStyles();
    onStylesChanged?.();
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean) => {
    await supabase.from('marketplace_styles').update({ is_featured: !currentFeatured } as any).eq('id', id);
    fetchStyles();
    onStylesChanged?.();
  };

  const deleteStyle = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este estilo?')) return;
    await supabase.from('marketplace_styles').delete().eq('id', id);
    fetchStyles();
    onStylesChanged?.();
    toast.success('Estilo excluído');
  };

  const startEdit = (style: MarketplaceStyleRow) => {
    setEditingId(style.id);
    setForm({
      name: style.name,
      description: style.description || '',
      category: style.category,
      price_credits: style.price_credits,
      price_brl: style.price_brl,
      tags: (style.tags || []).join(', '),
      is_featured: style.is_featured,
      strict_instructions: (style as any).strict_instructions || '',
    });
    setCoverFile(null);
    setCoverPreview(null);
    setRefFiles([]);
    setRefPreviews([]);
    setExistingImages(style.preview_images || []);
    setCreating(true);
    setExpanded(true);
  };

  if (!isAdmin) return null;

  return (
    <div className="mb-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.03] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-yellow-500/[0.05] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-yellow-300">Painel Admin</h3>
            <p className="text-[10px] text-yellow-300/40">{styles.length} estilos cadastrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setCreating(true); setEditingId(null); setExpanded(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-medium hover:bg-yellow-500/30 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Estilo
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-yellow-300/40" /> : <ChevronDown className="w-4 h-4 text-yellow-300/40" />}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-5">
          {/* Create / Edit form */}
          {creating && (
            <div className="p-5 rounded-xl border border-yellow-500/10 bg-black/30 space-y-4">
              <h4 className="text-sm font-bold text-white">
                {editingId ? 'Editar Estilo' : 'Criar Novo Estilo'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Nome *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Gringe Editorial"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-yellow-500/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Categoria</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white outline-none"
                  >
                    <option value="editorial">Editorial</option>
                    <option value="minimalista">Minimalista</option>
                    <option value="moderno">Moderno</option>
                    <option value="criativo">Criativo</option>
                    <option value="corporativo">Corporativo</option>
                    <option value="lifestyle">Lifestyle</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva o estilo visual..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none resize-none focus:border-yellow-500/40"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Preço (créditos)</label>
                  <input
                    type="number"
                    value={form.price_credits}
                    onChange={e => setForm(f => ({ ...f, price_credits: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price_brl}
                    onChange={e => setForm(f => ({ ...f, price_brl: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Tags (vírgula)</label>
                  <input
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="editorial, urban"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setForm(f => ({ ...f, is_featured: !f.is_featured }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      form.is_featured ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/[0.04] text-white/30'
                    }`}
                  >
                    {form.is_featured ? <Star className="w-3.5 h-3.5" /> : <StarOff className="w-3.5 h-3.5" />}
                    Destaque
                  </button>
                </div>
              </div>

              {/* Cover upload */}
              <div>
                <label className="text-[10px] text-white/40 mb-2 block">Imagem de Capa {!editingId && '*'}</label>
                {coverPreview ? (
                  <div className="relative w-32 h-40 rounded-xl overflow-hidden border border-white/10">
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    <button onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer text-[10px]">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : existingImages[0] ? (
                  <div className="relative w-32 h-40 rounded-xl overflow-hidden border border-white/10">
                    <img src={existingImages[0]} alt="Cover atual" className="w-full h-full object-cover" />
                    <button onClick={() => setExistingImages(prev => prev.slice(1))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer text-[10px]">
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white/60 text-[8px]">Atual</span>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-32 h-40 rounded-xl border-2 border-dashed border-white/10 cursor-pointer hover:border-yellow-500/30 transition-colors">
                    <div className="text-center">
                      <Upload className="w-5 h-5 text-white/20 mx-auto mb-1" />
                      <span className="text-[10px] text-white/20">Capa</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                  </label>
                )}
              </div>

              {/* Reference photos */}
              <div>
                <label className="text-[10px] text-white/40 mb-2 block">
                  Fotos de Referência {!editingId && '*'} <span className="text-white/20">({existingImages.slice(1).length + refFiles.length} fotos)</span>
                </label>
                <p className="text-[10px] text-white/15 mb-2">
                  A IA usará estas fotos como referência visual para replicar o estilo 100%. Quanto mais fotos, melhor a fidelidade.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {/* Existing reference images (skip index 0 = cover) */}
                  {existingImages.slice(1).map((url, i) => (
                    <div key={`existing-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 group">
                      <img src={url} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => removeExistingImage(i + 1)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]">
                        <X className="w-2.5 h-2.5" />
                      </button>
                      <span className="absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded bg-black/60 text-white/50 text-[7px]">Atual</span>
                    </div>
                  ))}
                  {/* Newly added files */}
                  {refPreviews.map((preview, i) => (
                    <div key={`new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-yellow-500/20 group">
                      <img src={preview} alt={`Nova ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => removeRefFile(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-white/10 cursor-pointer hover:border-yellow-500/30 transition-colors">
                    <div className="text-center">
                      <Plus className="w-4 h-4 text-white/20 mx-auto" />
                      <span className="text-[9px] text-white/20">Adicionar</span>
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleRefFilesChange} />
                  </label>
                </div>
              {/* Download all button */}
              {existingImages.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const JSZip = (await import('jszip')).default;
                      const zip = new JSZip();
                      const folder = zip.folder('referencias');
                      for (let i = 0; i < existingImages.length; i++) {
                        try {
                          const res = await fetch(existingImages[i]);
                          const blob = await res.blob();
                          const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
                          folder!.file(`ref-${i + 1}.${ext}`, blob);
                        } catch (e) { console.error('Erro ao baixar imagem', i, e); }
                      }
                      const content = await zip.generateAsync({ type: 'blob' });
                      const url = URL.createObjectURL(content);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `referencias-${form.name || 'estilo'}.zip`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (e) { console.error('Erro ao criar ZIP', e); }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/50 text-xs hover:bg-white/[0.1] hover:text-white/80 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar todas ({existingImages.length})
                </button>
              )}
              </div>

              {/* Strict instructions */}
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Instruções Rígidas (opcional)</label>
                <textarea
                  value={form.strict_instructions}
                  onChange={e => setForm(f => ({ ...f, strict_instructions: e.target.value }))}
                  placeholder="Ex: Ao usar esse estilo, todas as fotos devem ter fundo escuro com neon, a pessoa deve aparecer em poses dinâmicas..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none resize-none focus:border-yellow-500/40"
                />
                <p className="text-[9px] text-white/15 mt-1">Essas instruções serão injetadas com prioridade máxima na IA ao gerar com este estilo.</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 text-white text-sm font-semibold hover:from-yellow-500 hover:to-amber-500 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? 'Atualizar' : 'Criar Estilo'}
                </button>
                <button
                  onClick={() => {
                    setCreating(false); setEditingId(null);
                    setForm({ name: '', description: '', category: 'editorial', price_credits: 50, price_brl: 9.90, tags: '', is_featured: false, strict_instructions: '' });
                    setCoverFile(null); setCoverPreview(null); setRefFiles([]); setRefPreviews([]); setExistingImages([]);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-white/40 text-sm hover:bg-white/[0.08] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Styles list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-300/40" />
            </div>
          ) : styles.length === 0 ? (
            <p className="text-center text-xs text-white/20 py-6">Nenhum estilo criado.</p>
          ) : (
            <div className="space-y-2">
              {styles.map(style => (
                <div key={style.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  style.is_active ? 'border-white/[0.06] bg-white/[0.02]' : 'border-red-500/10 bg-red-500/[0.02] opacity-60'
                }`}>
                  {/* Preview */}
                  <div className="w-12 h-15 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0">
                    {style.preview_images?.[0] ? (
                      <img src={style.preview_images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-white/10" /></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{style.name}</p>
                      {style.is_featured && <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                      {!style.is_active && <span className="text-[10px] text-red-400">INATIVO</span>}
                    </div>
                    <p className="text-[10px] text-white/30">
                      {style.preview_images?.length || 0} imagens · {style.price_credits} créditos · {style.category}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(style)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white cursor-pointer" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleFeatured(style.id, style.is_featured)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-yellow-400 cursor-pointer" title="Destaque">
                      {style.is_featured ? <Star className="w-3.5 h-3.5 text-yellow-400" /> : <StarOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => toggleActive(style.id, style.is_active)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white cursor-pointer" title="Ativar/Desativar">
                      {style.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => deleteStyle(style.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 cursor-pointer" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminStyleCreator;
