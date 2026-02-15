import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Paperclip, X, Loader2, FileText, Image, Video, Music, File } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHubColor, DEFAULT_COLOR } from '@/hooks/useHubColor';
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
  { icon: '💬', text: 'Abrir meu CRM WhatsApp' },
  { icon: '📁', text: 'Criar uma pasta no Drive' },
  { icon: '📅', text: 'Ver minha agenda de hoje' },
  { icon: '📧', text: 'Enviar email marketing' },
  { icon: '📎', text: 'Envie um arquivo e peça para salvar' },
  { icon: '📊', text: 'Importar planilha de contatos' },
];

const AIAssistantHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { color: hubColor } = useHubColor();
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

  const bgColor = hubColor || DEFAULT_COLOR;
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
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response || data.error || 'Desculpe, ocorreu um erro.',
          action: data.action,
        }];
      });

      // Handle action
      if (data.action) {
        if (data.action.action === 'navigate') {
          setTimeout(() => navigate(data.action.path), 1500);
        } else if (data.action.action === 'import_contacts' && data.action.path) {
          setTimeout(() => navigate(data.action.path), 2000);
        }
      }
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

  const hasChat = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] transition-colors duration-500" style={{ backgroundColor: bgColor }}>
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {!hasChat ? (
          /* Empty state - centered greeting */
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-full max-w-2xl text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
                  {getGreeting()}, {firstName}
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="text-white/70 text-lg md:text-xl mb-10"
              >
                O que gostaria de fazer hoje?
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-6 max-w-xl mx-auto"
              >
                {SUGGESTIONS.map((item, i) => (
                  <motion.button
                    key={item.text}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.8 + i * 0.07 }}
                    onClick={() => {
                      if (item.text.includes('arquivo')) {
                        fileInputRef.current?.click();
                      } else {
                        setInput(item.text);
                        setTimeout(() => handleSubmit(item.text), 100);
                      }
                    }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/85 hover:text-white text-sm font-medium transition-all duration-200 border border-white/10 hover:border-white/25 active:scale-95 text-left"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="leading-tight">{item.text}</span>
                  </motion.button>
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ duration: 0.5, delay: 1.3 }}
                className="text-white/40 text-xs mt-6"
              >
                💡 Dica: Anexe arquivos (planilhas, vídeos, imagens) e peça para a IA organizar, salvar ou processar.
              </motion.p>
            </div>
          </div>
        ) : (
          /* Chat messages */
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
                    ? 'bg-white/20 text-white'
                    : 'bg-white/95 text-gray-800 shadow-lg'
                }`}>
                  {/* File attachment preview */}
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

                  {/* Loading state */}
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-400">Pensando...</span>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Action buttons */}
                  {msg.action?.action === 'navigate' && (
                    <button
                      onClick={() => navigate(msg.action.path)}
                      className="mt-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                      style={{ backgroundColor: bgColor, color: 'white' }}
                    >
                      Ir para {msg.action.label} →
                    </button>
                  )}
                  {msg.action?.action === 'saved_to_drive' && (
                    <button
                      onClick={() => navigate('/dashboard/drive')}
                      className="mt-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                      style={{ backgroundColor: bgColor, color: 'white' }}
                    >
                      Abrir Drive →
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input area - always at bottom */}
      <div className="shrink-0 px-4 pb-6 pt-2">
        <div className="max-w-3xl mx-auto">
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
            initial={!hasChat ? { opacity: 0, y: 30, scale: 0.92 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: hasChat ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative flex items-center bg-white rounded-full shadow-xl shadow-black/10 overflow-hidden transition-all duration-300 focus-within:shadow-2xl">
              {/* File upload button */}
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
                className="ml-3 p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {uploadingFile ? (
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5 text-gray-400" />
                )}
              </button>

              <Sparkles className="ml-1 h-5 w-5 text-gray-300 shrink-0" />

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachedFile ? "Descreva o que fazer com o arquivo..." : "Digite o que deseja fazer..."}
                className="flex-1 bg-transparent text-gray-800 placeholder:text-gray-400 text-lg px-3 py-5 outline-none"
                autoFocus
                disabled={isProcessing}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={isProcessing || (!input.trim() && !attachedFile)}
                className="mr-3 p-3 rounded-full bg-white/80 hover:bg-gray-100 transition-all duration-200 active:scale-90 disabled:opacity-40"
              >
                <Send className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantHome;
