import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Palette, Type, Layers, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { FLOW_COLOR } from './types';

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
  // New fonts
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

// Color palette presets
const COLOR_PRESETS = [
  { name: 'Escuro Clássico', bg: '#0F0F1A', accent: '#E84D1A', text: '#FFFFFF' },
  { name: 'Midnight Blue', bg: '#0A1628', accent: '#3B82F6', text: '#F1F5F9' },
  { name: 'Elegant Green', bg: '#0D1F0D', accent: '#22C55E', text: '#F0FDF4' },
  { name: 'Royal Purple', bg: '#1A0A2E', accent: '#A855F7', text: '#FAF5FF' },
  { name: 'Rose Gold', bg: '#1C1017', accent: '#FB7185', text: '#FFF1F2' },
  { name: 'Ocean Teal', bg: '#042F2E', accent: '#2DD4BF', text: '#F0FDFA' },
  { name: 'Amber Fire', bg: '#1C1106', accent: '#F59E0B', text: '#FFFBEB' },
  { name: 'Minimalista Claro', bg: '#FAFAF9', accent: '#18181B', text: '#18181B' },
  { name: 'Paper Cream', bg: '#F8F4EF', accent: '#92400E', text: '#1C1917' },
  { name: 'Cool Gray', bg: '#F3F4F6', accent: '#4F46E5', text: '#111827' },
  { name: 'Soft Pink', bg: '#FDF2F8', accent: '#DB2777', text: '#1F2937' },
  { name: 'Sage Green', bg: '#F0FDF4', accent: '#15803D', text: '#14532D' },
  { name: 'Neon Night', bg: '#000000', accent: '#00FF88', text: '#FFFFFF' },
  { name: 'Cyberpunk', bg: '#0D0221', accent: '#FF006E', text: '#F9FAFB' },
  { name: 'Sunset Gradient', bg: '#1A0505', accent: '#FF6B35', text: '#FFF7ED' },
  { name: 'Arctic Ice', bg: '#0C1222', accent: '#38BDF8', text: '#E0F2FE' },
];

