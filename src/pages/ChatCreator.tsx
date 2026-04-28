import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Sparkles, Loader2, Check, Image as ImageIcon, Layers, Square, RectangleVertical, Smartphone, User, Palette, X, Paperclip, Mic, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight, Upload, ArrowLeft, Download, Wand2, Folder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import GalleryPicker from '@/components/Carousel/wizard/GalleryPicker';
import { toast } from 'sonner';

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
}

const STORAGE_KEY = 'ello_chat_conversations_v1';
const ACTIVE_KEY = 'ello_chat_active_v1';
const CHAT_PREFILL_STORAGE_KEY = 'ello_chat_prefill_v1';

type WidgetType = 'style_picker' | 'format_picker' | 'content_type_picker' | 'personalization' | 'approve_content' | 'confirm_generate' | 'background_picker' | 'generating_post' | 'final_result' | null;

interface BackgroundOption { id: string; label: string; url: string; }

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
  brandColors?: string[];
  faceUrl?: string | string[];
  logoUrl?: string | string[];
  audience?: string;
  tone?: string;
  suggested_content?: Array<{ title?: string; subtitle?: string; body?: string }>;
}

interface ChatGenerationPrefill {
  topic?: string;
  styleId?: string | null;
  styleName?: string | null;
  format?: 'portrait' | 'square' | 'story';
  contentType?: 'single' | 'carousel';
  cardCount?: number;
  hasFace?: boolean;
  hasLogo?: boolean;
  hasBrandColors?: boolean;
  brandName?: string;
  brandColors?: string[];
  faceUrl?: string | string[];
  logoUrl?: string | string[];
}

interface MarketplaceStyle {
  id: string;
  name: string;
  preview_images: string[] | null;
  category?: string | null;
  is_free?: boolean;
}

const FORMAT_OPTIONS = [
  { value: 'portrait', label: 'Retrato', sub: '4:5 — Feed', icon: RectangleVertical },
  { value: 'square', label: 'Quadrado', sub: '1:1 — Clássico', icon: Square },
  { value: 'story', label: 'Stories', sub: '9:16 — Vertical', icon: Smartphone },
] as const;

const PURPLE = '#8B5CF6';
const isUuid = (value?: string | null) => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const MAX_AI_HISTORY_MESSAGES = 12;
const MAX_AI_MESSAGE_LENGTH = 1200;
const MAX_AI_FIELD_LENGTH = 240;

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string'
    ? resolve(reader.result)
    : reject(new Error('Falha ao ler arquivo'));
  reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
  reader.readAsDataURL(file);
});

const cloneBrief = (source: BriefState): BriefState => ({
  ...source,
  brandColors: source.brandColors ? [...source.brandColors] : undefined,
});

const sanitizeTextForAI = (value?: string, maxLength = MAX_AI_FIELD_LENGTH) => {
  if (!value) return undefined;
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength) || undefined;
};

const sanitizeMessagesForAI = (history: ChatMessage[]) => history
  .slice(-MAX_AI_HISTORY_MESSAGES)
  .map((message) => ({
    role: message.role,
    content: message.content.replace(/\s+/g, ' ').trim().slice(0, MAX_AI_MESSAGE_LENGTH),
  }))
  .filter((message) => message.content.length > 0);

const sanitizeBriefForAI = (source: BriefState) => ({
  topic: sanitizeTextForAI(source.topic, 320),
  format: source.format,
  contentType: source.contentType,
  cardCount: typeof source.cardCount === 'number' ? source.cardCount : undefined,
  styleId: isUuid(source.styleId) ? source.styleId : null,
  styleName: sanitizeTextForAI(source.styleName, 120),
  hasFace: !!source.hasFace,
  hasLogo: !!source.hasLogo,
  hasBrandColors: !!source.hasBrandColors,
  brandName: sanitizeTextForAI(source.brandName, 120),
  brandColors: source.brandColors?.slice(0, 4),
  audience: sanitizeTextForAI(source.audience, 160),
  tone: sanitizeTextForAI(source.tone, 120),
  faceProvided: Array.isArray(source.faceUrl) ? source.faceUrl.length > 0 : !!source.faceUrl,
  logoProvided: Array.isArray(source.logoUrl) ? source.logoUrl.length > 0 : !!source.logoUrl,
  suggested_content: source.suggested_content,
});

