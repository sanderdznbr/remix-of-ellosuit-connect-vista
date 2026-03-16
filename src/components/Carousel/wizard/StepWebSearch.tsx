import React from 'react';
import { Globe, Search, CheckCircle2, Image as ImageIcon, Loader2, ExternalLink, FileText, RefreshCw } from 'lucide-react';

interface Props {
  webSearchResult: {
    summary: string;
    citations: string[];
    content?: any;
    images?: string[];
  };
  searchingWeb?: boolean;
  onResearch?: () => void;
  topic: string;
}

const StepWebSearch: React.FC<Props> = ({ webSearchResult, searchingWeb, onResearch, topic }) => {
  const content = webSearchResult.content || {};
  const facts = content.facts || [];
  const imageCount = webSearchResult.images?.length || 0;
  const citationCount = webSearchResult.citations?.length || 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Pesquisa encontrada</h2>
        <p className="text-sm text-white/40">Confira os dados que vamos usar no seu post</p>
      </div>

      {/* Topic & status */}
      <div className="p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">Pesquisa concluída</span>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          {webSearchResult.summary}
        </p>
      </div>

      {/* Facts/Key points */}
      {facts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white/50 text-xs font-medium">
            <FileText className="h-3.5 w-3.5" />
            Pontos-chave encontrados ({facts.length})
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {facts.map((fact: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-sm font-medium text-white/80">{fact.heading}</p>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">{fact.body}</p>
                {fact.source && (
                  <span className="text-[10px] text-white/25 mt-1 inline-block">Fonte: {fact.source}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3">
        {imageCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <ImageIcon className="h-3.5 w-3.5 text-blue-400/70" />
            <span className="text-xs text-white/50">{imageCount} fotos encontradas</span>
          </div>
        )}
        {citationCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <Globe className="h-3.5 w-3.5 text-emerald-400/70" />
            <span className="text-xs text-white/50">{citationCount} fontes</span>
          </div>
        )}
      </div>

      {/* Sources */}
      {webSearchResult.citations.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-white/40 font-medium">Fontes utilizadas</span>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {webSearchResult.citations.map((url, i) => {
              let hostname = url;
              try { hostname = new URL(url).hostname.replace('www.', ''); } catch { /* keep raw */ }
              return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors group">
                  <Globe className="h-3 w-3 text-white/25 flex-shrink-0" />
                  <span className="text-xs text-white/50 group-hover:text-white/70 truncate flex-1">{hostname}</span>
                  <ExternalLink className="h-3 w-3 text-white/15 group-hover:text-white/40 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Re-search button */}
      {onResearch && (
        <button
          onClick={onResearch}
          disabled={searchingWeb}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-30 w-full justify-center"
        >
          {searchingWeb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {searchingWeb ? 'Pesquisando...' : 'Pesquisar novamente'}
        </button>
      )}
    </div>
  );
};

export default StepWebSearch;
