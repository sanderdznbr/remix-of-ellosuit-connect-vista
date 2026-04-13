import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Trash2, Upload, Save, Loader2, X, Download, Sparkles,
  Star, StarOff, Eye, EyeOff, GripVertical, Building2,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableImageItem {
  id: string;
  type: 'existing' | 'new';
  url: string; // display url (existing url or data url preview)
  originalIndex: number;
}

const SortableImageThumb: React.FC<{
  item: SortableImageItem;
  isFirst: boolean;
  onRemove: () => void;
}> = ({ item, isFirst, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as any,
  };
  return (
    <div ref={setNodeRef} style={style} className={`relative w-20 h-20 rounded-lg overflow-hidden border group ${item.type === 'new' ? 'border-yellow-500/20' : 'border-white/10'}`}>
      <img src={item.url} alt="ref" className="w-full h-full object-cover pointer-events-none" />
      {isFirst && <span className="absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded bg-yellow-500/80 text-black text-[7px] font-bold">Capa</span>}
      <div {...attributes} {...listeners} className="absolute top-0.5 left-0.5 w-5 h-5 rounded bg-black/60 text-white/60 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-3 h-3" />
      </div>
      <button onClick={onRemove}
        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]">
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

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
  is_free: boolean;
  sort_order: number;
  tags: string[];
  strict_instructions?: string;
}

const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';

interface AdminStyleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editStyle?: MarketplaceStyleRow | null;
  onSaved: () => void;
  totalStyles: number;
}

const AdminStyleDialog: React.FC<AdminStyleDialogProps> = ({ open, onOpenChange, editStyle, onSaved, totalStyles }) => {
  const [form, setForm] = useState({
    name: '', description: '', category: 'editorial',
    price_credits: 50, price_brl: 9.90, tags: '',
    is_featured: false, is_free: false, strict_instructions: '',
    negative_prompt: '',
    is_real_estate: false,
    real_estate_mode: 'single' as 'single' | 'multiple',
    is_beta: false,
  });
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [existingCover, setExistingCover] = useState<string>('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableItems: SortableImageItem[] = useMemo(() => [
    ...existingImages.map((url, i) => ({ id: `ex-${i}-${url.slice(-20)}`, type: 'existing' as const, url, originalIndex: i })),
    ...refPreviews.map((url, i) => ({ id: `new-${i}`, type: 'new' as const, url, originalIndex: i })),
  ], [existingImages, refPreviews]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableItems.findIndex(item => item.id === active.id);
    const newIndex = sortableItems.findIndex(item => item.id === over.id);
    const reordered = arrayMove(sortableItems, oldIndex, newIndex);
    setExistingImages(reordered.filter(i => i.type === 'existing').map(i => i.url));
    const newOrder = reordered.filter(i => i.type === 'new').map(i => i.originalIndex);
    setRefPreviews(prev => newOrder.map(idx => prev[idx]));
    setRefFiles(prev => newOrder.map(idx => prev[idx]));
  };

  const removeItem = (item: SortableImageItem) => {
    if (item.type === 'existing') {
      setExistingImages(prev => prev.filter(u => u !== item.url));
    } else {
      removeRefFile(item.originalIndex);
    }
  };

  useEffect(() => {
    if (open) {
      if (editStyle) {
        const sc = editStyle.style_config || {};
        setForm({
          name: editStyle.name,
          description: editStyle.description || '',
          category: editStyle.category,
          price_credits: editStyle.price_credits,
          price_brl: editStyle.price_brl,
          tags: (editStyle.tags || []).join(', '),
          is_featured: editStyle.is_featured,
          is_free: (editStyle as any).is_free || false,
          strict_instructions: (editStyle as any).strict_instructions || '',
          negative_prompt: sc?.imageGeneration?.negative_prompt || '',
          is_real_estate: !!sc.is_real_estate,
          real_estate_mode: sc.real_estate_mode || 'single',
          is_beta: !!sc.is_beta,
        });
        setExistingImages(editStyle.preview_images || []);
        setExistingCover(sc.cover_image || '');
      } else {
        setForm({ name: '', description: '', category: 'editorial', price_credits: 50, price_brl: 9.90, tags: '', is_featured: false, is_free: false, strict_instructions: '', negative_prompt: '', is_real_estate: false, real_estate_mode: 'single', is_beta: false });
        setExistingImages([]);
        setExistingCover('');
      }
      setRefFiles([]);
      setRefPreviews([]);
      setCoverFile(null);
      setCoverPreview('');
    }
  }, [open, editStyle]);

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const { error } = await supabase.storage.from('marketplace-assets').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/marketplace-assets/${path}`;
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

  const buildStyleConfig = (coverUrl?: string) => {
    let promptStyle = `Create an Instagram carousel post that EXACTLY replicates the visual style shown in the reference images. Follow these rules STRICTLY:
