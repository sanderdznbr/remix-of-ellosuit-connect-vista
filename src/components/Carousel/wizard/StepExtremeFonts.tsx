import React, { useState, useEffect, useCallback } from 'react';
import { Type, Loader2, ChevronDown, Check, X, Sparkles } from 'lucide-react';

interface FontItem {
  name: string;
  previewUrl: string;
  pageUrl: string;
}

interface Props {
  selectedFont: FontItem | null;
  onSelect: (font: FontItem | null) => void;
}

const StepExtremeFonts: React.FC<Props> = ({ selectedFont, onSelect }) => {
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFonts = useCallback(async (pageNum: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      if (!accessToken) throw new Error('Sessão expirada');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-envato-fonts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ page: pageNum }),
        }
      );

      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();

      if (data.success) {
        setFonts(prev => append ? [...prev, ...data.fonts] : data.fonts);
        setHasMore(data.hasMore);
        setPage(pageNum);
      } else {
        throw new Error(data.error || 'Erro ao buscar fontes');
      }
    } catch (err: any) {
      console.error('Font fetch error:', err);
      setError(err.message || 'Erro ao buscar fontes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchFonts(1);
  }, [fetchFonts]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchFonts(page + 1, true);
    }
  };

  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Type className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Escolha uma fonte</h2>
        </div>
        <p className="text-sm text-white/40">
          Selecione uma fonte para a IA replicar no seu post. A referência visual será enviada para garantir máxima fidelidade.
        </p>
      </div>

      {/* Selected font badge */}
      {selectedFont && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-orange-500/30 bg-orange-500/10">
          <img
            src={selectedFont.previewUrl}
            alt={selectedFont.name}
            className="w-16 h-10 object-contain rounded bg-white/90"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-300 truncate">{selectedFont.name}</p>
            <p className="text-[10px] text-white/30">Fonte selecionada</p>
          </div>
          <button
            onClick={() => onSelect(null)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          <p className="text-sm text-white/30">Buscando fontes do Envato Elements...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={() => fetchFonts(1)}
            className="mt-2 text-xs text-orange-400 underline cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Font grid */}
      {!loading && fonts.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5 max-h-[45vh] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {fonts.map((font, i) => {
              const isSelected = selectedFont?.name === font.name;
              return (
                <button
                  key={`${font.name}-${i}`}
                  onClick={() => onSelect(isSelected ? null : font)}
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 ring-2 ring-orange-500/30 scale-[1.02]'
                      : 'border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="aspect-[4/3] bg-white/95 flex items-center justify-center p-2">
                    <img
                      src={font.previewUrl}
                      alt={font.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-2 py-1.5 bg-white/[0.03]">
                    <p className="text-[10px] text-white/50 truncate text-center">{font.name}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/[0.06] text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-all cursor-pointer disabled:opacity-30"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando mais...
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Carregar mais fontes
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* No fonts found */}
      {!loading && !error && fonts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Type className="w-8 h-8 text-white/10" />
          <p className="text-sm text-white/30">Nenhuma fonte encontrada</p>
        </div>
      )}

      {/* Optional skip hint */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(249,115,22,0.06)' }}>
        <Sparkles className="w-3.5 h-3.5 text-orange-400/60 shrink-0" />
        <span className="text-[11px] text-white/30">
          Opcional — pule esta etapa se quiser que a IA escolha a fonte automaticamente.
        </span>
      </div>
    </div>
  );
};

export default StepExtremeFonts;
