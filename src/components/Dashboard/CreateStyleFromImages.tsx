import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, X, Sparkles } from 'lucide-react';

const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';

interface CreateStyleFromImagesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** base64 image data (without data: prefix) */
  imageBase64s: string[];
}

const CreateStyleFromImages: React.FC<CreateStyleFromImagesProps> = ({ open, onOpenChange, imageBase64s }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('editorial');
  const [tags, setTags] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Auto-generate name + description on open
  useEffect(() => {
    if (!open || imageBase64s.length === 0) return;
    generateNameAndDescription();
  }, [open]);

  const generateNameAndDescription = async () => {
    setGenerating(true);
    try {
      const imageContent = imageBase64s.slice(0, 4).map(b64 => ({
        type: 'image_url' as const,
        image_url: { url: `data:image/png;base64,${b64}` },
      }));

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em design de posts para Instagram. Analise as imagens e responda APENAS em JSON válido com este formato: {"name": "Nome Criativo do Estilo (2-3 palavras)", "description": "Descrição curta do estilo visual (máx 100 chars)", "category": "editorial|minimalista|moderno|criativo|corporativo|lifestyle", "tags": ["tag1", "tag2", "tag3"]}. Não use markdown, apenas JSON puro.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analise estas imagens de um estilo de post para Instagram e gere nome, descrição, categoria e tags baseados no visual.' },
                ...imageContent,
              ],
            },
          ],
          model: 'google/gemini-2.5-flash',
        },
      });

      if (error) throw error;
      const text = typeof data === 'string' ? data : data?.content || data?.message || '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.category) setCategory(parsed.category);
      if (parsed.tags) setTags(Array.isArray(parsed.tags) ? parsed.tags.join(', ') : parsed.tags);
    } catch (err) {
      console.error('Auto-generate error:', err);
      setName('Novo Estilo');
      setDescription('Estilo visual baseado em referências');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (imageBase64s.length === 0) { toast.error('Nenhuma imagem disponível'); return; }

    setSaving(true);
    try {
      const timestamp = Date.now();
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const uploadedUrls: string[] = [];

      for (let i = 0; i < imageBase64s.length; i++) {
        const bytes = Uint8Array.from(atob(imageBase64s[i]), c => c.charCodeAt(0));
        const path = `styles/${slug}/ref-${i + 1}-${timestamp}.png`;
        const { error } = await supabase.storage.from('marketplace-assets').upload(path, bytes, {
          upsert: true,
          contentType: 'image/png',
        });
        if (error) throw error;
        uploadedUrls.push(`${SUPABASE_URL}/storage/v1/object/public/marketplace-assets/${path}`);
      }

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

      const styleConfig = {
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

      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

      // Get total styles count for sort_order
      const { count } = await supabase.from('marketplace_styles').select('id', { count: 'exact', head: true });

      const { error: insertError } = await supabase.from('marketplace_styles').insert({
        name: name.trim(),
        description: description || null,
        preview_images: uploadedUrls,
        price_credits: isFree ? 0 : 50,
        price_brl: isFree ? 0 : 9.90,
        category,
        style_config: styleConfig,
        is_featured: false,
        is_free: isFree,
        tags: tagList,
        sort_order: (count || 0) + 1,
        strict_instructions: null,
      } as any);

      if (insertError) throw insertError;
      toast.success('Estilo publicado no Marketplace!');
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={() => !saving && onOpenChange(false)} />
      <div className="relative z-[9999] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] p-6 mx-4"
        style={{ backgroundColor: '#111118' }}>
        <button onClick={() => !saving && onOpenChange(false)}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-bold text-white mb-1">Criar Estilo no Marketplace</h2>
        <p className="text-xs text-white/30 mb-5">
          {imageBase64s.length} imagens processadas serão usadas como referência
        </p>

        {generating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="text-sm text-white/50">Analisando visual e gerando detalhes...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview grid */}
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {imageBase64s.slice(0, 8).map((b64, i) => (
                <img key={i} src={`data:image/png;base64,${b64}`} alt=""
                  className="w-16 h-20 rounded-lg object-cover shrink-0 border border-white/10" />
              ))}
              {imageBase64s.length > 8 && (
                <div className="w-16 h-20 rounded-lg shrink-0 border border-white/10 flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-xs text-white/30">+{imageBase64s.length - 8}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Nome *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-purple-500/40" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-white/40">Descrição</label>
                <button onClick={generateNameAndDescription} disabled={generating}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors cursor-pointer disabled:opacity-40">
                  <Sparkles className="w-3 h-3" /> Regenerar
                </button>
              </div>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none resize-none focus:border-purple-500/40" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/[0.08] text-sm text-white outline-none appearance-none cursor-pointer"
                  style={{ backgroundColor: '#1a1a24' }}>
                  <option value="editorial" style={{ backgroundColor: '#1a1a24' }}>Editorial</option>
                  <option value="minimalista" style={{ backgroundColor: '#1a1a24' }}>Minimalista</option>
                  <option value="moderno" style={{ backgroundColor: '#1a1a24' }}>Moderno</option>
                  <option value="criativo" style={{ backgroundColor: '#1a1a24' }}>Criativo</option>
                  <option value="corporativo" style={{ backgroundColor: '#1a1a24' }}>Corporativo</option>
                  <option value="lifestyle" style={{ backgroundColor: '#1a1a24' }}>Lifestyle</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Tags (vírgula)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="editorial, urban"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none" />
              </div>
            </div>

            <button onClick={() => setIsFree(!isFree)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${isFree ? 'bg-green-500/20 text-green-300' : 'bg-white/[0.04] text-white/30'}`}>
              {isFree ? '✓ Grátis' : '○ Pago (50 créditos / R$ 9,90)'}
            </button>

            <button onClick={handlePublish} disabled={saving || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-violet-500 transition-all disabled:opacity-50 cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Publicando...' : 'Publicar no Marketplace'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateStyleFromImages;
