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
  faceGender: 'male' | 'female' | 'auto';
  setFaceGender: (v: 'male' | 'female' | 'auto') => void;
  wearsGlasses: boolean;
  setWearsGlasses: (v: boolean) => void;
}

const GenderChip = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
      selected
        ? 'bg-white text-black'
        : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
    }`}>
    {children}
  </button>
);

const StepFaceRef: React.FC<Props> = ({
  referenceImages, setReferenceImages,
  faceGender, setFaceGender,
  wearsGlasses, setWearsGlasses,
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
  const hasFaces = faceRefs.length > 0;

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">O post deve ter algum rosto?</h2>
        <p className="text-sm text-white/40">Anexe fotos de quem deve aparecer no post.</p>
        <p className="text-xs text-amber-400/70 mt-1">⚡ Até 3 fotos serão usadas pela IA. Envie ângulos diferentes para melhor resultado.</p>
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

      {/* Face attributes — shown only when faces are uploaded */}
      {hasFaces && (
        <div className="space-y-5 pt-2 border-t border-white/[0.06]">
          {/* Gender */}
          <div>
            <label className="text-sm font-medium text-white/80 mb-2.5 block">Gênero da pessoa</label>
            <div className="flex gap-2">
              <GenderChip selected={faceGender === 'auto'} onClick={() => setFaceGender('auto')}>🤖 Detectar auto</GenderChip>
              <GenderChip selected={faceGender === 'male'} onClick={() => setFaceGender('male')}>👨 Masculino</GenderChip>
              <GenderChip selected={faceGender === 'female'} onClick={() => setFaceGender('female')}>👩 Feminino</GenderChip>
            </div>
          </div>

          {/* Glasses */}
          <div>
            <label className="text-sm font-medium text-white/80 mb-2.5 block">Usa óculos?</label>
            <div className="flex gap-2">
              <GenderChip selected={!wearsGlasses} onClick={() => setWearsGlasses(false)}>Não</GenderChip>
              <GenderChip selected={wearsGlasses} onClick={() => setWearsGlasses(true)}>🤓 Sim, usa óculos</GenderChip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepFaceRef;
