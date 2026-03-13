import React, { useEffect, useState, useCallback } from 'react';
import { Globe, Loader2, Search, Check, RefreshCw, Sparkles, ChevronDown } from 'lucide-react';

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
const PAGE_SIZE = 12;

// Always prefix with "social media" to stay relevant
function visionToSearchQueries(vision: string, suggestedStyle?: string): string[] {
  const raw = vision.toLowerCase().replace(/[^\w\sáéíóúãõçê]/g, ' ').trim();
  
  // Extract meaningful keywords (skip very short/common words)
  const stopwords = new Set(['de', 'da', 'do', 'para', 'com', 'em', 'um', 'uma', 'que', 'por', 'se', 'na', 'no', 'os', 'as', 'dos', 'das', 'mais', 'mas', 'como', 'ser', 'ter', 'seu', 'sua', 'ou', 'ao', 'nos', 'nas', 'esse', 'essa', 'este', 'esta']);
  const words = raw.split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w));
  
  // Build a short keyword hint from the vision
  const hint = words.slice(0, 3).join(' ');
  const styleHint = suggestedStyle ? suggestedStyle.toLowerCase() : '';

  const queries: string[] = [];

  // Primary: social media + context
  if (hint) {
    queries.push(`social media ${hint}`);
    queries.push(`social media post ${hint}`);
  }
  if (styleHint) {
    queries.push(`social media ${styleHint} design`);
  }

  // Broad fallbacks always with "social media"
  queries.push('social media post design inspiration');
  queries.push('social media app design modern');
  queries.push('social media instagram carousel');

  // Deduplicate
  return [...new Set(queries)];
}

const StepExtremeBehanceRefs: React.FC<Props> = ({
  vision,
  suggestedStyle,
  selectedImages,
  onSelectionChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [images, setImages] = useState<BehanceImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const searchBehance = useCallback(async (query: string, limit = 20) => {
    if (!query.trim()) return false;

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
          body: JSON.stringify({ action: 'search', query, limit }),
        }
      );

      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();

      if (data.results?.length > 0) {
        return data.results as BehanceImage[];
      }
      return null;
    } catch (err: any) {
      console.error('Behance search error:', err);
      return null;
    }
  }, []);

  // Auto-search with fallback queries on mount
  useEffect(() => {
    if (hasSearched || loading) return;

    const queries = visionToSearchQueries(vision, suggestedStyle);
    setSearchQuery(queries[0]);

    const tryQueries = async () => {
      setLoading(true);
      setError(null);
      const allImages: BehanceImage[] = [];
      const seenUrls = new Set<string>();

      for (const q of queries) {
        setSearchQuery(q);
        const results = await searchBehance(q, 12);
        if (results) {
          for (const img of results) {
            if (!seenUrls.has(img.imageUrl)) {
              seenUrls.add(img.imageUrl);
              allImages.push(img);
            }
          }
        }
        if (allImages.length >= 16) break;
      }

      if (allImages.length > 0) {
        setImages(allImages);
      } else {
        setError('Nenhuma referência encontrada. Tente buscar manualmente.');
      }
      setHasSearched(true);
      setSearchQuery(queries[0]);
      setLoading(false);
    };

    tryQueries();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSearch = async () => {
    setLoading(true);
    setError(null);
    const results = await searchBehance(searchQuery, 20);
    if (results && results.length > 0) {
      setImages(results);
      setVisibleCount(PAGE_SIZE);
    } else {
      setError('Nenhuma referência encontrada. Tente outro termo.');
    }
    setHasSearched(true);
    setLoading(false);
  };

  const handleLoadMore = async () => {
    if (visibleCount < images.length) {
      // Show more from already loaded
      setVisibleCount(prev => prev + PAGE_SIZE);
      return;
    }
    // Fetch more from Behance with a variation
    setLoadingMore(true);
    const extraQuery = `${searchQuery} creative`;
    const results = await searchBehance(extraQuery, 12);
    if (results) {
      const seenUrls = new Set(images.map(i => i.imageUrl));
      const newImages = results.filter(r => !seenUrls.has(r.imageUrl));
      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        setVisibleCount(prev => prev + PAGE_SIZE);
      }
    }
    setLoadingMore(false);
  };

  const toggleImage = (url: string) => {
    if (selectedImages.includes(url)) {
      onSelectionChange(selectedImages.filter(u => u !== url));
    } else if (selectedImages.length < MAX_SELECT) {
      onSelectionChange([...selectedImages, url]);
    }
  };

  const visibleImages = images.slice(0, visibleCount);
  const hasMore = visibleCount < images.length || images.length >= 8;

  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Referências do Behance</h2>
        </div>
        <p className="text-sm text-white/40">
          Referências visuais buscadas automaticamente. Selecione até {MAX_SELECT} imagens para definir o estilo.
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
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            placeholder="social media design..."
            className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/40 transition-colors"
          />
        </div>
        <button
          onClick={handleManualSearch}
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
            {selectedImages.length}/{MAX_SELECT} referências selecionadas — estas serão usadas como estilo
          </span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <span className="text-xs text-yellow-400">{error}</span>
          <p className="text-[10px] text-white/30 mt-1">
            Dica: use termos como "social media tech", "social media app", "social media modern"
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-orange-400/60" />
            <span className="text-xs text-white/30">Buscando no Behance...</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-video rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Image grid — 16:9 aspect ratio */}
      {!loading && visibleImages.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {visibleImages.map((img, idx) => {
              const isSelected = selectedImages.includes(img.imageUrl);
              return (
                <button
                  key={idx}
                  onClick={() => toggleImage(img.imageUrl)}
                  className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
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
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className={`absolute inset-0 transition-all ${
                    isSelected ? 'bg-orange-500/20' : 'bg-black/0 hover:bg-black/20'
                  }`} />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-bold">
                      #{selectedImages.indexOf(img.imageUrl) + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Load more button */}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/70 flex items-center justify-center gap-2"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {loadingMore ? 'Carregando...' : 'Carregar mais'}
            </button>
          )}
        </>
      )}

      {/* Skip hint */}
      {!loading && hasSearched && (
        <p className="text-[11px] text-white/20 text-center">
          Etapa opcional — as referências selecionadas definem o estilo visual do post.
        </p>
      )}
    </div>
  );
};

export default StepExtremeBehanceRefs;