// Style presets - now define LAYOUT DESIGNS, not just colors
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
  // Layout design properties
  layoutType: 'classic' | 'split' | 'full-image' | 'minimal-text' | 'bold-header' | 'editorial-grid';
  imagePosition: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'full';
  textAlignment: 'left' | 'center' | 'right';
  coverStyle: 'overlay' | 'split-horizontal' | 'minimal' | 'bold-center';
  contentDensity: 'compact' | 'balanced' | 'spacious';
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'editorial-classic',
    name: 'Editorial Clássico',
    description: 'Layout padrão: texto acima, imagem abaixo, fundo escuro. O formato mais usado.',
    emoji: '📰',
    bgColor: '#0F0F1A', accentColor: '#E84D1A', textColor: '#FFFFFF',
    fontIndex: 0,
    layoutPattern: ['dark', 'dark', 'light', 'accent', 'dark'],
    layoutType: 'classic', imagePosition: 'center', textAlignment: 'left',
    coverStyle: 'overlay', contentDensity: 'balanced',
  },
  {
    id: 'split-layout',
    name: 'Split Horizontal',
    description: 'Imagem em metade do card, texto na outra metade. Moderno e limpo.',
    emoji: '◧',
    bgColor: '#FAFAF9', accentColor: '#18181B', textColor: '#18181B',
    fontIndex: 10, // Inter
    layoutPattern: ['light', 'light', 'dark', 'light', 'light'],
    layoutType: 'split', imagePosition: 'left', textAlignment: 'left',
    coverStyle: 'split-horizontal', contentDensity: 'balanced',
  },
  {
    id: 'full-image-overlay',
    name: 'Imagem Full + Texto',
    description: 'Imagem ocupa todo o card com texto sobreposto. Impactante e visual.',
    emoji: '🖼️',
    bgColor: '#000000', accentColor: '#FFD60A', textColor: '#FFFFFF',
    fontIndex: 7, // Bebas Neue
    layoutPattern: ['dark', 'accent', 'dark', 'accent', 'dark'],
    layoutType: 'full-image', imagePosition: 'full', textAlignment: 'center',
    coverStyle: 'bold-center', contentDensity: 'spacious',
  },
  {
    id: 'minimal-text',
    name: 'Texto Minimalista',
    description: 'Foco 100% no texto com tipografia grande. Sem imagens nos cards de conteúdo.',
    emoji: '✏️',
    bgColor: '#F8F4EF', accentColor: '#92400E', textColor: '#1C1917',
    fontIndex: 4, // Cormorant Garamond
    layoutPattern: ['dark', 'light', 'light', 'accent', 'light'],
    layoutType: 'minimal-text', imagePosition: 'center', textAlignment: 'center',
    coverStyle: 'minimal', contentDensity: 'spacious',
  },
  {
    id: 'bold-header',
    name: 'Título Gigante',
    description: 'Cabeçalho dominante em cada card, texto menor abaixo. Alto impacto.',
    emoji: '💥',
    bgColor: '#1A0A2E', accentColor: '#C084FC', textColor: '#FAF5FF',
    fontIndex: 18, // Archivo Black
    layoutPattern: ['dark', 'dark', 'accent', 'dark', 'dark'],
    layoutType: 'bold-header', imagePosition: 'bottom', textAlignment: 'left',
    coverStyle: 'bold-center', contentDensity: 'compact',
  },
  {
    id: 'editorial-grid',
    name: 'Grid Editorial',
    description: 'Layout estilo revista com blocos de texto e imagem em grid organizado.',
    emoji: '📐',
    bgColor: '#0A1628', accentColor: '#3B82F6', textColor: '#F1F5F9',
    fontIndex: 11, // Space Grotesk
    layoutPattern: ['dark', 'dark', 'light', 'accent', 'dark'],
    layoutType: 'editorial-grid', imagePosition: 'right', textAlignment: 'left',
    coverStyle: 'overlay', contentDensity: 'compact',
  },
  {
    id: 'neon-dark',
    name: 'Neon Escuro',
    description: 'Visual futurista com neon sobre fundo escuro. Ideal para tech e inovação.',
    emoji: '🌃',
    bgColor: '#0D0221', accentColor: '#00FF88', textColor: '#F9FAFB',
    fontIndex: 12, // Sora
    layoutPattern: ['dark', 'dark', 'dark', 'accent', 'dark'],
    layoutType: 'classic', imagePosition: 'center', textAlignment: 'center',
    coverStyle: 'overlay', contentDensity: 'balanced',
  },
  {
    id: 'warm-sunset',
    name: 'Sunset Quente',
    description: 'Tons quentes com layout clássico. Ideal para lifestyle e bem-estar.',
    emoji: '🌅',
    bgColor: '#1A0505', accentColor: '#FF6B35', textColor: '#FFF7ED',
    fontIndex: 2, // Lora
    layoutPattern: ['dark', 'accent', 'dark', 'dark', 'accent'],
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
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-semibold mb-3">
          <Palette className="h-4 w-4" /> Etapa 4 — Estilo & Branding
        </div>
        <p className="text-sm text-muted-foreground">Cores, fonte e identidade visual do carrossel</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        {[
          { key: 'presets' as const, label: 'Estilos', icon: <Sparkles className="h-3.5 w-3.5" /> },
          { key: 'colors' as const, label: 'Cores', icon: <Palette className="h-3.5 w-3.5" /> },
          { key: 'fonts' as const, label: 'Fontes', icon: <Type className="h-3.5 w-3.5" /> },
          { key: 'branding' as const, label: 'Marca', icon: <Layers className="h-3.5 w-3.5" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSection === tab.key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Style Presets - LAYOUT DESIGNS */}
      {activeSection === 'presets' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Escolha o formato de layout do carrossel</p>
          <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
            {STYLE_PRESETS.map(preset => {
              const isActive = bgColor === preset.bgColor && accentColor === preset.accentColor;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`relative group text-left rounded-2xl border overflow-hidden transition-all ${
                    isActive ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/40'
                  }`}
                >
                  {/* Layout diagram preview */}
                  <div className="p-3 h-28" style={{ backgroundColor: preset.bgColor }}>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-sm">{preset.emoji}</span>
                      <span style={{ color: preset.textColor, fontFamily: FONT_OPTIONS[preset.fontIndex]?.value, fontSize: 11, fontWeight: 700 }}>
                        {preset.name}
                      </span>
                    </div>
                    {/* Layout wireframe based on layoutType */}
                    {preset.layoutType === 'classic' && (
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 rounded-sm w-3/4" style={{ backgroundColor: preset.textColor, opacity: 0.6 }} />
                        <div className="h-1 rounded-sm w-1/2" style={{ backgroundColor: preset.textColor, opacity: 0.3 }} />
                        <div className="h-8 rounded-md mt-1" style={{ backgroundColor: preset.accentColor, opacity: 0.35 }} />
                      </div>
                    )}
                    {preset.layoutType === 'split' && (
                      <div className="flex gap-1.5 h-12">
                        <div className="flex-1 rounded-md" style={{ backgroundColor: preset.accentColor, opacity: 0.35 }} />
                        <div className="flex-1 flex flex-col gap-0.5 justify-center">
                          <div className="h-1.5 rounded-sm w-full" style={{ backgroundColor: preset.textColor, opacity: 0.6 }} />
                          <div className="h-1 rounded-sm w-3/4" style={{ backgroundColor: preset.textColor, opacity: 0.3 }} />
                          <div className="h-1 rounded-sm w-1/2" style={{ backgroundColor: preset.textColor, opacity: 0.2 }} />
                        </div>
                      </div>
                    )}
                    {preset.layoutType === 'full-image' && (
                      <div className="relative h-12 rounded-md overflow-hidden" style={{ backgroundColor: preset.accentColor, opacity: 0.25 }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-1 left-1.5 right-1.5">
                          <div className="h-2 rounded-sm w-3/4 mb-0.5" style={{ backgroundColor: '#fff', opacity: 0.9 }} />
                          <div className="h-1 rounded-sm w-1/2" style={{ backgroundColor: '#fff', opacity: 0.5 }} />
                        </div>
                      </div>
                    )}
                    {preset.layoutType === 'minimal-text' && (
                      <div className="flex flex-col items-center gap-1 h-12 justify-center">
                        <div className="h-2.5 rounded-sm w-2/3" style={{ backgroundColor: preset.accentColor, opacity: 0.7 }} />
                        <div className="h-1 rounded-sm w-1/2" style={{ backgroundColor: preset.textColor, opacity: 0.4 }} />
                        <div className="h-1 rounded-sm w-3/5" style={{ backgroundColor: preset.textColor, opacity: 0.25 }} />
                      </div>
                    )}
                    {preset.layoutType === 'bold-header' && (
                      <div className="flex flex-col gap-1">
                        <div className="h-4 rounded-sm w-full" style={{ backgroundColor: preset.accentColor, opacity: 0.5 }} />
                        <div className="h-1 rounded-sm w-3/4" style={{ backgroundColor: preset.textColor, opacity: 0.3 }} />
                        <div className="h-5 rounded-md mt-0.5" style={{ backgroundColor: preset.textColor, opacity: 0.12 }} />
                      </div>
                    )}
                    {preset.layoutType === 'editorial-grid' && (
                      <div className="grid grid-cols-3 gap-1 h-12">
                        <div className="col-span-2 flex flex-col gap-0.5 justify-center">
                          <div className="h-1.5 rounded-sm w-full" style={{ backgroundColor: preset.textColor, opacity: 0.6 }} />
                          <div className="h-1 rounded-sm w-3/4" style={{ backgroundColor: preset.textColor, opacity: 0.3 }} />
                          <div className="h-1 rounded-sm w-full" style={{ backgroundColor: preset.textColor, opacity: 0.2 }} />
                        </div>
                        <div className="rounded-md" style={{ backgroundColor: preset.accentColor, opacity: 0.35 }} />
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2 bg-background">
                    <p className="text-[10px] text-muted-foreground leading-tight">{preset.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colors */}
      {activeSection === 'colors' && (
        <div className="space-y-4">
          {/* Quick palettes */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Paletas prontas</p>
            <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
              {COLOR_PRESETS.map((p, i) => {
                const isActive = bgColor === p.bg && accentColor === p.accent && textColor === p.text;
                return (
                  <button
                    key={i}
                    onClick={() => applyColorPreset(p)}
                    className={`rounded-xl p-1.5 border transition-all ${
                      isActive ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex gap-0.5 mb-1">
                      <div className="h-5 flex-1 rounded-l-md" style={{ backgroundColor: p.bg }} />
                      <div className="h-5 flex-1" style={{ backgroundColor: p.accent }} />
                      <div className="h-5 flex-1 rounded-r-md" style={{ backgroundColor: p.text }} />
                    </div>
                    <p className="text-[9px] text-muted-foreground truncate text-center">{p.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom colors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Cor de fundo</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-9 h-9 rounded-lg border-0 cursor-pointer" />
                <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="rounded-xl flex-1 text-xs font-mono" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Cor destaque</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-9 h-9 rounded-lg border-0 cursor-pointer" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="rounded-xl flex-1 text-xs font-mono" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Cor do texto</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-9 h-9 rounded-lg border-0 cursor-pointer" />
                <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="rounded-xl flex-1 text-xs font-mono" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fonts */}
      {activeSection === 'fonts' && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Escolha a fonte</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visibleFonts.map((font, i) => (
              <button key={i} onClick={() => setSelectedFont(i)}
                className={`px-3 py-2.5 rounded-xl text-sm border transition-all text-left ${selectedFont === i ? 'ring-2 ring-primary border-primary bg-primary/5 font-bold' : 'border-border hover:bg-muted/50'}`}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </button>
            ))}
          </div>
          {FONT_OPTIONS.length > 12 && (
            <button
              onClick={() => setShowAllFonts(!showAllFonts)}
              className="flex items-center gap-1 mx-auto mt-3 text-xs text-primary font-semibold hover:underline"
            >
              {showAllFonts ? <><ChevronUp className="h-3 w-3" /> Mostrar menos</> : <><ChevronDown className="h-3 w-3" /> Ver mais {FONT_OPTIONS.length - 12} fontes</>}
            </button>
          )}
        </div>
      )}

      {/* Branding */}
      {activeSection === 'branding' && (
        <div className="space-y-4">
          {setShowHeader && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showHeader}
                onChange={(e) => setShowHeader(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-xs font-medium text-foreground">Exibir cabeçalho (marca, @ e data) nos cards</span>
            </label>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Marca</label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="rounded-xl text-xs" disabled={!showHeader} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">@ Instagram</label>
              <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="seuuser" className="rounded-xl text-xs" disabled={!showHeader} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Data</label>
              <Input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} className="rounded-xl text-xs" disabled={!showHeader} />
            </div>
          </div>
        </div>
      )}

      {/* Preview mini */}
      <div className="flex gap-3 items-center p-4 rounded-2xl" style={{ backgroundColor: bgColor }}>
        <div className="flex-1">
          <p style={{ fontFamily: FONT_OPTIONS[selectedFont]?.value, color: textColor, fontSize: 18, fontWeight: 700 }}>
            Preview do <span style={{ color: accentColor }}>estilo</span>
          </p>
          <p style={{ color: textColor, opacity: 0.6, fontSize: 11 }}>{brandName} · @{userName || 'usuario'}</p>
        </div>
      </div>
    </div>
  );
};

export { FONT_OPTIONS };
export default StepStyle;
