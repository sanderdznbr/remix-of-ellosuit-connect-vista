import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Loader2, Wand2, Globe, Settings, Sparkles, Zap, Search, ExternalLink } from 'lucide-react';
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
  wizardMode?: 'simple' | 'advanced' | 'extreme' | 'tweet' | 'tweet2' | 'animated';
  setContentMode?: (mode: 'carousel' | 'single-post') => void;
  guestMode?: boolean;
  webSearchSuggestion?: { classification: string; reason: string } | null;
  onAcceptWebSearch?: () => void;
  onDeclineWebSearch?: () => void;
  classifyingTopic?: boolean;
  forceWebSearch?: boolean;
  setForceWebSearch?: (v: boolean) => void;
}

// Keywords that suggest the topic is news/current events
const NEWS_KEYWORDS = [
  'notícia', 'noticias', 'news', 'atualização', 'últimas', 'hoje',
  'tendência', 'tendencias', 'trend', 'mercado', 'dados', 'estatística',
  'pesquisa', 'estudo', 'relatório', 'report', 'ranking', 'top ',
  'melhores', 'piores', 'preço', 'precos', 'salário', 'salarios',
  'economia', 'política', 'eleição', 'governo', 'lei ', 'regulamentação',
  'ia ', 'inteligência artificial', 'artificial intelligence', 'ai ',
  'tecnologia', 'lançamento', 'release', 'update', 'nova versão',
  'covid', 'pandemia', 'inflação', 'dólar', 'bitcoin', 'cripto',
];

// Keywords that suggest personal/brand content (no web search needed)
const PERSONAL_KEYWORDS = [
  'meu ', 'minha ', 'nosso', 'nossa', 'meus ', 'minhas ',
  'meu negócio', 'minha empresa', 'minha marca', 'meu produto',
  'dicas de', 'como fazer', 'tutorial', 'passo a passo',
  'receita', 'treino', 'rotina', 'hábito', 'motivação',
  'frase', 'reflexão', 'pensamento', 'quote',
];

function detectTopicType(text: string): 'news' | 'personal' | 'unknown' {
  const lower = text.toLowerCase().trim();
  if (!lower || lower.length < 8) return 'unknown';
  
  const newsScore = NEWS_KEYWORDS.filter(k => lower.includes(k)).length;
  const personalScore = PERSONAL_KEYWORDS.filter(k => lower.includes(k)).length;
  
  if (newsScore > personalScore && newsScore >= 1) return 'news';
  if (personalScore > newsScore && personalScore >= 1) return 'personal';
  return 'unknown';
}

// AI-powered prompt suggestions based on the topic
const SMART_SUGGESTIONS: { trigger: string[]; suggestion: string }[] = [
  { trigger: ['pet', 'animal', 'cachorro', 'gato', 'veterinário'], suggestion: 'Adicione números ou estatísticas para mais impacto, ex: "5 cuidados..."' },
  { trigger: ['comida', 'receita', 'restaurante', 'gastronomia', 'chef'], suggestion: 'Mencione ingredientes específicos ou técnicas culinárias para conteúdo mais rico' },
  { trigger: ['fitness', 'treino', 'exercício', 'academia', 'musculação'], suggestion: 'Inclua o nível de dificuldade ou público-alvo (iniciante, avançado)' },
  { trigger: ['marketing', 'vendas', 'negócio', 'empreendedor'], suggestion: 'Adicione dados de mercado ou cases de sucesso para mais credibilidade' },
  { trigger: ['saúde', 'saude', 'bem-estar', 'medicina', 'doença'], suggestion: 'Referencie estudos ou profissionais da área para conteúdo confiável' },
  { trigger: ['beleza', 'cabelo', 'pele', 'maquiagem', 'estética'], suggestion: 'Especifique o tipo de pele/cabelo ou tendência da temporada' },
  { trigger: ['tecnologia', 'app', 'software', 'programação'], suggestion: 'Mencione ferramentas específicas ou comparações para engajar mais' },
  { trigger: ['educação', 'estudo', 'aprendizado', 'curso'], suggestion: 'Inclua métodos comprovados ou benefícios tangíveis' },
  { trigger: ['imóvel', 'casa', 'apartamento', 'imobiliária'], suggestion: 'Adicione faixa de preço, localização ou dicas de financiamento' },
];

