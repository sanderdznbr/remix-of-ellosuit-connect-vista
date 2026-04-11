import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, Building2, Upload, X, Folder, ShoppingBag, Palette, ImagePlus, Sparkles, Monitor } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FacePerson, ReferenceImage } from './types';
import { LogoPosition } from './StepStyle';
import GalleryPicker from './GalleryPicker';

interface Props {
  facePersons: FacePerson[];
  setFacePersons: React.Dispatch<React.SetStateAction<FacePerson[]>>;
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  allPeopleOnCover: boolean;
  setAllPeopleOnCover: (v: boolean) => void;
  faceGender: 'male' | 'female' | 'auto';
  setFaceGender: (v: 'male' | 'female' | 'auto') => void;
  wearsGlasses: boolean;
  setWearsGlasses: (v: boolean) => void;
  brandAssets: any[];
  onSuggestColors?: (palette: any) => void;
  showHeader: boolean;
  setShowHeader: (v: boolean) => void;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  logoDarkUrl: string;
  setLogoDarkUrl: (v: string) => void;
  logoPosition: LogoPosition;
  setLogoPosition: (v: LogoPosition) => void;
  logoBrandColors: any;
  useBrandColors: boolean;
  setUseBrandColors: (v: boolean) => void;
  brandName: string;
  setBrandName: (v: string) => void;
  userName: string;
  setUserName: (v: string) => void;
  dateLabel: string;
  setDateLabel: (v: string) => void;
  hasWebImages: boolean;
  webFacePosition: 'cover' | 'last' | 'none';
  setWebFacePosition: (v: 'cover' | 'last' | 'none') => void;
  onSkipAll: () => void;
  activeMarketplaceStyle?: any;
  isExtreme?: boolean;
  hasProduct?: boolean;
  setHasProduct?: (v: boolean) => void;
  onOpenProductStep?: () => void;
  useCustomColors: boolean;
  setUseCustomColors: (v: boolean) => void;
  customColors: string[];
  setCustomColors: React.Dispatch<React.SetStateAction<string[]>>;
  wizardMode?: 'simple' | 'advanced' | 'extreme' | 'tweet' | 'tweet2' | 'animated';
  logoMode: 'ai' | 'manual';
  setLogoMode: (v: 'ai' | 'manual') => void;
  animatedBgImageUrl?: string;
  setAnimatedBgImageUrl?: (v: string) => void;
  generateAiBg?: boolean;
  setGenerateAiBg?: (v: boolean) => void;
  generateAiMockup?: boolean;
  setGenerateAiMockup?: (v: boolean) => void;
}

