import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { extractColorsFromImage } from '@/utils/extractColorsFromImage';
import {
  ArrowLeft, ArrowRight, Upload, X, Loader2, Palette, Sparkles,
  Image as ImageIcon, User, Monitor, Wand2, Check, Plus, Eye, Download,
} from 'lucide-react';

const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';

interface GeneratedPost {
  imageUrl: string;
  hasFace: boolean;
  cardIndex: number;
}

const STEPS = [
  { key: 'references', label: 'Referências de Estilo', icon: ImageIcon },
  { key: 'brand', label: 'Elementos da Marca', icon: Palette },
  { key: 'mockups', label: 'Fotos p/ Mockups', icon: Monitor },
  { key: 'logo', label: 'Logo & Cores', icon: Sparkles },
  { key: 'face', label: 'Foto do Rosto', icon: User },
  { key: 'generate', label: 'Gerar Posts', icon: Wand2 },
];

const StyleCreator: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // Step data
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);

  const [brandFiles, setBrandFiles] = useState<File[]>([]);
  const [brandPreviews, setBrandPreviews] = useState<string[]>([]);

  const [mockupFiles, setMockupFiles] = useState<File[]>([]);
  const [mockupPreviews, setMockupPreviews] = useState<string[]>([]);
  const [mockupLabels, setMockupLabels] = useState<string[]>([]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [extractingColors, setExtractingColors] = useState(false);

  const [faceFiles, setFaceFiles] = useState<File[]>([]);
  const [facePreviews, setFacePreviews] = useState<string[]>([]);

  const [styleName, setStyleName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 10, message: '' });
  const [previewPost, setPreviewPost] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // File helpers
  const addFiles = (
    setter: React.Dispatch<React.SetStateAction<File[]>>,
    previewSetter: React.Dispatch<React.SetStateAction<string[]>>,
    files: FileList | null
  ) => {
    if (!files) return;
    const arr = Array.from(files);
    setter(prev => [...prev, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => previewSetter(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<File[]>>,
    previewSetter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
    previewSetter(prev => prev.filter((_, i) => i !== index));
  };

  // Logo color extraction
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    setExtractingColors(true);
    try {
      const colors = await extractColorsFromImage(url, 6);
      setExtractedColors(colors);
    } catch { setExtractedColors([]); }
    setExtractingColors(false);
  };

  // Upload helper
  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { error } = await supabase.storage.from('marketplace-assets').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/marketplace-assets/${path}`;
  };

  // Generate
  const handleGenerate = async () => {
    if (!styleName.trim()) { toast.error('Dê um nome ao estilo'); return; }
    if (refFiles.length === 0) { toast.error('Adicione pelo menos 1 referência de estilo'); return; }

    setGenerating(true);
    setGeneratedPosts([]);
    const posts: GeneratedPost[] = [];

    try {
      const timestamp = Date.now();
      const slug = styleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Upload all files
      setProgress({ current: 0, total: 10, message: 'Enviando arquivos...' });

      const refUrls: string[] = [];
      for (let i = 0; i < refFiles.length; i++) {
        const url = await uploadFile(refFiles[i], `style-creator/${slug}/ref-${i}-${timestamp}.${refFiles[i].name.split('.').pop()}`);
        refUrls.push(url);
      }

      const brandUrls: string[] = [];
      for (let i = 0; i < brandFiles.length; i++) {
        const url = await uploadFile(brandFiles[i], `style-creator/${slug}/brand-${i}-${timestamp}.${brandFiles[i].name.split('.').pop()}`);
        brandUrls.push(url);
      }

      const mockupUrls: string[] = [];
      for (let i = 0; i < mockupFiles.length; i++) {
        const url = await uploadFile(mockupFiles[i], `style-creator/${slug}/mockup-${i}-${timestamp}.${mockupFiles[i].name.split('.').pop()}`);
        mockupUrls.push(url);
      }

      let logoUrl = '';
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, `style-creator/${slug}/logo-${timestamp}.${logoFile.name.split('.').pop()}`);
      }

      const faceUrls: string[] = [];
      for (let i = 0; i < faceFiles.length; i++) {
        const url = await uploadFile(faceFiles[i], `style-creator/${slug}/face-${i}-${timestamp}.${faceFiles[i].name.split('.').pop()}`);
        faceUrls.push(url);
      }

      // Generate 10 posts (5 with face, 5 without)
      for (let i = 0; i < 10; i++) {
        const hasFace = i < 5; // first 5 with face
        const cardNumber = i + 1;

        setProgress({ current: i, total: 10, message: `Gerando post ${cardNumber}/10 ${hasFace ? '(com rosto)' : '(sem rosto)'}...` });

        const referenceImages: { type: string; image_url: { url: string } }[] = [];

        // Add style references
        for (const url of refUrls.slice(0, 4)) {
          referenceImages.push({ type: 'image_url', image_url: { url } });
        }

        // Add brand elements
        for (const url of brandUrls.slice(0, 2)) {
          referenceImages.push({ type: 'image_url', image_url: { url } });
        }

        // Face references (only for face posts)
        if (hasFace && faceUrls.length > 0) {
          referenceImages.push({ type: 'image_url', image_url: { url: faceUrls[0] } });
        }

        // Mockup references (for variety)
        if (mockupUrls.length > 0) {
          const mockupIdx = i % mockupUrls.length;
          referenceImages.push({ type: 'image_url', image_url: { url: mockupUrls[mockupIdx] } });
        }

        // Build prompt
        let prompt = `Crie um post profissional para Instagram no formato 1080x1350 (portrait).

ESTILO: Replique EXATAMENTE o estilo visual das imagens de referência fornecidas - mesmas cores, tipografia, composição, elementos decorativos e mood.

NOME DO ESTILO: "${styleName}"`;

        if (extractedColors.length > 0) {
          prompt += `\n\nCORES DA MARCA (OBRIGATÓRIO): Use predominantemente estas cores: ${extractedColors.join(', ')}. Integre estas cores harmoniosamente no design.`;
        }

        if (brandUrls.length > 0) {
          prompt += `\n\nELEMENTOS DA MARCA: Observe os patterns, texturas e elementos visuais das imagens de marca fornecidas. Incorpore-os no design.`;
        }

        if (mockupUrls.length > 0) {
          const mockupDesc = mockupLabels.filter(Boolean).join(', ') || 'tela de dispositivo (notebook, celular, etc.)';
          prompt += `\n\nMOCKUPS: Uma das imagens de referência contém fotos para serem usadas em mockups (${mockupDesc}). Integre essas fotos dentro de telas de dispositivos (notebook 3D, celular, tablet) de forma natural e profissional no design.`;
        }

        if (hasFace && faceUrls.length > 0) {
          prompt += `\n\nROSTO: Este post DEVE incluir o rosto da pessoa fornecida nas referências. A pessoa deve aparecer de forma natural e integrada ao design, mantendo FIDELIDADE TOTAL aos traços faciais da referência.`;
        } else {
          prompt += `\n\nSEM ROSTO: Este post NÃO deve conter rostos humanos. Foque em tipografia, elementos visuais, patterns e composição editorial.`;
        }

        prompt += `\n\nREGRAS:
- Full bleed, sem bordas
- Texto em PORTUGUÊS BRASILEIRO
- NÃO copie nomes, @, marcas ou logos das referências
- Varie a composição e layout entre os posts
- Post ${cardNumber}/10
- Estilo editorial profissional para Instagram`;

        if (logoUrl) {
          prompt += `\n\nLOGO: Incorpore a logomarca fornecida de forma sutil em um dos cantos do post.`;
          referenceImages.push({ type: 'image_url', image_url: { url: logoUrl } });
        }

        const userContent: any[] = [
          { type: 'text', text: prompt },
          ...referenceImages,
        ];

        try {
          const { data, error } = await supabase.functions.invoke('ai-chat', {
            body: {
              messages: [
                { role: 'system', content: 'Você é um designer profissional de posts para Instagram. Gere imagens seguindo as instruções com precisão.' },
                { role: 'user', content: userContent },
              ],
              model: 'google/gemini-2.5-flash-image',
              modalities: ['image', 'text'],
            },
          });

          if (error) throw error;

          const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (imageUrl) {
            // Upload generated image to storage
            const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
            const byteString = atob(base64Data);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
            const blob = new Blob([ab], { type: 'image/png' });
            const file = new File([blob], `generated-${i}.png`, { type: 'image/png' });

            const genUrl = await uploadFile(file, `style-creator/${slug}/generated-${hasFace ? 'face' : 'no-face'}-${i}-${timestamp}.png`);

            const post: GeneratedPost = { imageUrl: genUrl, hasFace, cardIndex: i };
            posts.push(post);
            setGeneratedPosts([...posts]);
          }
        } catch (err: any) {
          console.error(`Erro no post ${cardNumber}:`, err);
          toast.error(`Erro no post ${cardNumber}: ${err.message || 'Tente novamente'}`);
        }

        // Small delay between generations
        if (i < 9) await new Promise(r => setTimeout(r, 2000));
      }

      setProgress({ current: 10, total: 10, message: 'Concluído!' });
      setShowResults(true);
      toast.success(`${posts.length} posts gerados com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro: ' + (err.message || 'Tente novamente'));
    } finally {
      setGenerating(false);
    }
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return refFiles.length > 0;
      case 5: return styleName.trim().length > 0;
      default: return true; // optional steps
    }
  };

  const renderImageGrid = (
    previews: string[],
    fileSetter: React.Dispatch<React.SetStateAction<File[]>>,
    previewSetter: React.Dispatch<React.SetStateAction<string[]>>,
    onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void,
    label: string,
    hint: string
  ) => (
    <div>
      <p className="text-sm text-white/60 mb-3">{hint}</p>
      <div className="flex gap-3 flex-wrap">
        {previews.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => removeFile(i, fileSetter, previewSetter)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <label className="flex items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-white/15 cursor-pointer hover:border-yellow-500/40 transition-colors">
          <div className="text-center">
            <Plus className="w-5 h-5 text-white/25 mx-auto mb-1" />
            <span className="text-[10px] text-white/25">{label}</span>
          </div>
          <input type="file" accept="image/*" multiple className="hidden" onChange={onAdd} />
        </label>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0: // References
        return renderImageGrid(
          refPreviews, setRefFiles, setRefPreviews,
          (e) => addFiles(setRefFiles, setRefPreviews, e.target.files),
          'Adicionar', 'Adicione prints de posts que você gosta. Eles servirão como referência visual para o estilo.'
        );

      case 1: // Brand elements
        return renderImageGrid(
          brandPreviews, setBrandFiles, setBrandPreviews,
          (e) => addFiles(setBrandFiles, setBrandPreviews, e.target.files),
          'Adicionar', 'Adicione patterns, texturas, elementos gráficos da marca (opcional).'
        );

      case 2: // Mockups
        return (
          <div>
            <p className="text-sm text-white/60 mb-3">
              Adicione fotos que devem aparecer dentro de telas (notebook, celular, tablet). A IA criará mockups 3D com estas imagens.
            </p>
            <div className="flex gap-3 flex-wrap">
              {mockupPreviews.map((url, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => {
                      setMockupFiles(prev => prev.filter((_, idx) => idx !== i));
                      setMockupPreviews(prev => prev.filter((_, idx) => idx !== i));
                      setMockupLabels(prev => prev.filter((_, idx) => idx !== i));
                    }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    value={mockupLabels[i] || ''}
                    onChange={e => setMockupLabels(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                    placeholder="Ex: tela notebook"
                    className="w-24 px-2 py-1 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/70 outline-none placeholder:text-white/20"
                  />
                </div>
              ))}
              <label className="flex items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-white/15 cursor-pointer hover:border-yellow-500/40 transition-colors">
                <div className="text-center">
                  <Monitor className="w-5 h-5 text-white/25 mx-auto mb-1" />
                  <span className="text-[10px] text-white/25">Mockup</span>
                </div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setMockupFiles(prev => [...prev, ...files]);
                  files.forEach(f => {
                    const reader = new FileReader();
                    reader.onload = ev => {
                      setMockupPreviews(prev => [...prev, ev.target?.result as string]);
                      setMockupLabels(prev => [...prev, '']);
                    };
                    reader.readAsDataURL(f);
                  });
                }} />
              </label>
            </div>
          </div>
        );

      case 3: // Logo
        return (
          <div className="space-y-4">
            <p className="text-sm text-white/60">Faça upload da logo para extrair as cores da marca.</p>
            {logoPreview ? (
              <div className="flex items-start gap-4">
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-white/10">
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain bg-white/5" />
                  <button onClick={() => { setLogoFile(null); setLogoPreview(''); setExtractedColors([]); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  {extractingColors ? (
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <Loader2 className="w-4 h-4 animate-spin" /> Extraindo cores...
                    </div>
                  ) : extractedColors.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/40 mb-2">Cores extraídas:</p>
                      <div className="flex gap-2 flex-wrap">
                        {extractedColors.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.06]">
                            <div className="w-5 h-5 rounded-md border border-white/10" style={{ backgroundColor: c }} />
                            <span className="text-xs text-white/50 font-mono">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-white/30">Nenhuma cor detectada</p>
                  )}
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-white/15 cursor-pointer hover:border-yellow-500/40 transition-colors">
                <div className="text-center">
                  <Upload className="w-6 h-6 text-white/25 mx-auto mb-1" />
                  <span className="text-xs text-white/25">Logo</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            )}
          </div>
        );

      case 4: // Face
        return renderImageGrid(
          facePreviews, setFaceFiles, setFacePreviews,
          (e) => addFiles(setFaceFiles, setFacePreviews, e.target.files),
          'Adicionar', 'Adicione fotos do rosto. 5 dos 10 posts terão o rosto integrado ao design.'
        );

      case 5: // Generate
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Nome do Estilo *</label>
              <input value={styleName} onChange={e => setStyleName(e.target.value)}
                placeholder="Ex: Neon Editorial"
                className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-yellow-500/40" />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Referências', count: refFiles.length },
                { label: 'Marca', count: brandFiles.length },
                { label: 'Mockups', count: mockupFiles.length },
                { label: 'Cores', count: extractedColors.length },
                { label: 'Rostos', count: faceFiles.length },
              ].map(s => (
                <div key={s.label} className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-[10px] text-white/30 mb-0.5">{s.label}</p>
                  <p className="text-lg font-bold text-white/70">{s.count}</p>
                </div>
              ))}
            </div>

            {generating && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                  {progress.message}
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-amber-500 transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Generated posts grid */}
            {generatedPosts.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-3">Posts gerados ({generatedPosts.length}/10)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {generatedPosts.map((post, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-white/10 group cursor-pointer"
                      onClick={() => setPreviewPost(post.imageUrl)}>
                      <div className="aspect-[4/5]">
                        <img src={post.imageUrl} alt={`Post ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-[9px] text-white/60 flex items-center justify-between">
                        <span>{post.hasFace ? '👤 Com rosto' : '📐 Sem rosto'}</span>
                        <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleGenerate} disabled={generating || !styleName.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-semibold hover:from-yellow-500 hover:to-amber-500 transition-all disabled:opacity-50 cursor-pointer">
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              {generating ? 'Gerando...' : 'Gerar 10 Posts'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (user?.email !== 'admin@gmail.com') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/30">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Criador de Estilos</h1>
        <p className="text-sm text-white/40">Crie estilos únicos para o Marketplace com referências, marca e mockups.</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button key={s.key} onClick={() => !generating && setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isActive ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                isDone ? 'bg-white/[0.06] text-white/50' :
                'bg-white/[0.03] text-white/25'
              }`}>
              {isDone ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Icon className="w-3.5 h-3.5" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          {React.createElement(STEPS[step].icon, { className: 'w-5 h-5 text-yellow-500' })}
          {STEPS[step].label}
        </h2>
        {renderStep()}
      </div>

      {/* Navigation */}
      {!generating && (
        <div className="flex items-center gap-3 mt-8 max-w-3xl">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] text-white/50 text-sm hover:bg-white/[0.1] cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button onClick={() => canAdvance() && setStep(s => s + 1)} disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.12] disabled:opacity-30 cursor-pointer ml-auto">
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Results gallery (full view after generation) */}
      {showResults && generatedPosts.length > 0 && (
        <div className="fixed inset-0 z-[9998] bg-[#0a0a0f] overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Posts Gerados — {styleName}</h2>
                <p className="text-sm text-white/40 mt-1">{generatedPosts.length} posts criados • Clique para ampliar, use o botão para baixar</p>
              </div>
              <button onClick={() => setShowResults(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] text-white/60 text-sm hover:bg-white/[0.12] cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Voltar ao editor
              </button>
            </div>

            {/* With face */}
            {generatedPosts.filter(p => p.hasFace).length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-white/50 mb-3">👤 Com Rosto ({generatedPosts.filter(p => p.hasFace).length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {generatedPosts.filter(p => p.hasFace).map((post, i) => (
                    <div key={`face-${i}`} className="relative rounded-xl overflow-hidden border border-white/10 group">
                      <div className="aspect-[4/5] cursor-pointer" onClick={() => setPreviewPost(post.imageUrl)}>
                        <img src={post.imageUrl} alt={`Post ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <a href={post.imageUrl} download={`${styleName}-face-${i + 1}.png`} target="_blank" rel="noopener noreferrer"
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Without face */}
            {generatedPosts.filter(p => !p.hasFace).length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-white/50 mb-3">📐 Sem Rosto ({generatedPosts.filter(p => !p.hasFace).length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {generatedPosts.filter(p => !p.hasFace).map((post, i) => (
                    <div key={`noface-${i}`} className="relative rounded-xl overflow-hidden border border-white/10 group">
                      <div className="aspect-[4/5] cursor-pointer" onClick={() => setPreviewPost(post.imageUrl)}>
                        <img src={post.imageUrl} alt={`Post ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <a href={post.imageUrl} download={`${styleName}-${i + 1}.png`} target="_blank" rel="noopener noreferrer"
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewPost && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80" onClick={() => setPreviewPost(null)}>
          <div className="relative max-w-lg max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={previewPost} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl" />
            <button onClick={() => setPreviewPost(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleCreator;
