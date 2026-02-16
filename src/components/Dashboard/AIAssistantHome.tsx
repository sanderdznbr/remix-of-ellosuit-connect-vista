import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Paperclip, X, Loader2, FileText, Image, Video, Music, File, MessageSquare, FolderPlus, CalendarDays, Mail, UploadCloud, TableProperties, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHubColor, DEFAULT_COLOR } from '@/hooks/useHubColor';
import { useTheme } from '@/hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  action?: any;
  isLoading?: boolean;
}

const FILE_ICONS: Record<string, React.ElementType> = {
  image: Image, video: Video, audio: Music, spreadsheet: FileText, pdf: FileText, doc: FileText,
};

function getFileCategory(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return 'image';
  if (['mp4','mov','avi','webm'].includes(ext)) return 'video';
  if (['mp3','wav','ogg','m4a'].includes(ext)) return 'audio';
  if (['csv','xls','xlsx'].includes(ext)) return 'spreadsheet';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc','docx'].includes(ext)) return 'doc';
  return 'other';
}

const SUGGESTIONS = [
  { icon: MessageSquare, text: 'Abrir meu CRM WhatsApp' },
  { icon: FolderPlus, text: 'Criar uma pasta no Drive' },
  { icon: CalendarDays, text: 'Ver minha agenda de hoje' },
  { icon: Mail, text: 'Enviar email marketing' },
  { icon: UploadCloud, text: 'Envie um arquivo e peça para salvar' },
  { icon: TableProperties, text: 'Importar planilha de contatos' },
];

const AIAssistantHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { color: hubColor } = useHubColor();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSpeakRef = useRef<string | null>(null);

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const bgColor = isDark ? 'hsl(222, 47%, 6%)' : (hubColor || DEFAULT_COLOR);
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'usuário';
  const firstName = userName.split(' ')[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Fetch company id
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      if (data?.company_id) setCompanyId(data.company_id);
    };
    fetchCompanyId();
  }, [user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    try {
      setUploadingFile(true);
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `assistant/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from('documents').upload(filePath, file, { contentType: file.type });
      if (error) throw error;

      const { data: publicData } = supabase.storage.from('documents').getPublicUrl(filePath);
      return publicData.publicUrl;
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText && !attachedFile) return;
    if (isProcessing) return;

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;

    // Upload attached file first
    if (attachedFile) {
      const url = await uploadFileToStorage(attachedFile);
      if (url) {
        fileUrl = url;
        fileName = attachedFile.name;
        fileType = getFileCategory(attachedFile.name);
      }
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      fileUrl, fileName, fileType,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedFile(null);
    setIsProcessing(true);

    // Add loading message
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [...prev, { id: loadingId, role: 'assistant', content: '', isLoading: true }]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: messageText,
          fileUrl, fileName,
          userId: user?.id,
          companyId,
          messages: messages.filter(m => !m.isLoading).map(m => ({
            role: m.role,
            content: m.content + (m.fileUrl ? `\n[Arquivo: ${m.fileName}]` : ''),
          })),
        },
      });

      if (error) throw error;

      // Remove loading, add real response
      const responseText = data.response || data.error || 'Desculpe, ocorreu um erro.';
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: responseText,
          action: data.action,
        }];
      });

      // Store text to speak after render
      pendingSpeakRef.current = responseText;

      // Don't auto-navigate — let user click the action button instead
      // This prevents the component from unmounting and losing chat state
    } catch (err: any) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
        }];
      });
    } finally {
      setIsProcessing(false);
    }
  }, [input, attachedFile, isProcessing, user?.id, companyId, messages, navigate, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 20MB', variant: 'destructive' });
      return;
    }
    setAttachedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // === VOICE: Start recording ===
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) return; // Too short
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({ title: 'Microfone', description: 'Não foi possível acessar o microfone.', variant: 'destructive' });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // === VOICE: Transcribe audio via ElevenLabs Scribe ===
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`,
        {
          method: 'POST',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error('Transcription failed');
      const data = await response.json();

      if (data.text && data.text.trim()) {
        setInput(data.text.trim());
        // Auto-submit the transcribed text
        setTimeout(() => handleSubmit(data.text.trim()), 200);
      } else {
        toast({ title: 'Voz', description: 'Não consegui entender. Tente novamente.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Transcription error:', err);
      toast({ title: 'Erro', description: 'Falha na transcrição do áudio.', variant: 'destructive' });
    } finally {
      setIsTranscribing(false);
    }
  };

  // === VOICE: Speak AI response via ElevenLabs TTS ===
  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop any current audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setIsSpeaking(true);
    try {
      // Clean text for TTS (remove emojis, markdown, etc.)
      const cleanText = text
        .replace(/[→←↑↓]/g, '')
        .replace(/[*_~`#]/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim();

      if (!cleanText) { setIsSpeaking(false); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: cleanText }),
        }
      );

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Auto-speak new AI responses
  useEffect(() => {
    if (pendingSpeakRef.current) {
      speakText(pendingSpeakRef.current);
      pendingSpeakRef.current = null;
    }
  }, [messages, speakText]);

  const hasChat = messages.length > 0;

  const renderInput = () => (
    <div className="w-full max-w-3xl mx-auto">
      {/* Attached file preview */}
      <AnimatePresence>
        {attachedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-2 flex items-center gap-2 bg-white/15 text-white rounded-xl px-3 py-2 text-sm"
          >
            {React.createElement(FILE_ICONS[getFileCategory(attachedFile.name)] || File, { className: 'h-4 w-4 shrink-0' })}
            <span className="truncate flex-1">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="hover:bg-white/20 rounded-full p-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={!hasChat ? { opacity: 0, y: 20, scale: 0.95 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: hasChat ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div data-keep-light className="relative flex items-center backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 border border-gray-200 focus-within:border-gray-300 focus-within:shadow-[0_12px_50px_-10px_rgba(0,0,0,0.25)]" style={{ backgroundColor: '#ffffff' }}>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="*/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || isProcessing}
            className={`ml-3 p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 group hover:bg-gray-100/80`}
          >
            {uploadingFile ? (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            )}
          </button>

          <div className="mx-1 h-6 w-px bg-gray-200/60" />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachedFile ? "Descreva o que fazer com o arquivo..." : "Pergunte qualquer coisa..."}
            className="flex-1 bg-transparent text-gray-800 placeholder:text-gray-400/70 text-base md:text-[17px] px-3 py-4 md:py-[18px] outline-none font-medium tracking-[-0.01em]"
            autoFocus
            disabled={isProcessing}
          />

          <div className="flex items-center gap-1 mr-2">
            {/* Mic button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isTranscribing}
              className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 disabled:opacity-40 ${
                isRecording ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30' : 'hover:bg-gray-100/80 group'
              }`}
              title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
            >
              {isTranscribing ? (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-5 w-5 text-white" />
              ) : (
                <Mic className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              )}
            </button>

            {/* Send button */}
            <button
              onClick={() => handleSubmit()}
              disabled={isProcessing || (!input.trim() && !attachedFile)}
              className="p-2.5 rounded-xl transition-all duration-200 active:scale-90 disabled:opacity-30"
              style={{
                backgroundColor: isProcessing || (!input.trim() && !attachedFile) ? 'transparent' : (hubColor || DEFAULT_COLOR),
              }}
            >
              <Send
                className="h-5 w-5 transition-colors"
                style={{
                  color: isProcessing || (!input.trim() && !attachedFile) ? '#d1d5db' : '#ffffff',
                }}
              />
            </button>
          </div>
        </div>

        {/* Stop audio button - only when speaking */}
        {isSpeaking && (
          <div className="flex items-center justify-center mt-2">
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/20 animate-pulse"
            >
              Parar áudio
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );

  return (
    <div data-dashboard-home className="flex flex-col h-full transition-colors duration-500" style={{ backgroundColor: bgColor }}>
      {!hasChat ? (
        /* Empty state - greeting + suggestions + input inline */
        <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 overflow-y-auto py-6">
          <div className="w-full max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 md:mb-3 tracking-tight">
                {getGreeting()}, {firstName}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="text-white/70 text-base md:text-xl mb-6 md:mb-8"
            >
              O que gostaria de fazer hoje?
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid grid-cols-2 gap-2 md:gap-2.5 max-w-xl mx-auto mb-6 md:mb-8"
            >
              {SUGGESTIONS.map((item, i) => (
                <motion.button
                  key={item.text}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.6 + i * 0.06 }}
                  onClick={() => {
                    if (item.text.includes('arquivo')) {
                      fileInputRef.current?.click();
                    } else {
                      setInput(item.text);
                      setTimeout(() => handleSubmit(item.text), 100);
                    }
                  }}
                  className="flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-2.5 md:py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/85 hover:text-white text-xs md:text-sm font-medium transition-all duration-200 border border-white/10 hover:border-white/25 active:scale-95 text-left"
                >
                  <item.icon className="h-4 w-4 md:h-5 md:w-5 shrink-0 text-white/70" />
                  <span className="leading-tight">{item.text}</span>
                </motion.button>
              ))}
            </motion.div>

            {/* Input right below suggestions */}
            <div className="px-0 md:px-4">
              {renderInput()}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="text-white/40 text-xs mt-4 md:mt-5"
            >
              💡 Anexe arquivos (planilhas, vídeos, imagens) e peça para a IA organizar, salvar ou processar.
            </motion.p>
          </div>
        </div>
      ) : (
        /* Chat mode - messages + fixed input at bottom */
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? isDark ? 'bg-white/15 text-white backdrop-blur-sm border border-white/10' : 'bg-white/25 text-white backdrop-blur-sm border border-white/20'
                      : isDark ? 'bg-neutral-800 text-white shadow-xl border border-neutral-700' : 'bg-white text-gray-900 shadow-xl border border-gray-100'
                  }`}>
                    {msg.fileUrl && msg.fileName && (
                      <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg ${
                        msg.role === 'user' ? 'bg-white/10' : 'bg-gray-100'
                      }`}>
                        {msg.fileType === 'image' ? (
                          <img src={msg.fileUrl} alt={msg.fileName} className="h-16 w-16 rounded-lg object-cover" />
                        ) : (
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            msg.role === 'user' ? 'bg-white/20' : 'bg-gray-200'
                          }`}>
                            {React.createElement(FILE_ICONS[msg.fileType || 'other'] || File, { className: 'h-5 w-5' })}
                          </div>
                        )}
                        <span className="text-sm truncate flex-1">{msg.fileName}</span>
                      </div>
                    )}

                    {msg.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="text-sm text-gray-400">Pensando...</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {msg.action?.action === 'navigate' && (
                      <button
                        onClick={() => navigate(msg.action.path)}
                        className="mt-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: hubColor || DEFAULT_COLOR, color: 'white' }}
                      >
                        Ir para {msg.action.label} →
                      </button>
                    )}
                    {msg.action?.action === 'import_contacts' && msg.action?.path && (
                      <button
                        onClick={() => navigate(msg.action.path)}
                        className="mt-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: hubColor || DEFAULT_COLOR, color: 'white' }}
                      >
                        Importar Contatos →
                      </button>
                    )}
                    {msg.action?.action === 'saved_to_drive' && (
                      <button
                        onClick={() => navigate('/dashboard/drive')}
                        className="mt-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: hubColor || DEFAULT_COLOR, color: 'white' }}
                      >
                        Abrir Drive →
                      </button>
                    )}
                    {msg.action?.action === 'request_file' && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: hubColor || DEFAULT_COLOR, color: 'white' }}
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Anexar arquivo
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Fixed input at bottom in chat mode */}
          <div className="shrink-0 px-4 pb-4 md:pb-6 pt-2">
            {renderInput()}
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistantHome;
