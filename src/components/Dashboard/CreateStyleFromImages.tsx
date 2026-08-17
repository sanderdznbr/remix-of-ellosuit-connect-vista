import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, X, Sparkles } from 'lucide-react';
import { isNativeIOS } from '@/lib/platform';

const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';

interface CreateStyleFromImagesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** base64 image data (without data: prefix) */
  imageBase64s: string[];
}

const CreateStyleFromImages: React.FC<CreateStyleFromImagesProps> = ({ open, onOpenChange, imageBase64s }) => {
  const nativeIOS = isNativeIOS();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('editorial');
  const [tags, setTags] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detailedPromptStyle, setDetailedPromptStyle] = useState('');
  const [recommendedNoFaces, setRecommendedNoFaces] = useState(false);
  const [faceRecommendationReason, setFaceRecommendationReason] = useState('');

  // Auto-generate name + description + detailed prompt on open
  useEffect(() => {
    if (!open || imageBase64s.length === 0) return;
    generateNameAndDescription();
  }, [open]);

  const generateNameAndDescription = async () => {
    setGenerating(true);
    try {
      const imageContent = imageBase64s.slice(0, 6).map(b64 => ({
        type: 'image_url' as const,
        image_url: { url: `data:image/png;base64,${b64}` },
      }));

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em design de posts para Instagram. Analise as imagens e responda APENAS em JSON válido com este formato:
{
  "name": "Nome Criativo do Estilo (2-3 palavras)",
  "description": "Descrição curta do estilo visual (máx 100 chars)",
  "category": "editorial|minimalista|moderno|criativo|corporativo|lifestyle",
  "tags": ["tag1", "tag2", "tag3"],
  "has_people": true/false,
  "recommended_no_faces": true/false,
  "face_recommendation_reason": "motivo curto se recommended_no_faces=true",
  "visual_dna": {
    "background": "descrição detalhada dos fundos (cores, gradientes, texturas, padrões)",
    "typography": "descrição detalhada da tipografia (fonte tipo serif/sans/display, peso, tamanho, hierarquia, efeitos como outline/shadow/glow)",
    "layout": "descrição detalhada do layout (grid, alinhamento, espaçamento, zonas de texto vs imagem, composição)",
    "colors": "lista EXATA de todas as cores dominantes em hex (#XXXXXX) com seus papéis (fundo, texto, acento, destaque)",
    "decorative": "elementos decorativos específicos (linhas, formas geométricas, texturas, overlays, gradientes, sombras, brilhos, ícones)",
    "photo_treatment": "tratamento fotográfico (filtros, contraste, saturação, grain, blur, duotone, recorte)",
    "mood": "atmosfera geral (futurista, orgânico, corporativo, bold, suave, dramático)",
    "unique_features": "características únicas e diferenciadoras que tornam esse estilo reconhecível"
  }
}

Regras para has_people e recommended_no_faces:
- has_people: true se as referências contêm rostos/figuras humanas como parte do estilo
- recommended_no_faces: true se o estilo é PREDOMINANTEMENTE tipográfico, gráfico, abstrato, ou baseado em objetos/cenários — onde adicionar rostos humanos PREJUDICARIA a fidelidade ao estilo original. Exemplos: estilos com fundo sólido + tipografia, estilos 3D, estilos com padrões geométricos, estilos minimalistas sem pessoas.
- recommended_no_faces: false se o estilo NATURALMENTE incorpora pessoas/rostos como parte do design.

Não use markdown, apenas JSON puro. Seja EXTREMAMENTE detalhado e específico no visual_dna — descreva exatamente o que vê, não generalize.`,
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analise estas imagens de um estilo de post para Instagram e gere nome, descrição, categoria, tags e uma análise visual detalhada.' },
                ...imageContent,
              ],
            },
          ],
          model: 'google/gemini-2.5-flash',
          lightweight: true,
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

      // Face recommendation
      if (parsed.recommended_no_faces !== undefined) setRecommendedNoFaces(!!parsed.recommended_no_faces);
      if (parsed.face_recommendation_reason) setFaceRecommendationReason(parsed.face_recommendation_reason);

      // Build a detailed prompt_style from visual_dna
      if (parsed.visual_dna) {
        const dna = parsed.visual_dna;
        const detailedPrompt = buildDetailedPromptStyle(parsed.name || 'Custom Style', dna);
        setDetailedPromptStyle(detailedPrompt);

        // If recommended_no_faces, add anti-face instructions to prompt
        if (parsed.recommended_no_faces) {
          setDetailedPromptStyle(prev => prev + '\n\n=== PEOPLE/FACES ===\nThis style does NOT use human faces or people. Do NOT include any people, faces, portraits, or human figures. Focus exclusively on typography, graphic elements, objects, and abstract/editorial compositions.');
        }
      }
    } catch (err) {
      console.error('Auto-generate error:', err);
      setName('Novo Estilo');
      setDescription('Estilo visual baseado em referências');
    } finally {
      setGenerating(false);
    }
  };

  const buildDetailedPromptStyle = (styleName: string, dna: any): string => {
    return `Create an Instagram carousel post in the "${styleName}" style. Follow these MANDATORY visual rules with MAXIMUM FIDELITY:

=== BACKGROUND ===
${dna.background || 'Match the exact background treatment from references.'}

=== TYPOGRAPHY ===
${dna.typography || 'Match the exact typography from references.'}
- Reproduce the EXACT font style, weight, size hierarchy, and text effects (outline, shadow, glow, 3D, gradient fills).
- Match letter-spacing, line-height, and text transforms (uppercase, lowercase, mixed).

=== LAYOUT & COMPOSITION ===
${dna.layout || 'Follow the exact layout grid from references.'}
- Match the exact positioning of text blocks, images, and decorative elements.
- Replicate the same margins, padding, and visual breathing room.

=== COLOR PALETTE (MANDATORY) ===
${dna.colors || 'Extract and use the exact colors from references.'}
- These colors MUST dominate the composition. Do NOT introduce colors outside this palette.

=== DECORATIVE ELEMENTS ===
${dna.decorative || 'Reproduce decorative elements from references.'}
- Replicate the EXACT types of lines, shapes, textures, overlays, and visual accents.

=== PHOTOGRAPHY / IMAGE TREATMENT ===
${dna.photo_treatment || 'Match the photo treatment from references.'}

=== MOOD & ATMOSPHERE ===
${dna.mood || 'Match the overall mood from references.'}

=== UNIQUE SIGNATURE ELEMENTS ===
${dna.unique_features || 'Replicate the unique visual signatures from references.'}

=== CRITICAL RULES ===
1. PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas, logos ou informações pessoais das referências.
2. IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.
3. SEM BORDAS: Full bleed, sem barras ou bordas.
4. O resultado DEVE parecer parte da MESMA COLEÇÃO/SÉRIE que as referências — reconhecível instantaneamente como o mesmo estilo.
5. Cada card deve ter variação de layout MAS manter a MESMA identidade visual (paleta, tipografia, elementos decorativos).`;
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

      // Use the detailed AI-generated prompt or fallback to generic
      const promptStyle = detailedPromptStyle || buildFallbackPromptStyle();

      const styleConfig = {
        description: description || 'Estilo customizado baseado em referências visuais.',
        recommended_no_faces: recommendedNoFaces,
        face_recommendation_reason: faceRecommendationReason,
        colors: { primary: '#8FA9A0', secondary: '#1A1A1A', accent: '#F5F0E8', text: '#FFFFFF', textDark: '#1A1A1A', background_dark: '#0D0D0D', background_light: '#F5F0E8', highlight: '#8FA9A0' },
        imageGeneration: {
          prompt_style: promptStyle,
          prompt_prefix: 'Social media carousel post matching the exact visual style of the reference images. 1080x1350 portrait format.',
          negative_prompt: `cartoon, anime, illustration, 3d render, stock photo, generic corporate, gradient background, minimalist flat design${recommendedNoFaces ? ', human faces, people, person, portrait, selfie, headshot' : ''}`,
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

  const buildFallbackPromptStyle = () => `Create an Instagram carousel post that EXACTLY replicates the visual style shown in the reference images. Follow these rules STRICTLY:
1. COPY THE EXACT VISUAL DNA: Replicate the same color palette, typography style, layout composition, decorative elements, and overall aesthetic from the reference images.
2. TYPOGRAPHY: Match the exact font styles, sizes, weights, and placement patterns from the references.
3. COLOR PALETTE: Extract and use the EXACT same colors from the reference images.
4. LAYOUT & COMPOSITION: Follow the same grid, spacing, alignment, and element placement as the references.
5. DECORATIVE ELEMENTS: Reproduce the same types of decorative elements seen in the references.
6. PHOTOGRAPHY STYLE: Match the same photo treatment from the references.
7. PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas, logos ou informações pessoais das referências.
8. IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.
9. SEM BORDAS: Full bleed, sem barras ou bordas.`;

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
            <span className="text-sm text-white/50">Analisando DNA visual e gerando detalhes...</span>
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

            {/* Visual DNA indicator */}
            {detailedPromptStyle && (
              <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="text-[10px] text-green-300 font-medium">✓ DNA Visual analisado — prompt detalhado gerado automaticamente</span>
              </div>
            )}

            {/* Face recommendation indicator */}
            {recommendedNoFaces && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] text-amber-300 font-medium">⚠ Recomendado SEM rostos — {faceRecommendationReason || 'estilo tipográfico/gráfico funciona melhor sem pessoas'}</span>
              </div>
            )}

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

            {!nativeIOS && (
              <button onClick={() => setIsFree(!isFree)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${isFree ? 'bg-green-500/20 text-green-300' : 'bg-white/[0.04] text-white/30'}`}>
                {isFree ? '✓ Grátis' : '○ Pago (50 créditos / R$ 9,90)'}
              </button>
            )}

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
