import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Upload, X } from 'lucide-react';
import { LogoPosition } from './StepStyle';

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
}

const StepBranding: React.FC<Props> = ({
  brandName, setBrandName, userName, setUserName, dateLabel, setDateLabel,
  showHeader, setShowHeader, logoUrl, setLogoUrl, logoPosition, setLogoPosition,
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
          if (file) setLogoUrl(URL.createObjectURL(file));
          e.target.value = '';
        }} />
        {logoUrl && (
          <div>
            <p className="text-[10px] font-medium text-white/30 mb-2">Posição</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { key: 'top-left' as LogoPosition, label: '↖ Superior Esq.' },
                { key: 'top-right' as LogoPosition, label: '↗ Superior Dir.' },
                { key: 'bottom-left' as LogoPosition, label: '↙ Inferior Esq.' },
                { key: 'bottom-right' as LogoPosition, label: '↘ Inferior Dir.' },
              ]).map(pos => (
                <button key={pos.key} onClick={() => setLogoPosition(pos.key)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                    logoPosition === pos.key
                      ? 'bg-white/[0.1] border-purple-500 text-white'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:bg-white/[0.05]'
                  }`}>
                  {pos.label}
                </button>
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
