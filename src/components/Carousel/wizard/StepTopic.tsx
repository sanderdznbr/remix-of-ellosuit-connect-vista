import React, { useRef, useState, useEffect } from 'react';
import { Loader2, Wand2, Globe, Settings, Sparkles, Search, ExternalLink, Zap, TrendingUp, LayoutGrid, FileText, Copy, Lock } from 'lucide-react';
import { getAccentTheme, getThemeClasses } from './wizardTheme';
import PromptMentionInput, { PromptMentionRef } from './PromptMention';
import { toast } from 'sonner';

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
  wizardMode?: 'simple' | 'advanced' | 'extreme' | 'tweet' | 'tweet2' | 'animated';
  setContentMode?: (mode: 'carousel' | 'single-post') => void;
  guestMode?: boolean;
  webSearchSuggestion?: { classification: string; reason: string } | null;
  onAcceptWebSearch?: () => void;
  onDeclineWebSearch?: () => void;
  classifyingTopic?: boolean;
  forceWebSearch?: boolean;
  setForceWebSearch?: (v: boolean) => void;
  fromTrendData?: { topic: string; format: string; cardText: string; cardTexts?: string[]; caption: string } | null;
}

const NEWS_KEYWORDS = [
  'notícia', 'noticias', 'news', 'atualização', 'últimas', 'hoje',
  'tendência', 'tendencias', 'trend', 'mercado', 'dados', 'estatística',
  'pesquisa', 'estudo', 'relatório', 'report', 'ranking', 'top ',
  'melhores', 'piores', 'preço', 'precos', 'salário', 'salarios',
  'economia', 'política', 'eleição', 'governo', 'lei ', 'regulamentação',
  'ia ', 'inteligência artificial', 'ai ',
  'tecnologia', 'lançamento', 'release', 'update', 'nova versão',
  'covid', 'pandemia', 'inflação', 'dólar', 'bitcoin', 'cripto',
];