const ChatCreator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [brief, setBrief] = useState<BriefState>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pendingGenerationBrief, setPendingGenerationBrief] = useState<BriefState | null>(null);
  const [styles, setStyles] = useState<MarketplaceStyle[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);

  // Load conversations index
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConversations(JSON.parse(raw));
      const active = localStorage.getItem(ACTIVE_KEY);
      if (active) setActiveConvId(active);
    } catch {}
  }, []);

  // Persist conversation when messages change
  useEffect(() => {
    if (!activeConvId || messages.length === 0) return;
    try {
      const firstUser = messages.find(m => m.role === 'user');
      const title = (firstUser?.content || 'Nova conversa').slice(0, 60);
      localStorage.setItem(`ello_chat_msgs_${activeConvId}`, JSON.stringify({ messages, brief }));
      setConversations(prev => {
        const existing = prev.find(c => c.id === activeConvId);
        const updated = existing
          ? prev.map(c => c.id === activeConvId ? { ...c, title, updatedAt: Date.now() } : c)
          : [{ id: activeConvId, title, updatedAt: Date.now() }, ...prev];
        const sorted = updated.sort((a, b) => b.updatedAt - a.updatedAt);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
        return sorted;
      });
    } catch {}
  }, [messages, brief, activeConvId]);

  // Load ALL available styles for the picker widget (admin sees all, users see free + purchased)
  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;

        // adminmaster sees all
        let isAdmin = false;
        if (uid) {
          const { data: adm } = await supabase.rpc('is_adminmaster', { _user_id: uid });
          isAdmin = !!adm;
        }

        if (isAdmin || !uid) {
          const { data } = await supabase
            .from('marketplace_styles')
            .select('id, name, preview_images, category, is_free')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
          if (data) setStyles(data as any);
          return;
        }

        const [{ data: purchased }, { data: freeStyles }] = await Promise.all([
          supabase.from('purchased_styles').select('style_id').eq('user_id', uid),
          supabase
            .from('marketplace_styles')
            .select('id, name, preview_images, category, is_free')
            .eq('is_active', true)
            .eq('is_free', true)
            .order('sort_order', { ascending: true }),
        ]);
        const purchasedIds = (purchased as any[] || []).map(p => p.style_id);
        let allStyles = (freeStyles as any[]) || [];
        if (purchasedIds.length) {
          const { data: paid } = await supabase
            .from('marketplace_styles')
            .select('id, name, preview_images, category, is_free')
            .in('id', purchasedIds)
            .eq('is_active', true);
          const existingIds = new Set(allStyles.map(s => s.id));
          (paid || []).forEach((s: any) => { if (!existingIds.has(s.id)) allStyles.push(s); });
        }
        setStyles(allStyles as any);
      } catch (err) {
        console.error('Load styles error:', err);
      }
    })();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Append AI messages with a small delay between each so it feels like typing
  const appendAIMessages = useCallback(async (texts: string[], widget: WidgetType) => {
    for (let i = 0; i < texts.length; i++) {
      const isLast = i === texts.length - 1;
      // small "typing" pause between messages
      if (i > 0) await new Promise(r => setTimeout(r, 550));
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: texts[i],
        widget: isLast ? widget : null,
        timestamp: Date.now(),
      }]);
    }
  }, []);

  const callAI = useCallback(async (history: ChatMessage[], currentBrief: BriefState) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-creator', {
        body: {
          messages: sanitizeMessagesForAI(history),
          brief: sanitizeBriefForAI(currentBrief),
        },
      });
      if (error) throw error;

      if (data?.error && data?.fallback) {
        const texts: string[] = Array.isArray(data.messages) ? data.messages.filter(Boolean) : [data.error];
        const widget: WidgetType = data.widget && data.widget !== 'none' ? data.widget : null;
        setLoading(false);
        await appendAIMessages(texts, widget);
        return;
      }

      if (data?.error) throw new Error(data.error);

      const briefUpdate = (data?.brief_update && typeof data.brief_update === 'object') ? data.brief_update : {};
      const invalidStyleId = typeof briefUpdate.styleId === 'string' && !isUuid(briefUpdate.styleId);
      if (invalidStyleId) {
        console.warn('chat-creator returned invalid styleId, preserving previous selection:', briefUpdate.styleId);
      }

      const newBrief = {
        ...currentBrief,
        ...briefUpdate,
        ...(invalidStyleId ? {
          styleId: currentBrief.styleId ?? null,
          styleName: currentBrief.styleName ?? briefUpdate.styleName ?? null,
        } : {}),
      };
      setBrief(newBrief);

      const texts: string[] = Array.isArray(data.messages) ? data.messages.filter(Boolean) : [data.message || '...'];
      const widget: WidgetType = data.widget && data.widget !== 'none' ? data.widget : null;

      setLoading(false);

      // If model says ready but didn't show the confirm widget, force-show it
      // so the user always has explicit control over when generation starts.
      const finalWidget: WidgetType = data.ready && widget !== 'confirm_generate'
        ? 'confirm_generate'
        : widget;

      await appendAIMessages(texts, finalWidget);
      // NOTE: never auto-trigger generation. The user must click "Gerar agora"
      // in the ConfirmWidget. This prevents accidental skips after uploads.
    } catch (err: any) {
      console.error('chat-creator error:', err);
      toast.error(err?.message || 'Erro ao conversar com a IA');
      setLoading(false);
    }
  }, [appendAIMessages]);

  // Process initial prompt from query string
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const params = new URLSearchParams(location.search);
    const initialPrompt = params.get('prompt') || params.get('topic');

    let convId = localStorage.getItem(ACTIVE_KEY);
    if (initialPrompt || !convId) {
      convId = crypto.randomUUID();
      localStorage.setItem(ACTIVE_KEY, convId);
      setActiveConvId(convId);
    } else {
      setActiveConvId(convId);
      try {
        const raw = localStorage.getItem(`ello_chat_msgs_${convId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.messages?.length) {
            setMessages(parsed.messages);
            if (parsed.brief) setBrief(parsed.brief);
            return;
          }
        }
      } catch {}
    }

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
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Oi! Eu sou a Ello 👋',
        timestamp: Date.now(),
      }, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Me conta o que você quer criar hoje? Pode escrever do seu jeito mesmo.',
        timestamp: Date.now(),
      }]);
    }
  }, [location.search, callAI]);

  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    localStorage.setItem(ACTIVE_KEY, newId);
    setActiveConvId(newId);
    setMessages([{
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Oi! Eu sou a Ello 👋',
      timestamp: Date.now(),
    }, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Me conta o que você quer criar hoje?',
      timestamp: Date.now(),
    }]);
    setBrief({});
    setInput('');
    setAttachments([]);
  };

  const handleSelectConversation = (id: string) => {
    if (id === activeConvId) return;
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveConvId(id);
    try {
      const raw = localStorage.getItem(`ello_chat_msgs_${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setMessages(parsed.messages || []);
        setBrief(parsed.brief || {});
      } else {
        setMessages([]);
        setBrief({});
      }
    } catch {
      setMessages([]);
      setBrief({});
    }
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem(`ello_chat_msgs_${id}`);
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (id === activeConvId) handleNewChat();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setAttachments(prev => [...prev, ...files]);
      toast.success(`${files.length} arquivo(s) anexado(s)`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachments(prev => [...prev, file]);
        stream.getTracks().forEach(t => t.stop());
        toast.success('Áudio gravado');
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err) {
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };


  const sendMessage = (text: string, briefOverride?: BriefState) => {
    const trimmed = text.trim();
    if (!trimmed || loading || generating) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    callAI(newMessages, briefOverride ?? brief);
  };

  // === In-chat generation pipeline ===
  // 1) After confirm: call chat-generate-backgrounds → 2 options
  // 2) User picks one background → call chat-compose-final
  // 3) Show final result card with link to /{carouselId}
  const appendAssistantWithWidget = useCallback((text: string, widget: WidgetType, widgetData?: any) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: text,
      widget,
      widgetData,
      timestamp: Date.now(),
    }]);
  }, []);

  // Single-pass generation: capture everything (style, face, logo, brand, topic)
  // and send to chat-compose-final which calls Gemini 3 Pro Image once.
  const generateFinalPost = useCallback(async (b: BriefState) => {
    if (generating) return;
    setGenerating(true);
    appendAssistantWithWidget('Beleza! Tô gerando seu post agora com tudo que você passou. Isso leva uns 30-45s...', 'generating_post', { phase: 'compose' });
    try {
      const { data, error } = await supabase.functions.invoke('chat-compose-final', {
        body: { brief: b },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const carouselId: string | undefined = data?.carouselId;
      const imageUrl: string | undefined = data?.imageUrl;
      if (!carouselId || !imageUrl) throw new Error('Resposta incompleta');

      setMessages(prev => prev.filter(m => m.widget !== 'generating_post'));
      appendAssistantWithWidget('Prontíssimo! Olha como ficou 👇', 'final_result', { carouselId, imageUrl });
    } catch (err: any) {
      console.error('compose error:', err);
      setMessages(prev => prev.filter(m => m.widget !== 'generating_post'));
      toast.error(err?.message || 'Erro ao gerar o post');
      appendAssistantWithWidget('Tive um problema gerando o post. Quer tentar de novo?', 'confirm_generate');
    } finally {
      setGenerating(false);
    }
  }, [generating, appendAssistantWithWidget]);

  const handleStylePick = (style: MarketplaceStyle | null) => {
    const label = style ? `Quero o estilo "${style.name}"` : 'Pode escolher um estilo pra mim';
    const nextBrief = { ...brief, styleId: style?.id || null, styleName: style?.name || null };
    setBrief(nextBrief);
    sendMessage(label, nextBrief);
  };

  const handleContentTypePick = (contentType: 'single' | 'carousel', cards?: number) => {
    const nextBrief = { ...brief, contentType, cardCount: cards };
    setBrief(nextBrief);

    const label = contentType === 'carousel' ? `Quero um carrossel com ${cards || 5} slides` : 'Quero um post único';
    sendMessage(label, nextBrief);
  };
    sendMessage(label, nextBrief);
  };

  const handleFormatPick = (format: string) => {
    const nextBrief = { ...brief, format: format as any };
    setBrief(nextBrief);
    const label = `Quero no formato ${format === 'portrait' ? 'Retrato 4:5' : format === 'square' ? 'Quadrado 1:1' : 'Stories 9:16'}`;
    sendMessage(label, nextBrief);
  };

  const handlePersonalization = (data: { face: boolean; logo: boolean; colors: boolean; faceUrl?: string | string[]; logoUrl?: string | string[]; brandColors?: string[] }) => {
    const nextBrief = {
      ...brief,
      hasFace: data.face,
      hasLogo: data.logo,
      hasBrandColors: data.colors,
      faceUrl: data.faceUrl,
      logoUrl: data.logoUrl,
      brandColors: data.brandColors,
    };
    setBrief(nextBrief);
    const parts: string[] = [];
    const faceCount = Array.isArray(data.faceUrl) ? data.faceUrl.length : (data.faceUrl ? 1 : 0);
    const logoCount = Array.isArray(data.logoUrl) ? data.logoUrl.length : (data.logoUrl ? 1 : 0);
    
    if (data.face) parts.push(`rosto${faceCount > 0 ? ` (${faceCount} foto${faceCount > 1 ? 's' : ''})` : ''}`);
    if (data.logo) parts.push(`logo${logoCount > 0 ? ` (${logoCount} foto${logoCount > 1 ? 's' : ''})` : ''}`);
    if (data.colors) parts.push('cores da marca' + (data.brandColors?.length ? ` (${data.brandColors.join(', ')})` : ''));
    const label = parts.length ? `Quero usar: ${parts.join(', ')}` : 'Pode seguir sem personalização';
    sendMessage(label, nextBrief);
  };

  const handleConfirm = () => {
    if (generating || loading) return;
    const snapshot = cloneBrief(brief);
    setPendingGenerationBrief(snapshot);
    generateFinalPost(snapshot);
  };

  const renderWidget = (msg: ChatMessage) => {
    if (msg.widget === 'style_picker') {
      return <StyleSliderWidget styles={styles} topic={brief.topic || ''} onPick={handleStylePick} />;
    }
    if (msg.widget === 'content_type_picker') {
      return <ContentTypePickerWidget onPick={handleContentTypePick} />;
    }
    if (msg.widget === 'format_picker') {
      return <FormatPickerWidget onPick={handleFormatPick} />;
    }
    if (msg.widget === 'personalization') {
      return <PersonalizationWidget onPick={handlePersonalization} userId={user?.id} />;
    }
    if (msg.widget === 'approve_content') {
      return (
        <ApproveContentWidget 
          content={brief.suggested_content || []} 
          onApprove={() => sendMessage("Amei o texto! Pode seguir.")}
          onEdit={() => {
            inputRef.current?.focus();
            toast.info("Digite as alterações que você deseja.");
          }}
        />
      );
    }
    if (msg.widget === 'confirm_generate') {
      return <ConfirmWidget brief={brief} onConfirm={handleConfirm} />;
    }
    if (msg.widget === 'generating_post') {
      return <GeneratingWidget phase={msg.widgetData?.phase || 'compose'} />;
    }
    if (msg.widget === 'final_result') {
      return <FinalResultWidget
        carouselId={msg.widgetData?.carouselId}
        imageUrl={msg.widgetData?.imageUrl}
        onOpen={(id) => navigate(`/${id}`)}
        onImageUpdated={(newUrl) => {
          setMessages(prev => prev.map(m => m.id === msg.id
            ? { ...m, widgetData: { ...m.widgetData, imageUrl: newUrl } }
            : m));
        }}
      />;
    }
    return null;
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Sidebar - Conversation history (fixed full-height) */}
      <aside
        className="hidden md:flex flex-col border-r border-white/5 transition-all duration-300 shrink-0 h-screen sticky top-0"
        style={{
          width: sidebarOpen ? 260 : 0,
          backgroundColor: '#0D0D0D',
          overflow: 'hidden',
        }}
      >
        <div className="p-3 border-b border-white/5 space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para home
          </button>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-white/90 hover:bg-white/5 transition-colors text-sm font-medium border border-white/10"
          >
            <Plus className="h-4 w-4" />
            Nova conversa
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="text-xs text-white/30 px-3 py-4 text-center">Nenhuma conversa ainda</div>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                className="group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors"
                style={{
                  backgroundColor: c.id === activeConvId ? 'rgba(139,92,246,0.15)' : 'transparent',
                  color: c.id === activeConvId ? '#fff' : 'rgba(255,255,255,0.7)',
                }}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="flex-1 truncate text-[13px]">{c.title}</span>
                <span
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white/90 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 backdrop-blur-md sticky top-0 z-20" style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}>
          <button
            onClick={() => setSidebarOpen(s => !s)}
            className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Alternar sidebar"
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PURPLE}, #6D28D9)` }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Ello</span>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors md:hidden"
            aria-label="Nova conversa"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="hidden md:block w-8" />
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const showAvatar = msg.role === 'assistant' && (!prev || prev.role !== 'assistant');
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="flex gap-3 max-w-[88%] w-full">
                        <div className="w-8 shrink-0">
                          {showAvatar && (
                            <div className="h-8 w-8 rounded-full flex items-center justify-center mt-0.5" style={{ background: `linear-gradient(135deg, ${PURPLE}, #6D28D9)` }}>
                              <Sparkles className="h-3.5 w-3.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <div
                            className="inline-block px-4 py-2.5 rounded-2xl text-[15px] text-white/95 leading-relaxed whitespace-pre-wrap"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                          >
                            {msg.content}
                          </div>
                          {msg.widget && (
                            <div className="pt-1">
                              {renderWidget(msg)}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="px-4 py-2.5 rounded-2xl rounded-tr-md max-w-[85%] text-[15px]"
                        style={{ backgroundColor: 'rgba(139, 92, 246, 0.18)', border: '1px solid rgba(139,92,246,0.3)', color: '#fff' }}
                      >
                        {msg.content}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {(loading || generating) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PURPLE}, #6D28D9)` }}>
                  <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
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
          <div className="max-w-2xl mx-auto space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-white/80"
                    style={{ backgroundColor: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
                  >
                    {f.type.startsWith('audio') ? <Mic className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                    <span className="truncate max-w-[140px]">{f.name}</span>
                    <button onClick={() => removeAttachment(idx)} className="text-white/50 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl px-2 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.txt"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || generating}
                className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
                aria-label="Anexar arquivo"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={loading || generating}
                className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
                style={{
                  color: recording ? '#fff' : 'rgba(255,255,255,0.6)',
                  backgroundColor: recording ? '#EF4444' : 'transparent',
                }}
                aria-label={recording ? 'Parar gravação' : 'Gravar áudio'}
              >
                <Mic className={`h-4 w-4 ${recording ? 'animate-pulse' : ''}`} />
              </button>
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
                placeholder={generating ? 'Gerando seu post...' : recording ? 'Gravando áudio...' : 'Responda à Ello...'}
                disabled={loading || generating}
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-[15px] text-white placeholder:text-white/30 max-h-32 py-1.5 px-1"
                style={{ minHeight: '24px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={(!input.trim() && attachments.length === 0) || loading || generating}
                className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                style={{ backgroundColor: (input.trim() || attachments.length > 0) ? PURPLE : 'rgba(255,255,255,0.1)' }}
              >
                {loading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <ArrowUp className="h-4 w-4 text-white" />}
              </button>
            </div>
          </div>
        </div>

        <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } } .ello-scroll::-webkit-scrollbar { display: none; } .ello-scroll { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      </div>
    </div>
  );
};

// ============= WIDGETS =============

// Score how well a style matches a topic (simple keyword overlap on name + category)
const scoreStyleForTopic = (s: MarketplaceStyle, topic: string): number => {
  if (!topic) return 0;
  const t = topic.toLowerCase();
  const tokens = t.split(/[\s,.;:!?\-_/]+/).filter(w => w.length >= 3);
  const hay = `${s.name || ''} ${s.category || ''}`.toLowerCase();
  let score = 0;
  for (const tok of tokens) {
    if (hay.includes(tok)) score += 2;
  }
  const cat = (s.category || '').toLowerCase();
  if (/tech|app|sistema|software|saas|ia/.test(t) && /tech|digital|moderno|minimal/.test(cat)) score += 3;
  if (/agro|fazenda|rural|campo/.test(t) && /agro|rural/.test(cat)) score += 4;
  if (/imóvel|imove|imobil|casa|apartamento/.test(t) && /imobil|real/.test(cat)) score += 4;
  if (/comida|food|restaurante|gastr/.test(t) && /food|gastr/.test(cat)) score += 4;
  if (/moda|fashion|roupa/.test(t) && /moda|fashion/.test(cat)) score += 4;
  return score;
};

const StyleSliderWidget: React.FC<{ styles: MarketplaceStyle[]; topic: string; onPick: (s: MarketplaceStyle | null) => void }> = ({ styles, topic, onPick }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const sortedStyles = React.useMemo(() => {
    if (!topic) return styles;
    return [...styles]
      .map(s => ({ s, score: scoreStyleForTopic(s, topic) }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.s);
  }, [styles, topic]);

  const scroll = (dir: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const w = sliderRef.current.clientWidth;
    sliderRef.current.scrollBy({ left: dir === 'left' ? -w * 0.7 : w * 0.7, behavior: 'smooth' });
  };

  return (
    <div className="space-y-2 -mr-4">
      <div className="relative">
        <div
          ref={sliderRef}
          className="ello-scroll flex gap-3 overflow-x-auto pb-2 pr-4 snap-x snap-mandatory"
          style={{ scrollPaddingLeft: 0 }}
        >
          {sortedStyles.map((s) => {
            const preview = s.preview_images?.[0];
            return (
              <button
                key={s.id}
                onClick={() => onPick(s)}
                className="group relative shrink-0 w-[180px] aspect-[4/5] rounded-xl overflow-hidden border border-white/10 hover:border-white/40 transition-all snap-start"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                {preview ? (
                  <img src={preview} alt={s.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 to-transparent">
                  <p className="text-[12px] font-semibold text-white truncate">{s.name}</p>
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
        {sortedStyles.length > 2 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-md text-white/90 hover:bg-black/80 transition-colors -ml-1"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-md text-white/90 hover:bg-black/80 transition-colors"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <div className="flex gap-2 flex-wrap pt-1 items-center">
        <button
          onClick={() => setGalleryOpen(true)}
          className="text-xs px-3 py-1.5 rounded-full font-semibold text-white transition-colors flex items-center gap-1.5"
          style={{ backgroundColor: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.35)' }}
        >
          <Layers className="h-3 w-3" /> Ver todos os estilos ({styles.length})
        </button>
        <button onClick={() => onPick(null)} className="text-xs px-3 py-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition-colors border border-white/10">
          ✨ Escolha por mim
        </button>
        <button onClick={() => onPick(null)} className="text-xs px-3 py-1.5 rounded-full text-white/50 hover:text-white/80 transition-colors">
          Pular
        </button>
      </div>

      {galleryOpen && (
        <StyleGalleryModal
          styles={styles}
          topic={topic}
          onClose={() => setGalleryOpen(false)}
          onPick={(s) => { setGalleryOpen(false); onPick(s); }}
        />
      )}
    </div>
  );
};

const StyleGalleryModal: React.FC<{
  styles: MarketplaceStyle[];
  topic: string;
  onClose: () => void;
  onPick: (s: MarketplaceStyle) => void;
}> = ({ styles, topic, onClose, onPick }) => {
  const [search, setSearch] = useState('');

  const recommended = React.useMemo(() => {
    if (!topic) return [];
    return [...styles]
      .map(s => ({ s, score: scoreStyleForTopic(s, topic) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(x => x.s);
  }, [styles, topic]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return styles;
    return styles.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q)
    );
  }, [styles, search]);

  const byCategory = React.useMemo(() => {
    const map = new Map<string, MarketplaceStyle[]>();
    for (const s of filtered) {
      const cat = (s.category || 'Outros').trim() || 'Outros';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const renderRow = (title: string, items: MarketplaceStyle[], badge?: string) => (
    <div key={title} className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {badge && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: PURPLE }}>{badge}</span>
        )}
        <span className="text-xs text-white/40">· {items.length}</span>
      </div>
      <div className="ello-scroll flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {items.map(s => {
          const preview = s.preview_images?.[0];
          return (
            <button
              key={`${title}-${s.id}`}
              onClick={() => onPick(s)}
              className="group relative shrink-0 w-[160px] aspect-[4/5] rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/60 hover:scale-[1.03] transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              {preview ? (
                <img src={preview} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                <p className="text-[11px] font-semibold text-white truncate">{s.name}</p>
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
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: '#0F0F14', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white">Galeria de estilos</h2>
            <p className="text-xs text-white/40">{styles.length} estilos disponíveis · {topic ? `recomendados para "${topic}"` : 'navegue por categoria'}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar estilo..."
              className="text-sm rounded-lg px-3 py-2 text-white placeholder-white/30 outline-none w-56"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {recommended.length > 0 && !search && renderRow('Recomendados pro seu tema', recommended, 'IA')}
          {byCategory.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-sm">Nenhum estilo encontrado.</div>
          ) : (
            byCategory.map(([cat, items]) => renderRow(cat, items))
          )}
        </div>
      </div>
    </div>
  );
};


const ContentTypePickerWidget: React.FC<{ onPick: (type: 'single' | 'carousel', cards?: number) => void }> = ({ onPick }) => {
  const [carouselCards, setCarouselCards] = useState<number | null>(null);

  if (carouselCards !== null) {
    return (
      <div className="space-y-2.5 max-w-md">
        <div className="text-xs text-white/60 mb-1">Quantos slides?</div>
        <div className="grid grid-cols-4 gap-2">
          {[3, 5, 7, 10].map(n => (
            <button
              key={n}
              onClick={() => onPick('carousel', n)}
              className="flex flex-col items-center justify-center py-3 rounded-xl border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <span className="text-lg font-bold text-white">{n}</span>
              <span className="text-[10px] text-white/40">slides</span>
            </button>
          ))}
        </div>
        <button onClick={() => setCarouselCards(null)} className="text-[11px] text-white/40 hover:text-white/70">← voltar</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md">
      <button
        onClick={() => onPick('single')}
        className="flex items-start gap-3 p-4 rounded-xl border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all text-left"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
          <ImageIcon className="h-5 w-5" style={{ color: PURPLE }} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Post único</div>
          <div className="text-[11px] text-white/50 mt-0.5">Uma única arte impactante</div>
        </div>
      </button>
      <button
        onClick={() => setCarouselCards(5)}
        className="flex items-start gap-3 p-4 rounded-xl border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all text-left"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
          <Layers className="h-5 w-5" style={{ color: PURPLE }} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Carrossel</div>
          <div className="text-[11px] text-white/50 mt-0.5">Vários slides pra contar uma história</div>
        </div>
      </button>
    </div>
  );
};

const FormatPickerWidget: React.FC<{ onPick: (format: string) => void }> = ({ onPick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-md">
      {FORMAT_OPTIONS.map(f => {
        const Icon = f.icon;
        return (
          <button
            key={f.value}
            onClick={() => onPick(f.value)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
              <Icon className="h-5 w-5" style={{ color: PURPLE }} />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-white">{f.label}</div>
              <div className="text-[10px] text-white/50">{f.sub}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Personalization with inline upload
const ApproveContentWidget: React.FC<{ 
  content: Array<{ title?: string; subtitle?: string; body?: string }>; 
  onApprove: () => void;
  onEdit: () => void;
}> = ({ content, onApprove, onEdit }) => {
  return (
    <div className="space-y-3 w-full max-w-md">
      <div className="grid gap-3">
        {content.map((item, idx) => (
          <div 
            key={idx} 
            className="p-4 rounded-xl border border-white/10 space-y-2 bg-white/5"
          >
            {content.length > 1 && (
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">
                Slide {idx + 1}
              </div>
            )}
            {item.title && (
              <div className="text-sm font-bold text-white leading-tight">
                {item.title}
              </div>
            )}
            {item.subtitle && (
              <div className="text-xs text-white/60 font-medium">
                {item.subtitle}
              </div>
            )}
            {item.body && (
              <div className="text-[13px] text-white/80 leading-relaxed italic">
                "{item.body}"
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button 
          onClick={onApprove}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 gap-2"
        >
          <Check className="h-4 w-4" />
          Aprovar texto
        </Button>
        <Button 
          variant="outline"
          onClick={onEdit}
          className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-10 gap-2"
        >
          <Wand2 className="h-4 w-4" />
          Mudar algo
        </Button>
      </div>
    </div>
  );
};

const PersonalizationWidget: React.FC<{ onPick: (d: { face: boolean; logo: boolean; colors: boolean; faceUrl?: string | string[]; logoUrl?: string | string[]; brandColors?: string[] }) => void; userId?: string }> = ({ onPick }) => {
  const [face, setFace] = useState(false);
  const [logo, setLogo] = useState(false);
  const [colors, setColors] = useState(false);
  const [faceFiles, setFaceFiles] = useState<{url: string, file?: File}[]>([]);
  const [logoFiles, setLogoFiles] = useState<{url: string, file?: File}[]>([]);
  const [brandColors, setBrandColors] = useState<string[]>(['#8B5CF6']);
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState<'face' | 'logo' | null>(null);

  const faceInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const onFaceFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).map(f => ({ url: URL.createObjectURL(f), file: f }));
    setFaceFiles(prev => [...prev, ...newFiles]);
  };

  const onLogoFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).map(f => ({ url: URL.createObjectURL(f), file: f }));
    setLogoFiles(prev => [...prev, ...newFiles]);
  };

  const handleConfirm = async () => {
    setUploading(true);
    try {
      const faceUrls = await Promise.all(faceFiles.map(f => f.file ? fileToDataUrl(f.file) : Promise.resolve(f.url)));
      const logoUrls = await Promise.all(logoFiles.map(f => f.file ? fileToDataUrl(f.file) : Promise.resolve(f.url)));

      onPick({
        face,
        logo,
        colors,
        faceUrl: faceUrls.length > 0 ? (faceUrls.length === 1 ? faceUrls[0] : faceUrls) : undefined,
        logoUrl: logoUrls.length > 0 ? (logoUrls.length === 1 ? logoUrls[0] : logoUrls) : undefined,
        brandColors: colors ? brandColors : undefined,
      });
    } catch (err) {
      console.error('Inline media encode error:', err);
      toast.error('Não consegui ler as imagens enviadas. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const addColor = () => setBrandColors(prev => [...prev, '#000000']);
  const updateColor = (i: number, v: string) => setBrandColors(prev => prev.map((c, idx) => idx === i ? v : c));
  const removeColor = (i: number) => setBrandColors(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3 max-w-md">
      {/* Face */}
      <div className="rounded-xl border transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: face ? PURPLE : 'rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => setFace(v => !v)}
          className="w-full flex items-center gap-3 p-3"
        >
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: face ? PURPLE : 'rgba(255,255,255,0.06)' }}>
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-white">Foto do rosto</div>
            <div className="text-[11px] text-white/50">Apareça nas artes (pode subir várias)</div>
          </div>
          <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: face ? PURPLE : 'rgba(255,255,255,0.2)', backgroundColor: face ? PURPLE : 'transparent' }}>
            {face && <Check className="h-3 w-3 text-white" />}
          </div>
        </button>
        {face && (
          <div className="px-3 pb-3 space-y-2">
            <input ref={faceInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFaceFilesSelected(e.target.files)} />
            
            {faceFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {faceFiles.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                    <img src={f.url} className="w-full h-full object-cover" alt="Face preview" />
                    <button 
                      onClick={() => setFaceFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => faceInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(139,92,246,0.4)' }}
              >
                <Upload className="h-3.5 w-3.5" style={{ color: PURPLE }} />
                <span className="text-[11px] font-medium text-white/90">Upload</span>
              </button>
              <button
                onClick={() => setGalleryOpen('face')}
                className="flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(139,92,246,0.4)' }}
              >
                <Folder className="h-3.5 w-3.5" style={{ color: PURPLE }} />
                <span className="text-[11px] font-medium text-white/90">Galeria</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logo */}
      <div className="rounded-xl border transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: logo ? PURPLE : 'rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => setLogo(v => !v)}
          className="w-full flex items-center gap-3 p-3"
        >
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: logo ? PURPLE : 'rgba(255,255,255,0.06)' }}>
            <ImageIcon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-white">Logo da marca</div>
            <div className="text-[11px] text-white/50">PNG com fundo transparente</div>
          </div>
          <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: logo ? PURPLE : 'rgba(255,255,255,0.2)', backgroundColor: logo ? PURPLE : 'transparent' }}>
            {logo && <Check className="h-3 w-3 text-white" />}
          </div>
        </button>
        {logo && (
          <div className="px-3 pb-3 space-y-2">
            <input ref={logoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onLogoFilesSelected(e.target.files)} />
            
            {logoFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {logoFiles.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group bg-white/5">
                    <img src={f.url} className="w-full h-full object-contain p-1" alt="Logo preview" />
                    <button 
                      onClick={() => setLogoFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(139,92,246,0.4)' }}
              >
                <Upload className="h-3.5 w-3.5" style={{ color: PURPLE }} />
                <span className="text-[11px] font-medium text-white/90">Upload</span>
              </button>
              <button
                onClick={() => setGalleryOpen('logo')}
                className="flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(139,92,246,0.4)' }}
              >
                <Folder className="h-3.5 w-3.5" style={{ color: PURPLE }} />
                <span className="text-[11px] font-medium text-white/90">Galeria</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <GalleryPicker 
        open={!!galleryOpen}
        onClose={() => setGalleryOpen(null)}
        onSelectFiles={(selected) => {
          const newItems = selected.map(s => ({ url: s.url }));
          if (galleryOpen === 'face') setFaceFiles(prev => [...prev, ...newItems]);
          if (galleryOpen === 'logo') setLogoFiles(prev => [...prev, ...newItems]);
          setGalleryOpen(null);
        }}
      />

      {/* Colors */}
      <div className="rounded-xl border transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors ? PURPLE : 'rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => setColors(v => !v)}
          className="w-full flex items-center gap-3 p-3"
        >
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: colors ? PURPLE : 'rgba(255,255,255,0.06)' }}>
            <Palette className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-white">Cores da marca</div>
            <div className="text-[11px] text-white/50">Use suas cores na arte</div>
          </div>
          <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: colors ? PURPLE : 'rgba(255,255,255,0.2)', backgroundColor: colors ? PURPLE : 'transparent' }}>
            {colors && <Check className="h-3 w-3 text-white" />}
          </div>
        </button>
        {colors && (
          <div className="px-3 pb-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {brandColors.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg p-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <input
                    type="color"
                    value={c}
                    onChange={(e) => updateColor(i, e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border border-white/10"
                    style={{ backgroundColor: c }}
                  />
                  <span className="text-[11px] font-mono text-white/70 uppercase">{c}</span>
                  {brandColors.length > 1 && (
                    <button onClick={() => removeColor(i)} className="text-white/40 hover:text-white p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {brandColors.length < 4 && (
                <button onClick={addColor} className="h-11 px-3 rounded-lg border border-dashed border-white/20 text-xs text-white/60 hover:text-white hover:border-white/40 transition-colors">
                  + cor
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" disabled={uploading} onClick={handleConfirm} className="text-xs h-9 px-4" style={{ backgroundColor: PURPLE }}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
          {uploading ? 'Enviando...' : 'Confirmar'}
        </Button>
        <Button size="sm" variant="ghost" disabled={uploading} onClick={() => onPick({ face: false, logo: false, colors: false })} className="text-xs h-9 text-white/60">
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
        {brief.contentType && <Row label="Tipo" value={brief.contentType === 'carousel' ? `Carrossel${brief.cardCount ? ` (${brief.cardCount} slides)` : ''}` : 'Post único'} />}
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

// === In-chat generation widgets ===
const BackgroundPickerWidget: React.FC<{ backgrounds: BackgroundOption[]; onPick: (bg: BackgroundOption) => void; disabled?: boolean }> = ({ backgrounds, onPick, disabled }) => {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="space-y-2 max-w-md">
      <div className="grid grid-cols-2 gap-2.5">
        {backgrounds.map((bg) => {
          const isPicked = picked === bg.id;
          return (
            <button
              key={bg.id}
              onClick={() => { if (!disabled) { setPicked(bg.id); onPick(bg); } }}
              disabled={disabled || !!picked}
              className="group relative aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all disabled:opacity-60"
              style={{
                borderColor: isPicked ? PURPLE : 'rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <img src={bg.url} alt={bg.label} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                <p className="text-[11px] font-semibold text-white">{bg.label}</p>
              </div>
              {isPicked && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.4)' }}>
                  <Check className="h-8 w-8 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-white/40 pt-1">A IA vai adicionar texto, logo e identidade no fundo escolhido.</p>
    </div>
  );
};

const GeneratingWidget: React.FC<{ phase: 'backgrounds' | 'compose' }> = ({ phase }) => {
  return (
    <div className="rounded-xl p-4 max-w-md" style={{ backgroundColor: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: PURPLE, borderTopColor: 'transparent' }} />
          <Sparkles className="absolute inset-0 m-auto h-4 w-4 text-white/80" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            {phase === 'backgrounds' ? 'Criando 2 opções de fundo...' : 'Compondo seu post...'}
          </p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {phase === 'backgrounds' ? 'Gemini 3 Pro está pintando os cenários' : 'Adicionando texto, logo e identidade'}
          </p>
        </div>
      </div>
    </div>
  );
};

const FinalResultWidget: React.FC<{
  carouselId?: string;
  imageUrl?: string;
  onOpen: (id: string) => void;
  onImageUpdated?: (newUrl: string) => void;
}> = ({ carouselId, imageUrl, onOpen, onImageUpdated }) => {
  const [showAdjust, setShowAdjust] = React.useState(false);
  const [adjustText, setAdjustText] = React.useState('');
  const [adjusting, setAdjusting] = React.useState(false);

  if (!carouselId || !imageUrl) return null;

  const handleDownload = async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `post-${carouselId.slice(0, 8)}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Imagem baixada');
    } catch {
      toast.error('Não foi possível baixar');
    }
  };

  const handleAdjust = async () => {
    const text = adjustText.trim();
    if (!text || adjusting) return;
    setAdjusting(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-adjust-image', {
        body: { carouselId, instruction: text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.imageUrl) {
        onImageUpdated?.(data.imageUrl);
        toast.success('Pronto, ajustei pra você!');
        setAdjustText('');
        setShowAdjust(false);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao ajustar');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-2.5 max-w-md">
      <div className="rounded-xl overflow-hidden border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <img src={imageUrl} alt="Post gerado" className="w-full aspect-[4/5] object-cover" />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-sm font-medium text-white/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Baixar
        </button>
        <button
          onClick={() => setShowAdjust(s => !s)}
          className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full border text-sm font-medium transition-colors"
          style={{
            backgroundColor: showAdjust ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)',
            borderColor: 'rgba(139,92,246,0.3)',
            color: '#C4B5FD',
          }}
        >
          <Wand2 className="h-4 w-4" />
          Ajustar
        </button>
      </div>

      {showAdjust && (
        <div className="space-y-2 rounded-2xl border border-white/10 p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <textarea
            value={adjustText}
            onChange={(e) => setAdjustText(e.target.value)}
            placeholder="O que você quer mudar? Ex: troque o fundo, mude a cor do título..."
            className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/40 outline-none resize-none min-h-[72px]"
            disabled={adjusting}
          />
          <Button
            onClick={handleAdjust}
            disabled={adjusting || !adjustText.trim()}
            className="w-full h-9 rounded-full"
            style={{ backgroundColor: PURPLE }}
          >
            {adjusting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Ajustando...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Aplicar ajuste</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatCreator;
