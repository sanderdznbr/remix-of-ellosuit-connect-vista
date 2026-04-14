import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Upload, X, ShoppingBag, Loader2, RefreshCw } from 'lucide-react';
import LogoPositionPicker from './LogoPositionPicker';
import { supabase } from '@/integrations/supabase/client';

const FONT_OPTIONS = [
  { label: 'Playfair Display', value: "'Playfair Display', 'Georgia', serif" },
  { label: 'Merriweather', value: "'Merriweather', 'Georgia', serif" },
  { label: 'Lora', value: "'Lora', 'Georgia', serif" },
  { label: 'DM Serif Display', value: "'DM Serif Display', 'Georgia', serif" },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', 'Georgia', serif" },
  { label: 'Montserrat', value: "'Montserrat', 'Helvetica Neue', sans-serif" },
  { label: 'Poppins', value: "'Poppins', 'Helvetica Neue', sans-serif" },
  { label: 'Bebas Neue', value: "'Bebas Neue', 'Impact', sans-serif" },
  { label: 'Oswald', value: "'Oswald', 'Impact', sans-serif" },
  { label: 'Raleway', value: "'Raleway', 'Helvetica Neue', sans-serif" },
  { label: 'Inter', value: "'Inter', 'Helvetica Neue', sans-serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', 'Helvetica Neue', sans-serif" },
  { label: 'Sora', value: "'Sora', 'Helvetica Neue', sans-serif" },
  { label: 'Outfit', value: "'Outfit', 'Helvetica Neue', sans-serif" },
  { label: 'Clash Display', value: "'Clash Display', 'Impact', sans-serif" },
  { label: 'Crimson Text', value: "'Crimson Text', 'Georgia', serif" },
  { label: 'Libre Baskerville', value: "'Libre Baskerville', 'Georgia', serif" },
  { label: 'Source Serif Pro', value: "'Source Serif Pro', 'Georgia', serif" },
  { label: 'Archivo Black', value: "'Archivo Black', 'Impact', sans-serif" },
  { label: 'Anton', value: "'Anton', 'Impact', sans-serif" },
];

const COLOR_PRESETS = [
  { name: 'Ellosuit Dark', bg: '#0A0A1A', accent: '#3000E3', text: '#FFFFFF' },
  { name: 'Ellosuit Light', bg: '#FFFFFF', accent: '#3000E3', text: '#0A0A1A' },
  { name: 'Ellosuit Blue', bg: '#3000E3', accent: '#FFFFFF', text: '#FFFFFF' },
  { name: 'Preto & Branco', bg: '#000000', accent: '#FFFFFF', text: '#FFFFFF' },
  { name: 'Branco & Preto', bg: '#FFFFFF', accent: '#000000', text: '#0A0A1A' },
  { name: 'Midnight Blue', bg: '#0A1628', accent: '#3B82F6', text: '#F1F5F9' },
  { name: 'Cool Gray', bg: '#F3F4F6', accent: '#3000E3', text: '#111827' },
  { name: 'Ocean Teal', bg: '#042F2E', accent: '#2DD4BF', text: '#F0FDFA' },
];

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  bgColor: string;
  accentColor: string;
  textColor: string;
  fontIndex: number;
  layoutPattern: ('dark' | 'light' | 'accent')[];
  layoutType: 'classic' | 'split' | 'full-image' | 'minimal-text' | 'bold-header' | 'editorial-grid';
  imagePosition: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'full';
  textAlignment: 'left' | 'center' | 'right';
  coverStyle: 'overlay' | 'split-horizontal' | 'minimal' | 'bold-center';
  contentDensity: 'compact' | 'balanced' | 'spacious';
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'ellosuit-editorial',
    name: 'Ellosuit Editorial',
    description: 'Fundo escuro com azul vibrante. Moderno e profissional.',
    emoji: '🔷',
    bgColor: '#0A0A1A', accentColor: '#3000E3', textColor: '#FFFFFF',
    fontIndex: 10,
    layoutPattern: ['dark', 'dark', 'light', 'accent', 'dark'],
    layoutType: 'classic', imagePosition: 'center', textAlignment: 'left',
    coverStyle: 'overlay', contentDensity: 'balanced',
  },
  {
    id: 'beta-test2',
    name: 'Beta Test 2',
    description: 'Estilo clean com fundo claro, tipografia bold e acentos em coral.',
    emoji: '🧪',
    bgColor: '#F5F0EB', accentColor: '#E94560', textColor: '#1A1A2E',
    fontIndex: 8,
    layoutPattern: ['light', 'accent', 'light', 'dark', 'light'],
    layoutType: 'bold-header', imagePosition: 'top', textAlignment: 'center',
    coverStyle: 'bold-center', contentDensity: 'spacious',
  },
  {
    id: 'beta-test3',
    name: 'Beta Test 3',
    description: 'Magazine editorial com barra lateral, layout assimétrico e visual sofisticado.',
    emoji: '📐',
    bgColor: '#1C1C1E', accentColor: '#FF9F0A', textColor: '#F2F2F7',
    fontIndex: 11,
    layoutPattern: ['dark', 'light', 'dark', 'accent', 'dark'],
    layoutType: 'editorial-grid', imagePosition: 'left', textAlignment: 'left',
    coverStyle: 'split-horizontal', contentDensity: 'compact',
  },
];

