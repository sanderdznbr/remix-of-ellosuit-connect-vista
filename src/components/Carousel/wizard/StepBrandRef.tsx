import React, { useState, useEffect } from 'react';
import { Upload, X, Check, Loader2 } from 'lucide-react';
import { ReferenceImage } from './types';
import { extractColorsFromImage, isMonochromeImage, buildPaletteFromColors } from '@/utils/extractColorsFromImage';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  brandAssets: { id: string; name: string; file_url: string; category: string }[];
  // Color suggestion callbacks
  onSuggestColors?: (palette: { bg: string; accent: string; text: string }) => void;
}

const StepBrandRef: React.FC<Props> = ({ referenceImages, setReferenceImages, brandAssets, onSuggestColors }) => {
  const styleRefs = referenceImages.filter(r => r.category === 'style');

  const [extracting, setExtracting] = useState(false);
  const [suggestedPalette, setSuggestedPalette] = useState<{ bg: string; accent: string; text: string } | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  // When a new style image is added, try to extract colors
  const latestStyleRef = styleRefs[styleRefs.length - 1];
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!latestStyleRef || latestStyleRef.url === lastAnalyzedUrl || dismissed) return;
    
    const analyze = async () => {
      setExtracting(true);
      setSuggestedPalette(null);
      setExtractedColors([]);
      try {
        const mono = await isMonochromeImage(latestStyleRef.url);
        if (mono) {
          // Black & white logo — skip suggestion
          setExtracting(false);
          setLastAnalyzedUrl(latestStyleRef.url);
          return;
        }
        const colors = await extractColorsFromImage(latestStyleRef.url, 5);
        setExtractedColors(colors);
        const palette = buildPaletteFromColors(colors);
        if (palette) setSuggestedPalette(palette);
        setLastAnalyzedUrl(latestStyleRef.url);
      } catch (err) {
        console.error('Color extraction error:', err);
      } finally {
        setExtracting(false);
      }
    };
    analyze();
  }, [latestStyleRef?.url, lastAnalyzedUrl, dismissed]);

  const acceptPalette = () => {
    if (suggestedPalette && onSuggestColors) {
      onSuggestColors(suggestedPalette);
    }
    setSuggestedPalette(null);
  };

  const rejectPalette = () => {
    setSuggestedPalette(null);
    setDismissed(true);
  };

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">O post tem relação com alguma marca?</h2>
        <p className="text-sm text-white/40">Anexe logos, prints ou referências visuais da marca.</p>
      </div>

      {/* Upload */}
      <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition-colors">
        <Upload className="h-6 w-6 text-white/20" />
        <span className="text-sm font-medium text-white/50">Subir referências de marca/estilo</span>
        <span className="text-xs text-white/20">Logos, prints, screenshots do produto</span>
        <input type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => {
            if (!e.target.files) return;
            setDismissed(false); // reset dismiss on new upload
            Array.from(e.target.files).forEach(file => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                if (ev.target?.result) {
                  setReferenceImages(prev => [...prev, {
                    url: ev.target!.result as string, thumb: ev.target!.result as string,
                    label: file.name, source: 'upload', category: 'style',
                  }]);
                }
              };
              reader.readAsDataURL(file);
            });
          }} />
      </label>

      {/* Extracting indicator */}
      {extracting && (
        <div className="flex items-center gap-2 text-white/40 text-xs py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analisando cores da marca...
        </div>
      )}

      {/* Color suggestion card */}
      <AnimatePresence>
        {suggestedPalette && !extracting && (
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
              <p className="text-sm font-semibold text-white">Estilo sugerido com base na marca</p>
            </div>

            {/* Extracted colors row */}
            {extractedColors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/30">Cores detectadas:</span>
                <div className="flex gap-1">
                  {extractedColors.map((c, i) => (
                    <div key={i} className="w-6 h-6 rounded-md ring-1 ring-white/10" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </div>
            )}

            {/* Palette preview */}
            <div className="flex gap-1 h-12 rounded-lg overflow-hidden ring-1 ring-white/10">
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: suggestedPalette.bg }}>
                <span className="text-[9px] font-mono" style={{ color: suggestedPalette.text }}>Fundo</span>
              </div>
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: suggestedPalette.accent }}>
                <span className="text-[9px] font-mono text-white mix-blend-difference">Destaque</span>
              </div>
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: suggestedPalette.bg }}>
                <span className="text-[9px] font-mono" style={{ color: suggestedPalette.text }}>Texto</span>
              </div>
            </div>

            {/* Accept / Reject */}
            <div className="flex gap-2">
              <button onClick={acceptPalette}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)' }}>
                <Check className="h-3.5 w-3.5" /> Usar essas cores
              </button>
              <button onClick={rejectPalette}
                className="px-4 py-2.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 border border-white/[0.06] hover:border-white/10 transition-all">
                Não, obrigado
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand assets library */}
      {brandAssets.length > 0 && (
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <span className="text-sm font-medium text-white/60">Biblioteca de Marca</span>
          <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto">
            {brandAssets.map(asset => {
              const added = referenceImages.some(r => r.url === asset.file_url);
              return (
                <button key={asset.id} onClick={() => {
                  setDismissed(false);
                  if (added) {
                    setReferenceImages(prev => prev.filter(r => r.url !== asset.file_url));
                  } else {
                    setReferenceImages(prev => [...prev, { url: asset.file_url, thumb: asset.file_url, label: asset.name, source: 'upload', category: 'style' }]);
                  }
                }}
                  className={`rounded-lg overflow-hidden aspect-square transition-all relative group ${
                    added ? 'ring-2 ring-purple-500/60' : 'ring-1 ring-white/[0.06] hover:ring-white/20'
                  }`}>
                  <img src={asset.file_url} alt={asset.name} className="w-full h-full object-cover" />
                  {added && (
                    <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {styleRefs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-white/40 mb-3">Referências ({styleRefs.length})</p>
          <div className="flex gap-2 flex-wrap">
            {styleRefs.map((ref, i) => {
              const globalIdx = referenceImages.indexOf(ref);
              return (
                <div key={i} className="relative group">
                  <div className="w-16 h-16 rounded-lg overflow-hidden ring-1 ring-white/10">
                    <img src={ref.thumb} alt={ref.label} className="w-full h-full object-cover" />
                  </div>
                  <button onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== globalIdx))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepBrandRef;
