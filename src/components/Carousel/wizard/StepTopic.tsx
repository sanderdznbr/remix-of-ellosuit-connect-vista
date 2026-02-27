import React from 'react';
import { Loader2, Wand2, Globe, Search, PenTool } from 'lucide-react';
import PromptMentionInput from './PromptMention';

interface MentionedPrompt {
  id: string;
  title: string;
  avatar_url: string | null;
  content: string;
}

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
  skipWebSearch?: boolean;
  onToggleSkipWebSearch?: () => void;
  mentionedPrompts?: MentionedPrompt[];
  onMentionAdd?: (p: MentionedPrompt) => void;
  onMentionRemove?: (id: string) => void;
}

const StepTopic: React.FC<Props> = ({
  topic, setTopic,
  enhancingPrompt, onEnhance,
  searchingWeb, webSearchResult,
  skipWebSearch, onToggleSkipWebSearch,
  mentionedPrompts = [], onMentionAdd, onMentionRemove,
}) => {
  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      {/* Big friendly question */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Sobre o que é seu post?</h2>
        <p className="text-sm text-white/40">Descreva o assunto e nós cuidamos do resto.</p>
      </div>

      <div className="relative">
        <PromptMentionInput
          value={topic}
          onChange={setTopic}
          mentionedPrompts={mentionedPrompts}
          onMentionAdd={onMentionAdd || (() => {})}
          onMentionRemove={onMentionRemove || (() => {})}
          placeholder={skipWebSearch 
            ? "Descreva tudo sobre o assunto aqui. Quanto mais detalhes, melhor o resultado..." 
            : "Ex: 5 dicas de contabilidade para pequenas empresas..."}
          className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-2xl min-h-[140px] w-full resize-none text-base leading-relaxed focus:!border-white/20 focus:!ring-0 pr-12 border px-4 py-3 outline-none"
        />
        <button onClick={onEnhance} disabled={enhancingPrompt || !topic.trim()}
          className="absolute bottom-3 right-3 p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/40 hover:text-white/70 transition-all disabled:opacity-20 z-10"
          title="Melhorar com IA">
          {enhancingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Toggle: Web search ON/OFF */}
      <button
        onClick={onToggleSkipWebSearch}
        className="flex items-center gap-3 w-full p-3.5 rounded-xl transition-all text-left"
        style={{
          backgroundColor: !skipWebSearch ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${!skipWebSearch ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        <div className="p-2 rounded-lg" style={{ backgroundColor: !skipWebSearch ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)' }}>
          {!skipWebSearch ? <Search className="h-4 w-4 text-purple-400" /> : <PenTool className="h-4 w-4 text-white/30" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80">
            Pesquisa na Web
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            {!skipWebSearch 
              ? 'Ativada — busca informações reais para enriquecer o conteúdo.'
              : 'Desativada — usando apenas o que você escrever acima.'}
          </p>
        </div>
        <div className="w-10 h-5 rounded-full relative transition-all" style={{ backgroundColor: !skipWebSearch ? '#8B5CF6' : 'rgba(255,255,255,0.1)' }}>
          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: !skipWebSearch ? '22px' : '2px' }} />
        </div>
      </button>

      {/* Web search result (shown after auto-search) */}
      {webSearchResult && !skipWebSearch && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2 text-emerald-400/80 text-xs font-medium">
            <Search className="h-3.5 w-3.5" />
            Conteúdo encontrado na web
          </div>
          <p className="text-sm text-white/50 leading-relaxed line-clamp-3">{webSearchResult.summary}</p>
          {webSearchResult.citations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
                  {webSearchResult.citations.slice(0, 3).map((url, i) => {
                let hostname = url;
                try { hostname = new URL(url).hostname.replace('www.', ''); } catch { /* keep raw url */ }
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] text-white/40 text-[10px] hover:bg-white/[0.08] hover:text-white/60 transition-colors truncate max-w-[200px]">
                    <Globe className="h-2.5 w-2.5 flex-shrink-0" />
                    {hostname}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {searchingWeb && (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          <span className="text-sm text-white/40">Pesquisando na web...</span>
        </div>
      )}
    </div>
  );
};

export default StepTopic;
