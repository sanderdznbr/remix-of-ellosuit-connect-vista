import React, { useRef, useState } from 'react';
import { Upload, X, Settings2, Sun, Moon, Palette } from 'lucide-react';
import { LogoPosition } from './StepStyle';
import LogoPositionPicker from './LogoPositionPicker';
import { WizardAccentTheme, getThemeClasses } from './wizardTheme';
import { Switch } from '@/components/ui/switch';

interface Props {
  showHeader: boolean;
  setShowHeader: (v: boolean) => void;
  logoUrl: string | null;
  setLogoUrl: (v: string | null) => void;
  logoDarkUrl?: string | null;
  setLogoDarkUrl?: (v: string | null) => void;
  logoPosition: LogoPosition;
  setLogoPosition: (v: LogoPosition) => void;
  logoBrandColors?: string[];
  useBrandColors?: boolean;
  setUseBrandColors?: (v: boolean) => void;
  brandName?: string;
  setBrandName?: (v: string) => void;
  userName?: string;
  setUserName?: (v: string) => void;
  dateLabel?: string;
  setDateLabel?: (v: string) => void;
  isExtreme?: boolean;
  accentTheme?: WizardAccentTheme;
}

const StepBranding: React.FC<Props> = ({
  showHeader, setShowHeader, logoUrl, setLogoUrl, logoDarkUrl, setLogoDarkUrl,
  logoPosition, setLogoPosition,
  logoBrandColors = [], useBrandColors = true, setUseBrandColors,
  brandName, setBrandName, userName, setUserName, dateLabel, setDateLabel,
  isExtreme = false,
  accentTheme,
}) => {
  const theme = accentTheme || (isExtreme ? 'orange' : 'purple');
  const t = getThemeClasses(theme);
  const logoLightInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasAnyLogo = !!logoUrl || !!logoDarkUrl;

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sua logomarca</h2>
          <p className="text-sm text-white/40">
            Envie duas versões da logo — a IA escolhe automaticamente a melhor para cada fundo.
          </p>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`p-2.5 rounded-xl transition-all cursor-pointer ${showAdvanced ? `${t.bgLight} ${t.text}` : 'bg-white/[0.04] text-white/30 hover:text-white/50 hover:bg-white/[0.08]'}`}
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
              className={`w-4 h-4 rounded border-white/20 bg-white/[0.04] ${t.accent}`} />
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

      {/* Dual logo upload */}
      <div className="grid grid-cols-2 gap-3">
        {/* Light logo (for dark backgrounds) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Moon className="h-3.5 w-3.5 text-white/30" />
            <p className="text-xs font-medium text-white/40">Para fundo escuro</p>
          </div>
          {logoUrl ? (
            <div className="flex flex-col items-center gap-3 py-5 rounded-xl bg-[#111]/80 border border-white/[0.08]">
              <div className="w-20 h-20 rounded-lg bg-[#0a0a0a] border border-white/[0.08] flex items-center justify-center overflow-hidden p-2">
                <img src={logoUrl} alt="Logo clara" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => logoLightInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] transition-all">
                  Trocar
                </button>
                <button onClick={() => setLogoUrl(null)}
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => logoLightInputRef.current?.click()}
              className={`w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed ${t.borderSubtle} ${t.bgFaint} hover:bg-opacity-[0.06] text-white/40 hover:text-white/60 transition-all cursor-pointer`}>
              <Upload className="h-5 w-5" />
              <div className="text-center">
                <span className="text-xs font-semibold block">Logo clara</span>
                <span className="text-[10px] text-white/20 mt-0.5 block">Branca / cores claras</span>
              </div>
            </button>
          )}
          <input ref={logoLightInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setLogoUrl(URL.createObjectURL(file));
              setShowHeader(false);
            }
            e.target.value = '';
          }} />
        </div>

        {/* Dark logo (for light backgrounds) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-white/30" />
            <p className="text-xs font-medium text-white/40">Para fundo claro</p>
          </div>
          {logoDarkUrl && setLogoDarkUrl ? (
            <div className="flex flex-col items-center gap-3 py-5 rounded-xl bg-white/[0.7] border border-white/[0.15]">
              <div className="w-20 h-20 rounded-lg bg-white border border-black/10 flex items-center justify-center overflow-hidden p-2">
                <img src={logoDarkUrl} alt="Logo escura" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => logoDarkInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-black/40 hover:text-black/60 bg-black/[0.06] hover:bg-black/10 transition-all">
                  Trocar
                </button>
                <button onClick={() => setLogoDarkUrl(null)}
                  className="p-1.5 rounded-lg bg-black/[0.06] hover:bg-red-500/20 text-black/30 hover:text-red-400 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => logoDarkInputRef.current?.click()}
              className={`w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed ${t.borderSubtle} ${t.bgFaint} hover:bg-opacity-[0.06] text-white/40 hover:text-white/60 transition-all cursor-pointer`}>
              <Upload className="h-5 w-5" />
              <div className="text-center">
                <span className="text-xs font-semibold block">Logo escura</span>
                <span className="text-[10px] text-white/20 mt-0.5 block">Preta / cores escuras</span>
              </div>
            </button>
          )}
          {setLogoDarkUrl && (
            <input ref={logoDarkInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setLogoDarkUrl(URL.createObjectURL(file));
              }
              e.target.value = '';
            }} />
          )}
        </div>
      </div>

      {/* Hint */}
      {!hasAnyLogo && (
        <p className="text-[10px] text-white/20 text-center">
          💡 Envie ao menos uma versão. O ideal é ter as duas para contraste perfeito.
        </p>
      )}

      {/* Logo position picker */}
      {hasAnyLogo && (
        <LogoPositionPicker logoPosition={logoPosition} setLogoPosition={setLogoPosition} />
      )}

      {/* Brand colors toggle + preview */}
      {hasAnyLogo && logoBrandColors.length > 0 && setUseBrandColors && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <Palette className={`h-4 w-4 ${useBrandColors ? t.text : 'text-white/30'}`} />
              <div>
                <p className="text-xs font-medium text-white/70">Usar cores da marca no post</p>
                <p className="text-[10px] text-white/30">
                  {useBrandColors ? 'As cores extraídas da logo serão aplicadas' : 'Serão usadas as cores do estilo escolhido'}
                </p>
              </div>
            </div>
            <Switch
              checked={useBrandColors}
              onCheckedChange={setUseBrandColors}
              className={useBrandColors ? `data-[state=checked]:bg-${theme === 'orange' ? 'orange' : theme === 'red' ? 'red' : 'purple'}-500` : ''}
            />
          </div>
          {useBrandColors && (
            <div>
              <p className="text-[10px] text-white/30 mb-1.5">Cores extraídas da logo</p>
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
      )}
    </div>
  );
};

export default StepBranding;
