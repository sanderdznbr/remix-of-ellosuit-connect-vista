import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, Sparkles, ImageIcon, MousePointer2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import assistantAvatar from '@/assets/assistant-avatar.png';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  role: 'assistant' | 'user';
  text: string;
  image?: string;
}

interface RegionSelection {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RegenerateChatDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (instruction: string, attachedImageUrl: string | null, region?: RegionSelection | null) => void;
  cardIndex: number;
  loading?: boolean;
  currentCardImageUrl?: string | null;
}

const ASSISTANT_NAME = 'Laura';

/* ─── Region selector overlay on the card image (desktop only) ─── */
const ImageRegionSelector: React.FC<{
  imageUrl: string;
  region: RegionSelection | null;
  onRegionSelect: (r: RegionSelection | null) => void;
  selecting: boolean;
}> = ({ imageUrl, region, onRegionSelect, selecting }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number } | null>(null);

  const getRelativePos = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selecting) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    setStart(pos);
    setCurrent(pos);
    setDrawing(true);
    onRegionSelect(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !start) return;
    setCurrent(getRelativePos(e));
  };

  const handleMouseUp = () => {
    if (!drawing || !start || !current) return;
    setDrawing(false);
    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const w = Math.abs(current.x - start.x);
    const h = Math.abs(current.y - start.y);
    if (w > 0.02 && h > 0.02) {
      onRegionSelect({ x, y, w, h });
    }
    setStart(null);
    setCurrent(null);
  };

  const drawRect = drawing && start && current
    ? {
        left: `${Math.min(start.x, current.x) * 100}%`,
        top: `${Math.min(start.y, current.y) * 100}%`,
        width: `${Math.abs(current.x - start.x) * 100}%`,
        height: `${Math.abs(current.y - start.y) * 100}%`,
      }
    : region
    ? {
        left: `${region.x * 100}%`,
        top: `${region.y * 100}%`,
        width: `${region.w * 100}%`,
        height: `${region.h * 100}%`,
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden border border-white/10"
      style={{ cursor: selecting ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { if (drawing) handleMouseUp(); }}
    >
      <img src={imageUrl} alt="Card atual" className="w-full h-auto block" />
      {/* Dark overlay when selecting */}
      {selecting && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      )}
      {/* Selection rectangle */}
      {drawRect && (
        <div
          className="absolute border-2 border-purple-400 bg-purple-500/20 pointer-events-none"
          style={drawRect}
        />
      )}
      {selecting && !region && !drawing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-white/70 text-xs text-center">
            Clique e arraste para selecionar a região
          </div>
        </div>
      )}
    </div>
  );
};

