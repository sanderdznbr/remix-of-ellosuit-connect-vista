import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Sparkles, Loader2, Check, Image as ImageIcon, Layers, Square, RectangleVertical, Smartphone, User, Palette, X, Paperclip, Mic, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
}

const STORAGE_KEY = 'ello_chat_conversations_v1';
const ACTIVE_KEY = 'ello_chat_active_v1';

type WidgetType = 'style_picker' | 'format_picker' | 'personalization' | 'confirm_generate' | null;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  widget?: WidgetType;
  widgetData?: any;
  timestamp: number;
}

interface BriefState {
  topic?: string;
  format?: 'portrait' | 'square' | 'story';
  contentType?: 'single' | 'carousel';
  cardCount?: number;
  styleId?: string | null;
  styleName?: string | null;
  hasFace?: boolean;
  hasLogo?: boolean;
  hasBrandColors?: boolean;
  brandName?: string;
  audience?: string;
  tone?: string;
}

interface MarketplaceStyle {
  id: string;
  name: string;
  preview_images: string[] | null;
  category?: string | null;
  is_free?: boolean;
}

const FORMAT_OPTIONS = [
  { value: 'portrait', label: 'Retrato 4:5', icon: RectangleVertical },
  { value: 'square', label: 'Quadrado 1:1', icon: Square },
  { value: 'story', label: 'Stories 9:16', icon: Smartphone },
] as const;

const PURPLE = '#8B5CF6';

