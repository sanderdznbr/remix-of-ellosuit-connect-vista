import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Upload, Loader2, Sparkles, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'assistant' | 'user';
  text: string;
  image?: string;
}

interface RegenerateChatDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (instruction: string, attachedImageUrl: string | null) => void;
  cardIndex: number;
  loading?: boolean;
  currentCardImageUrl?: string | null;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  text: 'Olá! 👋 O que você gostaria de mudar nessa imagem? Me conte o que não ficou bom ou como você imagina o resultado ideal.',
};

const RegenerateChatDialog: React.FC<RegenerateChatDialogProps> = ({
  open, onClose, onConfirm, cardIndex, loading, currentCardImageUrl,
}) => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [finalInstruction, setFinalInstruction] = useState('');
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [readyToRegenerate, setReadyToRegenerate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([INITIAL_MESSAGE]);
      setInput('');
      setAttachedImage(null);
      setFinalInstruction('');
      setFinalImage(null);
      setReadyToRegenerate(false);
      setThinking(false);
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

    const userMsg: Message = { role: 'user', text, image: attachedImage || undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    const userImage = attachedImage;
    setAttachedImage(null);
    setThinking(true);

    try {
      const conversationContext = newMessages
        .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.text}${m.image ? ' [enviou uma imagem de referência]' : ''}`)
        .join('\n');

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é um assistente de design que ajuda o usuário a melhorar a imagem de um post/carrossel.

Seu objetivo é entender o que o usuário quer mudar na imagem atual e construir uma instrução clara para a IA de geração de imagens.

Regras:
- Seja breve e direto (máximo 2 frases por resposta)
- Se o usuário mencionar um produto, objeto específico ou pessoa, PEÇA uma foto de referência
- Se o usuário enviar uma foto, agradeça e pergunte se quer mais alguma mudança
- Quando tiver informação suficiente, responda com EXATAMENTE este formato na última linha:
  [INSTRUÇÃO_FINAL]: <instrução detalhada para a IA de geração>
- A instrução final deve ser em português, detalhada e específica
- Se o usuário pedir algo simples (mudar cor, fundo, etc), pode gerar a instrução final na primeira resposta
- NÃO gere a instrução final se ainda precisar de mais informações

${userImage ? 'O usuário acabou de enviar uma imagem de referência junto com a mensagem.' : ''}`
            },
            {
              role: 'user',
              content: conversationContext,
            }
          ],
          model: 'google/gemini-3-flash-preview',
        },
      });

      if (error) throw error;

      const reply = data?.choices?.[0]?.message?.content || data?.content || data?.reply || '';

      // Check if reply contains final instruction
      const finalMatch = reply.match(/\[INSTRUÇÃO_FINAL\]:\s*(.+)/s);
      if (finalMatch) {
        const cleanReply = reply.replace(/\[INSTRUÇÃO_FINAL\]:\s*.+/s, '').trim();
        const instruction = finalMatch[1].trim();
        setFinalInstruction(instruction);
        if (userImage) setFinalImage(userImage);
        setReadyToRegenerate(true);

        if (cleanReply) {
          setMessages(prev => [...prev, { role: 'assistant', text: cleanReply }]);
        }
        setMessages(prev => [...prev, { role: 'assistant', text: '✅ Entendi! Tudo pronto para regenerar com as suas instruções.' }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      }
    } catch (err) {
      console.warn('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Desculpe, houve um erro. Tente novamente ou clique em "Regenerar" para gerar com o que já temos.' }]);
      setReadyToRegenerate(true);
    } finally {
      setThinking(false);
    }
  }, [input, attachedImage, messages]);

  const handleRegenerate = () => {
    // Collect all user images
    const allUserImages = messages.filter(m => m.role === 'user' && m.image).map(m => m.image!);
    const imageToUse = finalImage || allUserImages[allUserImages.length - 1] || null;

    // Collect all user text as instruction if no final instruction
    const instruction = finalInstruction || messages
      .filter(m => m.role === 'user')
      .map(m => m.text)
      .filter(Boolean)
      .join('. ');

    onConfirm(instruction, imageToUse);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  const hasUserMessages = messages.some(m => m.role === 'user');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#111118] border border-white/[0.08] rounded-2xl w-full max-w-md mx-4 shadow-2xl flex flex-col"
        style={{ maxHeight: 'min(85vh, 600px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-white/90">Assistente de Regeneração</p>
              <p className="text-[10px] text-white/30">Card {cardIndex + 1}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: '200px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white/[0.06] text-white/80 rounded-bl-md'
                }`}
              >
                {msg.image && (
                  <img src={msg.image} alt="" className="w-full max-w-[180px] rounded-xl mb-2 border border-white/10" />
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attached preview */}
        {attachedImage && (
          <div className="px-4 pb-1 shrink-0">
            <div className="relative inline-block">
              <img src={attachedImage} alt="" className="h-14 rounded-xl border border-white/10 object-contain" />
              <button onClick={() => setAttachedImage(null)} className="absolute -top-1.5 -right-1.5 bg-white/10 hover:bg-white/20 rounded-full p-0.5">
                <X className="h-2.5 w-2.5 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
          {readyToRegenerate ? (
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Regenerar com instruções
            </button>
          ) : (
            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <button
                onClick={() => fileRef.current?.click()}
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descreva o que quer mudar..."
                rows={1}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-blue-500/40 max-h-20"
                style={{ minHeight: '36px' }}
              />
              <button
                onClick={sendMessage}
                disabled={(!input.trim() && !attachedImage) || thinking}
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
          {hasUserMessages && !readyToRegenerate && (
            <button
              onClick={() => { setReadyToRegenerate(true); }}
              className="w-full mt-2 text-[11px] text-white/25 hover:text-white/40 transition-colors"
            >
              Pular e regenerar direto
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegenerateChatDialog;
