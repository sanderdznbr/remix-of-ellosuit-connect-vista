import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractColorsFromImage, buildPaletteFromColors } from '@/utils/extractColorsFromImage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  brandSuggestedPalette?: { bg: string; accent: string; text: string } | null;
  onAcceptBrandPalette?: () => void;
  onDismissBrandPalette?: () => void;
  wizardMode?: string;
  setLogoUrl?: (v: string) => void;
}

const StepColors: React.FC<Props> = ({
  bgColor, setBgColor, accentColor, setAccentColor, textColor, setTextColor,
  brandSuggestedPalette, onAcceptBrandPalette, onDismissBrandPalette,
  wizardMode, setLogoUrl,
}) => {
  const { user } = useAuth();
  const [extracting, setExtracting] = useState(false);
  const [extractedPalette, setExtractedPalette] = useState<{ bg: string; accent: string; text: string } | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [uploadedLogoPreview, setUploadedLogoPreview] = useState('');

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    setExtracting(true);
    try {
      // Upload to storage
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/logos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('brand-assets').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      setUploadedLogoPreview(publicUrl);
      if (setLogoUrl) setLogoUrl(publicUrl);

      // Extract colors
      const colors = await extractColorsFromImage(publicUrl, 5);
      setExtractedColors(colors);
      const palette = buildPaletteFromColors(colors);
      if (palette) {
        setExtractedPalette(palette);
      }
    } catch (err) {
      console.error('Logo upload/extract error:', err);
    } finally {
      setExtracting(false);
    }
  };

  const applyExtractedPalette = () => {
    if (extractedPalette) {
      setBgColor(extractedPalette.bg);
      setAccentColor(extractedPalette.accent);
      setTextColor(extractedPalette.text);
      setExtractedPalette(null);
    }
  };

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Escolha as cores</h2>
        <p className="text-sm text-white/40">Selecione uma paleta, personalize ou extraia da sua logo.</p>
      </div>

      {/* Logo upload to extract colors — animated mode */}
      {wizardMode === 'animated' && (
        <div className="rounded-xl border border-violet-500/20 p-4 space-y-3" style={{ background: 'rgba(139,92,246,0.04)' }}>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">Extrair cores da logomarca</span>
          </div>
          <p className="text-[11px] text-white/30">Envie sua logo e extraímos as cores automaticamente.</p>

          {uploadedLogoPreview ? (
            <div className="flex items-center gap-3">
              <img src={uploadedLogoPreview} alt="Logo" className="w-14 h-14 rounded-lg object-contain border border-white/10 bg-white/5 p-1" />
              <div className="flex-1">
                {extractedColors.length > 0 && (
                  <div className="flex gap-1 mb-2">
                    {extractedColors.map((c, i) => (
                      <button key={i} onClick={() => setAccentColor(c)} title={c}
                        className="w-7 h-7 rounded-md border border-white/10 hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                )}
                <button onClick={() => { setUploadedLogoPreview(''); setExtractedPalette(null); setExtractedColors([]); }}
                  className="text-[10px] text-white/30 hover:text-white/50 transition-colors cursor-pointer">
                  Trocar logo
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-20 rounded-lg border-2 border-dashed border-violet-500/20 hover:border-violet-500/40 cursor-pointer transition-all bg-white/[0.02] hover:bg-violet-500/[0.03]">
              {extracting ? (
                <><Loader2 className="h-5 w-5 text-violet-400 animate-spin mb-1" /><span className="text-[10px] text-white/30">Extraindo cores...</span></>
              ) : (
                <><Upload className="h-5 w-5 text-white/20 mb-1" /><span className="text-[10px] text-white/30">Enviar logomarca</span></>
              )}
              <input type="file" accept="image/*" className="hidden" disabled={extracting} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }} />
            </label>
          )}
        </div>
      )}

      {/* Extracted palette suggestion */}
      <AnimatePresence>
        {extractedPalette && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl p-5 space-y-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.04) 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <p className="text-sm font-semibold text-white">Cores extraídas da sua logo</p>
            </div>
            <div className="flex gap-0.5 h-12 rounded-lg overflow-hidden ring-1 ring-white/10">
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: extractedPalette.bg }}>
                <span className="text-[9px] font-mono" style={{ color: extractedPalette.text }}>Fundo</span>
              </div>
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: extractedPalette.accent }}>
                <span className="text-[9px] font-mono text-white mix-blend-difference">Destaque</span>
              </div>
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: extractedPalette.bg }}>
                <span className="text-[9px] font-mono" style={{ color: extractedPalette.text }}>Texto</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={applyExtractedPalette}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)' }}>
                <Check className="h-3.5 w-3.5" /> Usar essas cores
              </button>
              <button onClick={() => setExtractedPalette(null)}
                className="px-4 py-2.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 border border-white/[0.06] hover:border-white/10 transition-all cursor-pointer">
                Não usar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand color suggestion */}
      <AnimatePresence>
        {brandSuggestedPalette && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl p-5 space-y-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.04) 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <p className="text-sm font-semibold text-white">Cores detectadas na sua marca</p>
            </div>
            <div className="flex gap-0.5 h-12 rounded-lg overflow-hidden ring-1 ring-white/10">
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: brandSuggestedPalette.bg }}>
                <span className="text-[9px] font-mono" style={{ color: brandSuggestedPalette.text }}>Fundo</span>
              </div>
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: brandSuggestedPalette.accent }}>
                <span className="text-[9px] font-mono text-white mix-blend-difference">Destaque</span>
              </div>
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: brandSuggestedPalette.bg }}>
                <span className="text-[9px] font-mono" style={{ color: brandSuggestedPalette.text }}>Texto</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onAcceptBrandPalette}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)' }}>
                <Check className="h-3.5 w-3.5" /> Usar essas cores
              </button>
              <button onClick={onDismissBrandPalette}
                className="px-4 py-2.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 border border-white/[0.06] hover:border-white/10 transition-all">
                Não, obrigado
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
