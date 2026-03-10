import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ChevronRight, ChevronLeft, Sparkles, Image as ImageIcon, Loader2, Download, Trash2, Maximize2, Pencil, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import ImageInpaintEditor from './ImageInpaintEditor';
import GalleryPicker from '@/components/Carousel/wizard/GalleryPicker';

interface MarketplaceStyle {
  id: string;
  name: string;
  preview_images: string[];
  description: string | null;
}

interface GeneratedPortrait {
  id: string;
  title: string | null;
  prompt: string;
  result_image_url: string | null;
  status: string;
  created_at: string;
}

type WizardStep = 'faces' | 'style' | 'prompt' | 'generating' | 'result';

const MAX_FACE_PHOTOS = 40;

const FaceGenerator: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<WizardStep>('faces');
  const [faceFiles, setFaceFiles] = useState<File[]>([]);
  const [facePreviews, setFacePreviews] = useState<string[]>([]);
  const [styleRefFiles, setStyleRefFiles] = useState<File[]>([]);
  const [styleRefPreviews, setStyleRefPreviews] = useState<string[]>([]);
  const [selectedMarketplaceStyle, setSelectedMarketplaceStyle] = useState<string | null>(null);
  const [marketplaceStyles, setMarketplaceStyles] = useState<MarketplaceStyle[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState<GeneratedPortrait[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [inpaintUrl, setInpaintUrl] = useState<string | null>(null);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).maybeSingle();
      if (cu) setCompanyId(cu.company_id);

      const [{ data: styles }, { data: portraits }] = await Promise.all([
        supabase.from('marketplace_styles').select('id, name, preview_images, description').eq('is_active', true).order('sort_order'),
        supabase.from('generated_portraits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      ]);
      setMarketplaceStyles(styles || []);
      setGallery((portraits as GeneratedPortrait[]) || []);
    };
    loadData();
  }, [user]);

  // ─── Ensure "Imagens Geradas" folder exists ─────────
  const ensureGeneratedFolder = async (): Promise<string | null> => {
    if (!companyId || !user) return null;
    const { data: existing } = await supabase
      .from('brand_asset_folders')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', 'Imagens Geradas')
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('brand_asset_folders')
      .insert({ company_id: companyId, created_by: user.id, name: 'Imagens Geradas', color: '#8B5CF6' })
      .select('id')
      .single();

    if (error) { console.error('Folder creation error:', error); return null; }
    return created?.id || null;
  };

  const saveToGalleryFolder = async (imageUrl: string, title: string) => {
    if (!companyId) return;
    const folderId = await ensureGeneratedFolder();
    if (!folderId) return;

    await supabase.from('brand_assets').insert({
      company_id: companyId,
      name: title || 'Retrato Gerado',
      file_url: imageUrl,
      file_type: 'image',
      category: 'photo',
      folder_id: folderId,
    });
  };

  const handleFaceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (faceFiles.length + files.length > MAX_FACE_PHOTOS) {
      toast.error(`Máximo ${MAX_FACE_PHOTOS} fotos de rosto`);
      return;
    }
    const newFiles = [...faceFiles, ...files];
    setFaceFiles(newFiles);
    setFacePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  }, [faceFiles]);

  const removeFace = (index: number) => {
    const newFiles = faceFiles.filter((_, i) => i !== index);
    setFaceFiles(newFiles);
    setFacePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const handleGalleryImport = async (selectedFiles: { url: string; name: string }[]) => {
    setGalleryPickerOpen(false);
    const remaining = MAX_FACE_PHOTOS - faceFiles.length;
    const toImport = selectedFiles.slice(0, remaining);
    if (toImport.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (const f of toImport) {
      try {
        const resp = await fetch(f.url);
        const blob = await resp.blob();
        const ext = f.name.split('.').pop() || 'jpg';
        const file = new File([blob], f.name || `gallery_${Date.now()}.${ext}`, { type: blob.type });
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      } catch (err) {
        console.error('Failed to import gallery file:', err);
      }
    }
    if (newFiles.length > 0) {
      setFaceFiles(prev => [...prev, ...newFiles]);
      setFacePreviews(prev => [...prev, ...newPreviews]);
      toast.success(`${newFiles.length} foto(s) importada(s) da galeria`);
    }
  };

  const handleStyleRefUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (styleRefFiles.length + files.length > 4) {
      toast.error('Máximo 4 referências de estilo');
      return;
    }
    const newFiles = [...styleRefFiles, ...files];
    setStyleRefFiles(newFiles);
    setStyleRefPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  }, [styleRefFiles]);

  const removeStyleRef = (index: number) => {
    const newFiles = styleRefFiles.filter((_, i) => i !== index);
    setStyleRefFiles(newFiles);
    setStyleRefPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const uploadFileToStorage = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true });
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = supabase.storage.from('brand-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleGenerate = async () => {
    if (!user || !companyId || !prompt.trim()) { toast.error('Preencha o prompt'); return; }
    if (faceFiles.length === 0) { toast.error('Envie pelo menos uma foto de rosto'); return; }

    setStep('generating');
    setIsGenerating(true);

    try {
      const faceUrls: string[] = [];
      for (let i = 0; i < faceFiles.length; i++) {
        const path = `portraits/${companyId}/refs/face_${Date.now()}_${i}.${faceFiles[i].name.split('.').pop()}`;
        const url = await uploadFileToStorage(faceFiles[i], path);
        if (url) faceUrls.push(url);
      }

      const styleUrls: string[] = [];
      for (let i = 0; i < styleRefFiles.length; i++) {
        const path = `portraits/${companyId}/refs/style_${Date.now()}_${i}.${styleRefFiles[i].name.split('.').pop()}`;
        const url = await uploadFileToStorage(styleRefFiles[i], path);
        if (url) styleUrls.push(url);
      }

      const { data: portrait, error: insertError } = await supabase.from('generated_portraits').insert({
        user_id: user.id, company_id: companyId,
        title: prompt.slice(0, 80), prompt,
        face_ref_urls: faceUrls, style_ref_urls: styleUrls,
        marketplace_style_id: selectedMarketplaceStyle, status: 'generating',
      }).select('id').single();

      if (insertError || !portrait) throw insertError || new Error('Failed to create record');

      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-portrait`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session?.access_token}` },
          body: JSON.stringify({ portraitId: portrait.id, prompt, faceRefUrls: faceUrls, styleRefUrls: styleUrls, marketplaceStyleId: selectedMarketplaceStyle }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Error ${response.status}`);
      }

      const result = await response.json();
      const imageUrl = result.imageUrl;

      // Save to brand gallery folder
      if (imageUrl) {
        await saveToGalleryFolder(imageUrl, prompt.slice(0, 80));
      }

      // Refresh gallery
      const { data: updated } = await supabase.from('generated_portraits')
        .select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      setGallery((updated as GeneratedPortrait[]) || []);

      setLastGeneratedUrl(imageUrl);
      setStep('result');
      toast.success('Retrato gerado com sucesso!');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Erro ao gerar retrato');
      setStep('prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('generated_portraits').delete().eq('id', id);
    setGallery((prev) => prev.filter((p) => p.id !== id));
    toast.success('Retrato removido');
  };

  const resetWizard = () => {
    setStep('faces');
    setFaceFiles([]);
    setFacePreviews([]);
    setStyleRefFiles([]);
    setStyleRefPreviews([]);
    setSelectedMarketplaceStyle(null);
    setPrompt('');
    setShowGallery(false);
    setLastGeneratedUrl(null);
  };

  // ─── Inpainting handler ──────────────────────────────
  const handleInpaint = async (originalUrl: string, compositeDataUrl: string, editPrompt: string): Promise<string> => {
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-portrait`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session?.access_token}` },
        body: JSON.stringify({ mode: 'inpaint', originalImageUrl: originalUrl, compositeImageDataUrl: compositeDataUrl, editPrompt }),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Error ${response.status}`);
    }
    const result = await response.json();
    if (!result.imageUrl) throw new Error('No image returned');

    // Save edited version to gallery folder
    await saveToGalleryFolder(result.imageUrl, `Edição: ${editPrompt.slice(0, 60)}`);

    // Refresh gallery
    const { data: updated } = await supabase.from('generated_portraits')
      .select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50);
    setGallery((updated as GeneratedPortrait[]) || []);

    toast.success('Edição aplicada!');
    return result.imageUrl;
  };

  // ─── Lightbox ──────────────────────────────
  const Lightbox = () => {
    if (!lightboxUrl) return null;
    return (
      <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6" onClick={() => setLightboxUrl(null)}>
        <div className="relative flex items-center justify-center" style={{ maxWidth: '90vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
          <img src={lightboxUrl} alt="Retrato expandido" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); setInpaintUrl(lightboxUrl); setLightboxUrl(null); }}
              className="p-2 rounded-full bg-purple-600/80 hover:bg-purple-500 text-white transition-colors cursor-pointer" title="Editar região">
              <Pencil className="w-5 h-5" />
            </button>
            <a href={lightboxUrl} download target="_blank" rel="noreferrer"
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors">
              <Download className="w-5 h-5" />
            </a>
            <button onClick={() => setLightboxUrl(null)}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Gallery View ──────────────────────────────
  if (showGallery) {
    return (
      <>
        <Lightbox />
        {inpaintUrl && (
          <ImageInpaintEditor
            imageUrl={inpaintUrl}
            onClose={() => setInpaintUrl(null)}
            onImageEdited={(newUrl) => { setInpaintUrl(null); setLightboxUrl(newUrl); setLastGeneratedUrl(newUrl); }}
            editFn={handleInpaint}
          />
        )}
        <div className="flex-1 overflow-y-auto p-6 md:p-8" style={{ backgroundColor: '#0a0a0f' }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-semibold text-white">Galeria de Retratos</h1>
              <button onClick={resetWizard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors cursor-pointer">
                <Sparkles className="w-4 h-4" /> Novo Retrato
              </button>
            </div>

            {gallery.length === 0 ? (
              <div className="text-center py-20 text-white/30">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhum retrato gerado ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.map((p) => (
                  <div key={p.id} className="group relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
                    {p.status === 'completed' && p.result_image_url ? (
                      <img
                        src={p.result_image_url}
                        alt={p.title || 'Retrato'}
                        className="w-full aspect-[3/4] object-cover cursor-pointer"
                        onClick={() => setLightboxUrl(p.result_image_url)}
                      />
                    ) : p.status === 'generating' ? (
                      <div className="w-full aspect-[3/4] flex items-center justify-center bg-white/[0.02]">
                        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[3/4] flex items-center justify-center bg-red-500/5">
                        <p className="text-xs text-red-400/60 px-3 text-center">Falhou</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <div className="flex-1">
                        <p className="text-xs text-white/80 line-clamp-2">{p.title || p.prompt}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {p.result_image_url && (
                          <>
                            <button onClick={() => setLightboxUrl(p.result_image_url)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </button>
                            <a href={p.result_image_url} download target="_blank" rel="noreferrer"
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                              <Download className="w-3.5 h-3.5 text-white" />
                            </a>
                          </>
                        )}
                        <button onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Wizard ──────────────────────────────
  const wizardSteps: { key: WizardStep; label: string }[] = [
    { key: 'faces', label: 'Rosto' },
    { key: 'style', label: 'Estilo' },
    { key: 'prompt', label: 'Prompt' },
  ];
  const currentIndex = wizardSteps.findIndex((s) => s.key === step);

  return (
    <>
      <Lightbox />
      {inpaintUrl && (
        <ImageInpaintEditor
          imageUrl={inpaintUrl}
          onClose={() => setInpaintUrl(null)}
          onImageEdited={(newUrl) => { setInpaintUrl(null); setLightboxUrl(newUrl); setLastGeneratedUrl(newUrl); }}
          editFn={handleInpaint}
        />
      )}
      <div className="flex-1 overflow-y-auto p-6 md:p-8" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-semibold text-white">Gerador de Rosto</h1>
              <p className="text-sm text-white/30 mt-1">Crie retratos profissionais com IA</p>
            </div>
            {gallery.length > 0 && (
              <button onClick={() => setShowGallery(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 border border-white/[0.08] hover:bg-white/[0.04] transition-colors cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" /> Galeria ({gallery.length})
              </button>
            )}
          </div>

          {/* Step indicator */}
          {step !== 'generating' && step !== 'result' && (
            <div className="flex items-center gap-2 mb-8">
              {wizardSteps.map((s, i) => (
                <React.Fragment key={s.key}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    i === currentIndex ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : i < currentIndex ? 'bg-white/[0.06] text-white/50' : 'text-white/20'
                  }`}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-white/[0.08]">{i + 1}</span>
                    {s.label}
                  </div>
                  {i < wizardSteps.length - 1 && <div className="w-6 h-px bg-white/[0.08]" />}
                </React.Fragment>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Face Upload */}
            {step === 'faces' && (
              <motion.div key="faces" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-white/80 text-sm font-medium mb-4">Envie fotos do rosto (até {MAX_FACE_PHOTOS})</h2>
                <p className="text-xs text-amber-400/70 mb-3">⚡ Quanto mais ângulos e expressões diferentes, maior a fidelidade facial.</p>
                <div className="grid grid-cols-4 md:grid-cols-5 gap-2 mb-6 max-h-[400px] overflow-y-auto pr-1">
                  {facePreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.08]">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeFace(i)} className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white/80 hover:text-white cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {faceFiles.length < MAX_FACE_PHOTOS && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-white/[0.08] hover:border-purple-500/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-5 h-5 text-white/25" />
                      <span className="text-[10px] text-white/20">Adicionar</span>
                      <input type="file" accept="image/*" multiple onChange={handleFaceUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setStep('style')} disabled={faceFiles.length === 0}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                    Próximo <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Style */}
            {step === 'style' && (
              <motion.div key="style" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-white/80 text-sm font-medium mb-4">Escolha um estilo ou envie referências</h2>
                <p className="text-xs text-white/30 mb-2">Estilos do Marketplace</p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-5 max-h-[280px] overflow-y-auto pr-1">
                  {marketplaceStyles.map((s) => (
                    <button key={s.id} onClick={() => setSelectedMarketplaceStyle(selectedMarketplaceStyle === s.id ? null : s.id)}
                      className={`rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedMarketplaceStyle === s.id ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-white/[0.06] hover:border-white/[0.12]'
                      }`}>
                      {s.preview_images?.[0] ? (
                        <img src={s.preview_images[0]} alt={s.name} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square bg-white/[0.04] flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-white/15" />
                        </div>
                      )}
                      <p className="px-2 py-1.5 text-[10px] text-white/50 truncate">{s.name}</p>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-white/30 mb-2">Ou referências personalizadas (até 4)</p>
                <div className="flex gap-2 mb-6">
                  {styleRefPreviews.map((preview, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/[0.08]">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeStyleRef(i)} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white/80 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {styleRefFiles.length < 4 && (
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/[0.08] hover:border-purple-500/30 flex items-center justify-center cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-white/20" />
                      <input type="file" accept="image/*" multiple onChange={handleStyleRefUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setStep('faces')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button onClick={() => setStep('prompt')}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer">
                    Próximo <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Prompt */}
            {step === 'prompt' && (
              <motion.div key="prompt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-white/80 text-sm font-medium mb-4">Descreva o retrato que deseja</h2>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Retrato profissional corporativo, fundo cinza neutro, iluminação de estúdio, terno azul marinho, expressão confiante..."
                  className="w-full h-40 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none outline-none focus:border-purple-500/40 transition-colors"
                />
                <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-white/30 mb-2">Resumo</p>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <span>🧑 {faceFiles.length} rosto(s)</span>
                    {selectedMarketplaceStyle && <span>🎨 Estilo selecionado</span>}
                    {styleRefFiles.length > 0 && <span>🖼️ {styleRefFiles.length} ref(s)</span>}
                  </div>
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => setStep('style')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                    <Sparkles className="w-4 h-4" /> Gerar Retrato
                  </button>
                </div>
              </motion.div>
            )}

            {/* Generating */}
            {step === 'generating' && (
              <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                <p className="text-white/60 text-sm">Gerando seu retrato profissional...</p>
                <p className="text-white/25 text-xs mt-2">Isso pode levar até 60 segundos</p>
              </motion.div>
            )}

            {/* Result */}
            {step === 'result' && lastGeneratedUrl && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                <h2 className="text-white/80 text-sm font-medium mb-4">✅ Retrato gerado!</h2>
                <div className="relative group rounded-2xl overflow-hidden border border-white/[0.08] mb-6 max-w-md w-full cursor-pointer"
                  onClick={() => setLightboxUrl(lastGeneratedUrl)}>
                  <img src={lastGeneratedUrl} alt="Retrato gerado" className="w-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <p className="text-xs text-white/30 mb-4">Salvo automaticamente na pasta "Imagens Geradas" da Galeria de Marca</p>
                <div className="flex gap-3">
                  <a href={lastGeneratedUrl} download target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] transition-colors">
                    <Download className="w-4 h-4" /> Baixar
                  </a>
                  <button onClick={resetWizard}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors cursor-pointer">
                    <Sparkles className="w-4 h-4" /> Gerar outro
                  </button>
                  <button onClick={() => setShowGallery(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 border border-white/[0.08] hover:bg-white/[0.04] transition-colors cursor-pointer">
                    <ImageIcon className="w-4 h-4" /> Ver Galeria
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default FaceGenerator;