export type LogoPosition = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface Props {
  bgColor: string;
  setBgColor: (v: string) => void;
  accentColor: string;
  setAccentColor: (v: string) => void;
  textColor: string;
  setTextColor: (v: string) => void;
  selectedFont: number;
  setSelectedFont: (v: number) => void;
  brandName: string;
  setBrandName: (v: string) => void;
  userName: string;
  setUserName: (v: string) => void;
  dateLabel: string;
  setDateLabel: (v: string) => void;
  showHeader?: boolean;
  setShowHeader?: (v: boolean) => void;
  onApplyPreset?: (preset: StylePreset) => void;
  onApplyMarketplaceStyle?: (styleConfig: any) => void;
  onRecreateWithStyle?: (styleConfig: any) => void;
  logoUrl?: string | null;
  setLogoUrl?: (v: string | null) => void;
  logoPosition?: LogoPosition;
  setLogoPosition?: (v: LogoPosition) => void;
  globalFontScale?: number;
  onChangeGlobalFontScale?: (v: number) => void;
}

interface MarketplacePurchasedStyle {
  id: string;
  name: string;
  preview_images: string[];
  style_config: any;
}

const StepStyle: React.FC<Props> = ({
  bgColor, setBgColor, accentColor, setAccentColor, textColor, setTextColor,
  selectedFont, setSelectedFont, brandName, setBrandName, userName, setUserName, dateLabel, setDateLabel,
  showHeader = true, setShowHeader,
  onApplyPreset, onApplyMarketplaceStyle, onRecreateWithStyle,
  logoUrl, setLogoUrl, logoPosition = 'top-left', setLogoPosition,
  globalFontScale = 100, onChangeGlobalFontScale,
}) => {
  const [showAllFonts, setShowAllFonts] = useState(false);
  const [activeSection, setActiveSection] = useState<'presets' | 'colors' | 'fonts' | 'branding'>('presets');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [marketplaceStyles, setMarketplaceStyles] = useState<MarketplacePurchasedStyle[]>([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [activeMarketplaceId, setActiveMarketplaceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPurchasedStyles = async () => {
      setLoadingMarketplace(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: isAdmin } = await supabase.rpc('is_adminmaster', { _user_id: userData.user.id });
        if (isAdmin) {
          const { data: styles } = await supabase
            .from('marketplace_styles')
            .select('id, name, preview_images, style_config')
            .eq('is_active', true);
          setMarketplaceStyles((styles as any[]) || []);
          return;
        }

        const [{ data: purchased }, { data: freeStyles }] = await Promise.all([
          supabase.from('purchased_styles').select('style_id').eq('user_id', userData.user.id),
          supabase.from('marketplace_styles').select('id').eq('is_active', true).eq('is_free', true),
        ]);
        const purchasedIds = (purchased as any[] || []).map(p => p.style_id);
        const freeIds = (freeStyles as any[] || []).map(s => s.id);
        const allIds = Array.from(new Set([...purchasedIds, ...freeIds]));
        if (!allIds.length) return;
        const { data: styles } = await supabase
          .from('marketplace_styles')
          .select('id, name, preview_images, style_config')
          .in('id', allIds)
          .eq('is_active', true);
        setMarketplaceStyles((styles as any[]) || []);
      } catch (err) {
        console.error('Error fetching marketplace styles:', err);
      } finally {
        setLoadingMarketplace(false);
      }
    };
    fetchPurchasedStyles();
  }, []);

  const applyPreset = (preset: StylePreset) => {
    setActiveMarketplaceId(null);
    setBgColor(preset.bgColor);
    setAccentColor(preset.accentColor);
    setTextColor(preset.textColor);
    setSelectedFont(preset.fontIndex);
    onApplyPreset?.(preset);
  };

  const applyMarketplaceStyle = (style: MarketplacePurchasedStyle) => {
    if (activeMarketplaceId === style.id) {
      setActiveMarketplaceId(null);
      return;
    }
    setActiveMarketplaceId(style.id);
    const config = style.style_config;
    if (config?.colors) {
      if (config.colors.primary) setAccentColor(config.colors.primary);
      if (config.colors.secondary) setBgColor(config.colors.secondary);
      if (config.colors.text) setTextColor(config.colors.text);
    }
    onApplyMarketplaceStyle?.({ ...config, id: style.id, _previewImages: style.preview_images, _styleName: style.name });
  };

  const applyColorPreset = (p: typeof COLOR_PRESETS[0]) => {
    setBgColor(p.bg);
    setAccentColor(p.accent);
    setTextColor(p.text);
  };

  const visibleFonts = showAllFonts ? FONT_OPTIONS : FONT_OPTIONS.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Section tabs - compact on mobile */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03]">
        {[
          { key: 'presets' as const, label: 'Estilos' },
          { key: 'colors' as const, label: 'Cores' },
          { key: 'fonts' as const, label: 'Fontes' },
          { key: 'branding' as const, label: 'Marca' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeSection === tab.key
                ? 'bg-white/[0.08] text-white'
                : 'text-white/30 hover:text-white/50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Presets */}
      {activeSection === 'presets' && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-white/40 mb-3">Layout do carrossel</p>
            <div className="flex gap-2 flex-wrap">
              {STYLE_PRESETS.map(preset => {
                const isActive = !activeMarketplaceId && bgColor === preset.bgColor && accentColor === preset.accentColor;
                return (
                  <button key={preset.id} onClick={() => applyPreset(preset)}
                    className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-white text-black'
                        : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
                    }`}>
                    {preset.emoji} {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Marketplace purchased styles */}
          {loadingMarketplace ? (
            <div className="flex items-center gap-2 text-white/30 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando estilos...
            </div>
          ) : marketplaceStyles.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/40 mb-3 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Estilos do Marketplace
              </p>
              <div className="flex gap-2 flex-wrap">
                {marketplaceStyles.map(style => {
                  const isActive = activeMarketplaceId === style.id;
                  return (
                    <button key={style.id} onClick={() => applyMarketplaceStyle(style)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
                      }`}>
                      {style.preview_images?.[0] && (
                        <img src={style.preview_images[0]} alt="" className="w-5 h-5 rounded object-cover" />
                      )}
                      {style.name}
                    </button>
                  );
                })}
              </div>
              {activeMarketplaceId && onRecreateWithStyle && (
                <button
                  onClick={() => {
                    const style = marketplaceStyles.find(s => s.id === activeMarketplaceId);
                    if (style) {
                      const config = style.style_config;
                      onRecreateWithStyle({ ...config, _previewImages: style.preview_images, _styleName: style.name, id: style.id });
                    }
                  }}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 50%, #6B3FA0 100%)' }}
                >
                  <RefreshCw className="w-4 h-4" /> Recriar post completo
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Colors */}
      {activeSection === 'colors' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-white/40 mb-3">Paletas prontas</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLOR_PRESETS.map((p, i) => {
                const isActive = bgColor === p.bg && accentColor === p.accent && textColor === p.text;
                return (
                  <button key={i} onClick={() => applyColorPreset(p)}
                    className={`rounded-xl p-2 border transition-all ${
                      isActive ? 'border-white/30' : 'border-white/[0.06] hover:border-white/15'
                    }`}>
                    <div className="flex gap-0.5 mb-1.5">
                      <div className="h-5 flex-1 rounded-l-md" style={{ backgroundColor: p.bg }} />
                      <div className="h-5 flex-1" style={{ backgroundColor: p.accent }} />
                      <div className="h-5 flex-1 rounded-r-md" style={{ backgroundColor: p.text }} />
                    </div>
                    <p className="text-[9px] text-white/30 truncate text-center">{p.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Fundo', value: bgColor, onChange: setBgColor },
              { label: 'Destaque', value: accentColor, onChange: setAccentColor },
              { label: 'Texto', value: textColor, onChange: setTextColor },
            ].map(c => (
              <div key={c.label}>
                <label className="text-xs font-medium text-white/40 mb-2 block">{c.label}</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={c.value} onChange={(e) => c.onChange(e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer bg-transparent" />
                  <Input value={c.value} onChange={(e) => c.onChange(e.target.value)}
                    className="!bg-white/[0.03] !border-white/[0.06] !text-white rounded-lg flex-1 text-xs font-mono h-9 focus:!border-white/20 focus:!ring-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fonts */}
      {activeSection === 'fonts' && (
        <div className="space-y-5">
          {onChangeGlobalFontScale && (
            <div>
              <label className="text-xs font-medium text-white/40 mb-2 flex items-center justify-between">
                <span>Tamanho da fonte (todos)</span>
                <span className="text-[10px] font-mono text-white/50">{globalFontScale}%</span>
              </label>
              <input type="range" min="50" max="200" step="5" value={globalFontScale}
                onChange={(e) => onChangeGlobalFontScale(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-white/60" style={{ accentColor: '#8B5CF6' }} />
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-white/40 mb-3">Escolha a fonte</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visibleFonts.map((font, i) => (
                <button key={i} onClick={() => setSelectedFont(i)}
                  className={`px-4 py-3 rounded-xl text-sm text-left transition-all border ${
                    selectedFont === i
                      ? 'bg-white/[0.08] border-white/20 text-white font-bold'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.05]'
                  }`}>
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                </button>
              ))}
            </div>
            {FONT_OPTIONS.length > 12 && (
              <button onClick={() => setShowAllFonts(!showAllFonts)}
                className="flex items-center gap-1 mx-auto mt-4 text-xs text-white/30 hover:text-white/50 transition-colors">
                {showAllFonts ? <><ChevronUp className="h-3 w-3" /> Menos</> : <><ChevronDown className="h-3 w-3" /> +{FONT_OPTIONS.length - 12} fontes</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Branding */}
      {activeSection === 'branding' && (
        <div className="space-y-5">
          {setShowHeader && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-white" />
              <span className="text-xs font-medium text-white/60">Exibir cabeçalho nos cards</span>
            </label>
          )}

          {/* Logo upload */}
          {setLogoUrl && setLogoPosition && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-white/40">Logomarca</p>
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden">
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                  <button onClick={() => setLogoUrl(null)}
                    className="p-1.5 rounded-md bg-white/[0.06] hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] text-white/40 hover:bg-white/[0.05] hover:text-white/60 transition-all text-xs w-full">
                  <Upload className="h-3.5 w-3.5" /> Enviar logomarca
                </button>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setLogoUrl(URL.createObjectURL(file));
                e.target.value = '';
              }} />

              {logoUrl && (
                <LogoPositionPicker logoPosition={logoPosition} setLogoPosition={setLogoPosition} />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Marca', value: brandName, onChange: setBrandName, ph: 'Nome da marca' },
              { label: '@ Instagram', value: userName, onChange: setUserName, ph: 'seuuser' },
              { label: 'Data', value: dateLabel, onChange: setDateLabel, ph: 'Fevereiro 2026' },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs font-medium text-white/40 mb-2 block">{f.label}</label>
                <Input value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.ph} disabled={!showHeader}
                  className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg text-xs h-10 focus:!border-white/20 focus:!ring-0 disabled:opacity-30" />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export { FONT_OPTIONS };
export default StepStyle;
