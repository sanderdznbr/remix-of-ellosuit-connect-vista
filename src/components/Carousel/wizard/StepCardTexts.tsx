import React, { useState } from 'react';
import { Loader2, Wand2, ChevronDown, ChevronUp, Type, ImageIcon, X, RefreshCw } from 'lucide-react';
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
  webImages?: string[];
  cardPhotoAssignments?: Record<number, string>;
  setCardPhotoAssignments?: (v: Record<number, string>) => void;
}

const StepCardTexts: React.FC<Props> = ({
  cardCount, contentMode, manualCardTexts, setManualCardTexts, topic, accentTheme = 'purple',
  webImages, cardPhotoAssignments, setCardPhotoAssignments,
}) => {
  const [filling, setFilling] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(0);
  const [pickingPhotoFor, setPickingPhotoFor] = useState<number | null>(null);

  const totalCards = contentMode === 'single-post' ? 1 : cardCount;

  // Ensure array length matches cardCount
  const texts = Array.from({ length: totalCards }, (_, i) => manualCardTexts[i] || { title: '', body: '' });

  const availableWebImages = (webImages || []).filter(url => typeof url === 'string' && url.startsWith('http'));

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

  const assignPhoto = (cardIndex: number, url: string) => {
    if (!setCardPhotoAssignments) return;
    setCardPhotoAssignments({ ...cardPhotoAssignments, [cardIndex]: url });
    setPickingPhotoFor(null);
  };

  const removePhoto = (cardIndex: number) => {
    if (!setCardPhotoAssignments || !cardPhotoAssignments) return;
    const updated = { ...cardPhotoAssignments };
    delete updated[cardIndex];
    setCardPhotoAssignments(updated);
  };

  const autoAssignPhotos = () => {
    if (!setCardPhotoAssignments || availableWebImages.length === 0) return;
    const assignments: Record<number, string> = {};
    const usedUrls = new Set<string>();
    
    for (let i = 0; i < totalCards; i++) {
      const cardText = `${texts[i]?.title || ''} ${texts[i]?.body || ''}`.toLowerCase();
      
      // Try to find best match by keyword overlap (simple heuristic)
      let bestImg = '';
      let bestScore = -1;
      
      for (const url of availableWebImages) {
        if (usedUrls.has(url)) continue;
        // Simple scoring: prefer unused images, distribute evenly
        const score = usedUrls.has(url) ? 0 : 1;
        if (score > bestScore) {
          bestScore = score;
          bestImg = url;
        }
      }
      
      if (!bestImg && availableWebImages.length > 0) {
        bestImg = availableWebImages[i % availableWebImages.length];
      }
      
      if (bestImg) {
        assignments[i] = bestImg;
        usedUrls.add(bestImg);
      }
    }
    
    setCardPhotoAssignments(assignments);
    toast.success(`${Object.keys(assignments).length} fotos atribuídas automaticamente`);
  };

  const fillWithAI = async () => {
    if (filling) return;
    if (!topic.trim()) {
      toast.error('Defina um tema antes de gerar o roteiro.');
      return;
    }
    setFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-outline',
          topic: topic.trim(),
          cardCount: totalCards,
          contentMode,
        },
      });
      if (error) throw error;
      if (data?.outline && Array.isArray(data.outline) && data.outline.length > 0) {
        setManualCardTexts(data.outline);
        toast.success('Roteiro gerado com sucesso!');
        // Auto-assign photos after generating outline
        if (availableWebImages.length > 0 && setCardPhotoAssignments) {
          setTimeout(() => autoAssignPhotos(), 300);
        }
      } else {
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
  const hasWebPhotos = availableWebImages.length > 0;

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

      {/* Auto-assign photos button */}
      {hasWebPhotos && setCardPhotoAssignments && (
        <button
          onClick={autoAssignPhotos}
          className="flex items-center gap-2 w-full p-3 rounded-xl transition-all text-left bg-blue-500/[0.08] border border-blue-500/20 hover:bg-blue-500/[0.12]"
        >
          <div className="p-2 rounded-lg bg-blue-500/15">
            <ImageIcon className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white/80">
              Atribuir fotos da web automaticamente
            </p>
            <p className="text-xs text-white/30 mt-0.5">
              {availableWebImages.length} fotos encontradas — distribuir nos cards evitando repetições.
            </p>
          </div>
        </button>
      )}

      {/* Card list */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {texts.map((card, i) => {
          const isExpanded = expandedCard === i;
          const hasContent = (card.title || '').trim() || (card.body || '').trim();
          const assignedPhoto = cardPhotoAssignments?.[i];
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
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Photo thumbnail preview */}
                  {assignedPhoto ? (
                    <div className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-blue-500/30">
                      <img src={assignedPhoto} alt="" className="w-full h-full object-cover" 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  ) : (
                    <Type className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-white/70 truncate">{getCardLabel(i)}</span>
                  {hasContent && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${accentBadgeBg} ${accentBadgeText} flex-shrink-0`}>editado</span>
                  )}
                  {assignedPhoto && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 flex-shrink-0">📷 foto</span>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Photo assignment */}
                  {hasWebPhotos && setCardPhotoAssignments && (
                    <div>
                      <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">
                        Foto real (web)
                      </label>
                      {assignedPhoto ? (
                        <div className="flex items-center gap-2">
                          <div className="relative w-20 h-14 rounded-lg overflow-hidden ring-1 ring-blue-500/30 flex-shrink-0">
                            <img src={assignedPhoto} alt="" className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setPickingPhotoFor(i); }}
                              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/50 hover:text-white/80 transition-colors"
                              title="Trocar foto"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                              title="Remover foto"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPickingPhotoFor(i); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/[0.10] text-xs text-white/30 hover:bg-white/[0.04] hover:text-white/50 transition-colors"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Escolher foto da web
                        </button>
                      )}
                    </div>
                  )}

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

      {/* Photo picker modal */}
      {pickingPhotoFor !== null && hasWebPhotos && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPickingPhotoFor(null)}>
          <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <span className="text-sm font-medium text-white">Escolher foto — {getCardLabel(pickingPhotoFor)}</span>
              <button onClick={() => setPickingPhotoFor(null)} className="text-white/40 hover:text-white/70">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-3 gap-2 overflow-y-auto max-h-[60vh]">
              {availableWebImages.map((url, idx) => {
                const isUsedByOther = Object.entries(cardPhotoAssignments || {}).some(
                  ([k, v]) => v === url && Number(k) !== pickingPhotoFor
                );
                const isCurrentlyAssigned = cardPhotoAssignments?.[pickingPhotoFor] === url;
                return (
                  <button
                    key={idx}
                    onClick={() => assignPhoto(pickingPhotoFor, url)}
                    className={`relative rounded-lg overflow-hidden transition-all h-24 ${
                      isCurrentlyAssigned
                        ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20'
                        : isUsedByOther
                        ? 'ring-1 ring-yellow-500/30 opacity-60'
                        : 'ring-1 ring-white/[0.06] hover:ring-white/20'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    {isCurrentlyAssigned && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">✓</span>
                      </div>
                    )}
                    {isUsedByOther && (
                      <div className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-yellow-300 px-1.5 py-0.5 rounded">
                        em uso
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepCardTexts;