const ChatCreator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [brief, setBrief] = useState<BriefState>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [styles, setStyles] = useState<MarketplaceStyle[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initRef = useRef(false);

  // Load 4 recommended styles for the picker widget
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('marketplace_styles')
        .select('id, name, preview_images, category, is_free')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(8);
      if (data) setStyles(data as any);
    })();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const callAI = useCallback(async (history: ChatMessage[], currentBrief: BriefState) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-creator', {
        body: {
          messages: history.map(m => ({ role: m.role, content: m.content })),
          brief: currentBrief,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newBrief = { ...currentBrief, ...(data.brief_update || {}) };
      setBrief(newBrief);

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || '...',
        widget: data.widget || null,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);

      if (data.ready) {
        // Auto-trigger generation
        setTimeout(() => triggerGenerate(newBrief), 600);
      }
    } catch (err: any) {
      console.error('chat-creator error:', err);
      toast.error(err?.message || 'Erro ao conversar com a IA');
    } finally {
      setLoading(false);
    }
  }, []);

  // Process initial prompt from query string
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const params = new URLSearchParams(location.search);
    const initialPrompt = params.get('prompt') || params.get('topic');
    if (initialPrompt) {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: initialPrompt,
        timestamp: Date.now(),
      };
      setMessages([userMsg]);
      callAI([userMsg], {});
    } else {
      // Greeting
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Oi! Eu sou a Ello 👋 Me conta: o que você quer criar hoje?',
        timestamp: Date.now(),
      }]);
    }
  }, [location.search, callAI]);

  const sendMessage = (text: string, hiddenContext?: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || generating) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    const newMessages = [...messages, userMsg];
    if (hiddenContext) {
      newMessages.push({
        id: crypto.randomUUID(),
        role: 'user',
        content: hiddenContext,
        timestamp: Date.now(),
      } as any);
    }
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    callAI(newMessages, brief);
  };

  const triggerGenerate = (b: BriefState) => {
    setGenerating(true);
    const params = new URLSearchParams();
    if (b.topic) params.set('topic', b.topic);
    if (b.styleId) params.set('styleId', b.styleId);
    if (b.format) params.set('format', b.format);
    if (b.contentType) params.set('mode', b.contentType);
    if (b.cardCount) params.set('cards', String(b.cardCount));
    params.set('autostart', '1');
    // Navigate to home which renders CarouselGenerator with these hints
    setTimeout(() => navigate(`/?${params.toString()}`), 800);
  };

  const handleStylePick = (style: MarketplaceStyle | null) => {
    const label = style ? `Quero o estilo "${style.name}"` : 'Pode escolher um estilo pra mim';
    setBrief(prev => ({ ...prev, styleId: style?.id || null, styleName: style?.name || null }));
    sendMessage(label);
  };

  const handleFormatPick = (format: string, contentType: 'single' | 'carousel', cards?: number) => {
    setBrief(prev => ({ ...prev, format: format as any, contentType, cardCount: cards }));
    const label = contentType === 'carousel'
      ? `Quero um carrossel ${format === 'portrait' ? 'retrato' : format === 'square' ? 'quadrado' : 'stories'} com ${cards || 5} cards`
      : `Quero um post único ${format === 'portrait' ? 'retrato' : format === 'square' ? 'quadrado' : 'stories'}`;
    sendMessage(label);
  };

  const handlePersonalization = (choices: { face: boolean; logo: boolean; colors: boolean }) => {
    setBrief(prev => ({ ...prev, hasFace: choices.face, hasLogo: choices.logo, hasBrandColors: choices.colors }));
    const parts: string[] = [];
    if (choices.face) parts.push('rosto');
    if (choices.logo) parts.push('logo');
    if (choices.colors) parts.push('cores da marca');
    const label = parts.length ? `Quero usar: ${parts.join(', ')}` : 'Pode seguir sem personalização';
    sendMessage(label);
  };

  const handleConfirm = () => {
    sendMessage('Pode gerar!');
  };

  const renderWidget = (msg: ChatMessage) => {
    if (msg.widget === 'style_picker') {
      return <StylePickerWidget styles={styles} onPick={handleStylePick} />;
    }
    if (msg.widget === 'format_picker') {
      return <FormatPickerWidget onPick={handleFormatPick} />;
    }
    if (msg.widget === 'personalization') {
      return <PersonalizationWidget onPick={handlePersonalization} />;
    }
    if (msg.widget === 'confirm_generate') {
      return <ConfirmWidget brief={brief} onConfirm={handleConfirm} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 backdrop-blur-md sticky top-0 z-20" style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <Home className="h-4 w-4" />
          <span className="text-sm font-medium">Início</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PURPLE}, #6D28D9)` }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Ello</span>
        </div>
        <div className="w-16" />
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' ? (
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center mt-0.5" style={{ background: `linear-gradient(135deg, ${PURPLE}, #6D28D9)` }}>
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="space-y-3">
                      <div className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                      {renderWidget(msg)}
                    </div>
                  </div>
                ) : (
                  <div
                    className="px-4 py-2.5 rounded-2xl rounded-tr-md max-w-[85%] text-[15px]"
                    style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#fff' }}
                  >
                    {msg.content}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {(loading || generating) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PURPLE}, #6D28D9)` }}>
                <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5 px-4 py-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-1.5 w-1.5 rounded-full bg-white/40" style={{ animation: `bounce 1.4s ${i * 0.15}s infinite ease-in-out` }} />
                ))}
                {generating && <span className="text-xs text-white/50 ml-2">Abrindo o estúdio...</span>}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2 sticky bottom-0" style={{ background: 'linear-gradient(to top, #0A0A0A 70%, transparent)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={generating ? 'Gerando seu post...' : 'Responda à Ello...'}
              disabled={loading || generating}
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none text-[15px] text-white placeholder:text-white/30 max-h-32 py-1.5"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading || generating}
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
              style={{ backgroundColor: input.trim() ? PURPLE : 'rgba(255,255,255,0.1)' }}
            >
              {loading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <ArrowUp className="h-4 w-4 text-white" />}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
};

// ============= WIDGETS =============

