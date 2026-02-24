import React from 'react';
import { Input } from '@/components/ui/input';
import { Palette, Type } from 'lucide-react';
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
}

const StepStyle: React.FC<Props> = ({
  bgColor, setBgColor, accentColor, setAccentColor, textColor, setTextColor,
  selectedFont, setSelectedFont, brandName, setBrandName, userName, setUserName, dateLabel, setDateLabel,
}) => {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-semibold mb-3">
          <Palette className="h-4 w-4" /> Etapa 4 — Estilo & Branding
        </div>
        <p className="text-sm text-muted-foreground">Cores, fonte e identidade visual do carrossel</p>
      </div>

      {/* Font */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5" /> Fonte
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FONT_OPTIONS.map((font, i) => (
            <button key={i} onClick={() => setSelectedFont(i)}
              className={`px-3 py-2.5 rounded-xl text-sm border transition-all text-left ${selectedFont === i ? 'ring-2 ring-primary border-primary bg-primary/5 font-bold' : 'border-border hover:bg-muted/50'}`}>
              <span style={{ fontFamily: font.value }}>{font.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-3 gap-3">
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

      {/* Branding */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Marca</label>
          <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="rounded-xl text-xs" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">@ Instagram</label>
          <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="seuuser" className="rounded-xl text-xs" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Data</label>
          <Input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} className="rounded-xl text-xs" />
        </div>
      </div>

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

export default StepStyle;
