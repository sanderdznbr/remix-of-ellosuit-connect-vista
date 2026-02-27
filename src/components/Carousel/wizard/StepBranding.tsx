import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Upload, X } from 'lucide-react';
import { LogoPosition } from './StepStyle';
import LogoPositionPicker from './LogoPositionPicker';

interface Props {
  brandName: string;
  setBrandName: (v: string) => void;
  userName: string;
  setUserName: (v: string) => void;
  dateLabel: string;
  setDateLabel: (v: string) => void;
  showHeader: boolean;
  setShowHeader: (v: boolean) => void;
  logoUrl: string | null;
  setLogoUrl: (v: string | null) => void;
  logoPosition: LogoPosition;
  setLogoPosition: (v: LogoPosition) => void;
  logoBrandColors?: string[];
}

const StepBranding: React.FC<Props> = ({
  brandName, setBrandName, userName, setUserName, dateLabel, setDateLabel,
  showHeader, setShowHeader, logoUrl, setLogoUrl, logoPosition, setLogoPosition,
  logoBrandColors = [],
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Sua marca</h2>
        <p className="text-sm text-white/40">Configure o cabeçalho e a logomarca do carrossel.</p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)}
          className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-purple-500" />
        <span className="text-xs font-medium text-white/60">Exibir cabeçalho nos cards</span>
      </label>

      {/* Logo */}
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
          if (file) {
            setLogoUrl(URL.createObjectURL(file));
            setShowHeader(false);
          }
          e.target.value = '';
        }} />
        {logoUrl && (
          <LogoPositionPicker logoPosition={logoPosition} setLogoPosition={setLogoPosition} />
        )}
        {logoUrl && logoBrandColors.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] text-white/30 mb-1.5">Cores extraídas da logo (usadas na geração IA)</p>
            <div className="flex gap-1.5">
              {logoBrandColors.map((color, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-md border border-white/10" style={{ backgroundColor: color }} />
                  <span className="text-[9px] text-white/20 font-mono">{color}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
  );
};

export default StepBranding;