const StylePickerWidget: React.FC<{ styles: MarketplaceStyle[]; onPick: (s: MarketplaceStyle | null) => void }> = ({ styles, onPick }) => {
  const top4 = styles.slice(0, 4);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 max-w-md">
        {top4.map((s) => {
          const preview = s.preview_images?.[0];
          return (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              {preview ? (
                <img src={preview} alt={s.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-[11px] font-medium text-white truncate">{s.name}</p>
              </div>
              {s.is_free && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: PURPLE }}>
                  FREE
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => onPick(null)} className="text-xs px-3 py-1.5 rounded-full text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors">
          Escolha por mim
        </button>
        <button onClick={() => onPick(null)} className="text-xs px-3 py-1.5 rounded-full text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors">
          Pular estilo
        </button>
      </div>
    </div>
  );
};

const FormatPickerWidget: React.FC<{ onPick: (format: string, type: 'single' | 'carousel', cards?: number) => void }> = ({ onPick }) => {
  const [type, setType] = useState<'single' | 'carousel' | null>(null);
  const [cards, setCards] = useState(5);

  if (!type) {
    return (
      <div className="flex gap-2 flex-wrap max-w-md">
        <button onClick={() => setType('single')} className="flex-1 min-w-[140px] flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 hover:border-white/30 transition-all text-left" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <ImageIcon className="h-4 w-4 text-white/70" />
          <div>
            <div className="text-sm font-medium text-white">Post único</div>
            <div className="text-[11px] text-white/40">1 card</div>
          </div>
        </button>
        <button onClick={() => setType('carousel')} className="flex-1 min-w-[140px] flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 hover:border-white/30 transition-all text-left" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <Layers className="h-4 w-4 text-white/70" />
          <div>
            <div className="text-sm font-medium text-white">Carrossel</div>
            <div className="text-[11px] text-white/40">vários slides</div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-md">
      {type === 'carousel' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">Quantos cards?</span>
          <div className="flex gap-1">
            {[3, 5, 7, 10].map(n => (
              <button key={n} onClick={() => setCards(n)} className="h-7 w-7 rounded-md text-xs font-medium transition-all" style={{ backgroundColor: cards === n ? PURPLE : 'rgba(255,255,255,0.06)', color: '#fff' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {FORMAT_OPTIONS.map(f => {
          const Icon = f.icon;
          return (
            <button key={f.value} onClick={() => onPick(f.value, type, type === 'carousel' ? cards : undefined)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Icon className="h-3.5 w-3.5 text-white/70" />
              <span className="text-xs text-white">{f.label}</span>
            </button>
          );
        })}
      </div>
      <button onClick={() => setType(null)} className="text-[11px] text-white/40 hover:text-white/70">← voltar</button>
    </div>
  );
};

const PersonalizationWidget: React.FC<{ onPick: (c: { face: boolean; logo: boolean; colors: boolean }) => void }> = ({ onPick }) => {
  const [choices, setChoices] = useState({ face: false, logo: false, colors: false });
  const toggle = (k: keyof typeof choices) => setChoices(prev => ({ ...prev, [k]: !prev[k] }));

  const items = [
    { key: 'face' as const, label: 'Foto do rosto', icon: User },
    { key: 'logo' as const, label: 'Logo da marca', icon: ImageIcon },
    { key: 'colors' as const, label: 'Cores da marca', icon: Palette },
  ];

  return (
    <div className="space-y-2 max-w-md">
      <div className="flex flex-wrap gap-2">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
            style={{
              backgroundColor: choices[key] ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
              borderColor: choices[key] ? PURPLE : 'rgba(255,255,255,0.1)',
            }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: choices[key] ? PURPLE : 'rgba(255,255,255,0.6)' }} />
            <span className="text-xs text-white">{label}</span>
            {choices[key] && <Check className="h-3 w-3" style={{ color: PURPLE }} />}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onPick(choices)} className="text-xs h-8" style={{ backgroundColor: PURPLE }}>
          Confirmar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onPick({ face: false, logo: false, colors: false })} className="text-xs h-8 text-white/60">
          Pular
        </Button>
      </div>
    </div>
  );
};

const ConfirmWidget: React.FC<{ brief: BriefState; onConfirm: () => void }> = ({ brief, onConfirm }) => {
  return (
    <div className="space-y-3 max-w-md">
      <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
        {brief.topic && <Row label="Tema" value={brief.topic} />}
        {brief.styleName && <Row label="Estilo" value={brief.styleName} />}
        {brief.format && <Row label="Formato" value={brief.format === 'portrait' ? 'Retrato 4:5' : brief.format === 'square' ? 'Quadrado 1:1' : 'Stories 9:16'} />}
        {brief.contentType && <Row label="Tipo" value={brief.contentType === 'carousel' ? `Carrossel${brief.cardCount ? ` (${brief.cardCount} cards)` : ''}` : 'Post único'} />}
      </div>
      <Button onClick={onConfirm} className="w-full h-10" style={{ backgroundColor: PURPLE }}>
        <Sparkles className="h-4 w-4 mr-2" />
        Gerar agora
      </Button>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-baseline gap-2 text-xs">
    <span className="text-white/40 w-14 shrink-0">{label}</span>
    <span className="text-white/90 truncate">{value}</span>
  </div>
);

export default ChatCreator;
