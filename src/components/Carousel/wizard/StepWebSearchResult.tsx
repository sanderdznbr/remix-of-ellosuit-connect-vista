import React from 'react';
import { Search, Globe, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface Props {
  webSearchResult: { summary: string; citations: string[]; images?: string[] } | null;
  searchingWeb?: boolean;
  onSearchWeb?: () => void;
  skipWebSearch?: boolean;
  onToggleSkipWebSearch?: () => void;
}

const StepWebSearchResult: React.FC<Props> = ({
  webSearchResult,
  searchingWeb,
  onSearchWeb,
  skipWebSearch,
  onToggleSkipWebSearch,
}) => {
  if (!webSearchResult) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Resultado da Pesquisa</h2>
          <p className="text-sm text-muted-foreground mt-1">Nenhum resultado encontrado.</p>
        </div>
      </div>
    );
  }

  const imageCount = webSearchResult.images?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Resultado da Pesquisa</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confirme os dados encontrados na web para o seu post.
        </p>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Conteúdo encontrado</span>
        </div>
        {imageCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
            <ImageIcon className="h-3.5 w-3.5 text-white/40" />
            <span className="text-xs font-medium text-white/50">{imageCount} fotos</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
        <p className="text-sm text-white/60 leading-relaxed">{webSearchResult.summary}</p>

        {/* Citations */}
        {webSearchResult.citations.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Fontes</p>
            <div className="flex flex-wrap gap-2">
              {webSearchResult.citations.slice(0, 5).map((url, i) => {
                let hostname = url;
                try { hostname = new URL(url).hostname.replace('www.', ''); } catch { /* keep raw */ }
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/40 text-[11px] hover:bg-white/[0.08] hover:text-white/60 transition-colors border border-white/[0.06]">
                    <Globe className="h-3 w-3 flex-shrink-0" />
                    {hostname}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onSearchWeb && (
          <button
            onClick={onSearchWeb}
            disabled={searchingWeb}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-30"
          >
            {searchingWeb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Repesquisar
          </button>
        )}
        {onToggleSkipWebSearch && (
          <button
            onClick={onToggleSkipWebSearch}
            className="text-xs text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
          >
            Ignorar pesquisa
          </button>
        )}
      </div>
    </div>
  );
};

export default StepWebSearchResult;
