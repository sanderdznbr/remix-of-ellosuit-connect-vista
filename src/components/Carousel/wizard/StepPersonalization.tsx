import React, { useState, useRef, useEffect } from 'react';
import { User, Building2, ChevronDown, ChevronUp, Upload, X, Loader2, ShoppingBag, Palette, ImagePlus, Folder, Sparkles, Monitor } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FacePerson, ReferenceImage } from './types';
import { LogoPosition } from './StepStyle';
import GalleryPicker from './GalleryPicker';

interface Props {
  // Face
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
  // Brand
  brandAssets: any[];
  onSuggestColors?: (palette: any) => void;
  // Logo
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
  // Web images
  hasWebImages: boolean;
  webFacePosition: 'cover' | 'last' | 'none';
  setWebFacePosition: (v: 'cover' | 'last' | 'none') => void;
  // Skip callback
  onSkipAll: () => void;
  // Active marketplace style
  activeMarketplaceStyle?: any;
  isExtreme?: boolean;
  // Product
  hasProduct?: boolean;
  setHasProduct?: (v: boolean) => void;
  onOpenProductStep?: () => void;
  // Custom colors
  useCustomColors: boolean;
  setUseCustomColors: (v: boolean) => void;
  customColors: string[];
  setCustomColors: React.Dispatch<React.SetStateAction<string[]>>;
  // Wizard mode
  wizardMode?: 'simple' | 'advanced' | 'extreme' | 'tweet' | 'tweet2' | 'animated';
  // Logo mode
  logoMode: 'ai' | 'manual';
  setLogoMode: (v: 'ai' | 'manual') => void;
  // Animated mode extras
  animatedBgImageUrl?: string;
  setAnimatedBgImageUrl?: (v: string) => void;
  generateAiBg?: boolean;
  setGenerateAiBg?: (v: boolean) => void;
  generateAiMockup?: boolean;
  setGenerateAiMockup?: (v: boolean) => void;
}

