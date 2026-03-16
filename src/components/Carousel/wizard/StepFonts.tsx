import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Type, Loader2, Check, X, Sparkles, Search } from 'lucide-react';

const FONT_OPTIONS = [
  { label: 'Playfair Display', value: "'Playfair Display', 'Georgia', serif" },
  { label: 'Merriweather', value: "'Merriweather', 'Georgia', serif" },
  { label: 'Lora', value: "'Lora', 'Georgia', serif" },
  { label: 'DM Serif Display', value: "'DM Serif Display', 'Georgia', serif" },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', 'Georgia', serif" },
  { label: 'Montserrat', value: "'Montserrat', 'Helvetica Neue', sans-serif" },
  { label: 'Poppins', value: "'Poppins', 'Helvetica Neue', sans-serif" },
  { label: 'Bebas Neue', value: "'Bebas Neue', 'Impact', sans-serif" },
  { label: 'Oswald', value: "'Oswald', 'Impact', sans-serif" },
  { label: 'Raleway', value: "'Raleway', 'Helvetica Neue', sans-serif" },
  { label: 'Inter', value: "'Inter', 'Helvetica Neue', sans-serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', 'Helvetica Neue', sans-serif" },
  { label: 'Sora', value: "'Sora', 'Helvetica Neue', sans-serif" },
  { label: 'Outfit', value: "'Outfit', 'Helvetica Neue', sans-serif" },
  { label: 'Clash Display', value: "'Clash Display', 'Impact', sans-serif" },
  { label: 'Crimson Text', value: "'Crimson Text', 'Georgia', serif" },
  { label: 'Libre Baskerville', value: "'Libre Baskerville', 'Georgia', serif" },
  { label: 'Source Serif Pro', value: "'Source Serif Pro', 'Georgia', serif" },
  { label: 'Archivo Black', value: "'Archivo Black', 'Impact', sans-serif" },
  { label: 'Anton', value: "'Anton', 'Impact', sans-serif" },
];

interface EnvatoFont {
  name: string;
  previewUrl: string;
  pageUrl: string;
}

interface Props {
  selectedFont: number;
  setSelectedFont: (v: number) => void;
  envatoFont?: EnvatoFont | null;
  onEnvatoFontSelect?: (font: EnvatoFont | null) => void;
  hasMarketplaceStyle?: boolean;
}

type FontMode = 'choose' | 'style' | 'custom';

