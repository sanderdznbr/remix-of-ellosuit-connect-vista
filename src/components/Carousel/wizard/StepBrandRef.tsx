import React, { useState, useEffect } from 'react';
import { Upload, X, Loader2, Folder } from 'lucide-react';
import { ReferenceImage } from './types';
import { extractColorsFromImage, isMonochromeImage, buildPaletteFromColors } from '@/utils/extractColorsFromImage';
import GalleryPicker from './GalleryPicker';

interface Props {
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  brandAssets: { id: string; name: string; file_url: string; category: string }[];
  onSuggestColors?: (palette: { bg: string; accent: string; text: string }) => void;
}

const StepBrandRef: React.FC<Props> = ({ referenceImages, setReferenceImages, brandAssets, onSuggestColors }) => {
  const styleRefs = referenceImages.filter(r => r.category === 'style');
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [extracting, setExtracting] = useState(false);
  const latestStyleRef = styleRefs[styleRefs.length - 1];
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!latestStyleRef || latestStyleRef.url === lastAnalyzedUrl) return;
    const analyze = async () => {
      setExtracting(true);
      try {
        const mono = await isMonochromeImage(latestStyleRef.url);
        if (mono) { setExtracting(false); setLastAnalyzedUrl(latestStyleRef.url); return; }
        const colors = await extractColorsFromImage(latestStyleRef.url, 5);
        const palette = buildPaletteFromColors(colors);
        if (palette && onSuggestColors) onSuggestColors(palette);
        setLastAnalyzedUrl(latestStyleRef.url);
      } catch (err) { console.error('Color extraction error:', err); }
      finally { setExtracting(false); }
    };
    analyze();
  }, [latestStyleRef?.url, lastAnalyzedUrl]);

  const handleGalleryFiles = (files: { url: string; name: string }[]) => {
    const newRefs: ReferenceImage[] = files.map(f => ({
      url: f.url, thumb: f.url, label: f.name, source: 'upload' as const, category: 'style' as const,
    }));
    setReferenceImages(prev => [...prev, ...newRefs]);
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

      {/* Gallery picker button */}
      <button onClick={() => setGalleryOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white/60 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all cursor-pointer">
        <Folder className="h-4 w-4" /> Importar da Galeria de Marca
      </button>

      <GalleryPicker open={galleryOpen} onClose={() => setGalleryOpen(false)} onSelectFiles={handleGalleryFiles} label="Selecionar pasta de marca" />

      {/* Extracting indicator */}
      {extracting && (
        <div className="flex items-center gap-2 text-white/40 text-xs py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analisando cores da marca...
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