const StepPersonalization: React.FC<Props> = ({
  facePersons, setFacePersons, referenceImages, setReferenceImages,
  allPeopleOnCover, setAllPeopleOnCover, faceGender, setFaceGender,
  wearsGlasses, setWearsGlasses,
  brandAssets, onSuggestColors,
  showHeader, setShowHeader, logoUrl, setLogoUrl, logoDarkUrl, setLogoDarkUrl,
  logoPosition, setLogoPosition, logoBrandColors, useBrandColors, setUseBrandColors,
  brandName, setBrandName, userName, setUserName, dateLabel, setDateLabel,
  hasWebImages, webFacePosition, setWebFacePosition,
  onSkipAll, activeMarketplaceStyle, isExtreme,
  hasProduct, setHasProduct, onOpenProductStep,
  useCustomColors, setUseCustomColors, customColors, setCustomColors,
  wizardMode, logoMode, setLogoMode,
  animatedBgImageUrl, setAnimatedBgImageUrl,
  generateAiBg, setGenerateAiBg,
  generateAiMockup, setGenerateAiMockup,
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(setHasProduct ? ['face', 'brand', 'media', 'product'] : ['face', 'brand', 'media'])
  );

  // Auto-expand sections with pre-filled data
  useEffect(() => {
    const hasFace = facePersons.some(p => p.photos.length > 0);
    const hasLogoData = !!logoUrl;
    const newExpanded = new Set(expandedSections);
    if (hasFace) newExpanded.add('face');
    if (hasLogoData) newExpanded.add('brand');
    if (newExpanded.size !== expandedSections.size) setExpandedSections(newExpanded);
  }, [facePersons, logoUrl]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const [galleryTarget, setGalleryTarget] = useState<'face' | 'logo' | 'media' | null>(null);

  const handleGallerySelect = (files: { url: string; name: string }[]) => {
    if (!galleryTarget) return;
    files.forEach(file => {
      const url = file.url;
      if (galleryTarget === 'face') {
        setFacePersons(prev => {
          const updated = [...prev];
          if (updated.length === 0) {
            updated.push({ id: crypto.randomUUID(), label: 'Pessoa 1', gender: 'auto', wearsGlasses: false, photos: [] });
          }
          updated[0] = { ...updated[0], photos: [...updated[0].photos, { url, thumb: url, label: file.name, source: 'upload' as const, category: 'face' as const }] };
          const nonFaceRefs = referenceImages.filter(r => r.category !== 'face');
          const allFaceRefs = updated.flatMap(p => p.photos);
          setReferenceImages([...nonFaceRefs, ...allFaceRefs]);
          return updated;
        });
      } else if (galleryTarget === 'logo') {
        setLogoUrl(url);
      } else if (galleryTarget === 'media') {
        setReferenceImages(prev => [...prev, { url, thumb: url, label: file.name, source: 'upload' as const, category: 'style' as const }]);
      }
    });
    setGalleryTarget(null);
  };

  const facePhotos = facePersons.flatMap(p => p.photos);
  const mediaRefs = referenceImages.filter(r => r.category !== 'face');

  const handleFaceUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (!ev.target?.result) return;
          const url = ev.target.result as string;
          setFacePersons(prev => {
            const updated = [...prev];
            if (updated.length === 0) {
              updated.push({ id: crypto.randomUUID(), label: 'Pessoa 1', gender: 'auto', wearsGlasses: false, photos: [] });
            }
            updated[0] = {
              ...updated[0],
              photos: [...updated[0].photos, { url, thumb: url, label: file.name, source: 'upload' as const, category: 'face' as const }],
            };
            const nonFaceRefs = referenceImages.filter(r => r.category !== 'face');
            const allFaceRefs = updated.flatMap(p => p.photos);
            setReferenceImages([...nonFaceRefs, ...allFaceRefs]);
            return updated;
          });
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const handleLogoUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;
      try {
        const ext = file.name.split('.').pop() || 'png';
        const path = `${user.id}/logos/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('brand-assets').upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
        setLogoUrl(urlData.publicUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) setLogoUrl(ev.target.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleMediaUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (!ev.target?.result) return;
          const url = ev.target.result as string;
          setReferenceImages(prev => [...prev, { url, thumb: url, label: file.name, source: 'upload' as const, category: 'style' as const }]);
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const SectionHeader = ({ id, icon: Icon, iconColor, label, badge }: { id: string; icon: any; iconColor: string; label: string; badge?: React.ReactNode }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between px-4 py-3 text-left"
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-sm font-medium text-white/80">{label}</span>
        {badge}
      </div>
      {expandedSections.has(id) ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
    </button>
  );

  return (
    <div className="space-y-3" style={{ minHeight: '260px' }}>
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Personalização</h2>
        <p className="text-sm text-white/40">Adicione logo, rosto e mídias nesta mesma tela antes de continuar.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] px-4 py-3 text-sm text-white/55" style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}>
        Você pode preencher <span className="text-white/80 font-medium">Marca</span> e <span className="text-white/80 font-medium">Fotos / Mídias</span> juntos — não precisa voltar etapa.
      </div>

      {/* === FACE SECTION === */}
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}>
        <SectionHeader
          id="face"
          icon={User}
          iconColor="text-blue-400"
          label="Rosto / Pessoa"
          badge={facePhotos.length > 0 ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{facePhotos.length} foto(s)</span> : undefined}
        />
        {expandedSections.has('face') && (
          <div className="px-4 pb-4 space-y-3">
            {facePhotos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {facePhotos.map((photo, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden ring-1 ring-blue-500/30">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        setFacePersons(prev => {
                          const updated = prev.map(p => ({
                            ...p,
                            photos: p.photos.filter(ph => ph.url !== photo.url),
                          }));
                          const nonFaceRefs = referenceImages.filter(r => r.category !== 'face');
                          const allFaceRefs = updated.flatMap(p => p.photos);
                          setReferenceImages([...nonFaceRefs, ...allFaceRefs]);
                          return updated;
                        });
                      }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleFaceUpload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.12] text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
              >
                <Upload className="h-4 w-4" />
                {facePhotos.length > 0 ? 'Adicionar' : 'Enviar foto'}
              </button>
              <button
                onClick={() => setGalleryTarget('face')}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.12] text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
              >
                <Folder className="h-4 w-4" />
                Galeria
              </button>
            </div>
            {facePhotos.length > 0 && (
              <div className="space-y-3 p-3 rounded-xl border border-blue-500/10 bg-blue-500/[0.03]">
                <p className="text-[11px] text-blue-300/60 font-medium uppercase tracking-wider">Atributos faciais</p>
                <div>
                  <label className="text-[11px] text-white/40 mb-1.5 block">Gênero</label>
                  <div className="flex gap-2">
                    {[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Feminino' }, { value: 'auto', label: 'Auto' }].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFaceGender(opt.value as 'male' | 'female' | 'auto')}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${faceGender === opt.value ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-white/40 mb-1.5 block">Usa óculos?</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setWearsGlasses(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${!wearsGlasses ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'}`}
                    >
                      Sem óculos
                    </button>
                    <button
                      onClick={() => setWearsGlasses(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${wearsGlasses ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'}`}
                    >
                      Com óculos
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-white/25 leading-relaxed">
                  ⭐ O rosto será priorizado na geração — a IA criará um corpo fiel com os atributos acima, integrando o produto caso exista.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* === BRAND SECTION === */}
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}>
        <SectionHeader
          id="brand"
          icon={Building2}
          iconColor="text-purple-400"
          label="Marca / Logo"
          badge={logoUrl ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">ok</span> : undefined}
        />
        {expandedSections.has('brand') && (
          <div className="px-4 pb-4 space-y-4">
            {/* Logo upload */}
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Logomarca</label>
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden ring-1 ring-purple-500/30 bg-white/[0.04] flex items-center justify-center">
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={handleLogoUpload} className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/50 hover:text-white/80 transition-colors text-xs">Trocar</button>
                    <button onClick={() => setGalleryTarget('logo')} className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/50 hover:text-white/80 transition-colors text-xs"><Folder className="h-3 w-3 inline mr-1" />Galeria</button>
                    <button onClick={() => setLogoUrl('')} className="p-2 rounded-lg bg-white/[0.06] hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors text-xs">Remover</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleLogoUpload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.12] text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Enviar logo
                  </button>
                  <button
                    onClick={() => setGalleryTarget('logo')}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.12] text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
                  >
                    <Folder className="h-4 w-4" />
                    Galeria
                  </button>
                </div>
              )}
            </div>

            {/* Logo positioning mode */}
            {logoUrl && wizardMode === 'advanced' && (
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Posição do logo</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setLogoMode('ai')}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${logoMode === 'ai' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'}`}
                  >
                    IA posiciona
                  </button>
                  <button
                    onClick={() => setLogoMode('manual')}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${logoMode === 'manual' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'}`}
                  >
                    Manual
                  </button>
                </div>
                {logoMode === 'manual' && (
                  <div className="relative w-full aspect-[4/5] max-w-[160px] rounded-xl border border-white/[0.10] bg-white/[0.03] mx-auto">
                    {[
                      { value: 'top-left', style: 'top-2 left-2' },
                      { value: 'top-right', style: 'top-2 right-2' },
                      { value: 'bottom-left', style: 'bottom-2 left-2' },
                      { value: 'bottom-right', style: 'bottom-2 right-2' },
                    ].map(pos => (
                      <button
                        key={pos.value}
                        onClick={() => setLogoPosition(pos.value as LogoPosition)}
                        className={`absolute ${pos.style} w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          logoPosition === pos.value
                            ? 'bg-purple-500 ring-2 ring-purple-400/50 scale-110'
                            : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.10]'
                        }`}
                      >
                        {logoPosition === pos.value ? (
                          <img src={logoUrl} alt="" className="w-4 h-4 object-contain" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-sm bg-white/20" />
                        )}
                      </button>
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-white/15 font-medium">POST</span>
                    </div>
                  </div>
                )}
                {logoMode === 'ai' && (
                  <p className="text-[10px] text-white/25 leading-relaxed mt-1">A IA posicionará o logo automaticamente no melhor local do design.</p>
                )}
              </div>
            )}

            {/* Color options */}
            {logoUrl && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-white/60">Usar cores da marca</span>
                  <button
                    onClick={() => { setUseBrandColors(!useBrandColors); if (!useBrandColors) setUseCustomColors(false); }}
                    className={`relative w-10 h-5 rounded-full transition-colors ${useBrandColors ? 'bg-purple-500' : 'bg-white/[0.1]'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${useBrandColors ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {!useBrandColors && (
                  <>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Palette className="h-3.5 w-3.5 text-white/40" />
                        <span className="text-sm text-white/60">Cores personalizadas</span>
                      </div>
                      <button
                        onClick={() => setUseCustomColors(!useCustomColors)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${useCustomColors ? 'bg-purple-500' : 'bg-white/[0.1]'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${useCustomColors ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {useCustomColors && (
                      <div className="flex items-center gap-3 pt-1">
                        {customColors.map((color, i) => (
                          <label key={i} className="relative cursor-pointer group">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => {
                                const updated = [...customColors];
                                updated[i] = e.target.value;
                                setCustomColors(updated);
                              }}
                              className="sr-only"
                            />
                            <div
                              className="w-10 h-10 rounded-xl border-2 border-white/[0.12] group-hover:border-white/30 transition-colors shadow-lg"
                              style={{ backgroundColor: color }}
                            />
                            <span className="block text-center text-[9px] text-white/30 mt-1">Cor {i + 1}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* === MEDIA SECTION === */}
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}>
        <SectionHeader
          id="media"
          icon={ImagePlus}
          iconColor="text-emerald-400"
          label="Fotos / Mídias"
          badge={mediaRefs.length > 0 ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">{mediaRefs.length}</span> : undefined}
        />
        {expandedSections.has('media') && (
          <div className="px-4 pb-4 space-y-3">
            {mediaRefs.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {mediaRefs.map((ref, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden ring-1 ring-emerald-500/30">
                    <img src={ref.url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setReferenceImages(prev => prev.filter(r => r.url !== ref.url))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleMediaUpload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.12] text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
              >
                <Upload className="h-4 w-4" />
                {mediaRefs.length > 0 ? 'Adicionar' : 'Enviar fotos'}
              </button>
              <button
                onClick={() => setGalleryTarget('media')}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.12] text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
              >
                <Folder className="h-4 w-4" />
                Galeria
              </button>
            </div>
          </div>
        )}
      </div>

      {/* === PRODUCT SECTION === */}
      {setHasProduct && (
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}>
          <button
            onClick={() => { setHasProduct?.(true); onOpenProductStep?.(); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
          >
            <ShoppingBag className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-white/80">Produto</span>
            {hasProduct && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">ok</span>}
          </button>
        </div>
      )}

      {/* AI Image Generation for animated mode */}
      {wizardMode === 'animated' && (setGenerateAiBg || setGenerateAiMockup) && (
        <div className="rounded-xl border border-violet-500/20 overflow-hidden bg-violet-500/[0.03]">
          <button
            onClick={() => toggleSection('ai-images')}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
          >
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-medium text-white/80">Imagens com IA</span>
            {(generateAiBg || generateAiMockup) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300">ativo</span>}
            <span className="ml-auto text-white/20 text-xs">{expandedSections.has('ai-images') ? '▲' : '▼'}</span>
          </button>
          {expandedSections.has('ai-images') && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-[11px] text-white/30">A IA gera imagens únicas para cada card, tornando o resultado mais profissional. Consome mais créditos e tempo de geração.</p>
              
              {/* AI Background toggle */}
              {setGenerateAiBg && (
                <button
                  onClick={() => { setGenerateAiBg(!generateAiBg); if (!generateAiBg && setAnimatedBgImageUrl) setAnimatedBgImageUrl(''); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${generateAiBg ? 'border-violet-500/40 bg-violet-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'}`}
                >
                  <ImagePlus className={`h-5 w-5 ${generateAiBg ? 'text-violet-400' : 'text-white/20'}`} />
                  <div className="text-left flex-1">
                    <div className={`text-xs font-medium ${generateAiBg ? 'text-violet-300' : 'text-white/60'}`}>Fundo IA</div>
                    <div className="text-[10px] text-white/30">Gera fotos de fundo temáticas para cada card</div>
                  </div>
                  <div className={`w-8 h-4.5 rounded-full transition-colors ${generateAiBg ? 'bg-violet-500' : 'bg-white/10'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.5 transition-transform ${generateAiBg ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              )}

              {/* AI Mockup toggle */}
              {setGenerateAiMockup && (
                <button
                  onClick={() => setGenerateAiMockup(!generateAiMockup)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${generateAiMockup ? 'border-violet-500/40 bg-violet-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'}`}
                >
                  <Monitor className={`h-5 w-5 ${generateAiMockup ? 'text-violet-400' : 'text-white/20'}`} />
                  <div className="text-left flex-1">
                    <div className={`text-xs font-medium ${generateAiMockup ? 'text-violet-300' : 'text-white/60'}`}>Mockups IA</div>
                    <div className="text-[10px] text-white/30">Gera mockups 3D relacionados ao tema (celular, laptop, etc)</div>
                  </div>
                  <div className={`w-8 h-4.5 rounded-full transition-colors ${generateAiMockup ? 'bg-violet-500' : 'bg-white/10'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.5 transition-transform ${generateAiMockup ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              )}

              {(generateAiBg || generateAiMockup) && (
                <p className="text-[10px] text-amber-300/60 flex items-center gap-1">
                  ⚡ Geração mais lenta (~15-30s por card) — cada card terá imagens únicas
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Background image for animated mode */}
      {wizardMode === 'animated' && setAnimatedBgImageUrl && !generateAiBg && (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <button
            onClick={() => toggleSection('bg-image')}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
          >
            <ImagePlus className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-medium text-white/80">Foto de Fundo Manual</span>
            {animatedBgImageUrl && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300">ok</span>}
            <span className="ml-auto text-white/20 text-xs">{expandedSections.has('bg-image') ? '▲' : '▼'}</span>
          </button>
          {expandedSections.has('bg-image') && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-[11px] text-white/30">Envie uma imagem sua para usar como fundo. A IA aplicará overlay escuro para legibilidade.</p>
              {animatedBgImageUrl ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/[0.08]">
                  <img src={animatedBgImageUrl} alt="Background" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setAnimatedBgImageUrl('')}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-white/80" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed border-white/[0.08] hover:border-violet-500/30 cursor-pointer transition-all bg-white/[0.02] hover:bg-violet-500/[0.03]">
                  <Upload className="h-6 w-6 text-white/20 mb-1.5" />
                  <span className="text-xs text-white/30">Clique para enviar</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    try {
                      const ext = file.name.split('.').pop() || 'jpg';
                      const path = `${user.id}/animated-bg/${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from('brand-assets').upload(path, file);
                      if (error) throw error;
                      const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
                      setAnimatedBgImageUrl(urlData.publicUrl);
                    } catch (err) {
                      console.error('Upload bg error:', err);
                    }
                  }} />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {/* Skip */}
      <button
        onClick={onSkipAll}
        className="w-full py-2.5 rounded-xl text-xs font-medium text-white/20 hover:text-white/40 transition-colors"
      >
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
