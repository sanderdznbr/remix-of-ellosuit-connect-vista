import React, { useEffect, useState, useCallback } from 'react';
import { Globe, Loader2, Search, Check, RefreshCw, Sparkles } from 'lucide-react';

interface BehanceImage {
  imageUrl: string;
  title?: string;
}

interface Props {
  vision: string;
  suggestedStyle?: string;
  selectedImages: string[];
  onSelectionChange: (urls: string[]) => void;
}

const MAX_SELECT = 5;

const StepExtremeBehanceRefs: React.FC<Props> = ({
  vision,
  suggestedStyle,
  selectedImages,
  onSelectionChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<BehanceImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build initial query from vision
  const buildQuery = useCallback(() => {
    const keywords = [suggestedStyle || ''];
    // Extract key design terms from vision
    const designTerms = vision
      .toLowerCase()
      .replace(/[^\w\sáéíóúãõçê]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 4);
    keywords.push(...designTerms);
    return `social media post design ${keywords.filter(Boolean).join(' ')}`.trim();
  }, [vision, suggestedStyle]);

  const searchBehance = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/behance-scraper`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ action: 'search', query, limit: 8 }),
        }
      );

      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();

      if (data.results?.length > 0) {
        setImages(data.results);
      } else {
        setError('Nenhuma referência encontrada. Tente outro termo.');
      }
      setHasSearched(true);
    } catch (err: any) {
      console.error('Behance search error:', err);
      setError(err.message || 'Erro ao buscar referências');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search on mount
  useEffect(() => {
    if (!hasSearched && !loading) {
      const q = buildQuery();
      setSearchQuery(q);
      searchBehance(q);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleImage = (url: string) => {
    if (selectedImages.includes(url)) {
      onSelectionChange(selectedImages.filter(u => u !== url));
    } else if (selectedImages.length < MAX_SELECT) {
      onSelectionChange([...selectedImages, url]);
    }
  };

  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Referências do Behance</h2>
        </div>
        <p className="text-sm text-white/40">
          A IA buscou referências visuais baseadas na sua visão. Selecione até {MAX_SELECT} imagens para inspirar o estilo.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchBehance(searchQuery)}
            placeholder="Buscar no Behance..."
            className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/40 transition-colors"
          />
        </div>
        <button
          onClick={() => searchBehance(searchQuery)}
          disabled={loading || !searchQuery.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 bg-white/[0.06] border border-white/[0.08] text-white/60 hover:bg-white/[0.1]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* Selection count */}
      {selectedImages.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(249,115,22,0.08)' }}>
          <Sparkles className="w-3.5 h-3.5 text-orange-400/60" />
          <span className="text-[11px] text-orange-300/60">
            {selectedImages.length}/{MAX_SELECT} referências selecionadas
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-[4/5] rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {/* Image grid */}
      {!loading && images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {images.map((img, idx) => {
            const isSelected = selectedImages.includes(img.imageUrl);
            return (
              <button
                key={idx}
                onClick={() => toggleImage(img.imageUrl)}
                className={`relative aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-500/30'
                    : 'border-transparent hover:border-white/20'
                }`}
              >
                <img
                  src={img.imageUrl}
                  alt={`Behance ref ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Overlay */}
                <div className={`absolute inset-0 transition-all ${
                  isSelected ? 'bg-orange-500/20' : 'bg-black/0 hover:bg-black/20'
                }`} />
                {/* Check badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                {/* Number badge */}
                {isSelected && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-bold">
                    #{selectedImages.indexOf(img.imageUrl) + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Skip hint */}
      {!loading && hasSearched && (
        <p className="text-[11px] text-white/20 text-center">
          Etapa opcional — você pode avançar sem selecionar referências.
        </p>
      )}
    </div>
  );
};

export default StepExtremeBehanceRefs;