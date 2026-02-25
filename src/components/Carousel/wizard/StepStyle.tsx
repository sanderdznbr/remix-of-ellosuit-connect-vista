import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
];

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
}

const StepStyle: React.FC<Props> = ({
  bgColor, setBgColor, accentColor, setAccentColor, textColor, setTextColor,
  selectedFont, setSelectedFont, brandName, setBrandName, userName, setUserName, dateLabel, setDateLabel,
  showHeader = true, setShowHeader,
  onApplyPreset,
}) => {
  const [showAllFonts, setShowAllFonts] = useState(false);
  const [activeSection, setActiveSection] = useState<'presets' | 'colors' | 'fonts' | 'branding'>('presets');

  const applyPreset = (preset: StylePreset) => {
    setBgColor(preset.bgColor);
    setAccentColor(preset.accentColor);
    setTextColor(preset.textColor);
    setSelectedFont(preset.fontIndex);
    onApplyPreset?.(preset);
  };

  const applyColorPreset = (p: typeof COLOR_PRESETS[0]) => {
    setBgColor(p.bg);
    setAccentColor(p.accent);
    setTextColor(p.text);
  };

  const visibleFonts = showAllFonts ? FONT_OPTIONS : FONT_OPTIONS.slice(0, 12);

  return (
    <div className="space-y-8">
      {/* Section tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03]">
        {[
          { key: 'presets' as const, label: 'Estilos' },
          { key: 'colors' as const, label: 'Cores' },
          { key: 'fonts' as const, label: 'Fontes' },
          { key: 'branding' as const, label: 'Marca' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            className={`flex-1 py-3 px-4 rounded-lg text-xs font-medium transition-all ${
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
        <div className="space-y-4">
          <p className="text-xs font-medium text-white/40">Layout do carrossel</p>
          <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
            {STYLE_PRESETS.map(preset => {
              const isActive = bgColor === preset.bgColor && accentColor === preset.accentColor;
              return (
                <button key={preset.id} onClick={() => applyPreset(preset)}
                  className={`text-left rounded-xl overflow-hidden transition-all border ${
                    isActive ? 'border-white/30' : 'border-white/[0.06] hover:border-white/15'
                  }`}>
                  <div className="p-4 h-28" style={{ backgroundColor: preset.bgColor }}>
                    <span style={{ color: preset.textColor, fontFamily: FONT_OPTIONS[preset.fontIndex]?.value, fontSize: 12, fontWeight: 700 }}>
                      {preset.emoji} {preset.name}
                    </span>
                    <div className="flex flex-col gap-1 mt-3">
                      <div className="h-1.5 rounded-sm w-3/4" style={{ backgroundColor: preset.textColor, opacity: 0.5 }} />
                      <div className="h-1 rounded-sm w-1/2" style={{ backgroundColor: preset.textColor, opacity: 0.25 }} />
                      <div className="h-8 rounded-md mt-1" style={{ backgroundColor: preset.accentColor, opacity: 0.3 }} />
                    </div>
                  </div>
                  <div className="px-4 py-2.5 bg-white/[0.02]">
                    <p className="text-[10px] text-white/30 leading-tight">{preset.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colors */}
      {activeSection === 'colors' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-white/40 mb-3">Paletas prontas</p>
            <div className="grid grid-cols-4 gap-2">
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

          <div className="grid grid-cols-3 gap-4">
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
          <div className="grid grid-cols-3 gap-4">
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

      {/* Preview */}
      <div className="flex gap-3 items-center p-5 rounded-xl" style={{ backgroundColor: bgColor, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex-1">
          <p style={{ fontFamily: FONT_OPTIONS[selectedFont]?.value, color: textColor, fontSize: 18, fontWeight: 700 }}>
            Preview do <span style={{ color: accentColor }}>estilo</span>
          </p>
          <p style={{ color: textColor, opacity: 0.5, fontSize: 11 }}>{brandName} · @{userName || 'usuario'}</p>
        </div>
      </div>
    </div>
  );
};

export { FONT_OPTIONS };
export default StepStyle;
