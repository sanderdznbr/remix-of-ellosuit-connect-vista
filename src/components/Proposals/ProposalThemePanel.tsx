
import { Palette, Type, Image as ImageIcon, RotateCcw, Upload, Loader2, FileText, PenLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showHeader: boolean;
  showFooter: boolean;
  logoUrl: string;
  headerText: string;
  footerText: string;
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
        <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5 block">Temas Prontos</label>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map(p => (
            <button key={p.name} type="button"
              onClick={() => set({ primaryColor: p.primary, secondaryColor: p.secondary, fontFamily: p.font })}
              className={`text-[10px] font-medium py-1.5 px-2 rounded-lg border transition-all ${theme.primaryColor === p.primary && theme.secondaryColor === p.secondary ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex gap-1 mb-0.5 justify-center">
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
        <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5 block flex items-center gap-1">
          <Palette className="h-3 w-3" /> Cores
        </label>
        <div className="space-y-2">
          <div>
            <span className="text-[9px] text-gray-500 mb-1 block">Cor Principal</span>
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set({ primaryColor: c })}
                  className={`w-6 h-6 rounded-md transition-all hover:scale-110 ${theme.primaryColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5 items-center">
              <div className="w-6 h-6 rounded-md border border-gray-200" style={{ background: theme.primaryColor }} />
              <Input value={theme.primaryColor} onChange={e => set({ primaryColor: e.target.value })} className="rounded-md h-7 text-[10px] flex-1 font-mono" />
            </div>
          </div>
          <div>
            <span className="text-[9px] text-gray-500 mb-1 block">Cor Secundária</span>
            <div className="flex gap-1.5 items-center">
              <div className="w-6 h-6 rounded-md border border-gray-200" style={{ background: theme.secondaryColor }} />
              <Input value={theme.secondaryColor} onChange={e => set({ secondaryColor: e.target.value })} className="rounded-md h-7 text-[10px] flex-1 font-mono" />
            </div>
          </div>
        </div>
      </div>

      {/* Font */}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5 block flex items-center gap-1">
          <Type className="h-3 w-3" /> Fonte
        </label>
        <div className="grid grid-cols-2 gap-1">
          {FONTS.map(f => (
            <button key={f.value} type="button" onClick={() => set({ fontFamily: f.value })}
              className={`text-[10px] py-1.5 rounded-md border transition-all ${theme.fontFamily === f.value ? 'border-gray-400 bg-gray-50 font-medium' : 'border-gray-200 hover:border-gray-300'}`}
              style={{ fontFamily: f.value }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header & Footer text */}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5 block flex items-center gap-1">
          <PenLine className="h-3 w-3" /> Textos
        </label>
        <div className="space-y-2">
          <div>
            <span className="text-[9px] text-gray-500 mb-0.5 block">Subtítulo do Cabeçalho</span>
            <Input value={theme.headerText || ''} onChange={e => set({ headerText: e.target.value })}
              placeholder="Proposta Comercial" className="rounded-md h-7 text-[10px]" />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 mb-0.5 block">Texto do Rodapé</span>
            <Input value={theme.footerText || ''} onChange={e => set({ footerText: e.target.value })}
              placeholder="Gerado por Ellosuit • Empresa" className="rounded-md h-7 text-[10px]" />
          </div>
        </div>
      </div>

      {/* Sections visibility */}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5 block flex items-center gap-1">
          <FileText className="h-3 w-3" /> Seções
        </label>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between bg-gray-50 rounded-md px-2.5 py-1.5">
            <span className="text-[11px] text-gray-700">Cabeçalho</span>
            <Switch checked={theme.showHeader} onCheckedChange={v => set({ showHeader: v })} />
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-md px-2.5 py-1.5">
            <span className="text-[11px] text-gray-700">Rodapé</span>
            <Switch checked={theme.showFooter} onCheckedChange={v => set({ showFooter: v })} />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5 block flex items-center gap-1">
          <ImageIcon className="h-3 w-3" /> Logo
        </label>
        {theme.logoUrl ? (
          <div className="rounded-lg border border-gray-200 p-2 bg-gray-50 flex items-center gap-2">
            <img src={theme.logoUrl} alt="Logo" className="h-8 w-auto object-contain rounded" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-gray-400 truncate">{theme.logoUrl.split('/').pop()}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="text-red-500 text-[10px] h-6 px-1.5 rounded-md"
              onClick={() => set({ logoUrl: '' })}>
              Remover
            </Button>
          </div>
        ) : (
          <button type="button" onClick={onUploadLogo}
            disabled={uploadingLogo}
            className="w-full flex items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed border-gray-200 text-[10px] text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors disabled:opacity-50">
            {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploadingLogo ? 'Enviando...' : 'Enviar logo'}
          </button>
        )}
        <div className="mt-1.5">
          <span className="text-[8px] text-gray-400">ou cole a URL:</span>
          <Input value={theme.logoUrl} onChange={e => set({ logoUrl: e.target.value })} placeholder="https://..." className="rounded-md h-6 text-[9px] mt-0.5" />
        </div>
      </div>

      {/* Reset */}
      <Button type="button" variant="ghost" size="sm" className="w-full rounded-md text-[10px] gap-1 text-gray-400 h-7"
        onClick={() => set({ primaryColor: '#3000E3', secondaryColor: '#007DE3', fontFamily: 'Inter, sans-serif', showHeader: true, showFooter: true, logoUrl: '', headerText: '', footerText: '' })}>
        <RotateCcw className="h-3 w-3" /> Restaurar padrão
      </Button>
    </div>
  );
}
