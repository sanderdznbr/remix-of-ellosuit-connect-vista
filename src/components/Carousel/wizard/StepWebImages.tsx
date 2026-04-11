import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2, ImageIcon, Globe, Upload, X, ChevronLeft, Check } from 'lucide-react';
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

  const validWebImages = (webImages || []).filter(url => typeof url === 'string' && url.length > 0);
  const webImageCount = validWebImages.length;

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
    ...validWebImages.map((url, i) => ({ url, thumb: url, label: `Web ${i + 1}`, isWeb: true })),
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

  // Preview thumbs for the question card (show first 4)
  const previewThumbs = validWebImages.slice(0, 4);

  // ─── Question screen ───
  if (viewMode === 'question') {
    return (
      <div className="space-y-6" style={{ minHeight: '300px' }}>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Fotos para o post</h2>
          <p className="text-[13px] text-white/30">Escolha como adicionar imagens ao conteúdo</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Web images */}
          <button
            onClick={() => webImageCount > 0 ? setViewMode('web-gallery') : undefined}
            disabled={webImageCount === 0}
            className={`group relative rounded-xl text-left transition-all overflow-hidden border ${
              webImageCount > 0
                ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/[0.15] cursor-pointer'
                : 'bg-white/[0.015] border-white/[0.04] opacity-40 cursor-not-allowed'
            }`}
          >
            {/* Image preview strip */}
            {webImageCount > 0 && (
              <div className="flex h-[100px] overflow-hidden">
                {previewThumbs.map((url, i) => (
                  <div key={i} className="flex-1 min-w-0 relative">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                ))}
                {webImageCount > 4 && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-white/70 font-medium">
                    +{webImageCount - 4}
                  </div>
                )}
              </div>
            )}
            {webImageCount === 0 && (
              <div className="h-[100px] flex items-center justify-center">
                <Globe className="w-8 h-8 text-white/10" />
              </div>
            )}
            <div className="p-3.5">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${webImageCount > 0 ? t.bg : 'bg-white/[0.06]'} flex items-center justify-center shrink-0`}>
                  <Globe className="w-4 h-4 text-white/80" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white/90 leading-tight">Imagens da web</p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {webImageCount > 0 ? `${webImageCount} encontradas` : 'Nenhuma encontrada'}
                  </p>
                </div>
              </div>
            </div>
          </button>

          {/* Card 2: Manual upload */}
          <button
            onClick={() => setViewMode('manual-upload')}
            className="group relative rounded-xl text-left transition-all overflow-hidden border bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/[0.15] cursor-pointer"
          >
            <div
              className="h-[100px] flex flex-col items-center justify-center gap-2 border-b border-white/[0.04]"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
            >
              {uploadedImages.length > 0 ? (
                <div className="flex h-full w-full overflow-hidden">
                  {uploadedImages.slice(0, 4).map((img, i) => (
                    <div key={i} className="flex-1 min-w-0 relative">
                      <img src={img.thumb} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <Upload className={`w-6 h-6 transition-colors ${isDragging ? 'text-white/40' : 'text-white/10'}`} />
                  <p className="text-[10px] text-white/20">Arraste ou clique</p>
                </>
              )}
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4 text-white/60" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white/90 leading-tight">Enviar fotos</p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {uploadedImages.length > 0 ? `${uploadedImages.length} enviada(s)` : 'Suba suas próprias'}
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Skip */}
        <button onClick={() => {
          setReferenceImages(prev => prev.filter(r => r.category !== 'general'));
          onSkip?.();
        }}
          className="w-full py-2.5 rounded-lg text-[12px] text-white/25 hover:text-white/45 transition-colors">
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
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">Enviar fotos</h2>
            <p className="text-[11px] text-white/30">Arraste ou clique para enviar</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          className={`relative rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center py-10 px-4 cursor-pointer ${
            isDragging
              ? 'border-white/30 bg-white/[0.06]'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
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
              <Upload className="w-7 h-7 text-white/10 mb-3" />
              <p className="text-[13px] text-white/30 text-center">
                Arraste imagens aqui ou <span className="text-white/60 underline">clique</span>
              </p>
            </>
          )}
        </div>

        {uploadedImages.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] text-white/25">{uploadedImages.length} imagem(ns)</p>
            <div className="grid grid-cols-4 gap-2">
              {uploadedImages.map((img, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden aspect-square ring-1 ring-white/[0.06]">
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

        {webImageCount > 0 && (
          <button onClick={() => setViewMode('web-gallery')}
            className="w-full py-2 rounded-lg text-[11px] text-white/30 hover:text-white/50 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all">
            Ver {webImageCount} imagens da web
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
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">Imagens da web</h2>
          <p className="text-[11px] text-white/30">Toque para selecionar</p>
        </div>
      </div>

      {allImages.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5 max-h-[380px] overflow-y-auto pr-1">
          {allImages.map((img, i) => {
            const alreadyAdded = referenceImages.some(r => r.url === img.url);
            const currentCount = referenceImages.filter(r => r.category === 'general').length;
            const isAtLimit = !!maxSelections && !alreadyAdded && currentCount >= maxSelections;
            return (
              <div key={i} className={`relative group ${isAtLimit ? 'opacity-25 cursor-not-allowed' : ''}`}>
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
                  className={`w-full rounded-lg overflow-hidden aspect-[4/3] transition-all ${
                    alreadyAdded
                      ? `ring-2 ${t.ringFull} brightness-110`
                      : 'ring-1 ring-white/[0.04] hover:ring-white/15 hover:brightness-110'
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
          <ImageIcon className="h-7 w-7 text-white/8 mx-auto" />
          <p className="text-[13px] text-white/25">Nenhuma imagem</p>
        </div>
      )}

      {/* Manual search */}
      <div className="flex gap-2">
        <Input value={refSearchQuery} onChange={(e) => setRefSearchQuery(e.target.value)}
          placeholder="Buscar mais..."
          className="!bg-white/[0.03] !border-white/[0.05] !text-white !placeholder-white/15 rounded-lg flex-1 text-[13px] h-9 focus:!border-white/15 focus:!ring-0"
          onKeyDown={(e) => e.key === 'Enter' && searchWebReferences(refSearchQuery)} />
        <button onClick={() => searchWebReferences(refSearchQuery)} disabled={searchingReferences || !refSearchQuery.trim()}
          className="px-3.5 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/50 transition-all disabled:opacity-25">
          {searchingReferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {(selectedWebImages.length > 0 || uploadedImages.length > 0) && (
        <p className="text-[11px] text-white/25">
          {selectedWebImages.length + uploadedImages.length}{maxSelections ? `/${maxSelections}` : ''} selecionadas
        </p>
      )}

      <button onClick={() => {
        setReferenceImages(prev => prev.filter(r => r.category !== 'general'));
        onSkip?.();
      }}
        className="w-full py-3 rounded-xl text-[13px] font-medium text-white/40 hover:text-white/60 border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.05] transition-all">
        Pular — não usar imagens
      </button>
    </div>
  );
};

export default StepWebImages;
