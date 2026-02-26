import React, { useState } from 'react';
import { Upload, X, Folder } from 'lucide-react';
import { ReferenceImage, FamousPerson } from './types';
import GalleryPicker from './GalleryPicker';

interface Props {
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  famousList: FamousPerson[];
  setFamousList: React.Dispatch<React.SetStateAction<FamousPerson[]>>;
  famousImages: { username: string; images: any[] }[];
  setFamousImages: React.Dispatch<React.SetStateAction<{ username: string; images: any[] }[]>>;
}

const StepFaceRef: React.FC<Props> = ({
  referenceImages, setReferenceImages,
}) => {
  const [galleryOpen, setGalleryOpen] = useState(false);

  const handleFaceUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setReferenceImages(prev => [...prev, {
            url: e.target!.result as string, thumb: e.target!.result as string,
            label: file.name, source: 'upload', category: 'face',
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGalleryFiles = (files: { url: string; name: string }[]) => {
    const newRefs: ReferenceImage[] = files.map(f => ({
      url: f.url, thumb: f.url, label: f.name, source: 'upload' as const, category: 'face' as const,
    }));
    setReferenceImages(prev => [...prev, ...newRefs]);
  };

  const faceRefs = referenceImages.filter(r => r.category === 'face');

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">O post deve ter algum rosto?</h2>
        <p className="text-sm text-white/40">Anexe fotos de quem deve aparecer no post.</p>
      </div>

      {/* Upload */}
      <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition-colors">
        <Upload className="h-6 w-6 text-white/20" />
        <span className="text-sm font-medium text-white/50">Subir fotos do rosto</span>
        <span className="text-xs text-white/20">JPG, PNG — múltiplas fotos para melhor resultado</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFaceUpload(e.target.files)} />
      </label>

      {/* Gallery picker button */}
      <button onClick={() => setGalleryOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white/60 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all cursor-pointer">
        <Folder className="h-4 w-4" /> Importar da Galeria de Marca
      </button>

      <GalleryPicker open={galleryOpen} onClose={() => setGalleryOpen(false)} onSelectFiles={handleGalleryFiles} label="Selecionar pasta de rostos" />

      {faceRefs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-white/40 mb-3">Fotos adicionadas ({faceRefs.length})</p>
          <div className="flex gap-2 flex-wrap">
            {faceRefs.map((ref, i) => {
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

export default StepFaceRef;
