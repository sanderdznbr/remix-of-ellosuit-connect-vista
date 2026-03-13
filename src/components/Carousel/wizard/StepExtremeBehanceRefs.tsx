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

// Map common Portuguese design terms to English for Behance search
const PT_TO_EN: Record<string, string> = {
  celular: 'phone mockup', iphone: 'iphone mockup', tela: 'screen mockup',
  aplicativo: 'app design', app: 'app ui', mockup: 'mockup',
  post: 'social media post', carrossel: 'carousel', stories: 'stories',
  minimalista: 'minimal', moderno: 'modern', elegante: 'elegant',
  escuro: 'dark', claro: 'light', gradiente: 'gradient',
  neon: 'neon', urbano: 'urban', profissional: 'professional',
  corporativo: 'corporate', criativo: 'creative', futurista: 'futuristic',
  tecnologia: 'technology', saude: 'health', fitness: 'fitness',
  comida: 'food', restaurante: 'restaurant', moda: 'fashion',
  beleza: 'beauty', imobiliario: 'real estate', loja: 'store',
  produto: 'product', marca: 'brand', logo: 'logo',
  foto: 'photo', imagem: 'image', pessoa: 'person',
  rosto: 'portrait', fundo: 'background', texto: 'typography',
  tipografia: 'typography', cor: 'color', roxo: 'purple',
  azul: 'blue', verde: 'green', laranja: 'orange', vermelho: 'red',
  preto: 'black', branco: 'white', dourado: 'gold',
  instagram: 'instagram', marketing: 'marketing', digital: 'digital',
  banner: 'banner', flyer: 'flyer', cartao: 'card design',
  apresentacao: 'presentation', slide: 'slide design',
};

function visionToEnglishQuery(vision: string, suggestedStyle?: string): string[] {
  const words = vision
    .toLowerCase()
    .replace(/[^\w\sáéíóúãõçê]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const translated = new Set<string>();
  
  for (const word of words) {
    // Check exact match
    if (PT_TO_EN[word]) {
      translated.add(PT_TO_EN[word]);
    }
    // Check partial match
    for (const [pt, en] of Object.entries(PT_TO_EN)) {
      if (word.includes(pt) || pt.includes(word)) {
        translated.add(en);
        break;
      }
    }
  }

  // Always add base design context
  translated.add('social media');
  translated.add('post design');

  if (suggestedStyle) {
    translated.add(suggestedStyle.toLowerCase());
  }

  const mainQuery = Array.from(translated).slice(0, 6).join(' ');

  // Build fallback queries from broad to generic
  const fallbacks: string[] = [
    mainQuery,
    `instagram post ${Array.from(translated).slice(0, 3).join(' ')}`,
    'social media post design inspiration',
    'instagram carousel design modern',
  ];

  return fallbacks;
}

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
        setHasSearched(true);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Behance search error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search with fallback queries on mount
  useEffect(() => {
    if (hasSearched || loading) return;

    const queries = visionToEnglishQuery(vision, suggestedStyle);
    setSearchQuery(queries[0]);

    const tryQueries = async () => {
      for (const q of queries) {
        setSearchQuery(q);
        const found = await searchBehance(q);
        if (found) return;
      }
      // If all failed, show message but not as error
      setHasSearched(true);
      setError('Nenhuma referência encontrada. Tente buscar manualmente.');
    };

    tryQueries();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSearch = async () => {
    const found = await searchBehance(searchQuery);
    if (!found) {
      setError('Nenhuma referência encontrada. Tente outro termo em inglês.');
    }
    setHasSearched(true);
  };

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
            placeholder="Search Behance (use English)..."
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
            Dica: use termos em inglês como "app mockup", "instagram post", "minimal design"
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
              <div key={i} className="aspect-[4/5] rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
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