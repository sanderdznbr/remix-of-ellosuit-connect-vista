import React, { useState, useRef, useCallback } from 'react';
import { Loader2, Wand2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Type, ImageIcon, X, RefreshCw, Upload, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';

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
  cardPhotoOptions?: Record<number, string[]>;
  setCardPhotoAssignments?: (v: Record<number, string>) => void;
  onOutlineGenerated?: (outline: CardText[]) => Promise<void> | void;
}

const StepCardTexts: React.FC<Props> = ({
  cardCount, contentMode, manualCardTexts, setManualCardTexts, topic, accentTheme = 'purple',
  webImages, cardPhotoAssignments, cardPhotoOptions, setCardPhotoAssignments, onOutlineGenerated,
}) => {
  const [filling, setFilling] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(0);
  const [pickingPhotoFor, setPickingPhotoFor] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [refreshingCard, setRefreshingCard] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // Swipe state
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isSwiping = useRef(false);

  const totalCards = contentMode === 'single-post' ? 1 : cardCount;
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

  // ── Refresh: auto-search a new photo for a card ──
  const refreshPhoto = async (cardIndex: number) => {
    if (refreshingCard !== null) return;
    const cardData = texts[cardIndex];
    const cardTitle = (cardData?.title || '').trim();
    const cardBody = (cardData?.body || '').trim();
    // Build query from card content — extract names, events, entities
    let query = '';
    if (cardTitle && cardBody) {
      query = `${cardTitle} ${cardBody.split(/[.,;!?]/).slice(0, 2).join(' ')}`.trim();
    } else if (cardTitle) {
      query = cardTitle;
    } else {
      query = topic || '';
    }
    if (!query.trim()) { toast.error('Sem texto para buscar foto'); return; }
    // Add topic as fallback context if query is short
    if (query.length < 15) query = `${topic} ${query}`.trim();
    setRefreshingCard(cardIndex);
    try {
      const currentUrl = cardPhotoAssignments?.[cardIndex];
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'web-search', query: `${query} photo` },
      });
      if (error) throw error;
      const urls: string[] = (data?.images || [])
        .map((img: any) => img.url || img)
        .filter((u: string) => typeof u === 'string' && u.startsWith('http') && u !== currentUrl);
      if (urls.length > 0) {
        // Pick a random one that's not already used by another card
        const usedUrls = new Set(Object.values(cardPhotoAssignments || {}));
        const unused = urls.filter(u => !usedUrls.has(u));
        const pick = unused.length > 0 ? unused[Math.floor(Math.random() * unused.length)] : urls[0];
        assignPhoto(cardIndex, pick);
        toast.success('Foto atualizada!');
      } else {
        toast.info('Nenhuma foto diferente encontrada. Tente buscar manualmente.');
        setPickingPhotoFor(cardIndex);
      }
    } catch {
      toast.error('Erro ao buscar nova foto');
    } finally {
      setRefreshingCard(null);
    }
  };

  const fillWithAI = async () => {
    if (filling) return;
    if (!topic.trim()) { toast.error('Defina um tema antes de gerar o roteiro.'); return; }
    setFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'generate-outline', topic: topic.trim(), cardCount: totalCards, contentMode },
      });
      if (error) throw error;
      if (data?.outline && Array.isArray(data.outline) && data.outline.length > 0) {
        setManualCardTexts(data.outline);
        await onOutlineGenerated?.(data.outline);
        toast.success('Roteiro gerado com sucesso!');
      } else {
        const fallback = Array.from({ length: totalCards }, (_, i) => {
          if (contentMode === 'single-post') return { title: topic.trim().slice(0, 60), body: '' };
          if (i === 0) return { title: topic.trim().slice(0, 60), body: 'Descubra tudo sobre este assunto' };
          if (i === totalCards - 1) return { title: 'Gostou?', body: 'Siga para mais conteúdo!' };
          return { title: `Ponto ${i}`, body: '' };
        });
        setManualCardTexts(fallback);
        await onOutlineGenerated?.(fallback);
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
      await onOutlineGenerated?.(fallback);
    } finally { setFilling(false); }
  };

  // ── Manual photo upload ──
  const handleManualUpload = (cardIndex: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          assignPhoto(cardIndex, dataUrl);
          toast.success('Foto adicionada!');
        };
        reader.readAsDataURL(file);
      } catch {
        toast.error('Erro ao carregar imagem');
      }
    };
    input.click();
  };

  // ── Web search for images ──
  const searchWebPhotos = async (query: string) => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'web-search', query: query.trim() },
      });
      if (error) throw error;
      if (data?.images) {
        const urls = data.images.map((img: any) => img.url || img).filter((u: string) => typeof u === 'string' && u.startsWith('http'));
        setSearchResults(urls);
        if (urls.length === 0) toast.info('Nenhuma imagem encontrada');
      }
    } catch {
      toast.error('Erro na busca');
    } finally {
      setSearching(false);
    }
  };

  // ── Swipe handlers ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = delta;
    // Only start swiping if horizontal movement > 10px
    if (Math.abs(delta) > 10) {
      isSwiping.current = true;
      // Limit swipe at edges
      if ((currentSlide === 0 && delta > 0) || (currentSlide === totalCards - 1 && delta < 0)) {
        setSwipeOffset(delta * 0.3); // rubber band
      } else {
        setSwipeOffset(delta);
      }
    }
  }, [currentSlide, totalCards]);

  const handleTouchEnd = useCallback(() => {
    const threshold = 60;
    if (touchDeltaX.current < -threshold && currentSlide < totalCards - 1) {
      setCurrentSlide(prev => prev + 1);
    } else if (touchDeltaX.current > threshold && currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
    setSwipeOffset(0);
    isSwiping.current = false;
  }, [currentSlide, totalCards]);

  const hasAnyText = texts.some(t => (t.title || '').trim() || (t.body || '').trim());
  const isOrange = accentTheme === 'orange';
  const isRed = accentTheme === 'red';
  const accentBg = isOrange ? 'rgba(249,115,22,0.08)' : isRed ? 'rgba(220,38,38,0.08)' : 'rgba(139,92,246,0.08)';
  const accentBorder = isOrange ? 'rgba(249,115,22,0.2)' : isRed ? 'rgba(220,38,38,0.2)' : 'rgba(139,92,246,0.2)';
  const accentIconBg = isOrange ? 'rgba(249,115,22,0.15)' : isRed ? 'rgba(220,38,38,0.15)' : 'rgba(139,92,246,0.15)';
  const accentIconClass = isOrange ? 'text-orange-400' : isRed ? 'text-red-400' : 'text-purple-400';
  const accentBadgeBg = isOrange ? 'bg-orange-500/20' : isRed ? 'bg-red-500/20' : 'bg-purple-500/20';
  const accentBadgeText = isOrange ? 'text-orange-300' : isRed ? 'text-red-300' : 'text-purple-300';
  const accentColor = isOrange ? '#FB923C' : isRed ? '#F87171' : '#A78BFA';
  const hasWebPhotos = availableWebImages.length > 0;

  // ── Photo Picker Modal (shared) ──
  const photoPickerModal = pickingPhotoFor !== null && (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setPickingPhotoFor(null); setSearchResults([]); setSearchQuery(''); }}>
      <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 shadow-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <span className="text-sm font-medium text-white">Foto — {getCardLabel(pickingPhotoFor)}</span>
          <button onClick={() => { setPickingPhotoFor(null); setSearchResults([]); setSearchQuery(''); }} className="text-white/40 hover:text-white/70"><X className="h-4 w-4" /></button>
        </div>

        {/* Actions: Upload + Search */}
        <div className="px-4 pt-4 space-y-3">
          <button onClick={() => handleManualUpload(pickingPhotoFor)}
            className="flex items-center gap-2.5 w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-left">
            <div className="p-2 rounded-lg bg-blue-500/15"><Upload className="h-4 w-4 text-blue-400" /></div>
            <div>
              <p className="text-sm font-medium text-white/80">Enviar do dispositivo</p>
              <p className="text-[11px] text-white/30">Selecione uma foto do seu celular ou computador</p>
            </div>
          </button>

          <div className="flex gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar imagem na web..."
              className="!bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/25 rounded-xl flex-1 text-sm h-10 focus:!border-white/20 focus:!ring-0"
              onKeyDown={(e) => e.key === 'Enter' && searchWebPhotos(searchQuery)} />
            <button onClick={() => searchWebPhotos(searchQuery)} disabled={searching || !searchQuery.trim()}
              className="px-3.5 h-10 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white/60 transition-all disabled:opacity-30">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-[11px] text-white/30 mb-2">{searchResults.length} resultados</p>
            <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[30vh]">
              {searchResults.map((url, idx) => (
                <button key={idx} onClick={() => assignPhoto(pickingPhotoFor, url)}
                  className="relative rounded-lg overflow-hidden ring-1 ring-white/[0.06] hover:ring-white/20 transition-all h-24">
                  <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing web images */}
        {hasWebPhotos && (
          <div className="px-4 py-3">
            <p className="text-[11px] text-white/30 mb-2">Fotos encontradas ({availableWebImages.length})</p>
            <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[35vh]">
              {availableWebImages.map((url, idx) => {
                const isUsedByOther = Object.entries(cardPhotoAssignments || {}).some(([k, v]) => v === url && Number(k) !== pickingPhotoFor);
                const isCurrentlyAssigned = cardPhotoAssignments?.[pickingPhotoFor] === url;
                return (
                  <button key={idx} onClick={() => assignPhoto(pickingPhotoFor, url)}
                    className={`relative rounded-lg overflow-hidden transition-all h-24 ${isCurrentlyAssigned ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20' : isUsedByOther ? 'ring-1 ring-yellow-500/30 opacity-60' : 'ring-1 ring-white/[0.06] hover:ring-white/20'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    {isCurrentlyAssigned && <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><span className="text-white text-[10px] font-bold">✓</span></div>}
                    {isUsedByOther && <div className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-yellow-300 px-1.5 py-0.5 rounded">em uso</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );

  // ── MOBILE SLIDER LAYOUT WITH SWIPE ──
  if (isMobile) {
    const card = texts[currentSlide] || { title: '', body: '' };
    const assignedPhoto = cardPhotoAssignments?.[currentSlide];

    return (
      <div className="space-y-3" style={{ minHeight: '300px' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Roteiro</h2>
          <button onClick={fillWithAI} disabled={filling || !topic.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}>
            {filling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {hasAnyText ? 'Regenerar' : 'Gerar'}
          </button>
        </div>

        {/* Swipeable slider container */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-2xl"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex"
            style={{
              transform: `translateX(calc(-${currentSlide * 100}% + ${swipeOffset}px))`,
              transition: swipeOffset === 0 ? 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
              willChange: 'transform',
            }}
          >
            {texts.map((cardData, i) => {
              const photo = cardPhotoAssignments?.[i];
              return (
                <div key={i} className="w-full flex-shrink-0">
                  <div className="border border-white/[0.08] rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    {/* Photo — full width, no crop (contain) */}
                    {photo ? (
                      <div className="relative w-full bg-black/40" style={{ minHeight: 180 }}>
                        <img
                          src={photo}
                          alt=""
                          className="w-full max-h-[220px] object-contain mx-auto"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button onClick={() => refreshPhoto(i)}
                            disabled={refreshingCard === i}
                            className="p-2 rounded-xl bg-black/50 backdrop-blur-sm text-white/80 active:scale-95 transition-transform disabled:opacity-50">
                            {refreshingCard === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </button>
                          <button onClick={() => removePhoto(i)}
                            className="p-2 rounded-xl bg-black/50 backdrop-blur-sm text-white/80 active:scale-95 transition-transform">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <span className="text-[10px] px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/70 font-medium">
                            📷 {photo.startsWith('data:') ? 'Foto manual' : 'Foto da web'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setPickingPhotoFor(i)}
                        className="w-full bg-white/[0.02] flex flex-col items-center justify-center gap-2 text-white/25 active:bg-white/[0.05] transition-colors"
                        style={{ minHeight: 140 }}>
                        <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                        <span className="text-xs">Toque para adicionar foto</span>
                        <span className="text-[10px] text-white/15">Web, busca ou do dispositivo</span>
                      </button>
                    )}

                    {/* Card text content */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accentColor + '99' }}>
                          {getCardLabel(i)}
                        </span>
                        {((cardData.title || '').trim() || (cardData.body || '').trim()) && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${accentBadgeBg} ${accentBadgeText}`}>✓</span>
                        )}
                      </div>
                      <input
                        value={cardData.title || ''}
                        onChange={(e) => updateCard(i, 'title', e.target.value)}
                        placeholder={i === 0 ? 'Título da capa...' : 'Título do card...'}
                        className="w-full bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-white/15 transition-colors"
                      />
                      <textarea
                        value={cardData.body || ''}
                        onChange={(e) => updateCard(i, 'body', e.target.value)}
                        placeholder={i === 0 ? 'Subtítulo descritivo...' : 'Conteúdo do card...'}
                        className="w-full bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2.5 rounded-xl resize-none outline-none focus:border-white/15 transition-colors"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation dots + arrows */}
        <div className="flex items-center justify-between px-1">
          <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0}
            className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 disabled:opacity-20 active:scale-90 transition-all">
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1.5">
            {texts.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)}
                className="transition-all rounded-full"
                style={{
                  width: currentSlide === i ? 22 : 7,
                  height: 7,
                  backgroundColor: currentSlide === i ? accentColor : 'rgba(255,255,255,0.12)',
                }} />
            ))}
          </div>

          <button onClick={() => setCurrentSlide(Math.min(totalCards - 1, currentSlide + 1))} disabled={currentSlide === totalCards - 1}
            className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 disabled:opacity-20 active:scale-90 transition-all">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Hint */}
        <p className="text-center text-[10px] text-white/15">← Deslize para navegar entre cards →</p>

        {photoPickerModal}
      </div>
    );
  }

  // ── DESKTOP LAYOUT (original accordion) ──
  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Roteiro por Card</h2>
        <p className="text-sm text-white/40">Opcional — defina o texto exato de cada card. A IA preenche o que ficar vazio.</p>
      </div>

      <button onClick={fillWithAI} disabled={filling || !topic.trim()} className="flex items-center gap-2 w-full p-3 rounded-xl transition-all text-left"
        style={{ backgroundColor: accentBg, border: `1px solid ${accentBorder}` }}>
        <div className="p-2 rounded-lg" style={{ backgroundColor: accentIconBg }}>
          {filling ? <Loader2 className={`h-4 w-4 animate-spin ${accentIconClass}`} /> : <Wand2 className={`h-4 w-4 ${accentIconClass}`} />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80">{filling ? 'Gerando roteiro...' : hasAnyText ? 'Regenerar com IA' : 'Preencher todos com IA'}</p>
          <p className="text-xs text-white/30 mt-0.5">A IA sugere títulos e textos para cada card baseado no tema.</p>
        </div>
      </button>


      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {texts.map((card, i) => {
          const isExpanded = expandedCard === i;
          const hasContent = (card.title || '').trim() || (card.body || '').trim();
          const assignedPhoto = cardPhotoAssignments?.[i];
          return (
            <div key={i} className="rounded-xl transition-all"
              style={{ backgroundColor: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${hasContent ? accentBorder : 'rgba(255,255,255,0.06)'}` }}>
              <button onClick={() => setExpandedCard(isExpanded ? null : i)} className="flex items-center justify-between w-full px-4 py-3 text-left">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {assignedPhoto ? (
                    <div className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-blue-500/30">
                      <img src={assignedPhoto} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  ) : (<Type className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />)}
                  <span className="text-sm font-medium text-white/70 truncate">{getCardLabel(i)}</span>
                  {hasContent && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${accentBadgeBg} ${accentBadgeText} flex-shrink-0`}>editado</span>}
                  {assignedPhoto && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 flex-shrink-0">📷 foto</span>}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {setCardPhotoAssignments && (
                    <div>
                      <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Foto do card</label>
                      {assignedPhoto ? (
                        <div className="flex items-center gap-2">
                          <div className="relative w-20 h-14 rounded-lg overflow-hidden ring-1 ring-blue-500/30 flex-shrink-0">
                            <img src={assignedPhoto} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={(e) => { e.stopPropagation(); refreshPhoto(i); }}
                              disabled={refreshingCard === i}
                              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/50 hover:text-white/80 transition-colors disabled:opacity-50" title="Buscar nova foto">
                              {refreshingCard === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleManualUpload(i); }}
                              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/50 hover:text-white/80 transition-colors" title="Enviar foto">
                              <Upload className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors" title="Remover foto">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button onClick={(e) => { e.stopPropagation(); setPickingPhotoFor(i); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/[0.10] text-xs text-white/30 hover:bg-white/[0.04] hover:text-white/50 transition-colors">
                            <ImageIcon className="h-3.5 w-3.5" /> Escolher foto
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleManualUpload(i); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/[0.10] text-xs text-white/30 hover:bg-white/[0.04] hover:text-white/50 transition-colors">
                            <Upload className="h-3.5 w-3.5" /> Enviar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1 block">
                      {i === 0 ? 'Título da capa' : i === totalCards - 1 ? 'Título do CTA' : 'Título'}
                    </label>
                    <input value={card.title || ''} onChange={(e) => updateCard(i, 'title', e.target.value)}
                      placeholder={i === 0 ? 'Ex: 5 DICAS ESSENCIAIS' : 'Título do card...'}
                      className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2 rounded-lg outline-none focus:border-white/15 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1 block">
                      {i === 0 ? 'Subtítulo' : 'Corpo do texto'}
                    </label>
                    <textarea value={card.body || ''} onChange={(e) => updateCard(i, 'body', e.target.value)}
                      placeholder={i === 0 ? 'Subtítulo descritivo...' : 'Conteúdo do card...'}
                      className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2 rounded-lg resize-none outline-none focus:border-white/15 transition-colors min-h-[80px]" rows={3} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {photoPickerModal}
    </div>
  );
};

export default StepCardTexts;
