import React, { useState, useRef } from 'react';
import { User, Building2, ChevronDown, ChevronUp, Upload, X, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FacePerson, ReferenceImage } from './types';
import { LogoPosition } from './StepStyle';

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
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [wantsPerson, setWantsPerson] = useState<boolean | null>(null);
  const [wantsBrand, setWantsBrand] = useState<boolean | null>(null);
  const [expandedSection, setExpandedSection] = useState<'face' | 'brand' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const hasFacePhotos = facePersons.some(p => p.photos.length > 0);
  const hasLogo = !!logoUrl;
  const hasBrandInfo = !!brandName || hasLogo;

  // If user hasn't decided yet, show the gate question
  if (wantsPerson === null && wantsBrand === null) {
    return (
      <div className="space-y-5" style={{ minHeight: '260px' }}>
        <div>
          <h2 className="text-xl font-bold text-white mb-1.5">Personalização</h2>
          <p className="text-sm text-white/40">Seu post tem algo relacionado à marca ou pessoas?</p>
        </div>

        <div className="space-y-3">
          {/* Person option */}
          <button
            onClick={() => { setWantsPerson(true); setWantsBrand(false); setExpandedSection('face'); }}
            className="w-full flex items-center gap-3.5 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all text-left group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/25 transition-colors">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/80">Sim, tem pessoa</p>
              <p className="text-[11px] text-white/30 mt-0.5">Envie sua foto para aparecer no post</p>
            </div>
          </button>

          {/* Brand option */}
          <button
            onClick={() => { setWantsBrand(true); setWantsPerson(false); setExpandedSection('brand'); }}
            className="w-full flex items-center gap-3.5 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all text-left group"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/25 transition-colors">
              <Building2 className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/80">Sim, tem marca / logo</p>
              <p className="text-[11px] text-white/30 mt-0.5">Adicione logomarca e nome da marca</p>
            </div>
          </button>

          {/* Both option */}
          <button
            onClick={() => { setWantsPerson(true); setWantsBrand(true); setExpandedSection('face'); }}
            className="w-full flex items-center gap-3.5 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all text-left group"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">✨</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/80">Ambos</p>
              <p className="text-[11px] text-white/30 mt-0.5">Pessoa + logomarca no post</p>
            </div>
          </button>

          {/* Skip */}
          <button
            onClick={onSkipAll}
            className="w-full py-3 rounded-xl text-sm font-medium text-white/30 hover:text-white/50 border border-white/[0.06] hover:border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
          >
            Não, pular tudo
          </button>
        </div>
      </div>
    );
  }

  // Show inline editors based on choices
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
            // Sync referenceImages
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
        // Fallback to data URL
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) setLogoUrl(ev.target.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const facePhotos = facePersons.flatMap(p => p.photos);

  return (
    <div className="space-y-4" style={{ minHeight: '260px' }}>
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Personalização</h2>
        <p className="text-sm text-white/40">Configure pessoa e/ou marca do post.</p>
      </div>

      {/* Face section */}
      {wantsPerson && (
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'face' ? null : 'face')}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-white/80">Rosto / Pessoa</span>
              {facePhotos.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{facePhotos.length} foto(s)</span>
              )}
            </div>
            {expandedSection === 'face' ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
          </button>

          {expandedSection === 'face' && (
            <div className="px-4 pb-4 space-y-3">
              {/* Uploaded face photos */}
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

              <button
                onClick={handleFaceUpload}
                className="flex items-center gap-2 px-4 py-3 w-full rounded-xl border border-dashed border-white/[0.12] text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
              >
                <Upload className="h-4 w-4" />
                {facePhotos.length > 0 ? 'Adicionar mais fotos' : 'Enviar foto do rosto'}
              </button>

              {/* Gender selector */}
              <div className="flex gap-2">
                {[{ value: 'male', label: '♂ Masculino' }, { value: 'female', label: '♀ Feminino' }, { value: 'auto', label: '⚡ Auto' }].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFaceGender(opt.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${faceGender === opt.value ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brand/Logo section */}
      {wantsBrand && (
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'brand' ? null : 'brand')}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-white/80">Marca / Logo</span>
              {hasBrandInfo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">✓</span>
              )}
            </div>
            {expandedSection === 'brand' ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
          </button>

          {expandedSection === 'brand' && (
            <div className="px-4 pb-4 space-y-3">
              {/* Logo */}
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Logomarca</label>
                {logoUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden ring-1 ring-purple-500/30 bg-white/[0.04] flex items-center justify-center">
                      <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={handleLogoUpload} className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/50 hover:text-white/80 transition-colors text-xs">Trocar</button>
                      <button onClick={() => setLogoUrl('')} className="p-2 rounded-lg bg-white/[0.06] hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors text-xs">Remover</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleLogoUpload}
                    className="flex items-center gap-2 px-4 py-3 w-full rounded-xl border border-dashed border-white/[0.12] text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Enviar logomarca
                  </button>
                )}
              </div>

              {/* Brand name */}
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Nome da marca</label>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ex: Minha Empresa"
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-white/15 transition-colors"
                />
              </div>

              {/* Author name */}
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Seu nome (opcional)</label>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-white/15 transition-colors"
                />
              </div>

              {/* Logo position */}
              {logoUrl && (
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Posição do logo</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { value: 'top-left', label: '↖' },
                      { value: 'top-right', label: '↗' },
                      { value: 'bottom-left', label: '↙' },
                      { value: 'bottom-right', label: '↘' },
                    ].map(pos => (
                      <button
                        key={pos.value}
                        onClick={() => setLogoPosition(pos.value)}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${logoPosition === pos.value ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'}`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reset choice */}
      <button
        onClick={() => { setWantsPerson(null); setWantsBrand(null); setExpandedSection(null); }}
        className="w-full py-2.5 rounded-xl text-xs font-medium text-white/20 hover:text-white/40 transition-colors"
      >
        ← Alterar escolha
      </button>
    </div>
  );
};

export default StepPersonalization;
