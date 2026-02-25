import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Globe, Search } from 'lucide-react';

interface Props {
  topic: string;
  setTopic: (v: string) => void;
  keywords: string;
  setKeywords: (v: string) => void;
  cardCount: number;
  setCardCount: (v: number) => void;
  imageCardCount: number;
  setImageCardCount: (v: number) => void;
  enhancingPrompt: boolean;
  onEnhance: () => void;
  searchingWeb?: boolean;
  onSearchWeb?: () => void;
  webSearchResult?: { summary: string; citations: string[] } | null;
}

const StepTopic: React.FC<Props> = ({
  topic, setTopic, keywords, setKeywords,
  cardCount, setCardCount, imageCardCount, setImageCardCount,
  enhancingPrompt, onEnhance,
  searchingWeb, onSearchWeb, webSearchResult,
}) => {
  return (
    <div className="space-y-8">
      {/* Topic */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-white/80">Tópico do Carrossel</label>
          <div className="flex items-center gap-2">
            <button onClick={onSearchWeb} disabled={searchingWeb || !topic.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-30">
              {searchingWeb ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
              Pesquisar
            </button>
            <button onClick={onEnhance} disabled={enhancingPrompt || !topic.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-30">
              {enhancingPrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              Melhorar com IA
            </button>
          </div>
        </div>
        <Textarea value={topic} onChange={(e) => setTopic(e.target.value)}
          placeholder="Descreva o assunto do carrossel..."
          className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-xl min-h-[120px] resize-none text-[15px] leading-relaxed focus:!border-white/20 focus:!ring-0" />
      </div>

      {/* Web search result */}
      {webSearchResult && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2 text-white/60 text-xs font-medium">
            <Search className="h-3.5 w-3.5" />
            Conteúdo encontrado
          </div>
          <p className="text-sm text-white/50 leading-relaxed">{webSearchResult.summary}</p>
          {webSearchResult.citations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {webSearchResult.citations.slice(0, 3).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] text-white/40 text-[10px] hover:bg-white/[0.08] hover:text-white/60 transition-colors truncate max-w-[200px]">
                  <Globe className="h-2.5 w-2.5 flex-shrink-0" />
                  {new URL(url).hostname.replace('www.', '')}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Keywords */}
      <div>
        <label className="text-sm font-medium text-white/80 mb-3 block">Palavras-chave</label>
        <Input value={keywords} onChange={(e) => setKeywords(e.target.value)}
          placeholder="proteína, saúde, marketing (separadas por vírgula)"
          className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-xl h-11 text-sm focus:!border-white/20 focus:!ring-0" />
      </div>

      {/* Card counts */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <label className="text-sm font-medium text-white/80 mb-3 block">Total de cards</label>
          <div className="flex items-center gap-2">
            {[5, 7, 9, 12].map(n => (
              <button key={n} onClick={() => { setCardCount(n); if (imageCardCount > n - 1) setImageCardCount(Math.max(1, n - 2)); }}
                className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all ${
                  cardCount === n
                    ? 'bg-white text-black'
                    : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-white/80 mb-3 block">Cards com imagem</label>
          <div className="flex items-center gap-2">
            {[2, 3, 4, 5, 6].filter(n => n <= cardCount - 1).map(n => (
              <button key={n} onClick={() => setImageCardCount(n)}
                className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all ${
                  imageCardCount === n
                    ? 'bg-white text-black'
                    : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTopic;
