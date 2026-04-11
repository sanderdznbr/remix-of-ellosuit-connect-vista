import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2, ImageIcon, Globe, Upload, X, ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ReferenceImage } from './types';
import { WizardAccentTheme, getThemeClasses } from './wizardTheme';

interface Props {
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  webImages?: string[];
  onSkip?: () => void;
  accentTheme?: WizardAccentTheme;
  maxSelections?: number;
}

type ViewMode = 'question' | 'web-gallery' | 'manual-upload';

const StepWebImages: React.FC<Props> = ({ referenceImages, setReferenceImages, webImages, onSkip, accentTheme = 'purple', maxSelections }) => {
  const t = getThemeClasses(accentTheme);
  const [viewMode, setViewMode] = useState<ViewMode>('question');
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [searchingReferences, setSearchingReferences] = useState(false);
  const [refSearchResults, setRefSearchResults] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const webImageCount = (webImages || []).filter(url => typeof url === 'string' && url.length > 0).length;

  const searchWebReferences = async (query: string) => {
    if (!query.trim()) return;
    setSearchingReferences(true);
    setRefSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'web-search', query: query.trim() },
      });
      if (error) throw error;
      if (data?.images) setRefSearchResults(data.images);
    } catch { /* silent */ }
    finally { setSearchingReferences(false); }
  };

  const allImages = [
    ...(webImages || []).filter(url => typeof url === 'string' && url.length > 0).map((url, i) => ({ url, thumb: url, label: `Web ${i + 1}`, isWeb: true })),
    ...refSearchResults.filter((img: any) => img?.url).map((img: any) => ({ url: img.url, thumb: img.thumb || img.url, label: img.alt || 'Web', isWeb: false })),
  ];

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArr.length === 0) return;
    setUploading(true);
    try {
      for (const file of fileArr) {
        const url = URL.createObjectURL(file);
        setReferenceImages(prev => [...prev, {
          url, thumb: url, label: file.name, source: 'upload' as const, category: 'general' as const,
        }]);
      }
    } finally {
      setUploading(false);
    }
  }, [setReferenceImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const uploadedImages = referenceImages.filter(r => r.source === 'upload' && r.category === 'general');
  const selectedWebImages = referenceImages.filter(r => r.source === 'web' && r.category === 'general');

  // ─── Question screen ───
  if (viewMode === 'question') {
    return (
      <div className="space-y-5" style={{ minHeight: '300px' }}>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Fotos para o post</h2>
          <p className="text-sm text-white/40">Escolha como deseja adicionar imagens ao seu conteúdo.</p>
        </div>

        <div className="space-y-3">
          {/* Option 1: Web images */}
          {webImageCount > 0 && (
            <button
              onClick={() => setViewMode('web-gallery')}
              className="w-full group flex items-center gap-4 p-4 rounded-xl text-left transition-all bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15]"
            >
              <div className={`w-11 h-11 rounded-xl ${t.bg} flex items-center justify-center shrink-0`}>
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/90">Ver imagens encontradas na web</p>
                <p className="text-xs text-white/35 mt-0.5">
                  Encontramos <span className="text-white/60 font-medium">{webImageCount}</span> imagens relacionadas ao assunto
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
            </button>
          )}

          {/* Option 2: Manual upload */}
          <button
            onClick={() => setViewMode('manual-upload')}
            className="w-full group flex items-center gap-4 p-4 rounded-xl text-left transition-all bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15]"
          >
            <div className="w-11 h-11 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/90">Enviar fotos manualmente</p>
              <p className="text-xs text-white/35 mt-0.5">
                Suba suas próprias fotos sobre o assunto
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
          </button>
        </div>

        {/* Skip */}
        <button onClick={() => {
          setReferenceImages(prev => prev.filter(r => r.category !== 'general'));
          onSkip?.();
        }}
          className="w-full py-3 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors">
          Pular esta etapa
        </button>
      </div>
    );
  }

  // ─── Manual upload screen ───
  if (viewMode === 'manual-upload') {
    return (
      <div className="space-y-5" style={{ minHeight: '300px' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode('question')} className="text-white/30 hover:text-white/60 transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Enviar fotos</h2>
            <p className="text-xs text-white/35">Arraste ou clique para enviar imagens do assunto</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          className={`relative rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center py-10 px-4 cursor-pointer ${
            isDragging
              ? `border-white/30 bg-white/[0.06]`
              : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]'
          }`}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files) handleFiles(files);
            };
            input.click();
          }}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-white/15 mb-3" />
              <p className="text-sm text-white/40 text-center">
                Arraste imagens aqui ou <span className="text-white/70 underline">clique para selecionar</span>
              </p>
            </>
          )}
        </div>

        {/* Uploaded images preview */}
        {uploadedImages.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-white/30">{uploadedImages.length} imagem(ns) enviada(s)</p>
            <div className="grid grid-cols-4 gap-2">
              {uploadedImages.map((img, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden aspect-square ring-1 ring-white/[0.08]">
                  <img src={img.thumb} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReferenceImages(prev => prev.filter(r => r.url !== img.url));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white/70" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Also view web images */}
        {webImageCount > 0 && (
          <button onClick={() => setViewMode('web-gallery')}
            className="w-full py-2.5 rounded-xl text-xs text-white/40 hover:text-white/60 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all">
            Também ver {webImageCount} imagens da web
          </button>
        )}
      </div>
    );
  }

  // ─── Web gallery screen ───
  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => setViewMode('question')} className="text-white/30 hover:text-white/60 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Imagens da web</h2>
          <p className="text-xs text-white/35">Clique para selecionar as que deseja usar</p>
        </div>
      </div>

      {allImages.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {allImages.map((img, i) => {
            const alreadyAdded = referenceImages.some(r => r.url === img.url);
            const currentCount = referenceImages.filter(r => r.category === 'general').length;
            const isAtLimit = !!maxSelections && !alreadyAdded && currentCount >= maxSelections;
            return (
              <div key={i} className={`relative group ${isAtLimit ? 'opacity-30 cursor-not-allowed' : ''}`}>
                <button onClick={() => {
                  try {
                    if (alreadyAdded) {
                      setReferenceImages(prev => prev.filter(r => r.url !== img.url));
                    } else if (!isAtLimit) {
                      setReferenceImages(prev => [...prev, {
                        url: img.url, thumb: img.thumb, label: img.label, source: 'web', category: 'general',
                      }]);
                    }
                  } catch (err) {
                    console.error('Error selecting image:', err);
                  }
                }}
                  disabled={isAtLimit}
                  className={`w-full rounded-lg overflow-hidden aspect-video transition-all ${
                    alreadyAdded
                      ? `ring-2 ${t.ringFull} ${t.shadowStrong}`
                      : 'ring-1 ring-white/[0.06] hover:ring-white/20'
                  }`}>
                  <img src={img.thumb || ''} alt="" className="w-full h-full object-cover"
                    onError={(e) => { try { (e.target as HTMLImageElement).style.display = 'none'; } catch {} }} />
                  {alreadyAdded && (
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full ${t.bg} flex items-center justify-center shadow-lg`}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center space-y-2">
          <ImageIcon className="h-8 w-8 text-white/10 mx-auto" />
          <p className="text-sm text-white/30">Nenhuma imagem encontrada</p>
        </div>
      )}

      {/* Manual search */}
      <div className="flex gap-2">
        <Input value={refSearchQuery} onChange={(e) => setRefSearchQuery(e.target.value)}
          placeholder="Buscar mais imagens..."
          className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg flex-1 text-sm h-10 focus:!border-white/20 focus:!ring-0"
          onKeyDown={(e) => e.key === 'Enter' && searchWebReferences(refSearchQuery)} />
        <button onClick={() => searchWebReferences(refSearchQuery)} disabled={searchingReferences || !refSearchQuery.trim()}
          className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/60 transition-all disabled:opacity-30">
          {searchingReferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {(selectedWebImages.length > 0 || uploadedImages.length > 0) && (
        <p className="text-xs text-white/30">
          {selectedWebImages.length + uploadedImages.length}{maxSelections ? `/${maxSelections}` : ''} imagens selecionadas
        </p>
      )}

      {/* Skip */}
      <button onClick={() => {
        setReferenceImages(prev => prev.filter(r => r.category !== 'general'));
        onSkip?.();
      }}
        className="w-full py-3.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white/80 border-2 border-white/[0.12] hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.08] transition-all">
        Pular — não gostei de nenhuma
      </button>
    </div>
  );
};

export default StepWebImages;
