import React, { useState } from 'react';
import { Search, Globe, Loader2, CheckCircle2, Link, ExternalLink, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface WebSource {
  title: string;
  summary: string;
  angle: string;
  url?: string;
}

interface Props {
  webSearchResult: { summary: string; citations: string[]; images?: string[]; sources?: WebSource[] } | null;
  searchingWeb?: boolean;
  onSearchWeb?: () => void;
  skipWebSearch?: boolean;
  onToggleSkipWebSearch?: () => void;
  selectedSourceIndex: number | null;
  onSelectSource: (index: number) => void;
  onExtractUrl?: (url: string) => void;
  extractingUrl?: boolean;
}

const StepWebSearchResult: React.FC<Props> = ({
  webSearchResult,
  searchingWeb,
  onSearchWeb,
  skipWebSearch,
  onToggleSkipWebSearch,
  selectedSourceIndex,
  onSelectSource,
  onExtractUrl,
  extractingUrl,
}) => {
  const [manualUrl, setManualUrl] = useState('');

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

  // Build sources from API response or fallback to citations
  const sources: WebSource[] = (() => {
    if (webSearchResult.sources && webSearchResult.sources.length > 0) {
      return webSearchResult.sources.slice(0, 3).map((s, i) => ({
        ...s,
        url: webSearchResult.citations?.[i] || undefined,
      }));
    }
    // Fallback: generate from citations
    return webSearchResult.citations.slice(0, 3).map((url, i) => {
      let hostname = url;
      try { hostname = new URL(url).hostname.replace('www.', ''); } catch { /* keep raw */ }
      return {
        title: hostname,
        summary: `Fonte ${i + 1} sobre o tema`,
        angle: hostname,
        url,
      };
    });
  })();

  const handleManualSubmit = () => {
    const url = manualUrl.trim();
    if (!url || !onExtractUrl) return;
    if (!/^https?:\/\/.+/.test(url)) {
      const withProtocol = `https://${url}`;
      if (/^https?:\/\/.+\..+/.test(withProtocol)) {
        onExtractUrl(withProtocol);
        setManualUrl('');
        return;
      }
      return;
    }
    onExtractUrl(url);
    setManualUrl('');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Escolha a fonte</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione uma das fontes encontradas para basear seu post.
        </p>
      </div>

      {/* Source cards */}
      <div className="space-y-2.5">
        {sources.map((source, i) => {
          const isSelected = selectedSourceIndex === i;
          let hostname = '';
          if (source.url) {
            try { hostname = new URL(source.url).hostname.replace('www.', ''); } catch { hostname = source.url; }
          }
          return (
            <button
              key={i}
              onClick={() => onSelectSource(i)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-purple-500/60 bg-purple-500/10'
                  : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? 'border-purple-500 bg-purple-500' : 'border-white/20'
                }`}>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{source.title}</h3>
                  <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{source.summary}</p>
                  {hostname && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Globe className="w-3 h-3 text-white/25" />
                      <span className="text-[10px] text-white/30">{hostname}</span>
                    </div>
                  )}
                </div>
                {source.url && (
                  <a href={source.url} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[10px] text-white/20 uppercase tracking-wider">ou</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* Manual URL input */}
      <div className="space-y-2">
        <p className="text-xs text-white/40">Cole um link para extrair o conteúdo:</p>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://exemplo.com/artigo..."
              className="w-full h-10 pl-9 pr-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-purple-500/40 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
          </div>
          <button
            onClick={handleManualSubmit}
            disabled={!manualUrl.trim() || extractingUrl}
            className="px-4 h-10 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-30 flex items-center gap-1.5"
          >
            {extractingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Extrair
          </button>
        </div>
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
            Pesquisar mais
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