const StepFonts: React.FC<Props> = ({ selectedFont, setSelectedFont, envatoFont, onEnvatoFontSelect, hasMarketplaceStyle }) => {
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState<FontMode>(hasMarketplaceStyle ? 'choose' : 'custom');
  
  // Envato state
  const [fonts, setFonts] = useState<EnvatoFont[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visible = showAll ? FONT_OPTIONS : FONT_OPTIONS.slice(0, 12);

  // If user already has an envato font selected, skip to custom mode
  useEffect(() => {
    if (envatoFont) setMode('custom');
  }, [envatoFont]);

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

  const handleChooseCustom = () => {
    setMode('custom');
    if (fonts.length === 0) fetchFonts(1);
  };

  // Mode: Choose between style fonts or custom
  if (mode === 'choose' && hasMarketplaceStyle) {
    return (
      <div className="space-y-6" style={{ minHeight: '300px' }}>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Tipografia</h2>
          <p className="text-sm text-white/40">Como deseja configurar as fontes?</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => setMode('style')}
            className="flex items-center gap-4 px-5 py-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-purple-500/30 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">Usar fontes do estilo</p>
              <p className="text-xs text-white/30 mt-0.5">A IA replicará a tipografia das referências do estilo selecionado</p>
            </div>
          </button>

          <button
            onClick={handleChooseCustom}
            className="flex items-center gap-4 px-5 py-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-purple-500/30 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Search className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">Usar fontes personalizadas</p>
              <p className="text-xs text-white/30 mt-0.5">Escolha fontes do Envato Elements ou da nossa lista</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Mode: Style fonts selected — simple confirmation
  if (mode === 'style') {
    return (
      <div className="space-y-6" style={{ minHeight: '300px' }}>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Tipografia do Estilo</h2>
          <p className="text-sm text-white/40">A IA vai replicar automaticamente as fontes do estilo selecionado.</p>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Fontes do estilo ativas</span>
          </div>
          <p className="text-xs text-white/30">A tipografia será extraída das referências visuais do estilo e aplicada fielmente.</p>
        </div>

        <button
          onClick={handleChooseCustom}
          className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer"
        >
          <Type className="w-3 h-3" /> Prefiro escolher manualmente
        </button>
      </div>
    );
  }

  // Mode: Custom fonts — show tabs for Google Fonts list vs Envato
  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-white">Escolha a fonte</h2>
          {hasMarketplaceStyle && (
            <button
              onClick={() => { setMode('choose'); onEnvatoFontSelect?.(null); }}
              className="text-[10px] text-white/30 hover:text-white/50 cursor-pointer"
            >
              Voltar
            </button>
          )}
        </div>
        <p className="text-sm text-white/40">Selecione uma fonte do catálogo ou busque no Envato Elements.</p>
      </div>

      {/* Envato selected badge */}
      {envatoFont && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-500/30 bg-purple-500/10">
          <img
            src={envatoFont.previewUrl}
            alt={envatoFont.name}
            className="w-16 h-10 object-contain rounded bg-white/90"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-purple-300 truncate">{envatoFont.name}</p>
            <p className="text-[10px] text-white/30">Fonte Envato selecionada</p>
          </div>
          <button
            onClick={() => onEnvatoFontSelect?.(null)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
      )}

      {!envatoFont && (
        <>
          {/* Standard fonts grid */}
          <div>
            <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wider">Fontes populares</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visible.map((font, i) => (
                <button key={i} onClick={() => setSelectedFont(i)}
                  className={`px-4 py-3 rounded-xl text-sm text-left transition-all border cursor-pointer ${
                    selectedFont === i
                      ? 'bg-white/[0.08] border-purple-500 ring-1 ring-purple-500/50 text-white font-bold'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.05]'
                  }`}>
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                </button>
              ))}
            </div>
            {FONT_OPTIONS.length > 12 && (
              <button onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1 mx-auto mt-2 text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer">
                {showAll ? <><ChevronUp className="h-3 w-3" /> Menos</> : <><ChevronDown className="h-3 w-3" /> +{FONT_OPTIONS.length - 12} fontes</>}
              </button>
            )}
          </div>

          {/* Envato section */}
          <div className="border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Envato Elements</p>
              {fonts.length === 0 && !loading && (
                <button
                  onClick={() => fetchFonts(1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 text-xs hover:bg-purple-500/20 transition-colors cursor-pointer"
                >
                  <Search className="w-3 h-3" /> Buscar fontes
                </button>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <p className="text-xs text-white/30">Buscando fontes do Envato Elements...</p>
              </div>
            )}

            {error && !loading && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{error}</p>
                <button onClick={() => fetchFonts(1)} className="mt-1 text-xs text-purple-400 underline cursor-pointer">
                  Tentar novamente
                </button>
              </div>
            )}

            {!loading && fonts.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 max-h-[35vh] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {fonts.map((font, i) => {
                    const isSelected = envatoFont?.name === font.name;
                    return (
                      <button
                        key={`${font.name}-${i}`}
                        onClick={() => onEnvatoFontSelect?.(isSelected ? null : font)}
                        className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]'
                            : 'border-white/[0.06] hover:border-white/20'
                        }`}
                      >
                        <div className="aspect-[4/3] bg-white/95 flex items-center justify-center p-2">
                          <img src={font.previewUrl} alt={font.name} className="w-full h-full object-contain" loading="lazy" />
                        </div>
                        <div className="px-2 py-1.5 bg-white/[0.03]">
                          <p className="text-[10px] text-white/50 truncate text-center">{font.name}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {hasMore && (
                  <button
                    onClick={() => !loadingMore && hasMore && fetchFonts(page + 1, true)}
                    disabled={loadingMore}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] text-xs text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-all cursor-pointer disabled:opacity-30"
                  >
                    {loadingMore ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Carregando...</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" /> Carregar mais</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export { FONT_OPTIONS };
export default StepFonts;
