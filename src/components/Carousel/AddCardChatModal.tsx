import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Paperclip, Wand2, Loader2, RotateCcw, Sparkles, Image as ImageIcon, Type, Zap } from 'lucide-react';

type ChatMsg =
  | { id: string; role: 'assistant'; kind: 'text'; content: string }
  | { id: string; role: 'assistant'; kind: 'suggestion'; title: string; body: string }
  | { id: string; role: 'user'; kind: 'text'; content: string; attachments?: string[] };

interface Props {
  open: boolean;
  onClose: () => void;
  cardType: 'composed' | 'solid';
  textSize: 'short' | 'medium' | 'long';
  onTextSizeChange: (v: 'short' | 'medium' | 'long') => void;
  generating: boolean;
  autoText: { title: string; body: string } | null;
  generate: (instruction?: string, imageUrls?: string[]) => Promise<void>;
  onApprove: (text: { title: string; body: string }, attachments: string[]) => void;
  onManualCreate: (text: { title: string; body: string }, attachments: string[]) => void;
  themeRgb: string;
  themeRgb2: string;
  themeHex: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const AddCardChatModal = ({
  open, onClose, cardType, textSize, onTextSizeChange, generating, autoText,
  generate, onApprove, onManualCreate, themeRgb, themeRgb2, themeHex,
}: Props) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset & greet when opened
  useEffect(() => {
    if (open) {
      setMessages([
        {
          id: uid(),
          role: 'assistant',
          kind: 'text',
          content: `Vamos criar seu novo card ${cardType === 'composed' ? 'composto' : 'sólido'}. Me diga o que quer trazer nele — pode digitar um tema, colar uma referência, anexar imagem/screenshot ou clicar em **Criar automaticamente** que eu decido.`,
        },
      ]);
      setInput('');
      setAttachments([]);
    }
  }, [open, cardType]);

