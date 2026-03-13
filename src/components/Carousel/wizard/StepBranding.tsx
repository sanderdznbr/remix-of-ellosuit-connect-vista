import React, { useRef, useState } from 'react';
import { Upload, X, Settings2 } from 'lucide-react';
import { LogoPosition } from './StepStyle';
import LogoPositionPicker from './LogoPositionPicker';

interface Props {
  showHeader: boolean;
  setShowHeader: (v: boolean) => void;
  logoUrl: string | null;
  setLogoUrl: (v: string | null) => void;
  logoPosition: LogoPosition;
  setLogoPosition: (v: LogoPosition) => void;
  logoBrandColors?: string[];
  brandName?: string;
  setBrandName?: (v: string) => void;
  userName?: string;
  setUserName?: (v: string) => void;
  dateLabel?: string;
  setDateLabel?: (v: string) => void;
  isExtreme?: boolean;
}

const StepBranding: React.FC<Props> = ({
  showHeader, setShowHeader, logoUrl, setLogoUrl, logoPosition, setLogoPosition,
  logoBrandColors = [], brandName, setBrandName, userName, setUserName, dateLabel, setDateLabel,
  isExtreme = false,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sua logomarca</h2>
          <p className="text-sm text-white/40">Envie a logomarca que aparecerá nos cards.</p>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`p-2.5 rounded-xl transition-all cursor-pointer ${showAdvanced ? 'bg-purple-500/20 text-purple-400' : 'bg-white/[0.04] text-white/30 hover:text-white/50 hover:bg-white/[0.08]'}`}
          title="Configurações avançadas de cabeçalho"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {/* Advanced: header settings */}
      {showAdvanced && (
        <div className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-in fade-in duration-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-purple-500" />
            <span className="text-xs font-medium text-white/60">Exibir cabeçalho nos cards (marca, @, data)</span>
          </label>
          {showHeader && (
            <div className="space-y-2 pl-7">
              {setBrandName && (
                <input type="text" value={brandName || ''} onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Nome da marca" className="w-full bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder-white/20 text-xs px-3 py-2 rounded-lg outline-none focus:border-white/15" />
              )}
              {setUserName && (
                <input type="text" value={userName || ''} onChange={(e) => setUserName(e.target.value)}
                  placeholder="@ seu usuário" className="w-full bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder-white/20 text-xs px-3 py-2 rounded-lg outline-none focus:border-white/15" />
              )}
              {setDateLabel && (
                <input type="text" value={dateLabel || ''} onChange={(e) => setDateLabel(e.target.value)}
                  placeholder="Data (ex: 01 Mar 2026)" className="w-full bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder-white/20 text-xs px-3 py-2 rounded-lg outline-none focus:border-white/15" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Logo upload */}
      <div className="space-y-4">
        {logoUrl ? (
          <div className="flex flex-col items-center gap-4 py-6 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <div className="w-24 h-24 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden">
              <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => logoInputRef.current?.click()}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] transition-all">
                Trocar logo
              </button>
              <button onClick={() => setLogoUrl(null)}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => logoInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed border-purple-500/30 bg-purple-500/[0.04] hover:bg-purple-500/[0.08] text-white/50 hover:text-white/70 transition-all cursor-pointer">
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold block">Enviar logomarca</span>
              <span className="text-xs text-white/30 mt-1 block">PNG ou JPG com fundo transparente</span>
            </div>
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
      </div>

      {/* Logo position picker */}
      {logoUrl && (
        <LogoPositionPicker logoPosition={logoPosition} setLogoPosition={setLogoPosition} />
      )}

      {/* Brand colors extracted */}
      {logoUrl && logoBrandColors.length > 0 && (
        <div>
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
  );
};

export default StepBranding;
