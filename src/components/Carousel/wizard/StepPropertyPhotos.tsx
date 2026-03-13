import React, { useRef } from 'react';
import { Camera, Plus, X, Upload, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { autoSaveFilesToGallery } from '@/utils/autoSaveUpload';
import { PropertyData, createEmptyProperty, PhotoFocalPoint } from './StepProperty';

interface StepPropertyPhotosProps {
  properties: PropertyData[];
  setProperties: React.Dispatch<React.SetStateAction<PropertyData[]>>;
  realEstateMode: 'single' | 'multiple';
  cardCount?: number;
}

const StepPropertyPhotos: React.FC<StepPropertyPhotosProps> = ({ properties, setProperties, realEstateMode, cardCount }) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addPhotos = async (id: string, files: FileList) => {
    const newPhotos: { url: string; file: File }[] = [];
    for (const file of Array.from(files)) {
      try {
        const base64Url = await fileToBase64(file);
        newPhotos.push({ url: base64Url, file });
      } catch {
        // Fallback to blob URL if base64 conversion fails
        newPhotos.push({ url: URL.createObjectURL(file), file });
      }
    }
    setProperties(prev => prev.map(p =>
      p.id === id ? { ...p, photos: [...p.photos, ...newPhotos] } : p
    ));
  };

  const removePhoto = (propId: string, photoIdx: number) => {
    setProperties(prev => prev.map(p =>
      p.id === propId ? { ...p, photos: p.photos.filter((_, i) => i !== photoIdx) } : p
    ));
  };

  const setFocalPoint = (propId: string, photoIdx: number, fp: PhotoFocalPoint) => {
    setProperties(prev => prev.map(p =>
      p.id === propId ? { ...p, photos: p.photos.map((ph, i) => i === photoIdx ? { ...ph, focalPoint: fp } : ph) } : p
    ));
  };

  const addProperty = () => {
    if (properties.length >= 10) return;
    setProperties(prev => [...prev, createEmptyProperty()]);
  };

  const removeProperty = (id: string) => {
    if (properties.length <= 1) return;
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  const totalPhotos = properties.reduce((sum, p) => sum + p.photos.length, 0);
  const requiredPhotos = realEstateMode === 'single' ? (cardCount || 5) : properties.length;

  const renderPropertyPhotos = (prop: PropertyData, index: number) => (
    <div key={prop.id} className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03]">
      {realEstateMode === 'multiple' && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-white/60">Imóvel {index + 1}</span>
          {properties.length > 1 && (
            <button onClick={() => removeProperty(prop.id)}
              className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {prop.photos.map((photo, pi) => (
          <div key={pi} className="relative w-36 h-44 rounded-xl overflow-hidden border border-white/10 group">
            <img src={photo.url} alt="" className="w-full h-full object-cover"
              style={{ objectPosition: photo.focalPoint === 'top' ? 'center top' : photo.focalPoint === 'bottom' ? 'center bottom' : 'center center' }} />
            <button onClick={() => removePhoto(prop.id, pi)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <X className="w-3 h-3" />
            </button>
            {/* Focal point picker - always visible */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 flex flex-col items-center gap-0.5 py-1.5">
              <span className="text-[8px] text-white/50 uppercase tracking-wider">Ponto focal</span>
              <div className="flex items-center gap-1">
                {(['top', 'center', 'bottom'] as PhotoFocalPoint[]).map(fp => (
                  <button key={fp} onClick={() => setFocalPoint(prop.id, pi, fp)}
                    className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-all ${(photo.focalPoint || 'center') === fp ? 'bg-purple-500/60 text-white ring-1 ring-purple-400/50' : 'text-white/40 hover:text-white/70 hover:bg-white/10'}`}
                    title={fp === 'top' ? 'Foco no topo' : fp === 'bottom' ? 'Foco na base' : 'Foco no centro'}>
                    {fp === 'top' ? <ArrowUp className="w-3.5 h-3.5" /> : fp === 'bottom' ? <ArrowDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
            {realEstateMode === 'single' && (
              <div className="absolute top-0 left-0 right-0 bg-black/60 text-center py-0.5">
                <span className="text-[9px] text-white/70">Card {pi + 1}</span>
              </div>
            )}
          </div>
        ))}
        <label className="flex items-center justify-center w-36 h-44 rounded-xl border-2 border-dashed border-white/10 cursor-pointer hover:border-white/25 transition-colors">
          <div className="text-center">
            <Upload className="w-5 h-5 text-white/25 mx-auto mb-1" />
            <span className="text-[10px] text-white/25">Adicionar</span>
          </div>
          <input
            type="file" accept="image/*" multiple className="hidden"
            ref={el => { fileInputRefs.current[prop.id] = el; }}
            onChange={e => { if (e.target.files) addPhotos(prop.id, e.target.files); }}
          />
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Camera className="w-5 h-5 text-white/50" />
        <div>
          <h3 className="text-sm font-semibold text-white">
            {realEstateMode === 'single' ? 'Fotos do Imóvel' : 'Fotos dos Imóveis'}
          </h3>
          <p className="text-[10px] text-white/30">
            {realEstateMode === 'single'
              ? `Adicione ${cardCount || 'várias'} fotos — cada foto será usada em 1 card`
              : 'Adicione pelo menos 1 foto para cada imóvel'}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/40">Progresso</span>
            <span className={`text-[10px] font-medium ${totalPhotos >= requiredPhotos ? 'text-green-400' : 'text-white/50'}`}>
              {totalPhotos}/{requiredPhotos} fotos
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (totalPhotos / requiredPhotos) * 100)}%`,
                backgroundColor: totalPhotos >= requiredPhotos ? '#4ade80' : 'rgba(255,255,255,0.3)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
        {properties.map((prop, i) => renderPropertyPhotos(prop, i))}
      </div>

      {realEstateMode === 'multiple' && properties.length < 10 && (
        <button onClick={addProperty}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-white/10 text-xs text-white/30 hover:border-white/20 hover:text-white/50 cursor-pointer transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar Imóvel ({properties.length}/10)
        </button>
      )}
    </div>
  );
};

export default StepPropertyPhotos;
