import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2, ImageIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ReferenceImage } from './types';

interface Props {
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  webImages?: string[];
}

const StepWebImages: React.FC<Props> = ({ referenceImages, setReferenceImages, webImages }) => {
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [searchingReferences, setSearchingReferences] = useState(false);
  const [refSearchResults, setRefSearchResults] = useState<any[]>([]);

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
    ...(webImages || []).map((url, i) => ({ url, thumb: url, label: `Web ${i + 1}`, isWeb: true })),
    ...refSearchResults.map((img: any) => ({ url: img.url, thumb: img.thumb || img.url, label: img.alt || 'Web', isWeb: false })),
  ];

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Selecione fotos para o post</h2>
        <p className="text-sm text-white/40">Escolha imagens relacionadas ao assunto. Clique para selecionar.</p>
      </div>

      {allImages.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {allImages.map((img, i) => {
            const alreadyAdded = referenceImages.some(r => r.url === img.url);
            return (
              <div key={i} className="relative group">
                <button onClick={() => {
                  if (alreadyAdded) {
                    setReferenceImages(prev => prev.filter(r => r.url !== img.url));
                  } else {
                    setReferenceImages(prev => [...prev, {
                      url: img.url, thumb: img.thumb, label: img.label, source: 'web', category: 'general',
                    }]);
                  }
                }}
                  className={`w-full rounded-lg overflow-hidden aspect-video transition-all ${
                    alreadyAdded
                      ? 'ring-2 ring-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                      : 'ring-1 ring-white/[0.06] hover:ring-white/20'
                  }`}>
                  <img src={img.thumb} alt="" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  {alreadyAdded && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                      <span className="text-white text-[10px] font-bold">✓</span>
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

      {referenceImages.filter(r => r.category === 'general').length > 0 && (
        <p className="text-xs text-white/30">{referenceImages.filter(r => r.category === 'general').length} imagens selecionadas</p>
      )}
    </div>
  );
};

export default StepWebImages;
