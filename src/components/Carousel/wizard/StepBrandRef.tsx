import React from 'react';
import { Upload, X } from 'lucide-react';
import { ReferenceImage } from './types';

interface Props {
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  brandAssets: { id: string; name: string; file_url: string; category: string }[];
}

const StepBrandRef: React.FC<Props> = ({ referenceImages, setReferenceImages, brandAssets }) => {
  const styleRefs = referenceImages.filter(r => r.category === 'style');

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

      {/* Brand assets library */}
      {brandAssets.length > 0 && (
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <span className="text-sm font-medium text-white/60">Biblioteca de Marca</span>
          <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto">
            {brandAssets.map(asset => {
              const added = referenceImages.some(r => r.url === asset.file_url);
              return (
                <button key={asset.id} onClick={() => {
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
