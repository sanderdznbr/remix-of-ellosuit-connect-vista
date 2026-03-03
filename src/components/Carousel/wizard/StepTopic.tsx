import React, { useRef, useState } from 'react';
import { Loader2, Wand2, Globe, Search, PenTool, Settings, Image as ImageIcon, Layers } from 'lucide-react';
import PromptMentionInput, { PromptMentionRef } from './PromptMention';

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
  contentMode?: 'carousel' | 'single-post';
  manualPostText?: string;
  setManualPostText?: (v: string) => void;
  wizardMode?: 'simple' | 'advanced';
  setContentMode?: (mode: 'carousel' | 'single-post') => void;
  guestMode?: boolean;
}

const StepTopic: React.FC<Props> = ({
  topic, setTopic,
  cardCount, setCardCount,
  enhancingPrompt, onEnhance,
  searchingWeb, webSearchResult,
  skipWebSearch, onToggleSkipWebSearch,
  mentionedPrompts = [], onMentionAdd, onMentionRemove,
  contentMode, manualPostText, setManualPostText,
  wizardMode = 'advanced', setContentMode, guestMode = false,
}) => {
  const mentionRef = useRef<PromptMentionRef>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const isSimple = wizardMode === 'simple';

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      {/* Header with gear toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {advancedMode ? 'Texto direto na imagem' : 'Sobre o que é seu post?'}
          </h2>
          <p className="text-sm text-white/40">
            {advancedMode ? 'Escreva exatamente o que a IA deve renderizar na imagem.' : 'Descreva o assunto e nós cuidamos do resto.'}
          </p>
        </div>
        {!isSimple && (
          <button
            onClick={() => setAdvancedMode(!advancedMode)}
            className="p-2 rounded-lg transition-all"
            style={{
              backgroundColor: advancedMode ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${advancedMode ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}
            title="Configuração avançada: digitar texto direto na imagem"
          >
            <Settings className="h-4 w-4" style={{ color: advancedMode ? '#A78BFA' : 'rgba(255,255,255,0.3)' }} />
          </button>
        )}
      </div>

      {/* Normal mode: topic prompt */}
      {!advancedMode && (
        <>
          <div className="relative">
            {guestMode ? (
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder={skipWebSearch 
                  ? "Descreva tudo sobre o assunto aqui. Quanto mais detalhes, melhor o resultado..." 
                  : "Ex: 5 dicas de contabilidade para pequenas empresas..."}
                className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-2xl min-h-[140px] w-full resize-none text-base leading-relaxed focus:!border-white/20 focus:!ring-0 pr-12 border px-4 py-3 outline-none"
              />
            ) : (
              <PromptMentionInput
                ref={mentionRef}
                value={topic}
                onChange={setTopic}
                mentionedPrompts={mentionedPrompts}
                onMentionAdd={onMentionAdd || (() => {})}
                onMentionRemove={onMentionRemove || (() => {})}
                placeholder={skipWebSearch 
                  ? "Descreva tudo sobre o assunto aqui. Quanto mais detalhes, melhor o resultado..." 
                  : "Ex: 5 dicas de contabilidade para pequenas empresas..."}
                className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-2xl min-h-[140px] w-full resize-none text-base leading-relaxed focus:!border-white/20 focus:!ring-0 pr-24 border px-4 py-3 outline-none"
              />
            )}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
              {!guestMode && (
                <button
                  onClick={() => mentionRef.current?.triggerMention()}
                  className="h-8 px-2.5 rounded-lg bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-200 transition-all cursor-pointer text-sm font-semibold"
                  title="Inserir menção de prompt"
                >
                  @
                </button>
              )}
              <button
                onClick={onEnhance}
                disabled={enhancingPrompt || !topic.trim()}
                className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/40 hover:text-white/70 transition-all disabled:opacity-20"
                title="Melhorar com IA"
              >
                {enhancingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Toggle: Web search ON/OFF (only in advanced mode) */}
          {!isSimple && onToggleSkipWebSearch && (
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
                <p className="text-sm font-medium text-white/80">Pesquisa na Web</p>
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
          )}

          {/* Web search result */}
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
        </>
      )}

      {/* Advanced mode: manual text for image */}
      {advancedMode && setManualPostText && (
        <div className="space-y-2">
          <textarea
            value={manualPostText || ''}
            onChange={(e) => setManualPostText(e.target.value)}
            placeholder="Digite o texto exato que a IA deve renderizar na imagem do post..."
            className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 placeholder-white/20 text-sm px-4 py-3 rounded-xl resize-none outline-none focus:border-white/15 transition-colors min-h-[180px]"
            rows={6}
          />
          <p className="text-[11px] text-white/25">Este texto será renderizado pela IA diretamente na imagem com tipografia editorial.</p>
        </div>
      )}

    </div>
  );
};

export default StepTopic;
