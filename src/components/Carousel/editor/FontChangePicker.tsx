import React, { useState, useCallback } from 'react';
import { Loader2, Search, X, Type } from 'lucide-react';

interface EnvatoFont {
  name: string;
  previewUrl: string;
  pageUrl: string;
}

const QUICK_FONTS = [
  'Playfair Display', 'Bebas Neue', 'Montserrat', 'Oswald',
  'Poppins', 'Lora', 'Inter', 'Anton',
  'DM Serif Display', 'Raleway', 'Space Grotesk', 'Outfit',
];

interface Props {
  onSelectFont: (fontName: string, previewUrl?: string) => void;
  loading?: boolean;
}

const FontChangePicker: React.FC<Props> = ({ onSelectFont, loading }) => {
  const [tab, setTab] = useState<'quick' | 'envato'>('quick');
  const [fonts, setFonts] = useState<EnvatoFont[]>([]);
  const [loadingFonts, setLoadingFonts] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvatoFonts = useCallback(async (pageNum: number, append = false) => {
    setLoadingFonts(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-envato-fonts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ page: pageNum }),
        }
      );
      const data = await res.json();
      if (data.success && data.fonts?.length) {
        setFonts(prev => append ? [...prev, ...data.fonts] : data.fonts);
        setPage(pageNum);
      } else {
        setError('Nenhuma fonte encontrada');
      }
    } catch {
      setError('Erro ao buscar fontes');
    } finally {
      setLoadingFonts(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Type className="h-4 w-4 text-pink-400" />
        <span className="text-xs font-semibold text-white/70">Escolha a nova fonte</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.04]">
        <button
          onClick={() => setTab('quick')}
          className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
            tab === 'quick' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Fontes rápidas
        </button>
        <button
          onClick={() => { setTab('envato'); if (fonts.length === 0) fetchEnvatoFonts(1); }}
          className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
            tab === 'envato' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Envato Elements
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
          <span className="text-xs text-white/50">Alterando fonte...</span>
        </div>
      )}

      {!loading && tab === 'quick' && (
        <div className="grid grid-cols-2 gap-1.5 max-h-[30vh] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {QUICK_FONTS.map(font => (
            <button
              key={font}
              onClick={() => onSelectFont(font)}
              className="px-3 py-2.5 rounded-xl text-[12px] font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all text-left cursor-pointer"
            >
              {font}
            </button>
          ))}
        </div>
      )}

      {!loading && tab === 'envato' && (
        <div className="space-y-2">
          {loadingFonts && fonts.length === 0 && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
            </div>
          )}
          {error && <p className="text-xs text-red-400 text-center py-2">{error}</p>}
          {fonts.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-1.5 max-h-[30vh] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {fonts.map((font, i) => (
                  <button
                    key={`${font.name}-${i}`}
                    onClick={() => onSelectFont(font.name, font.previewUrl)}
                    className="relative group rounded-xl overflow-hidden border border-white/[0.06] hover:border-purple-500/40 bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-pointer"
                  >
                    <img
                      src={font.previewUrl}
                      alt={font.name}
                      className="w-full h-14 object-contain p-1.5 bg-white/90 rounded-t-xl"
                      loading="lazy"
                    />
                    <p className="text-[9px] text-white/40 truncate px-1.5 py-1 text-center">{font.name}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => fetchEnvatoFonts(page + 1, true)}
                disabled={loadingFonts}
                className="w-full py-2 text-[11px] text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-40"
              >
                {loadingFonts ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Carregar mais'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FontChangePicker;