1. COPY THE EXACT VISUAL DNA: Replicate the same color palette, typography style, layout composition, decorative elements, and overall aesthetic from the reference images.
2. TYPOGRAPHY: Match the exact font styles, sizes, weights, and placement patterns from the references.
3. COLOR PALETTE: Extract and use the EXACT same colors from the reference images.
4. LAYOUT & COMPOSITION: Follow the same grid, spacing, alignment, and element placement as the references.
5. DECORATIVE ELEMENTS: Reproduce the same types of decorative elements seen in the references.
6. PHOTOGRAPHY STYLE: Match the same photo treatment from the references.
7. PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas, logos ou informações pessoais das referências.
8. IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.
9. SEM BORDAS: Full bleed, sem barras ou bordas.`;

    if (form.is_real_estate) {
      promptStyle += `\n\n=== MODO IMOBILIÁRIO ===
Este estilo é especializado para o mercado IMOBILIÁRIO. Ao gerar posts:
- Use as fotos do imóvel fornecidas pelo usuário como base visual do post.
- Destaque informações como: metragem (m²), quartos, suítes, banheiros, vagas, valor e localização.
- Tipografia de marketing premium: títulos impactantes como "Seu Novo Lar", "Oportunidade Única", "Viva com Estilo".
- Mantenha a identidade visual do estilo mas adapte para contexto imobiliário.
- ${form.real_estate_mode === 'single' ? 'MODO IMÓVEL ÚNICO: Cada card mostra um ângulo/cômodo diferente do MESMO imóvel.' : 'MODO VÁRIOS IMÓVEIS: Cada card do carrossel apresenta um imóvel DIFERENTE com suas características.'}`;
    }

    const config: any = {
      description: form.is_real_estate ? 'Estilo imobiliário baseado em referências visuais.' : 'Estilo customizado baseado em referências visuais.',
      is_real_estate: form.is_real_estate,
      is_beta: form.is_beta,
      real_estate_mode: form.is_real_estate ? form.real_estate_mode : undefined,
      cover_image: coverUrl || existingCover || undefined,
      colors: { primary: '#8FA9A0', secondary: '#1A1A1A', accent: '#F5F0E8', text: '#FFFFFF', textDark: '#1A1A1A', background_dark: '#0D0D0D', background_light: '#F5F0E8', highlight: '#8FA9A0' },
      imageGeneration: {
        prompt_style: promptStyle,
        prompt_prefix: form.is_real_estate
          ? 'Premium real estate marketing post for Instagram. Showcase property with professional photography and bold typography. 1080x1350 portrait format.'
          : 'Social media carousel post matching the exact visual style of the reference images. 1080x1350 portrait format.',
        negative_prompt: form.negative_prompt.trim() || 'cartoon, anime, illustration, 3d render, stock photo, generic corporate, gradient background, minimalist flat design',
        imageType: 'photo', lightingStyle: 'cinematic', cameraAngle: 'front', fidelity: 'high',
      },
      cardVariations: [
        { type: 'hero_photo', description: 'Bold cover card matching reference style' },
        { type: 'content', description: 'Content card with editorial layout from references' },
        { type: 'dark_typography', description: 'Dark background card with dramatic typography' },
        { type: 'light_editorial', description: 'Light background variation with editorial elements' },
      ],
    };

    return config;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (refFiles.length === 0 && existingImages.length === 0) { toast.error('Adicione pelo menos 1 foto de referência'); return; }

    setSaving(true);
    try {
      const timestamp = Date.now();
      const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const uploadedUrls: string[] = [];

      for (let i = 0; i < refFiles.length; i++) {
        const refPath = `styles/${slug}/ref-${i + 1}-${timestamp}.${refFiles[i].name.split('.').pop()}`;
        const refUrl = await uploadImage(refFiles[i], refPath);
        uploadedUrls.push(refUrl);
      }

      // Upload cover if new file provided
      let coverUrl = existingCover;
      if (coverFile) {
        const coverPath = `styles/${slug}/cover-${timestamp}.${coverFile.name.split('.').pop()}`;
        coverUrl = await uploadImage(coverFile, coverPath);
      }

      const styleConfig = buildStyleConfig(coverUrl || undefined);
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);

      if (editStyle) {
        const { error } = await supabase.from('marketplace_styles').update({
          name: form.name,
          description: form.description || null,
          category: form.category,
          price_credits: form.price_credits,
          price_brl: form.price_brl,
          is_featured: form.is_featured,
          is_free: form.is_free,
          tags,
          style_config: styleConfig,
          strict_instructions: form.strict_instructions || null,
          preview_images: [...existingImages, ...uploadedUrls],
        } as any).eq('id', editStyle.id);
        if (error) throw error;
        toast.success('Estilo atualizado!');
      } else {
        const { error } = await supabase.from('marketplace_styles').insert({
          name: form.name,
          description: form.description || null,
          preview_images: uploadedUrls,
          price_credits: form.price_credits,
          price_brl: form.price_brl,
          category: form.category,
          style_config: styleConfig,
          is_featured: form.is_featured,
          is_free: form.is_free,
          tags,
          sort_order: totalStyles + 1,
          strict_instructions: form.strict_instructions || null,
        } as any);
        if (error) throw error;
        toast.success('Estilo criado com sucesso!');
      }

      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const generateDescription = async () => {
    setGeneratingDesc(true);
    try {
      const imageUrls: { type: string; image_url: { url: string } }[] = [];
      const allRefs = [...existingImages, ...refPreviews].slice(0, 4);
      for (const url of allRefs) {
        if (url) imageUrls.push({ type: 'image_url', image_url: { url } });
      }
      const userContent: any[] = [
        { type: 'text', text: `Analise as imagens deste estilo de post para Instagram e gere uma descrição curta (1-2 frases, máx 120 chars) descrevendo o visual: cores, tipografia, composição e mood. Nome: "${form.name}", Categoria: "${form.category}", Tags: ${form.tags || 'nenhuma'}. Responda APENAS com a descrição, sem aspas.` },
        ...imageUrls,
      ];
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            { role: 'system', content: 'Você é um especialista em design de posts para Instagram. Analise as imagens fornecidas e descreva o estilo visual de forma concisa. Foque em cores, tipografia, layout e mood. Responda APENAS com a descrição.' },
            { role: 'user', content: imageUrls.length > 0 ? userContent : `Gere uma descrição para o estilo "${form.name}" da categoria "${form.category}". Tags: ${form.tags || 'nenhuma'}.` }
          ],
          model: 'google/gemini-2.5-flash'
        }
      });
      if (error) throw error;
      const text = typeof data === 'string' ? data : data?.content || data?.message || '';
      if (text) setForm(f => ({ ...f, description: text.trim() }));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar descrição');
    } finally {
      setGeneratingDesc(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={() => onOpenChange(false)} />
      <div className="relative z-[9999] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] p-6 mx-4" style={{ backgroundColor: '#111118' }}>
        <button onClick={() => onOpenChange(false)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold text-white mb-4">
          {editStyle ? 'Editar Estilo' : 'Criar Novo Estilo'}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Gringe Editorial"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-yellow-500/40" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.08] text-sm text-white outline-none appearance-none cursor-pointer"
                style={{ backgroundColor: '#1a1a24' }}>
                <option value="editorial" style={{ backgroundColor: '#1a1a24', color: '#fff' }}>Editorial</option>
                <option value="minimalista" style={{ backgroundColor: '#1a1a24', color: '#fff' }}>Minimalista</option>
                <option value="moderno" style={{ backgroundColor: '#1a1a24', color: '#fff' }}>Moderno</option>
                <option value="criativo" style={{ backgroundColor: '#1a1a24', color: '#fff' }}>Criativo</option>
                <option value="corporativo" style={{ backgroundColor: '#1a1a24', color: '#fff' }}>Corporativo</option>
                <option value="lifestyle" style={{ backgroundColor: '#1a1a24', color: '#fff' }}>Lifestyle</option>
              </select>
          </div>


          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-white/40">Descrição</label>
              <button type="button" disabled={generatingDesc || !form.name.trim()} onClick={generateDescription}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors disabled:opacity-40 cursor-pointer">
                {generatingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Gerar com IA
              </button>
            </div>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descreva o estilo visual..." rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none resize-none focus:border-yellow-500/40" />
          </div>

          {/* Pricing & tags */}
          <div className={`grid gap-3 ${form.is_free ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {!form.is_free && (
              <>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Preço (créditos)</label>
                  <input type="number" value={form.price_credits} onChange={e => setForm(f => ({ ...f, price_credits: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Preço (R$)</label>
                  <input type="number" step="0.01" value={form.price_brl} onChange={e => setForm(f => ({ ...f, price_brl: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white outline-none" />
                </div>
              </>
            )}
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Tags (vírgula)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="editorial, urban"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => setForm(f => ({ ...f, is_featured: !f.is_featured }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${form.is_featured ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/[0.04] text-white/30'}`}>
                {form.is_featured ? <Star className="w-3.5 h-3.5" /> : <StarOff className="w-3.5 h-3.5" />}
                Destaque
              </button>
              <button onClick={() => setForm(f => ({ ...f, is_free: !f.is_free, ...(!f.is_free ? { price_credits: 0, price_brl: 0 } : {}) }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${form.is_free ? 'bg-green-500/20 text-green-300' : 'bg-white/[0.04] text-white/30'}`}>
                {form.is_free ? '✓' : '○'} Grátis
              </button>
              <button onClick={() => setForm(f => ({ ...f, is_beta: !f.is_beta }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${form.is_beta ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.04] text-white/30'}`}>
                {form.is_beta ? '✓' : '○'} Beta
              </button>
            </div>
          </div>

          {/* Real Estate Toggle */}
          <div className="p-3 rounded-xl border border-white/[0.06]" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-xs font-medium text-white">Modo Imobiliária</span>
                  <p className="text-[9px] text-white/30">Ativa wizard especializado para imóveis</p>
                </div>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, is_real_estate: !f.is_real_estate }))}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.is_real_estate ? 'bg-amber-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_real_estate ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {form.is_real_estate && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                <label className="text-[10px] text-white/40 block">Tipo de divulgação</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm(f => ({ ...f, real_estate_mode: 'single' }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${form.real_estate_mode === 'single' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/[0.03] text-white/30 border-white/[0.06]'}`}
                  >
                    🏠 Imóvel Único
                    <p className="text-[9px] mt-0.5 opacity-60">Vários cards do mesmo imóvel</p>
                  </button>
                  <button
                    onClick={() => setForm(f => ({ ...f, real_estate_mode: 'multiple' }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${form.real_estate_mode === 'multiple' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/[0.03] text-white/30 border-white/[0.06]'}`}
                  >
                    🏘️ Vários Imóveis
                    <p className="text-[9px] mt-0.5 opacity-60">Cada card = 1 imóvel diferente</p>
                  </button>
                </div>
                <p className="text-[9px] text-amber-300/50">
                  {form.real_estate_mode === 'single'
                    ? 'No wizard, o usuário preencherá dados de 1 imóvel (m², quartos, valor, fotos) e a IA gerará cards variados.'
                    : 'No wizard, o usuário adicionará vários imóveis e cada card do carrossel destacará um imóvel diferente.'}
                </p>
              </div>
            )}
          </div>

          {/* Reference photos - Drag & Drop */}
          <div>
            <label className="text-[10px] text-white/40 mb-2 block">
              Fotos de Referência * <span className="text-white/20">({sortableItems.length} fotos)</span>
            </label>
            <p className="text-[10px] text-white/15 mb-2">
              Arraste para reordenar. A primeira foto será usada como capa.
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortableItems.map(i => i.id)} strategy={rectSortingStrategy}>
                <div className="flex gap-2 flex-wrap">
                  {sortableItems.map((item, i) => (
                    <SortableImageThumb key={item.id} item={item} isFirst={i === 0} onRemove={() => removeItem(item)} />
                  ))}
                  <label className="flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-white/10 cursor-pointer hover:border-yellow-500/30 transition-colors">
                    <div className="text-center">
                      <Plus className="w-4 h-4 text-white/20 mx-auto" />
                      <span className="text-[9px] text-white/20">Adicionar</span>
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleRefFilesChange} />
                  </label>
                </div>
              </SortableContext>
            </DndContext>
            {existingImages.length > 0 && (
              <button onClick={async () => {
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
                  a.href = url; a.download = `referencias-${form.name || 'estilo'}.zip`; a.click();
                  URL.revokeObjectURL(url);
                } catch (e) { console.error('Erro ao criar ZIP', e); }
              }}
                className="flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg bg-white/[0.06] text-white/50 text-xs hover:bg-white/[0.1] hover:text-white/80 cursor-pointer transition-colors">
                <Download className="w-3.5 h-3.5" /> Baixar todas ({existingImages.length})
              </button>
            )}
          </div>

          {/* Cover Image - separate from references */}
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Capa para o Marketplace (opcional)</label>
            <p className="text-[9px] text-white/15 mb-2">Imagem de capa usada apenas para exibição. Não é usada como referência na geração.</p>
            <div className="flex items-center gap-3">
              {(coverPreview || existingCover) ? (
                <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-yellow-500/20 group">
                  <img src={coverPreview || existingCover} alt="Capa" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 left-0.5 px-1.5 py-0.5 rounded bg-yellow-500/80 text-black text-[8px] font-bold">CAPA</span>
                  <button onClick={() => { setCoverFile(null); setCoverPreview(''); setExistingCover(''); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-28 h-28 rounded-lg border-2 border-dashed border-yellow-500/20 cursor-pointer hover:border-yellow-500/40 transition-colors" style={{ backgroundColor: 'rgba(234,179,8,0.03)' }}>
                  <div className="text-center">
                    <Upload className="w-5 h-5 text-yellow-500/30 mx-auto mb-1" />
                    <span className="text-[9px] text-yellow-500/40 font-medium">Upload Capa</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCoverFile(file);
                    const reader = new FileReader();
                    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }} />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Instruções Rígidas (opcional)</label>
            <textarea value={form.strict_instructions} onChange={e => setForm(f => ({ ...f, strict_instructions: e.target.value }))}
              placeholder="Ex: Ao usar esse estilo, todas as fotos devem ter fundo escuro com neon, a pessoa deve aparecer em poses dinâmicas..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none resize-none focus:border-yellow-500/40" />
            <p className="text-[9px] text-white/15 mt-1">Essas instruções serão injetadas com prioridade máxima na IA ao gerar com este estilo.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {editStyle && (
              <button onClick={async () => {
                if (!confirm(`Excluir o estilo "${editStyle.name}" permanentemente?`)) return;
                try {
                  const { error } = await supabase.from('marketplace_styles').delete().eq('id', editStyle.id);
                  if (error) throw error;
                  toast.success('Estilo excluído!');
                  onOpenChange(false);
                  onSaved();
                } catch (err: any) {
                  toast.error('Erro ao excluir: ' + (err.message || ''));
                }
              }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors cursor-pointer border border-red-500/20">
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 text-white text-sm font-semibold hover:from-yellow-500 hover:to-amber-500 transition-all disabled:opacity-50 cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editStyle ? 'Atualizar' : 'Criar Estilo'}
            </button>
            <button onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-white/40 text-sm hover:bg-white/[0.08] cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStyleDialog;