/* ─── Drag & Drop Zone ─── */
const DropZone: React.FC<{
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  compact?: boolean;
}> = ({ onFiles, multiple = true, accept = 'image/*', icon, label, sublabel, compact }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onFiles(multiple ? files : [files[0]]);
  }, [onFiles, multiple]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center rounded-xl border border-dashed cursor-pointer transition-all
        ${compact ? 'py-5 gap-1.5' : 'py-8 gap-2'}
        ${dragging
          ? 'border-purple-500/50 bg-purple-500/[0.06] scale-[1.01]'
          : 'border-white/[0.08] bg-white/[0.015] hover:border-white/[0.15] hover:bg-white/[0.03]'}
      `}
    >
      {icon}
      <span className="text-xs text-white/35 font-medium">{label}</span>
      {sublabel && <span className="text-[10px] text-white/20">{sublabel}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={e => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
    </div>
  );
};

/* ─── Thumbnail strip ─── */
const ThumbStrip: React.FC<{
  items: { url: string; label?: string }[];
  onRemove: (idx: number) => void;
  accentClass?: string;
}> = ({ items, onRemove, accentClass = 'ring-white/10' }) => (
  <div className="flex gap-2 flex-wrap">
    {items.map((item, idx) => (
      <div key={idx} className="relative group">
        <div className={`w-14 h-14 rounded-lg overflow-hidden ring-1 ${accentClass}`}>
          <img src={item.url} alt={item.label || ''} className="w-full h-full object-cover" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white/10 hover:bg-red-500/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    ))}
  </div>
);

const StepPersonalization: React.FC<Props> = (props) => {
  const {
    facePersons, setFacePersons, referenceImages, setReferenceImages,
    faceGender, setFaceGender, wearsGlasses, setWearsGlasses,
    logoUrl, setLogoUrl, logoDarkUrl, setLogoDarkUrl,
    logoPosition, setLogoPosition, useBrandColors, setUseBrandColors,
    useCustomColors, setUseCustomColors, customColors, setCustomColors,
    onSkipAll, wizardMode, logoMode, setLogoMode,
    setHasProduct, hasProduct, onOpenProductStep,
    animatedBgImageUrl, setAnimatedBgImageUrl,
    generateAiBg, setGenerateAiBg, generateAiMockup, setGenerateAiMockup,
  } = props;

  const { user } = useAuth();
  const [galleryTarget, setGalleryTarget] = useState<'face' | 'logo' | 'media' | null>(null);

  const facePhotos = facePersons.flatMap(p => p.photos);
  const mediaRefs = referenceImages.filter(r => r.category !== 'face');

  /* ── File handlers ── */
  const readFiles = (files: File[], cb: (url: string, name: string) => void) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => { if (ev.target?.result) cb(ev.target.result as string, file.name); };
      reader.readAsDataURL(file);
    });
  };

  const handleFaceFiles = (files: File[]) => {
    readFiles(files, (url, name) => {
      setFacePersons(prev => {
        const updated = [...prev];
        if (!updated.length) updated.push({ id: crypto.randomUUID(), label: 'Pessoa 1', gender: 'auto', wearsGlasses: false, photos: [] });
        updated[0] = { ...updated[0], photos: [...updated[0].photos, { url, thumb: url, label: name, source: 'upload' as const, category: 'face' as const }] };
        const nonFace = referenceImages.filter(r => r.category !== 'face');
        setReferenceImages([...nonFace, ...updated.flatMap(p => p.photos)]);
        return updated;
      });
    });
  };

  const handleLogoFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (user) {
      try {
        const ext = file.name.split('.').pop() || 'png';
        const path = `${user.id}/logos/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('brand-assets').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('brand-assets').getPublicUrl(path);
        setLogoUrl(data.publicUrl);
        return;
      } catch {}
    }
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setLogoUrl(ev.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleMediaFiles = (files: File[]) => {
    readFiles(files, (url, name) => {
      setReferenceImages(prev => [...prev, { url, thumb: url, label: name, source: 'upload' as const, category: 'style' as const }]);
    });
  };

  const removeFace = (idx: number) => {
    setFacePersons(prev => {
      const updated = prev.map(p => ({ ...p, photos: p.photos.filter((_, i2) => {
        // calc global index
        return true;
      }) }));
      // simple: remove from first person by index
      if (updated[0]) {
        updated[0] = { ...updated[0], photos: updated[0].photos.filter((_, i) => i !== idx) };
      }
      const nonFace = referenceImages.filter(r => r.category !== 'face');
      setReferenceImages([...nonFace, ...updated.flatMap(p => p.photos)]);
      return updated;
    });
  };

  const removeMedia = (idx: number) => {
    const mediaItems = referenceImages.filter(r => r.category !== 'face');
    const target = mediaItems[idx];
    if (target) setReferenceImages(prev => prev.filter(r => r !== target));
  };

  const handleGallerySelect = (files: { url: string; name: string }[]) => {
    if (!galleryTarget) return;
    files.forEach(f => {
      if (galleryTarget === 'face') {
        setFacePersons(prev => {
          const updated = [...prev];
          if (!updated.length) updated.push({ id: crypto.randomUUID(), label: 'Pessoa 1', gender: 'auto', wearsGlasses: false, photos: [] });
          updated[0] = { ...updated[0], photos: [...updated[0].photos, { url: f.url, thumb: f.url, label: f.name, source: 'upload' as const, category: 'face' as const }] };
          const nonFace = referenceImages.filter(r => r.category !== 'face');
          setReferenceImages([...nonFace, ...updated.flatMap(p => p.photos)]);
          return updated;
        });
      } else if (galleryTarget === 'logo') {
        setLogoUrl(f.url);
      } else {
        setReferenceImages(prev => [...prev, { url: f.url, thumb: f.url, label: f.name, source: 'upload' as const, category: 'style' as const }]);
      }
    });
    setGalleryTarget(null);
  };

  const BLOCK = "rounded-xl border border-white/[0.06] p-4 space-y-3";
  const BLOCK_BG = "rgba(255,255,255,0.02)";

  return (
    <div className="flex flex-col gap-4 w-full" style={{ minHeight: '260px' }}>
      {/* Header */}
      <div className="mb-1">
        <h2 className="text-lg font-semibold text-white/90">Personalização</h2>
        <p className="text-xs text-white/30 mt-0.5">Arraste arquivos em qualquer zona ou clique para enviar.</p>
      </div>

      {/* ═══ ROSTO ═══ */}
      <div className={BLOCK} style={{ backgroundColor: BLOCK_BG }}>
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs font-medium text-white/50">Rosto / Pessoa</span>
          {facePhotos.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 ml-auto">{facePhotos.length}</span>}
        </div>

        {facePhotos.length > 0 && (
          <ThumbStrip items={facePhotos} onRemove={removeFace} accentClass="ring-white/[0.08]" />
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <DropZone
              onFiles={handleFaceFiles}
              icon={<Upload className="h-4 w-4 text-white/15" />}
              label={facePhotos.length > 0 ? 'Adicionar mais' : 'Arraste ou clique'}
              compact
            />
          </div>
          {user && (
            <button
              onClick={() => setGalleryTarget('face')}
              className="flex items-center gap-1.5 px-3 rounded-xl border border-white/[0.06] text-[11px] text-white/25 hover:text-white/45 hover:bg-white/[0.03] transition-colors"
            >
              <Folder className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Face attributes - shown only when photos exist */}
        {facePhotos.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-1.5">
              {(['male', 'female', 'auto'] as const).map(g => (
                <button key={g} onClick={() => setFaceGender(g)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${faceGender === g ? 'bg-white/[0.08] text-white/70' : 'bg-white/[0.02] text-white/20 hover:text-white/35'}`}>
                  {g === 'male' ? 'Masc.' : g === 'female' ? 'Fem.' : 'Auto'}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setWearsGlasses(false)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${!wearsGlasses ? 'bg-white/[0.08] text-white/70' : 'bg-white/[0.02] text-white/20'}`}>
                Sem óculos
              </button>
              <button onClick={() => setWearsGlasses(true)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${wearsGlasses ? 'bg-white/[0.08] text-white/70' : 'bg-white/[0.02] text-white/20'}`}>
                Com óculos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MARCA / LOGO ═══ */}
      <div className={BLOCK} style={{ backgroundColor: BLOCK_BG }}>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs font-medium text-white/50">Marca / Logo</span>
          {logoUrl && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 ml-auto">✓</span>}
        </div>

        {logoUrl ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden ring-1 ring-white/[0.08] bg-white/[0.03] flex items-center justify-center">
              <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
            </div>
            <div className="flex gap-1.5 flex-1">
              <button onClick={() => handleLogoFiles([])} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-white/35 hover:text-white/60 transition-colors"
                onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = e => { const f = (e.target as HTMLInputElement).files; if (f) handleLogoFiles(Array.from(f)); }; input.click(); }}>
                Trocar
              </button>
              {user && (
                <button onClick={() => setGalleryTarget('logo')} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-white/35 hover:text-white/60 transition-colors">
                  <Folder className="h-3 w-3 inline mr-0.5" />Galeria
                </button>
              )}
              <button onClick={() => setLogoUrl('')} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-white/35 hover:text-red-400/60 transition-colors ml-auto">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <DropZone
                onFiles={handleLogoFiles}
                multiple={false}
                icon={<Upload className="h-4 w-4 text-white/15" />}
                label="Arraste o logo aqui"
                sublabel="Apenas 1 arquivo"
                compact
              />
            </div>
            {user && (
              <button
                onClick={() => setGalleryTarget('logo')}
                className="flex items-center gap-1.5 px-3 rounded-xl border border-white/[0.06] text-[11px] text-white/25 hover:text-white/45 hover:bg-white/[0.03] transition-colors"
              >
                <Folder className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Logo positioning */}
        {logoUrl && wizardMode === 'advanced' && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-1.5">
              <button onClick={() => setLogoMode('ai')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${logoMode === 'ai' ? 'bg-white/[0.08] text-white/70' : 'bg-white/[0.02] text-white/20'}`}>
                IA posiciona
              </button>
              <button onClick={() => setLogoMode('manual')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${logoMode === 'manual' ? 'bg-white/[0.08] text-white/70' : 'bg-white/[0.02] text-white/20'}`}>
                Manual
              </button>
            </div>
            {logoMode === 'manual' && (
              <div className="relative w-full aspect-[4/5] max-w-[120px] rounded-lg border border-white/[0.08] bg-white/[0.02] mx-auto">
                {[
                  { value: 'top-left', style: 'top-1.5 left-1.5' },
                  { value: 'top-right', style: 'top-1.5 right-1.5' },
                  { value: 'bottom-left', style: 'bottom-1.5 left-1.5' },
                  { value: 'bottom-right', style: 'bottom-1.5 right-1.5' },
                ].map(pos => (
                  <button key={pos.value} onClick={() => setLogoPosition(pos.value as LogoPosition)}
                    className={`absolute ${pos.style} w-6 h-6 rounded flex items-center justify-center transition-all ${
                      logoPosition === pos.value ? 'bg-purple-500/80 scale-110' : 'bg-white/[0.05] hover:bg-white/[0.10]'
                    }`}>
                    {logoPosition === pos.value
                      ? <img src={logoUrl} alt="" className="w-3.5 h-3.5 object-contain" />
                      : <div className="w-2 h-2 rounded-sm bg-white/15" />}
                  </button>
                ))}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-white/10">POST</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Color options */}
        {logoUrl && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/35">Cores da marca</span>
              <button onClick={() => { setUseBrandColors(!useBrandColors); if (!useBrandColors) setUseCustomColors(false); }}
                className={`relative w-8 h-4 rounded-full transition-colors ${useBrandColors ? 'bg-purple-500/70' : 'bg-white/[0.08]'}`}>
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${useBrandColors ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            {!useBrandColors && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Palette className="h-3 w-3 text-white/25" />
                  <span className="text-[11px] text-white/35">Cores custom</span>
                </div>
                <button onClick={() => setUseCustomColors(!useCustomColors)}
                  className={`relative w-8 h-4 rounded-full transition-colors ${useCustomColors ? 'bg-purple-500/70' : 'bg-white/[0.08]'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${useCustomColors ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            )}
            {useCustomColors && !useBrandColors && (
              <div className="flex items-center gap-2 pt-0.5">
                {customColors.map((c, i) => (
                  <label key={i} className="relative cursor-pointer group">
                    <input type="color" value={c} onChange={e => { const u = [...customColors]; u[i] = e.target.value; setCustomColors(u); }} className="sr-only" />
                    <div className="w-8 h-8 rounded-lg border border-white/[0.08] group-hover:border-white/20 transition-colors" style={{ backgroundColor: c }} />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ FOTOS / MÍDIAS ═══ */}
      <div className={BLOCK} style={{ backgroundColor: BLOCK_BG }}>
        <div className="flex items-center gap-2">
          <ImagePlus className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs font-medium text-white/50">Fotos / Mídias</span>
          {mediaRefs.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 ml-auto">{mediaRefs.length}</span>}
        </div>

        {mediaRefs.length > 0 && (
          <ThumbStrip items={mediaRefs} onRemove={removeMedia} accentClass="ring-white/[0.08]" />
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <DropZone
              onFiles={handleMediaFiles}
              icon={<Upload className="h-4 w-4 text-white/15" />}
              label={mediaRefs.length > 0 ? 'Adicionar mais' : 'Arraste fotos aqui'}
              sublabel="Screenshots, prints, referências"
              compact
            />
          </div>
          {user && (
            <button
              onClick={() => setGalleryTarget('media')}
              className="flex items-center gap-1.5 px-3 rounded-xl border border-white/[0.06] text-[11px] text-white/25 hover:text-white/45 hover:bg-white/[0.03] transition-colors"
            >
              <Folder className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ PRODUTO ═══ */}
      {setHasProduct && (
        <button
          onClick={() => { setHasProduct?.(true); onOpenProductStep?.(); }}
          className={`${BLOCK} flex items-center gap-3 text-left hover:bg-white/[0.03] transition-colors w-full`}
          style={{ backgroundColor: BLOCK_BG }}
        >
          <ShoppingBag className="h-4 w-4 text-white/25 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-white/50">Fotos de Produto</span>
            <p className="text-[10px] text-white/20 leading-tight mt-0.5">A IA recria em mockups e cenas no carrossel</p>
          </div>
          {hasProduct
            ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 shrink-0">✓</span>
            : <span className="text-[10px] text-white/15 shrink-0">opcional</span>}
        </button>
      )}

      {/* ═══ AI IMAGES (animated mode) ═══ */}
      {wizardMode === 'animated' && (setGenerateAiBg || setGenerateAiMockup) && (
        <div className={BLOCK} style={{ backgroundColor: BLOCK_BG }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-white/30" />
            <span className="text-xs font-medium text-white/50">Imagens com IA</span>
          </div>
          <p className="text-[10px] text-white/20">Gera imagens únicas por card. Consome mais créditos.</p>

          {setGenerateAiBg && (
            <button onClick={() => { setGenerateAiBg(!generateAiBg); if (!generateAiBg && setAnimatedBgImageUrl) setAnimatedBgImageUrl(''); }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${generateAiBg ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.01]'}`}>
              <ImagePlus className={`h-4 w-4 ${generateAiBg ? 'text-white/50' : 'text-white/15'}`} />
              <div className="text-left flex-1">
                <div className={`text-[11px] font-medium ${generateAiBg ? 'text-white/60' : 'text-white/30'}`}>Fundo IA</div>
              </div>
              <div className={`w-7 h-3.5 rounded-full transition-colors ${generateAiBg ? 'bg-purple-500/70' : 'bg-white/[0.08]'}`}>
                <div className={`w-2.5 h-2.5 rounded-full bg-white mt-0.5 transition-transform ${generateAiBg ? 'translate-x-3.5 ml-0.5' : 'ml-0.5'}`} />
              </div>
            </button>
          )}

          {setGenerateAiMockup && (
            <button onClick={() => setGenerateAiMockup(!generateAiMockup)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${generateAiMockup ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.01]'}`}>
              <Monitor className={`h-4 w-4 ${generateAiMockup ? 'text-white/50' : 'text-white/15'}`} />
              <div className="text-left flex-1">
                <div className={`text-[11px] font-medium ${generateAiMockup ? 'text-white/60' : 'text-white/30'}`}>Mockups IA</div>
              </div>
              <div className={`w-7 h-3.5 rounded-full transition-colors ${generateAiMockup ? 'bg-purple-500/70' : 'bg-white/[0.08]'}`}>
                <div className={`w-2.5 h-2.5 rounded-full bg-white mt-0.5 transition-transform ${generateAiMockup ? 'translate-x-3.5 ml-0.5' : 'ml-0.5'}`} />
              </div>
            </button>
          )}
        </div>
      )}

      {/* Manual bg for animated */}
      {wizardMode === 'animated' && setAnimatedBgImageUrl && !generateAiBg && (
        <div className={BLOCK} style={{ backgroundColor: BLOCK_BG }}>
          <div className="flex items-center gap-2">
            <ImagePlus className="h-3.5 w-3.5 text-white/30" />
            <span className="text-xs font-medium text-white/50">Fundo Manual</span>
          </div>
          {animatedBgImageUrl ? (
            <div className="relative w-full h-24 rounded-lg overflow-hidden border border-white/[0.06]">
              <img src={animatedBgImageUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setAnimatedBgImageUrl('')}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70">
                <X className="h-3 w-3 text-white/70" />
              </button>
            </div>
          ) : (
            <DropZone
              onFiles={async (files) => {
                const file = files[0];
                if (!file || !user) return;
                try {
                  const ext = file.name.split('.').pop() || 'jpg';
                  const path = `${user.id}/animated-bg/${Date.now()}.${ext}`;
                  const { error } = await supabase.storage.from('brand-assets').upload(path, file);
                  if (error) throw error;
                  const { data } = supabase.storage.from('brand-assets').getPublicUrl(path);
                  setAnimatedBgImageUrl(data.publicUrl);
                } catch {}
              }}
              multiple={false}
              icon={<Upload className="h-4 w-4 text-white/15" />}
              label="Arraste a imagem de fundo"
              compact
            />
          )}
        </div>
      )}

      {/* Skip */}
      <button onClick={onSkipAll}
        className="py-2 text-[11px] text-white/15 hover:text-white/30 transition-colors">
        Pular personalização
      </button>

      <GalleryPicker
        open={!!galleryTarget}
        onClose={() => setGalleryTarget(null)}
        onSelectFiles={handleGallerySelect}
        label={galleryTarget === 'face' ? 'Selecionar foto do rosto' : galleryTarget === 'logo' ? 'Selecionar logomarca' : 'Selecionar mídias'}
        maxFiles={galleryTarget === 'logo' ? 1 : undefined}
      />
    </div>
  );
};

export default StepPersonalization;
