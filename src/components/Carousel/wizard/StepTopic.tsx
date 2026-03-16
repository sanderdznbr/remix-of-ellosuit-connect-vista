import React, { useRef, useState } from 'react';
import { Loader2, Wand2, Globe, Search, Settings, Image as ImageIcon, Layers } from 'lucide-react';
import { getAccentTheme, getThemeClasses } from './wizardTheme';
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
  webSearchResult?: { summary: string; citations: string[]; images?: string[] } | null;
  skipWebSearch?: boolean;
  onToggleSkipWebSearch?: () => void;
  mentionedPrompts?: MentionedPrompt[];
  onMentionAdd?: (p: MentionedPrompt) => void;
  onMentionRemove?: (id: string) => void;
  contentMode?: 'carousel' | 'single-post';
  manualPostText?: string;
  setManualPostText?: (v: string) => void;
  wizardMode?: 'simple' | 'advanced' | 'extreme';
  setContentMode?: (mode: 'carousel' | 'single-post') => void;
  guestMode?: boolean;
  webSearchSuggestion?: { classification: string; reason: string } | null;
  onAcceptWebSearch?: () => void;
  onDeclineWebSearch?: () => void;
  classifyingTopic?: boolean;
}

const StepTopic: React.FC<Props> = ({
  topic, setTopic,
  cardCount, setCardCount,
  enhancingPrompt, onEnhance,
  searchingWeb, onSearchWeb, webSearchResult,
  skipWebSearch, onToggleSkipWebSearch,
  mentionedPrompts = [], onMentionAdd, onMentionRemove,
  contentMode, manualPostText, setManualPostText,
  wizardMode = 'advanced', setContentMode, guestMode = false,
  webSearchSuggestion, onAcceptWebSearch, onDeclineWebSearch, classifyingTopic,
}) => {
  const mentionRef = useRef<PromptMentionRef>(null);
  const t = getThemeClasses(getAccentTheme(wizardMode));
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
                  className={`h-8 px-2.5 rounded-lg ${t.bgLight} border ${t.borderLight} hover:bg-opacity-30 ${t.textLighter} transition-all cursor-pointer text-sm font-semibold`}
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

          {/* Manual toggle removed from advanced mode — AI classifies and suggests automatically */}

          {/* Web search loading indicators */}
          {classifyingTopic && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              <span className="text-sm text-white/40">Analisando seu tema...</span>
            </div>
          )}

          {searchingWeb && !webSearchResult && (
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
