import React, { useState, useRef, useCallback, useEffect } from 'react';
import { User, Building2, Upload, X, Folder, ShoppingBag, Palette, ImagePlus, Sparkles, Monitor, ChevronRight, ChevronLeft, Check, Moon, Sun } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FacePerson, ReferenceImage } from './types';
import { LogoPosition } from './StepStyle';
import GalleryPicker from './GalleryPicker';
import LogoPositionPicker from './LogoPositionPicker';

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
  onWizardBack?: () => void;
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
  large?: boolean;
}> = ({ onFiles, multiple = true, accept = 'image/*', icon, label, sublabel, large }) => {
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
        relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all
        ${large ? 'py-12 gap-3' : 'py-8 gap-2'}
        ${dragging
          ? 'border-purple-500/40 bg-purple-500/[0.06] scale-[1.01]'
          : 'border-white/[0.08] bg-white/[0.015] hover:border-white/[0.18] hover:bg-white/[0.04]'}
      `}
    >
      {icon}
      <span className="text-sm text-white/40 font-medium">{label}</span>
      {sublabel && <span className="text-xs text-white/20">{sublabel}</span>}
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
}> = ({ items, onRemove }) => (
  <div className="flex gap-2.5 flex-wrap">
    {items.map((item, idx) => (
      <div key={idx} className="relative group">
        <div className="w-16 h-16 rounded-xl overflow-hidden ring-1 ring-white/[0.08]">
          <img src={item.url} alt={item.label || ''} className="w-full h-full object-cover" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/60 hover:bg-red-500/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    ))}
  </div>
);

/* ─── Sub-step indicator ─── */
const SubStepDots: React.FC<{ current: number; total: number; labels: string[] }> = ({ current, total, labels }) => (
  <div className="flex items-center gap-1.5 mb-1">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="flex items-center gap-1.5">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
          i === current ? 'bg-white/[0.08] text-white/70' : i < current ? 'text-white/30' : 'text-white/15'
        }`}>
          {i < current ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
          <span className="hidden sm:inline">{labels[i]}</span>
        </div>
        {i < total - 1 && <div className="w-4 h-px bg-white/[0.06]" />}
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
    onSkipAll, onWizardBack, wizardMode, logoMode, setLogoMode,
    setHasProduct, hasProduct, onOpenProductStep,
    animatedBgImageUrl, setAnimatedBgImageUrl,
    generateAiBg, setGenerateAiBg, generateAiMockup, setGenerateAiMockup,
  } = props;

  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [subStep, setSubStep] = useState(0); // 0=Rosto, 1=Logo, 2=Mídias
  const [galleryTarget, setGalleryTarget] = useState<'face' | 'logo' | 'media' | null>(null);

  const facePhotos = facePersons.flatMap(p => p.photos);
  const mediaRefs = referenceImages.filter(r => r.category !== 'face');

  useEffect(() => {
    if (logoUrl && logoMode !== 'manual') {
      setLogoMode('manual');
    }
  }, [logoUrl, logoMode, setLogoMode]);

  // Auto-skip mídias if already has media refs
  const totalSubSteps = 3;
  const subStepLabels = ['Rosto', 'Logo', 'Mídias'];

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

  const handleLogoUpload = async (file: File, setter: (v: string) => void) => {
    if (user) {
      try {
        const ext = file.name.split('.').pop() || 'png';
        const path = `${user.id}/logos/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('brand-assets').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('brand-assets').getPublicUrl(path);
        setter(data.publicUrl);
        setLogoMode('manual');
        return;
      } catch {}
    }
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setter(ev.target.result as string);
        setLogoMode('manual');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    handleLogoUpload(file, setLogoUrl);
  };

  const handleLogoDarkFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    handleLogoUpload(file, setLogoDarkUrl);
  };

  const handleMediaFiles = (files: File[]) => {
    readFiles(files, (url, name) => {
      setReferenceImages(prev => [...prev, { url, thumb: url, label: name, source: 'upload' as const, category: 'general' as const }]);
    });
  };

  const removeFace = (idx: number) => {
    setFacePersons(prev => {
      const updated = prev.map(p => ({ ...p, photos: [...p.photos] }));
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
        setLogoMode('manual');
      } else {
        setReferenceImages(prev => [...prev, { url: f.url, thumb: f.url, label: f.name, source: 'upload' as const, category: 'style' as const }]);
      }
    });
    setGalleryTarget(null);
  };

  const goNext = () => {
    if (subStep < totalSubSteps - 1) {
      // If going to mídias (step 2) and already has media, could auto-advance
      setSubStep(s => s + 1);
    }
  };
  const goBack = () => { if (subStep > 0) setSubStep(s => s - 1); else onWizardBack?.(); };

  return (
    <div className="flex flex-col gap-4 w-full" style={{ minHeight: '260px' }}>
      {/* Sub-step indicator */}
      <SubStepDots current={subStep} total={totalSubSteps} labels={subStepLabels} />

      {/* ═══ SUB-STEP 0: ROSTO ═══ */}
      {subStep === 0 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <User className="h-5 w-5 text-white/30" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white/90">Rosto</h2>
                <p className="text-xs text-white/30">Insira a foto da pessoa que aparecerá no post</p>
              </div>
            </div>
          </div>

          {facePhotos.length > 0 && (
            <ThumbStrip items={facePhotos} onRemove={removeFace} />
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <DropZone onFiles={handleFaceFiles} large
                icon={<Upload className="h-6 w-6 text-white/10" />}
                label={facePhotos.length > 0 ? 'Adicionar mais fotos' : 'Arraste ou clique para enviar'}
                sublabel="Fotos do rosto da pessoa" />
            </div>
            {user && (
              <button onClick={() => setGalleryTarget('face')}
                className="flex items-center px-4 rounded-xl border border-white/[0.06] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors">
                <Folder className="h-4 w-4" />
              </button>
            )}
          </div>

          {facePhotos.length > 0 && (
            <div className="flex gap-1.5">
              {(['male', 'female', 'auto'] as const).map(g => (
                <button key={g} onClick={() => setFaceGender(g)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${faceGender === g ? 'bg-white/[0.08] text-white/70' : 'text-white/20 hover:text-white/35 bg-white/[0.02]'}`}>
                  {g === 'male' ? 'Masculino' : g === 'female' ? 'Feminino' : 'Automático'}
                </button>
              ))}
              <button onClick={() => setWearsGlasses(!wearsGlasses)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${wearsGlasses ? 'bg-white/[0.08] text-white/70' : 'text-white/20 hover:text-white/35 bg-white/[0.02]'}`}>
                🤓
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={goBack}
              className="flex items-center gap-1 text-sm text-white/30 hover:text-white/50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => { goNext(); }}
                className="text-sm text-white/30 hover:text-white/50 transition-colors">
                Pular
              </button>
              <button onClick={goNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-medium transition-all">
                Continuar <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUB-STEP 1: LOGO ═══ */}
      {subStep === 1 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white/30" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white/90">Logomarca</h2>
                <p className="text-xs text-white/30">Envie duas versões — a IA escolhe a melhor para cada fundo</p>
              </div>
            </div>
          </div>

          {/* Dual logo upload grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Light logo (for dark backgrounds) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5 text-white/30" />
                <p className="text-[10px] font-medium text-white/40">Para fundo escuro</p>
              </div>
              {logoUrl ? (
                <div className="flex flex-col items-center gap-3 py-4 rounded-xl bg-[#111]/80 border border-white/[0.08]">
                  <div className="w-16 h-16 rounded-lg bg-[#0a0a0a] border border-white/[0.08] flex items-center justify-center overflow-hidden p-1.5">
                    <img src={logoUrl} alt="Logo clara" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = e => { const f = (e.target as HTMLInputElement).files; if (f?.[0]) handleLogoUpload(f[0], setLogoUrl); }; input.click(); }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] transition-all">Trocar</button>
                    {user && (
                      <button onClick={() => setGalleryTarget('logo')} className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] transition-all">Galeria</button>
                    )}
                    <button onClick={() => setLogoUrl('')}
                      className="p-1 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <DropZone onFiles={handleLogoFiles} multiple={false}
                      icon={<Upload className="h-5 w-5 text-white/10" />}
                      label="Logo clara"
                      sublabel="Branca / cores claras" />
                  </div>
                  {user && (
                    <button onClick={() => setGalleryTarget('logo')}
                      className="flex items-center px-3 rounded-xl border border-white/[0.06] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors">
                      <Folder className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Dark logo (for light backgrounds) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-white/30" />
                <p className="text-[10px] font-medium text-white/40">Para fundo claro</p>
              </div>
              {logoDarkUrl ? (
                <div className="flex flex-col items-center gap-3 py-4 rounded-xl bg-white/[0.7] border border-white/[0.15]">
                  <div className="w-16 h-16 rounded-lg bg-white border border-black/10 flex items-center justify-center overflow-hidden p-1.5">
                    <img src={logoDarkUrl} alt="Logo escura" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = e => { const f = (e.target as HTMLInputElement).files; if (f?.[0]) handleLogoUpload(f[0], setLogoDarkUrl); }; input.click(); }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-black/40 hover:text-black/60 bg-black/[0.06] hover:bg-black/10 transition-all">Trocar</button>
                    <button onClick={() => setLogoDarkUrl('')}
                      className="p-1 rounded-lg bg-black/[0.06] hover:bg-red-500/20 text-black/30 hover:text-red-400 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <DropZone onFiles={handleLogoDarkFiles} multiple={false}
                  icon={<Upload className="h-5 w-5 text-white/10" />}
                  label="Logo escura"
                  sublabel="Preta / cores escuras" />
              )}
            </div>
          </div>

          {/* Hint */}
          {!logoUrl && !logoDarkUrl && (
            <p className="text-[10px] text-white/20 text-center">
              💡 Envie ao menos uma versão. O ideal é ter as duas para contraste perfeito.
            </p>
          )}

          {/* Logo position + brand colors */}
          {(logoUrl || logoDarkUrl) && (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-white/45">Posição da logo no post final</p>
                <LogoPositionPicker logoPosition={logoPosition} setLogoPosition={setLogoPosition} />
                <p className="text-[10px] text-white/25">A logo será aplicada via canvas no canto selecionado, após a geração.</p>
              </div>
            </div>
          )}
          {(logoUrl || logoDarkUrl) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">Cores da marca</span>
                <button onClick={() => { setUseBrandColors(!useBrandColors); if (!useBrandColors) setUseCustomColors(false); }}
                  className={`relative w-8 h-4 rounded-full transition-colors ${useBrandColors ? 'bg-purple-500/60' : 'bg-white/[0.08]'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${useBrandColors ? 'translate-x-4' : ''}`} />
                </button>
              </div>
              {!useBrandColors && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Palette className="h-3 w-3 text-white/20" />
                    <span className="text-xs text-white/30">Custom</span>
                  </div>
                  <button onClick={() => setUseCustomColors(!useCustomColors)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${useCustomColors ? 'bg-purple-500/60' : 'bg-white/[0.08]'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${useCustomColors ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              )}
              {useCustomColors && !useBrandColors && (
                <div className="flex items-center gap-2">
                  {customColors.map((c, i) => (
                    <label key={i} className="relative cursor-pointer group">
                      <input type="color" value={c} onChange={e => { const u = [...customColors]; u[i] = e.target.value; setCustomColors(u); }} className="sr-only" />
                      <div className="w-7 h-7 rounded-lg border border-white/[0.08] group-hover:border-white/20 transition-colors" style={{ backgroundColor: c }} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={goBack}
              className="flex items-center gap-1 text-sm text-white/30 hover:text-white/50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </button>
            <div className="flex items-center gap-2">
              <button onClick={goNext}
                className="text-sm text-white/30 hover:text-white/50 transition-colors">
                Pular
              </button>
              <button onClick={goNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-medium transition-all">
                Continuar <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUB-STEP 2: MÍDIAS ═══ */}
      {subStep === 2 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <ImagePlus className="h-5 w-5 text-white/30" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white/90">Mídias</h2>
                <p className="text-xs text-white/30">Fotos, prints ou screenshots para o post</p>
              </div>
            </div>
          </div>

          {mediaRefs.length > 0 && (
            <ThumbStrip items={mediaRefs} onRemove={removeMedia} />
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <DropZone onFiles={handleMediaFiles} large
                icon={<Upload className="h-6 w-6 text-white/10" />}
                label={mediaRefs.length > 0 ? 'Adicionar mais fotos' : 'Arraste ou clique para enviar'}
                sublabel="Prints, screenshots, fotos do produto" />
            </div>
            {user && (
              <button onClick={() => setGalleryTarget('media')}
                className="flex items-center px-4 rounded-xl border border-white/[0.06] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors">
                <Folder className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Animated mode extras */}
          {wizardMode === 'animated' && (setGenerateAiBg || setGenerateAiMockup) && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">IA Imagens</span>
              <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {setGenerateAiBg && (
                  <button onClick={() => { setGenerateAiBg(!generateAiBg); if (!generateAiBg && setAnimatedBgImageUrl) setAnimatedBgImageUrl(''); }}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${generateAiBg ? 'border-white/[0.12] bg-white/[0.05]' : 'border-white/[0.05] bg-white/[0.015]'}`}>
                    <Sparkles className={`h-4 w-4 ${generateAiBg ? 'text-white/50' : 'text-white/15'}`} />
                    <span className={`text-xs font-medium flex-1 text-left ${generateAiBg ? 'text-white/60' : 'text-white/25'}`}>Fundo IA</span>
                    <div className={`w-7 h-3.5 rounded-full transition-colors ${generateAiBg ? 'bg-purple-500/60' : 'bg-white/[0.08]'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full bg-white mt-0.5 transition-transform ${generateAiBg ? 'translate-x-3.5 ml-0.5' : 'ml-0.5'}`} />
                    </div>
                  </button>
                )}
                {setGenerateAiMockup && (
                  <button onClick={() => setGenerateAiMockup(!generateAiMockup)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${generateAiMockup ? 'border-white/[0.12] bg-white/[0.05]' : 'border-white/[0.05] bg-white/[0.015]'}`}>
                    <Monitor className={`h-4 w-4 ${generateAiMockup ? 'text-white/50' : 'text-white/15'}`} />
                    <span className={`text-xs font-medium flex-1 text-left ${generateAiMockup ? 'text-white/60' : 'text-white/25'}`}>Mockups IA</span>
                    <div className={`w-7 h-3.5 rounded-full transition-colors ${generateAiMockup ? 'bg-purple-500/60' : 'bg-white/[0.08]'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full bg-white mt-0.5 transition-transform ${generateAiMockup ? 'translate-x-3.5 ml-0.5' : 'ml-0.5'}`} />
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {wizardMode === 'animated' && setAnimatedBgImageUrl && !generateAiBg && (
            <div className="space-y-2">
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Fundo</span>
              {animatedBgImageUrl ? (
                <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/[0.06]">
                  <img src={animatedBgImageUrl} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setAnimatedBgImageUrl('')}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70">
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
                  icon={<Upload className="h-5 w-5 text-white/10" />}
                  label="Arraste imagem de fundo"
                />
              )}
            </div>
          )}

          {/* Produto */}
          {setHasProduct && (
            <button
              onClick={() => { setHasProduct?.(true); onOpenProductStep?.(); }}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4 w-4 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-white/50">Produto</span>
                <p className="text-[10px] text-white/20">Mockups e cenas IA</p>
              </div>
              {hasProduct
                ? <Check className="w-4 h-4 text-white/40" />
                : <span className="text-[10px] text-white/15">opcional</span>}
            </button>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={goBack}
              className="flex items-center gap-1 text-sm text-white/30 hover:text-white/50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </button>
            <button onClick={onSkipAll}
              className={mediaRefs.length > 0
                ? "px-5 py-2 rounded-xl text-sm font-semibold bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/25 transition-all"
                : "text-sm text-white/30 hover:text-white/50 transition-colors"
              }>
              {mediaRefs.length > 0 ? 'Concluir ✓' : 'Pular'}
            </button>
          </div>
        </div>
      )}

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