const RegenerateChatDialog: React.FC<RegenerateChatDialogProps> = ({
  open, onClose, onConfirm, cardIndex, loading, currentCardImageUrl,
}) => {
  const { isMobile } = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [finalInstruction, setFinalInstruction] = useState('');
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [readyToRegenerate, setReadyToRegenerate] = useState(false);
  const [selectingRegion, setSelectingRegion] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionSelection | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([
        { role: 'assistant', text: 'Oi! Sou a Laura 😊' },
        { role: 'assistant', text: 'Me conta, o que não ficou legal nessa imagem?' },
      ]);
      setInput('');
      setAttachedImage(null);
      setFinalInstruction('');
      setFinalImage(null);
      setReadyToRegenerate(false);
      setThinking(false);
      setSelectingRegion(false);
      setSelectedRegion(null);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setAttachedImage(ev.target.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text && !attachedImage) return;

    const regionInfo = selectedRegion
      ? ` [selecionou região: x=${Math.round(selectedRegion.x*100)}% y=${Math.round(selectedRegion.y*100)}% w=${Math.round(selectedRegion.w*100)}% h=${Math.round(selectedRegion.h*100)}%]`
      : '';

    const userMsg: Message = { role: 'user', text: text + (selectedRegion ? ' 📍 (região marcada)' : ''), image: attachedImage || undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    const userImage = attachedImage;
    setAttachedImage(null);
    const userRegion = selectedRegion;
    setSelectedRegion(null);
    setSelectingRegion(false);
    setThinking(true);

    try {
      const conversationContext = newMessages
        .map(m => `${m.role === 'user' ? 'Usuário' : 'Laura'}: ${m.text}${m.image ? ' [enviou uma foto]' : ''}`)
        .join('\n');

      const isDesktop = !isMobile;
      const regionSystemNote = isDesktop && userRegion
        ? `\nO usuário SELECIONOU uma região específica da imagem: posição (${Math.round(userRegion.x*100)}%, ${Math.round(userRegion.y*100)}%) tamanho (${Math.round(userRegion.w*100)}% x ${Math.round(userRegion.h*100)}%). Use essa informação na instrução final.`
        : '';

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é a Laura, assistente de design simpática e direta. Você ajuda o usuário a melhorar a imagem de um post.

REGRAS DE PERSONALIDADE:
- Fale de forma curta e natural, como mensagem de WhatsApp
- Máximo 1-2 frases por mensagem
- Use emojis com moderação (1 por mensagem no máximo)
- Seja calorosa mas objetiva
- Trate o usuário por "você"

REGRAS DE FLUXO:
${isDesktop ? '- Se o usuário falar de algo específico na imagem (logo, objeto, região): sugira "Quer marcar a região na imagem? Clica no botão 📍 e seleciona!" OU se já selecionou a região, confirme.' : ''}
- Se o usuário mencionar produto, objeto ou pessoa específica e enviar foto: "Perfeito, entendi!"
- Se o usuário mencionar produto sem foto: peça uma foto "Manda uma foto pra eu entender melhor!"
- Quando tiver informação suficiente, responda com EXATAMENTE este formato na última linha:
  [INSTRUÇÃO_FINAL]: <instrução detalhada para a IA>
- A instrução deve ser clara e específica em português
- Se for algo simples (trocar cor, fundo, etc), pode dar a instrução final já na primeira resposta
- Se o usuário selecionou uma região, INCLUA a posição da região na instrução final
- NÃO gere instrução final se precisar de mais info
${regionSystemNote}
${userImage ? 'O usuário enviou uma imagem junto com a mensagem.' : ''}`
            },
            { role: 'user', content: conversationContext + regionInfo },
          ],
          model: 'google/gemini-3-flash-preview',
          lightweight: true,
        },
      });

      if (error) throw error;

      const reply = data?.choices?.[0]?.message?.content || data?.content || data?.reply || '';
      const finalMatch = reply.match(/\[INSTRUÇÃO_FINAL\]:\s*(.+)/s);

      if (finalMatch) {
        const cleanReply = reply.replace(/\[INSTRUÇÃO_FINAL\]:\s*.+/s, '').trim();
        const instruction = finalMatch[1].trim();
        setFinalInstruction(instruction);
        if (userImage) setFinalImage(userImage);
        setReadyToRegenerate(true);

        const replies: Message[] = [];
        if (cleanReply) replies.push({ role: 'assistant', text: cleanReply });
        replies.push({ role: 'assistant', text: 'Prontinho! Posso gerar agora? ✨' });
        setMessages(prev => [...prev, ...replies]);
      } else {
        const parts = reply.split(/\n\n+/).filter(Boolean).map((t: string) => t.trim()).filter(Boolean);
        const replyMessages: Message[] = parts.length > 0
          ? parts.map((t: string) => ({ role: 'assistant' as const, text: t }))
          : [{ role: 'assistant' as const, text: reply }];
        setMessages(prev => [...prev, ...replyMessages]);
      }
    } catch (err) {
      console.warn('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Ops, tive um probleminha. Tenta de novo? 😅' }]);
      setReadyToRegenerate(true);
    } finally {
      setThinking(false);
    }
  }, [input, attachedImage, messages, selectedRegion, isMobile]);

  const handleRegenerate = () => {
    const allUserImages = messages.filter(m => m.role === 'user' && m.image).map(m => m.image!);
    const imageToUse = finalImage || allUserImages[allUserImages.length - 1] || null;
    const instruction = finalInstruction || messages
      .filter(m => m.role === 'user')
      .map(m => m.text)
      .filter(Boolean)
      .join('. ');
    onConfirm(instruction, imageToUse, selectedRegion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  const hasUserMessages = messages.some(m => m.role === 'user');

  /* ─── Chat content (shared between mobile & desktop) ─── */
  const chatContent = (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, i) => {
          const isAssistant = msg.role === 'assistant';
          const showAvatar = isAssistant && (i === 0 || messages[i - 1]?.role !== 'assistant');
          const isLastInGroup = !messages[i + 1] || messages[i + 1]?.role !== msg.role;

          return (
            <div key={i} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} ${isLastInGroup ? 'mb-3' : 'mb-0.5'}`}>
              {isAssistant && (
                <div className="w-7 shrink-0 mr-2">
                  {showAvatar && (
                    <img src={assistantAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                  )}
                </div>
              )}
              <div
                className={`max-w-[80%] px-3.5 py-2.5 text-[14px] leading-[1.45] ${
                  isAssistant
                    ? 'bg-white/[0.07] text-white/85 rounded-2xl rounded-tl-md'
                    : 'bg-purple-600/80 text-white rounded-2xl rounded-tr-md'
                }`}
              >
                {msg.image && (
                  <img src={msg.image} alt="" className="w-full max-w-[200px] rounded-xl mb-2 border border-white/10" />
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          );
        })}

        {thinking && (
          <div className="flex justify-start mb-3">
            <div className="w-7 shrink-0 mr-2" />
            <div className="bg-white/[0.07] rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white/25 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-white/25 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-white/25 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attached preview */}
      {attachedImage && (
        <div className="px-4 pb-2 shrink-0">
          <div className="relative inline-block">
            <img src={attachedImage} alt="" className="h-16 rounded-xl border border-white/10 object-contain" />
            <button onClick={() => setAttachedImage(null)} className="absolute -top-1.5 -right-1.5 bg-red-500/80 hover:bg-red-500 rounded-full p-0.5 transition-colors">
              <X className="h-2.5 w-2.5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Region indicator */}
      {selectedRegion && (
        <div className="px-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-purple-300">
            <MousePointer2 className="h-3.5 w-3.5" />
            Região selecionada
            <button onClick={() => { setSelectedRegion(null); setSelectingRegion(false); }} className="ml-auto text-white/40 hover:text-white/70">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 px-3 py-3 border-t border-white/[0.06]"
        style={isMobile ? { paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' } : {}}>
        {readyToRegenerate ? (
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl text-[15px] font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Regenerar imagem
          </button>
        ) : (
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            {/* Region select button - desktop only */}
            {!isMobile && currentCardImageUrl && (
              <button
                onClick={() => { setSelectingRegion(prev => !prev); if (selectingRegion) setSelectedRegion(null); }}
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  selectingRegion ? 'bg-purple-500/30 text-purple-300' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
                }`}
                title="Selecionar região da imagem"
              >
                <MousePointer2 className="h-5 w-5" />
              </button>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-[14px] text-white placeholder-white/25 resize-none focus:outline-none focus:border-purple-500/40 max-h-24"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={sendMessage}
              disabled={(!input.trim() && !attachedImage) || thinking}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-30 active:scale-95"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        )}
        {hasUserMessages && !readyToRegenerate && (
          <button
            onClick={() => setReadyToRegenerate(true)}
            className="w-full mt-2.5 text-[12px] text-white/20 hover:text-white/40 transition-colors"
          >
            Pular e regenerar direto →
          </button>
        )}
      </div>
    </>
  );

  /* ─── MOBILE: fullscreen ─── */
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-[#0a0a0f]">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <div className="relative">
            <img src={assistantAvatar} alt={ASSISTANT_NAME} className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30" />
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0a0a0f]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white">{ASSISTANT_NAME}</p>
            <p className="text-[11px] text-green-400/80">Online agora</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {chatContent}
      </div>
    );
  }

  /* ─── DESKTOP: centered modal with side-by-side layout ─── */
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="bg-[#0f0f18] border border-white/[0.08] rounded-2xl shadow-2xl flex overflow-hidden"
        style={{ width: 'min(900px, 90vw)', height: 'min(620px, 85vh)' }}
      >
        {/* Left: image preview + region selector */}
        {currentCardImageUrl && (
          <div className="w-[340px] shrink-0 border-r border-white/[0.06] flex flex-col bg-[#0a0a12] p-4">
            <p className="text-xs text-white/30 mb-3 font-medium">Card {cardIndex + 1} — Imagem atual</p>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <ImageRegionSelector
                imageUrl={currentCardImageUrl}
                region={selectedRegion}
                onRegionSelect={setSelectedRegion}
                selecting={selectingRegion}
              />
            </div>
            <button
              onClick={() => { setSelectingRegion(prev => !prev); if (selectingRegion) setSelectedRegion(null); }}
              className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors ${
                selectingRegion
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/[0.04] text-white/40 hover:text-white/60 border border-white/[0.06] hover:border-white/10'
              }`}
            >
              <MousePointer2 className="h-3.5 w-3.5" />
              {selectingRegion ? 'Selecionando região...' : 'Marcar região'}
            </button>
          </div>
        )}

        {/* Right: chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
            <div className="relative">
              <img src={assistantAvatar} alt={ASSISTANT_NAME} className="w-9 h-9 rounded-full object-cover border-2 border-purple-500/30" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0f0f18]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white">{ASSISTANT_NAME}</p>
              <p className="text-[11px] text-green-400/80">Online agora</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {chatContent}
        </div>
      </div>
    </div>
  );
};

export default RegenerateChatDialog;
