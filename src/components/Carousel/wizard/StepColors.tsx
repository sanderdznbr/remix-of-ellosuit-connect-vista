import React from 'react';
import { Input } from '@/components/ui/input';

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

interface Props {
  bgColor: string;
  setBgColor: (v: string) => void;
  accentColor: string;
  setAccentColor: (v: string) => void;
  textColor: string;
  setTextColor: (v: string) => void;
}

const StepColors: React.FC<Props> = ({ bgColor, setBgColor, accentColor, setAccentColor, textColor, setTextColor }) => {
  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Escolha as cores</h2>
        <p className="text-sm text-white/40">Selecione uma paleta ou personalize.</p>
      </div>

      <div>
        <p className="text-xs font-medium text-white/40 mb-3">Paletas prontas</p>
        <div className="grid grid-cols-4 gap-2">
          {COLOR_PRESETS.map((p, i) => {
            const isActive = bgColor === p.bg && accentColor === p.accent && textColor === p.text;
            return (
              <button key={i} onClick={() => { setBgColor(p.bg); setAccentColor(p.accent); setTextColor(p.text); }}
                className={`rounded-xl p-2 border transition-all ${
                  isActive ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-white/[0.06] hover:border-white/15'
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
  );
};

export default StepColors;