  // Push AI suggestion when autoText arrives
  useEffect(() => {
    if (autoText && open) {
      setMessages(prev => {
        if (prev.some(m => m.role === 'assistant' && m.kind === 'suggestion' && m.title === autoText.title && m.body === autoText.body)) return prev;
        return [...prev, { id: uid(), role: 'assistant', kind: 'suggestion', title: autoText.title, body: autoText.body }];
      });
    }
  }, [autoText, open]);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, generating]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open]);

  const handleAttach = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 4 - attachments.length);
    Promise.all(arr.map(f => new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    }))).then(urls => setAttachments(prev => [...prev, ...urls].slice(0, 4)));
  };

  const send = async (autoMode = false) => {
    const text = input.trim();
    if (!autoMode && !text && attachments.length === 0) return;
    const instruction = autoMode
      ? 'Escolha um ângulo criativo e único para o próximo card.'
      : (text || 'Sugira algo que combine com as imagens anexadas.');
    if (!autoMode) {
      setMessages(prev => [...prev, { id: uid(), role: 'user', kind: 'text', content: text, attachments: attachments.length ? [...attachments] : undefined }]);
    } else {
      setMessages(prev => [...prev, { id: uid(), role: 'user', kind: 'text', content: '✨ Criar automaticamente' }]);
    }
    setInput('');
    await generate(instruction, attachments);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="add-card-chat-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl h-[min(720px,90vh)] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
          style={{
            background: 'linear-gradient(180deg, #0F0F14 0%, #0A0A0F 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: `0 40px 100px -20px rgba(0,0,0,0.9), 0 0 60px -30px rgba(${themeRgb},0.3)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient glow */}
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none opacity-30"
            style={{ background: `radial-gradient(circle, rgba(${themeRgb},0.5), transparent 70%)`, filter: 'blur(60px)' }}
          />

          {/* Header */}
          <div className="relative flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgba(${themeRgb2},0.7))`, boxShadow: `0 0 24px rgba(${themeRgb},0.5)` }}>
                <Sparkles className="h-4 w-4 text-white" />
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: `rgba(${themeRgb},0.3)` }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Assistente de card</p>
                <p className="text-white font-semibold text-[15px] leading-tight">Novo card — vamos conversar</p>
              </div>
            </div>
            <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-white/[0.06] flex items-center justify-center transition-colors">
              <X className="h-4 w-4 text-white/50" />
            </button>
          </div>

          {/* Quick controls */}
          <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Tamanho</span>
            <div className="flex gap-1">
              {(['short', 'medium', 'long'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => onTextSizeChange(v)}
                  className="px-3 py-1 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    backgroundColor: textSize === v ? `rgba(${themeRgb},0.18)` : 'rgba(255,255,255,0.03)',
                    color: textSize === v ? themeHex : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${textSize === v ? `rgba(${themeRgb},0.4)` : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {v === 'short' ? 'Curto' : v === 'medium' ? 'Médio' : 'Longo'}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button
              onClick={() => send(true)}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, rgba(${themeRgb},0.25), rgba(${themeRgb2},0.15))`, border: `1px solid rgba(${themeRgb},0.35)`, color: themeHex }}
            >
              <Zap className="h-3 w-3" />
              Criar automaticamente
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && m.kind === 'text' && (
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgba(${themeRgb2},0.7))` }}>
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-[13.5px] leading-relaxed text-white/85" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {m.content.split('**').map((chunk, i) => i % 2 === 0 ? chunk : <strong key={i} className="text-white">{chunk}</strong>)}
                    </div>
                  </div>
                )}

                {m.role === 'assistant' && m.kind === 'suggestion' && (
                  <div className="flex gap-3 max-w-[90%]">
                    <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgba(${themeRgb2},0.7))` }}>
                      <Wand2 className="h-3 w-3 text-white" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm p-4 space-y-3" style={{ backgroundColor: `rgba(${themeRgb},0.06)`, border: `1px solid rgba(${themeRgb},0.2)` }}>
                      <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: themeHex }}>Sugestão de conteúdo</p>
                      <div className="space-y-2">
                        <p className="text-white font-semibold text-[15px] leading-snug">{m.title}</p>
                        {m.body && <p className="text-white/60 text-[13px] leading-relaxed">{m.body}</p>}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => generate(input.trim() || 'Gere outra variação com ângulo diferente', attachments)}
                          disabled={generating}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-white/70 hover:text-white transition-colors disabled:opacity-40"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                          Outra ideia
                        </button>
                        <button
                          onClick={() => onApprove({ title: m.title, body: m.body }, attachments)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white transition-all hover:opacity-90"
                          style={{ background: `linear-gradient(135deg, rgba(${themeRgb},1), rgba(${themeRgb2},0.9))`, boxShadow: `0 4px 16px -4px rgba(${themeRgb},0.6)` }}
                        >
                          <Sparkles className="h-3 w-3" />
                          Aprovar e gerar card
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {m.role === 'user' && (
                  <div className="max-w-[85%] space-y-2">
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {m.attachments.map((url, i) => (
                          <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                        ))}
                      </div>
                    )}
                    {m.content && (
                      <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-[13.5px] leading-relaxed text-white ml-auto" style={{ background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgba(${themeRgb2},0.75))` }}>
                        {m.content}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {generating && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgba(${themeRgb2},0.7))` }}>
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ backgroundColor: themeHex, animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ backgroundColor: themeHex, animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ backgroundColor: themeHex, animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="px-5 py-2 flex gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {attachments.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-12 h-12 rounded-lg object-cover" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-black flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                    <X className="h-2.5 w-2.5 text-white/80" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="relative flex items-end gap-2 rounded-2xl p-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleAttach(e.target.files)} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= 4}
                className="h-9 w-9 rounded-lg hover:bg-white/[0.06] flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-30"
                title="Anexar imagem"
              >
                <Paperclip className="h-4 w-4 text-white/50" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Descreva o card, cole referências ou peça uma ideia..."
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-[14px] text-white/90 placeholder-white/30 py-2 px-1 max-h-32"
              />
              <button
                onClick={() => {
                  const text = input.trim();
                  if (text || attachments.length > 0) {
                    // Manual "create with typed text as title"
                    if (text && text.split(' ').length <= 20 && !generating && messages.filter(m => m.role === 'assistant' && m.kind === 'suggestion').length === 0) {
                      // treat as instruction: let AI turn into card
                    }
                    send();
                  }
                }}
                disabled={generating || (!input.trim() && attachments.length === 0)}
                className="h-9 px-4 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-30 flex-shrink-0"
                style={{ background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgba(${themeRgb2},0.75))`, boxShadow: `0 4px 12px -4px rgba(${themeRgb},0.5)` }}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <p className="text-[10px] text-white/25">Enter para enviar · Shift+Enter nova linha</p>
              <button
                onClick={() => {
                  const text = input.trim();
                  if (text) onManualCreate({ title: text, body: '' }, attachments);
                }}
                disabled={!input.trim()}
                className="text-[10px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1 disabled:opacity-30"
              >
                <Type className="h-2.5 w-2.5" />
                Usar como texto manual
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
