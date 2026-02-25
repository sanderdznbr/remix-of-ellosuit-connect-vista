import React, { useState } from 'react';
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

interface Props {
  selectedFont: number;
  setSelectedFont: (v: number) => void;
}

const StepFonts: React.FC<Props> = ({ selectedFont, setSelectedFont }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? FONT_OPTIONS : FONT_OPTIONS.slice(0, 12);

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Escolha a fonte</h2>
        <p className="text-sm text-white/40">Selecione a tipografia do seu carrossel.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {visible.map((font, i) => (
          <button key={i} onClick={() => setSelectedFont(i)}
            className={`px-4 py-3 rounded-xl text-sm text-left transition-all border ${
              selectedFont === i
                ? 'bg-white/[0.08] border-purple-500 ring-1 ring-purple-500/50 text-white font-bold'
                : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.05]'
            }`}>
            <span style={{ fontFamily: font.value }}>{font.label}</span>
          </button>
        ))}
      </div>
      {FONT_OPTIONS.length > 12 && (
        <button onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 mx-auto text-xs text-white/30 hover:text-white/50 transition-colors">
          {showAll ? <><ChevronUp className="h-3 w-3" /> Menos</> : <><ChevronDown className="h-3 w-3" /> +{FONT_OPTIONS.length - 12} fontes</>}
        </button>
      )}
    </div>
  );
};

export default StepFonts;
