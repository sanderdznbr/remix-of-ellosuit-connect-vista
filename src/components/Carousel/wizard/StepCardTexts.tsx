import React, { useState } from 'react';
import { Loader2, Wand2, ChevronDown, ChevronUp, Type } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CardText {
  title?: string;
  body?: string;
}

interface Props {
  cardCount: number;
  contentMode: 'carousel' | 'single-post';
  manualCardTexts: CardText[];
  setManualCardTexts: (v: CardText[]) => void;
  topic: string;
  accentTheme?: 'purple' | 'orange' | 'red';
}

const StepCardTexts: React.FC<Props> = ({
  cardCount, contentMode, manualCardTexts, setManualCardTexts, topic, accentTheme = 'purple',
}) => {
  const [filling, setFilling] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(0);

  const totalCards = contentMode === 'single-post' ? 1 : cardCount;

  // Ensure array length matches cardCount
  const texts = Array.from({ length: totalCards }, (_, i) => manualCardTexts[i] || { title: '', body: '' });

  const updateCard = (index: number, field: 'title' | 'body', value: string) => {
    const updated = [...texts];
    updated[index] = { ...updated[index], [field]: value };
    setManualCardTexts(updated);
  };

  const getCardLabel = (index: number) => {
    if (contentMode === 'single-post') return 'Post Único';
    if (index === 0) return 'Card 1 — Capa';
    if (index === totalCards - 1) return `Card ${index + 1} — CTA`;
    return `Card ${index + 1}`;
  };

  const fillWithAI = async () => {
    if (filling) return;
    if (!topic.trim()) {
      toast.error('Defina um tema antes de gerar o roteiro.');
      return;
    }
    setFilling(true);
    try {
      console.log('[StepCardTexts] Calling generate-outline with topic:', topic.trim(), 'cards:', totalCards);
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-outline',
          topic: topic.trim(),
          cardCount: totalCards,
          contentMode,
        },
      });
      console.log('[StepCardTexts] Response:', { data, error });
      if (error) throw error;
      if (data?.outline && Array.isArray(data.outline) && data.outline.length > 0) {
        setManualCardTexts(data.outline);
        toast.success('Roteiro gerado com sucesso!');
      } else {
        // Fallback: generate basic outline locally
        console.warn('[StepCardTexts] No outline from API, using local fallback');
        const fallback = Array.from({ length: totalCards }, (_, i) => {
          if (contentMode === 'single-post') return { title: topic.trim().slice(0, 60), body: '' };
          if (i === 0) return { title: topic.trim().slice(0, 60), body: 'Descubra tudo sobre este assunto' };
          if (i === totalCards - 1) return { title: 'Gostou?', body: 'Siga para mais conteúdo!' };
          return { title: `Ponto ${i}`, body: '' };
        });
        setManualCardTexts(fallback);
        toast.info('Roteiro gerado com modelo local.');
      }
    } catch (err) {
      console.error('[StepCardTexts] AI fill error:', err);
      toast.error('Erro ao gerar roteiro. Tente novamente.');
      // Local fallback on error
      const fallback = Array.from({ length: totalCards }, (_, i) => {
        if (contentMode === 'single-post') return { title: topic.trim().slice(0, 60), body: '' };
        if (i === 0) return { title: topic.trim().slice(0, 60), body: 'Descubra tudo sobre este assunto' };
        if (i === totalCards - 1) return { title: 'Gostou?', body: 'Siga para mais conteúdo!' };
        return { title: `Ponto ${i}`, body: '' };
      });
      setManualCardTexts(fallback);
    } finally {
      setFilling(false);
    }
  };

  const hasAnyText = texts.some(t => (t.title || '').trim() || (t.body || '').trim());
  const isOrange = accentTheme === 'orange';
  const isRed = accentTheme === 'red';
  const accentBg = isOrange ? 'rgba(249,115,22,0.08)' : isRed ? 'rgba(220,38,38,0.08)' : 'rgba(139,92,246,0.08)';
  const accentBorder = isOrange ? 'rgba(249,115,22,0.2)' : isRed ? 'rgba(220,38,38,0.2)' : 'rgba(139,92,246,0.2)';
  const accentIconBg = isOrange ? 'rgba(249,115,22,0.15)' : isRed ? 'rgba(220,38,38,0.15)' : 'rgba(139,92,246,0.15)';
  const accentIconClass = isOrange ? 'text-orange-400' : isRed ? 'text-red-400' : 'text-purple-400';
  const accentBadgeBg = isOrange ? 'bg-orange-500/20' : isRed ? 'bg-red-500/20' : 'bg-purple-500/20';
  const accentBadgeText = isOrange ? 'text-orange-300' : isRed ? 'text-red-300' : 'text-purple-300';

  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Roteiro por Card</h2>
        <p className="text-sm text-white/40">
          Opcional — defina o texto exato de cada card. A IA preenche o que ficar vazio.
        </p>
      </div>

      {/* AI fill button */}
      <button
        onClick={fillWithAI}
        disabled={filling || !topic.trim()}
        className="flex items-center gap-2 w-full p-3 rounded-xl transition-all text-left"
        style={{ backgroundColor: accentBg, border: `1px solid ${accentBorder}` }}
      >
        <div className="p-2 rounded-lg" style={{ backgroundColor: accentIconBg }}>
          {filling ? <Loader2 className={`h-4 w-4 animate-spin ${accentIconClass}`} /> : <Wand2 className={`h-4 w-4 ${accentIconClass}`} />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80">
            {filling ? 'Gerando roteiro...' : hasAnyText ? 'Regenerar com IA' : 'Preencher todos com IA'}
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            A IA sugere títulos e textos para cada card baseado no tema.
          </p>
        </div>
      </button>

      {/* Card list */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {texts.map((card, i) => {
          const isExpanded = expandedCard === i;
          const hasContent = (card.title || '').trim() || (card.body || '').trim();
          return (
            <div
              key={i}
              className="rounded-xl transition-all"
              style={{
                backgroundColor: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${hasContent ? accentBorder : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <button
                onClick={() => setExpandedCard(isExpanded ? null : i)}
                className="flex items-center justify-between w-full px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <Type className="h-3.5 w-3.5 text-white/30" />
                  <span className="text-sm font-medium text-white/70">{getCardLabel(i)}</span>
                  {hasContent && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${accentBadgeBg} ${accentBadgeText}`}>editado</span>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1 block">
                      {i === 0 ? 'Título da capa' : i === totalCards - 1 ? 'Título do CTA' : 'Título'}
                    </label>
                    <input
                      value={card.title || ''}
                      onChange={(e) => updateCard(i, 'title', e.target.value)}
                      placeholder={i === 0 ? 'Ex: 5 DICAS ESSENCIAIS' : 'Título do card...'}
                      className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2 rounded-lg outline-none focus:border-white/15 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1 block">
                      {i === 0 ? 'Subtítulo' : 'Corpo do texto'}
                    </label>
                    <textarea
                      value={card.body || ''}
                      onChange={(e) => updateCard(i, 'body', e.target.value)}
                      placeholder={i === 0 ? 'Subtítulo descritivo...' : 'Conteúdo do card...'}
                      className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2 rounded-lg resize-none outline-none focus:border-white/15 transition-colors min-h-[80px]"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepCardTexts;
