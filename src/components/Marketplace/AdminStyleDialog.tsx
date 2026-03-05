import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Trash2, Upload, Save, Loader2, X, Download, Sparkles,
  Star, StarOff, Eye, EyeOff,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  });
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  useEffect(() => {
    if (open) {
      if (editStyle) {
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
        });
        setExistingImages(editStyle.preview_images || []);
      } else {
        setForm({ name: '', description: '', category: 'editorial', price_credits: 50, price_brl: 9.90, tags: '', is_featured: false, is_free: false, strict_instructions: '' });
        setExistingImages([]);
      }
      setRefFiles([]);
      setRefPreviews([]);
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

  const buildStyleConfig = () => {
    const promptStyle = `Create an Instagram carousel post that EXACTLY replicates the visual style shown in the reference images. Follow these rules STRICTLY:
1. COPY THE EXACT VISUAL DNA: Replicate the same color palette, typography style, layout composition, decorative elements, and overall aesthetic from the reference images.
2. TYPOGRAPHY: Match the exact font styles, sizes, weights, and placement patterns from the references.
3. COLOR PALETTE: Extract and use the EXACT same colors from the reference images.
4. LAYOUT & COMPOSITION: Follow the same grid, spacing, alignment, and element placement as the references.
5. DECORATIVE ELEMENTS: Reproduce the same types of decorative elements seen in the references.
6. PHOTOGRAPHY STYLE: Match the same photo treatment from the references.
7. PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas, logos ou informações pessoais das referências.
8. IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.
9. SEM BORDAS: Full bleed, sem barras ou bordas.`;

    return {
      description: 'Estilo customizado baseado em referências visuais.',
      colors: { primary: '#8FA9A0', secondary: '#1A1A1A', accent: '#F5F0E8', text: '#FFFFFF', textDark: '#1A1A1A', background_dark: '#0D0D0D', background_light: '#F5F0E8', highlight: '#8FA9A0' },
      imageGeneration: {
        prompt_style: promptStyle,
        prompt_prefix: 'Social media carousel post matching the exact visual style of the reference images. 1080x1350 portrait format.',
        negative_prompt: 'cartoon, anime, illustration, 3d render, stock photo, generic corporate, gradient background, minimalist flat design',
        imageType: 'photo', lightingStyle: 'cinematic', cameraAngle: 'front', fidelity: 'high',
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

      const styleConfig = buildStyleConfig();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111118] border-white/[0.08] text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            {editStyle ? 'Editar Estilo' : 'Criar Novo Estilo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white outline-none">
                <option value="editorial">Editorial</option>
                <option value="minimalista">Minimalista</option>
                <option value="moderno">Moderno</option>
                <option value="criativo">Criativo</option>
                <option value="corporativo">Corporativo</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>
          </div>

          {/* Description */}
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
            </div>
          </div>

          {/* Reference photos */}
          <div>
            <label className="text-[10px] text-white/40 mb-2 block">
              Fotos de Referência * <span className="text-white/20">({existingImages.length + refFiles.length} fotos)</span>
            </label>
            <p className="text-[10px] text-white/15 mb-2">
              A IA usará estas fotos como referência visual para replicar o estilo 100%. A primeira foto será usada como capa.
            </p>
            <div className="flex gap-2 flex-wrap">
              {existingImages.map((url, i) => (
                <div key={`existing-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 group">
                  <img src={url} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded bg-yellow-500/80 text-black text-[7px] font-bold">Capa</span>}
                  <button onClick={() => removeExistingImage(i)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
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

          {/* Strict instructions */}
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
      </DialogContent>
    </Dialog>
  );
};

export default AdminStyleDialog;