function getSmartSuggestion(text: string): string | null {
  const lower = text.toLowerCase();
  for (const item of SMART_SUGGESTIONS) {
    if (item.trigger.some(t => lower.includes(t))) return item.suggestion;
  }
  if (lower.length > 15) return 'Dica: quanto mais detalhes você der, melhor será o resultado da IA ✨';
  return null;
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
}) => {
  const mentionRef = useRef<PromptMentionRef>(null);
  const t = getThemeClasses(getAccentTheme(wizardMode));
  const [advancedMode, setAdvancedMode] = useState(false);
  const isSimple = wizardMode === 'simple';
  const [autoDetected, setAutoDetected] = useState<'news' | 'personal' | 'unknown'>('unknown');

  // Auto-detect topic type and toggle web search
  useEffect(() => {
    if (!setForceWebSearch) return;
    const type = detectTopicType(topic);
    setAutoDetected(type);
    
    if (type === 'news' && !forceWebSearch) {
      setForceWebSearch(true);
    }
    // Don't auto-disable — let user control that
  }, [topic]);

  const smartSuggestion = topic.trim() ? getSmartSuggestion(topic) : null;

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
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      {/* Header with gear toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {advancedMode ? 'Texto direto na imagem' : 'Sobre o que é seu post?'}
          </h2>
          <p className="text-sm text-white/40">
            {advancedMode ? 'Escreva exatamente o que a IA deve renderizar na imagem.' : 'Descreva o assunto e a IA criará o conteúdo completo.'}
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
                placeholder="Descreva o assunto do seu post com o máximo de detalhes possível. Quanto mais informações, melhor o resultado..."
                className="!bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/25 rounded-2xl min-h-[180px] w-full resize-none text-base leading-relaxed focus:!border-purple-500/40 focus:!ring-0 pr-12 border px-5 py-4 outline-none transition-colors"
              />
            ) : (
              <PromptMentionInput
                ref={mentionRef}
                value={topic}
                onChange={setTopic}
                mentionedPrompts={mentionedPrompts}
                onMentionAdd={onMentionAdd || (() => {})}
                onMentionRemove={onMentionRemove || (() => {})}
                placeholder="Descreva o assunto do seu post com o máximo de detalhes possível. Quanto mais informações, melhor o resultado..."
                className="!bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/25 rounded-2xl min-h-[180px] w-full resize-none text-base leading-relaxed focus:!border-purple-500/40 focus:!ring-0 pr-24 border px-5 py-4 outline-none transition-colors"
              />
            )}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
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
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-purple-200 transition-all disabled:opacity-20 border border-purple-500/20"
                title="Melhorar prompt com IA"
              >
                {enhancingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                <span className="text-xs font-medium">Melhorar</span>
              </button>
            </div>
          </div>

          {/* AI Smart Suggestion */}
          {smartSuggestion && !enhancingPrompt && (
            <div 
              className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: 'rgba(139,92,246,0.06)',
                border: '1px solid rgba(139,92,246,0.12)',
              }}
            >
              <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#A78BFA' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(167,139,250,0.8)' }}>
                {smartSuggestion}
              </p>
            </div>
          )}

          {/* Auto-detection badge */}
          {autoDetected !== 'unknown' && topic.trim().length > 10 && (
            <div className="flex items-center gap-2">
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: autoDetected === 'news' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
                  color: autoDetected === 'news' ? '#93C5FD' : '#86EFAC',
                  border: `1px solid ${autoDetected === 'news' ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)'}`,
                }}
              >
                {autoDetected === 'news' ? (
                  <><Globe className="h-3 w-3" /> Conteúdo informativo detectado</>
                ) : (
                  <><Zap className="h-3 w-3" /> Conteúdo autoral detectado</>
                )}
              </span>
            </div>
          )}

          {/* Topic suggestions */}
          {!topic.trim() && (
            <div className="space-y-2">
              <p className="text-xs text-white/30 font-medium">💡 Sugestões rápidas — clique para usar:</p>
              <div className="flex flex-wrap gap-2">
                {topicSuggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setTopic(s.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all hover:scale-[1.03]"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Web search toggle — redesigned */}
          {setForceWebSearch && !classifyingTopic && !searchingWeb && (
            <div
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                backgroundColor: forceWebSearch ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${forceWebSearch ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <button
                onClick={() => setForceWebSearch(!forceWebSearch)}
                className="flex items-center gap-3 w-full px-4 py-3.5 transition-all"
              >
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: forceWebSearch ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Globe className="h-4.5 w-4.5" style={{ color: forceWebSearch ? '#60A5FA' : 'rgba(255,255,255,0.3)' }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: forceWebSearch ? '#BFDBFE' : 'rgba(255,255,255,0.5)' }}>
                      Pesquisa inteligente na web
                    </span>
                    <span 
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: 'rgba(139,92,246,0.15)',
                        color: '#C4B5FD',
                        border: '1px solid rgba(139,92,246,0.25)',
                      }}
                    >
                      +1 crédito
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: forceWebSearch ? 'rgba(147,197,253,0.6)' : 'rgba(255,255,255,0.25)' }}>
                    Busca fontes reais, notícias e dados atualizados para enriquecer seu conteúdo
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className={`relative w-10 h-[22px] rounded-full transition-colors ${forceWebSearch ? 'bg-blue-500' : 'bg-white/[0.1]'}`}>
                    <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${forceWebSearch ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                  </div>
                </div>
              </button>
              
              {forceWebSearch && (
                <div className="px-4 pb-3 flex items-center gap-4 text-[10px]" style={{ color: 'rgba(147,197,253,0.45)' }}>
                  <span className="flex items-center gap-1"><Search className="h-3 w-3" /> Fontes verificadas</span>
                  <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Citações reais</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Dados atualizados</span>
                </div>
              )}
            </div>
          )}

          {/* Web search loading indicators */}
          {classifyingTopic && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              <span className="text-sm text-white/40">Analisando seu tema...</span>
            </div>
          )}

          {searchingWeb && !webSearchResult && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400/60" />
              <span className="text-sm text-blue-300/50">Pesquisando fontes reais na web...</span>
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