function detectIsNews(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower || lower.length < 10) return false;
  return NEWS_KEYWORDS.filter(k => lower.includes(k)).length >= 1;
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
  forceWebSearch = false, setForceWebSearch,
  fromTrendData,
}) => {
  const mentionRef = useRef<PromptMentionRef>(null);
  const accent = getAccentTheme(wizardMode);
  const t = getThemeClasses(accent);
  const accentHex = t.hex || '#8B5CF6';
  const accentRgb = t.rgb || '139,92,246';
  const [advancedMode, setAdvancedMode] = useState(false);
  const isSimple = wizardMode === 'simple';

  // Auto-detect news topics and enable web search
  useEffect(() => {
    if (!setForceWebSearch || !topic.trim() || fromTrendData) return;
    if (detectIsNews(topic) && !forceWebSearch) {
      setForceWebSearch(true);
    }
  }, [topic]);

  // === FROM TREND — LOCKED MODE ===
  if (fromTrendData) {
    const isCarousel = fromTrendData.format === 'carrossel';
    return (
      <div className="space-y-5" style={{ minHeight: '300px' }}>
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5" style={{ color: '#a78bfa' }} />
            <h2 className="text-xl font-bold text-white">Trend selecionada</h2>
          </div>
          <p className="text-[13px] text-white/30">Conteúdo pronto baseado nas tendências do dia.</p>
        </div>

        {/* Topic (locked) */}
        <div className="rounded-2xl border border-white/[0.08] p-5 relative" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="absolute top-3 right-3">
            <Lock className="w-3.5 h-3.5 text-white/15" />
          </div>
          <p className="text-sm text-white/80 leading-relaxed">{topic}</p>
        </div>

        {/* Format badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06]"
            style={{ backgroundColor: isCarousel ? 'rgba(139,92,246,0.06)' : 'rgba(59,130,246,0.06)' }}>
            <LayoutGrid className="w-3.5 h-3.5" style={{ color: isCarousel ? '#a78bfa' : '#60a5fa' }} />
            <span className="text-xs font-medium" style={{ color: isCarousel ? '#a78bfa' : '#60a5fa' }}>
              {isCarousel ? 'Carrossel' : 'Post Estático'}
            </span>
          </div>
          <span className="text-[10px] text-white/20">Formato sugerido pela IA</span>
        </div>

        {/* Card text */}
        {isCarousel && Array.isArray(fromTrendData.cardTexts) && fromTrendData.cardTexts.length > 0 ? (
          <div className="rounded-xl border border-white/[0.06] p-4" style={{ backgroundColor: 'rgba(139,92,246,0.03)' }}>
            <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-2">Textos exatos dos slides</p>
            <div className="space-y-2">
              {fromTrendData.cardTexts.map((text, index) => (
                <div key={`${index}-${text}`} className="flex items-start gap-2 rounded-lg border border-white/[0.05] px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-[10px] text-purple-400/40 font-mono w-4 text-right shrink-0 mt-0.5">{index + 1}</span>
                  <p className="text-sm text-white/70 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : fromTrendData.cardText ? (
          <div className="rounded-xl border border-white/[0.06] p-4" style={{ backgroundColor: 'rgba(139,92,246,0.03)' }}>
            <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-2">Texto da arte</p>
            <p className="text-sm text-white/70 leading-relaxed">{fromTrendData.cardText}</p>
          </div>
        ) : null}

        {/* Caption */}
        {fromTrendData.caption && (
          <div className="rounded-xl border border-white/[0.06] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium">Legenda do Instagram</p>
              <button onClick={() => { navigator.clipboard.writeText(fromTrendData.caption); toast.success('Legenda copiada!'); }}
                className="text-white/20 hover:text-white/50 transition-colors cursor-pointer p-1" title="Copiar legenda">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{fromTrendData.caption}</p>
          </div>
        )}

        {/* No web search notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <Globe className="w-3.5 h-3.5 text-white/15" />
          <span className="text-[11px] text-white/20">Pesquisa web desativada — conteúdo já pesquisado via Trends</span>
        </div>
      </div>
    );
  }

  const topicSuggestions = [
    { emoji: '🐾', label: 'Petshop', prompt: '5 cuidados essenciais com seu pet no verão' },
    { emoji: '🍕', label: 'Restaurante', prompt: '7 motivos para experimentar nossa nova receita artesanal' },
    { emoji: '💪', label: 'Fitness', prompt: '5 exercícios rápidos para fazer em casa sem equipamento' },
    { emoji: '💇', label: 'Beleza', prompt: '5 tendências de cabelo que vão dominar este ano' },
    { emoji: '📊', label: 'Marketing', prompt: '5 estratégias de marketing digital para pequenos negócios' },
    { emoji: '⚖️', label: 'Contabilidade', prompt: '5 dicas de contabilidade para pequenas empresas' },
    { emoji: '🏠', label: 'Imobiliária', prompt: '5 dicas para comprar seu primeiro imóvel com segurança' },
    { emoji: '👶', label: 'Maternidade', prompt: '5 cuidados essenciais nos primeiros meses do bebê' },
    { emoji: '📚', label: 'Educação', prompt: '5 técnicas de estudo comprovadas pela ciência' },
    { emoji: '🧘', label: 'Bem-estar', prompt: '5 hábitos matinais para começar o dia com energia' },
  ];

  return (
    <div className="space-y-4" style={{ minHeight: '300px' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {advancedMode ? 'Texto direto na imagem' : 'Sobre o que é seu post?'}
          </h2>
          <p className="text-[13px] text-white/35">
            {advancedMode ? 'Escreva exatamente o que a IA deve renderizar.' : 'Descreva o assunto e a IA cria o conteúdo.'}
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
            title="Texto direto na imagem"
          >
            <Settings className="h-4 w-4" style={{ color: advancedMode ? '#A78BFA' : 'rgba(255,255,255,0.25)' }} />
          </button>
        )}
      </div>

      {/* Normal mode */}
      {!advancedMode && (
        <>
          {/* Main input */}
          <div className="relative">
            {guestMode ? (
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Ex: 5 dicas de contabilidade para pequenas empresas..."
                className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-2xl min-h-[200px] w-full resize-none text-base leading-relaxed focus:!border-white/15 focus:!ring-0 border px-5 py-4 outline-none transition-colors"
              />
            ) : (
              <PromptMentionInput
                ref={mentionRef}
                value={topic}
                onChange={setTopic}
                mentionedPrompts={mentionedPrompts}
                onMentionAdd={onMentionAdd || (() => {})}
                onMentionRemove={onMentionRemove || (() => {})}
                placeholder="Ex: 5 dicas de contabilidade para pequenas empresas..."
                className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-2xl min-h-[200px] w-full resize-none text-base leading-relaxed focus:!border-white/15 focus:!ring-0 border px-5 py-4 outline-none transition-colors"
              />
            )}
            {/* Subtle action row */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
              {!guestMode && (
                <button
                  onClick={() => mentionRef.current?.triggerMention()}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-white/20 hover:text-white/40 hover:bg-white/[0.06] transition-all"
                  title="Inserir menção"
                >
                  <span className="text-xs font-medium">@</span>
                </button>
              )}
              <button
                onClick={onEnhance}
                disabled={enhancingPrompt || !topic.trim()}
                className="h-7 w-7 rounded-md flex items-center justify-center text-white/20 hover:text-white/40 hover:bg-white/[0.06] transition-all disabled:opacity-10"
                title="Melhorar com IA"
              >
                {enhancingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Topic suggestions */}
          {!topic.trim() && (
            <div className="space-y-2">
              <p className="text-[11px] text-white/25">Sugestões rápidas:</p>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                {topicSuggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setTopic(s.prompt)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-all hover:bg-white/[0.06] flex-shrink-0"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.4)',
                    }}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Web search toggle */}
          {setForceWebSearch && !classifyingTopic && !searchingWeb && (
            <button
              onClick={() => setForceWebSearch(!forceWebSearch)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all text-left"
              style={{
                backgroundColor: forceWebSearch ? `rgba(${accentRgb},0.07)` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${forceWebSearch ? `rgba(${accentRgb},0.15)` : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <Globe className="h-4 w-4 flex-shrink-0" style={{ color: forceWebSearch ? accentHex : 'rgba(255,255,255,0.2)' }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium" style={{ color: forceWebSearch ? accentHex : 'rgba(255,255,255,0.35)' }}>
                  Buscar fontes reais na web
                </span>
                <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `rgba(${accentRgb},0.12)`, color: accentHex }}>
                  +1 crédito
                </span>
              </div>
              <div className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0" style={{ backgroundColor: forceWebSearch ? accentHex : 'rgba(255,255,255,0.08)' }}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${forceWebSearch ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
          )}

          {/* Loading states */}
          {classifyingTopic && (
            <div className="flex items-center gap-3 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-white/30" />
              <span className="text-xs text-white/30">Analisando tema...</span>
            </div>
          )}
          {searchingWeb && !webSearchResult && (
            <div className="flex items-center gap-3 py-3">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: `rgba(${accentRgb},0.5)` }} />
              <span className="text-xs" style={{ color: `rgba(${accentRgb},0.4)` }}>Pesquisando na web...</span>
            </div>
          )}
        </>
      )}

      {/* Advanced mode */}
      {advancedMode && setManualPostText && (
        <div className="space-y-2">
          <textarea
            value={manualPostText || ''}
            onChange={(e) => setManualPostText(e.target.value)}
            placeholder="Digite o texto exato que a IA deve renderizar na imagem..."
            className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 placeholder-white/20 text-sm px-4 py-3 rounded-xl resize-none outline-none focus:border-white/15 transition-colors min-h-[200px]"
            rows={6}
          />
          <p className="text-[11px] text-white/20">Texto renderizado diretamente na imagem com tipografia editorial.</p>
        </div>
      )}
    </div>
  );
};

export default StepTopic;
