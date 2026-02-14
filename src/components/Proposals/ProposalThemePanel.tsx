
import { Palette, Type, Image as ImageIcon, RotateCcw, Upload, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showHeader: boolean;
  showFooter: boolean;
  logoUrl: string;
}

interface Props {
  theme: ThemeSettings;
  onChange: (t: ThemeSettings) => void;
  onUploadLogo?: () => void;
  uploadingLogo?: boolean;
}

const PRESET_COLORS = [
  '#3000E3', '#007DE3', '#FF4500', '#16A34A', '#DC2626',
  '#D97706', '#7C3AED', '#0891B2', '#1F2937', '#EC4899',
  '#8B5CF6', '#059669',
];

const FONTS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
  { value: '"Courier New", monospace', label: 'Courier' },
  { value: 'system-ui, sans-serif', label: 'System' },
];

const PRESETS = [
  { name: 'Ellosuit', primary: '#3000E3', secondary: '#007DE3', font: 'Inter, sans-serif' },
  { name: 'Corporativo', primary: '#1F2937', secondary: '#6B7280', font: 'Georgia, serif' },
  { name: 'Moderno', primary: '#7C3AED', secondary: '#EC4899', font: 'Inter, sans-serif' },
  { name: 'Natural', primary: '#059669', secondary: '#16A34A', font: 'Georgia, serif' },
  { name: 'Energia', primary: '#FF4500', secondary: '#D97706', font: 'Helvetica, Arial, sans-serif' },
  { name: 'Oceano', primary: '#0891B2', secondary: '#007DE3', font: 'system-ui, sans-serif' },
];

export default function ProposalThemePanel({ theme, onChange, onUploadLogo, uploadingLogo }: Props) {
  const set = (partial: Partial<ThemeSettings>) => onChange({ ...theme, ...partial });

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Temas Prontos</label>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map(p => (
            <button key={p.name} type="button"
              onClick={() => set({ primaryColor: p.primary, secondaryColor: p.secondary, fontFamily: p.font })}
              className={`text-[10px] font-medium py-2 px-2 rounded-lg border transition-all ${theme.primaryColor === p.primary && theme.secondaryColor === p.secondary ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex gap-1 mb-1 justify-center">
                <div className="w-3 h-3 rounded-full" style={{ background: p.primary }} />
                <div className="w-3 h-3 rounded-full" style={{ background: p.secondary }} />
              </div>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block flex items-center gap-1.5">
          <Palette className="h-3 w-3" /> Cores
        </label>
        <div className="space-y-2.5">
          <div>
            <span className="text-[10px] text-gray-500 mb-1 block">Cor Principal</span>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set({ primaryColor: c })}
                  className={`w-7 h-7 rounded-lg transition-all hover:scale-110 ${theme.primaryColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="flex gap-2 mt-2 items-center">
              <div className="w-7 h-7 rounded-lg border border-gray-200" style={{ background: theme.primaryColor }} />
              <Input value={theme.primaryColor} onChange={e => set({ primaryColor: e.target.value })} className="rounded-lg h-8 text-xs flex-1 font-mono" />
            </div>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 mb-1 block">Cor Secundária</span>
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-lg border border-gray-200" style={{ background: theme.secondaryColor }} />
              <Input value={theme.secondaryColor} onChange={e => set({ secondaryColor: e.target.value })} className="rounded-lg h-8 text-xs flex-1 font-mono" />
            </div>
          </div>
        </div>
      </div>

      {/* Font */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block flex items-center gap-1.5">
          <Type className="h-3 w-3" /> Fonte
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {FONTS.map(f => (
            <button key={f.value} type="button" onClick={() => set({ fontFamily: f.value })}
              className={`text-xs py-2 rounded-lg border transition-all ${theme.fontFamily === f.value ? 'border-gray-400 bg-gray-50 font-medium' : 'border-gray-200 hover:border-gray-300'}`}
              style={{ fontFamily: f.value }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections visibility */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Seções</label>
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-700">Cabeçalho</span>
            <Switch checked={theme.showHeader} onCheckedChange={v => set({ showHeader: v })} />
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-700">Rodapé</span>
            <Switch checked={theme.showFooter} onCheckedChange={v => set({ showFooter: v })} />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block flex items-center gap-1.5">
          <ImageIcon className="h-3 w-3" /> Logo da Empresa
        </label>
        {theme.logoUrl ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50 flex items-center gap-3">
              <img src={theme.logoUrl} alt="Logo" className="h-10 w-auto object-contain rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 truncate">{theme.logoUrl.split('/').pop()}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-red-500 text-xs h-7 px-2 rounded-lg"
                onClick={() => set({ logoUrl: '' })}>
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={onUploadLogo}
            disabled={uploadingLogo}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors disabled:opacity-50">
            {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploadingLogo ? 'Enviando...' : 'Enviar logo da empresa'}
          </button>
        )}
        <div className="mt-2">
          <span className="text-[9px] text-gray-400">ou cole a URL:</span>
          <Input value={theme.logoUrl} onChange={e => set({ logoUrl: e.target.value })} placeholder="https://..." className="rounded-lg h-7 text-[10px] mt-1" />
        </div>
      </div>

      {/* Reset */}
      <Button type="button" variant="ghost" size="sm" className="w-full rounded-lg text-xs gap-1.5 text-gray-500"
        onClick={() => set({ primaryColor: '#3000E3', secondaryColor: '#007DE3', fontFamily: 'Inter, sans-serif', showHeader: true, showFooter: true, logoUrl: '' })}>
        <RotateCcw className="h-3 w-3" /> Restaurar padrão
      </Button>
    </div>
  );
}
