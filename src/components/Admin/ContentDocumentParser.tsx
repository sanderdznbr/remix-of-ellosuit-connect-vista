import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Sparkles, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import { motion, AnimatePresence } from 'framer-motion';

interface ParsedCard {
  cardNumber: number;
  text: string;
  imageDirection?: string;
}

interface ParsedPost {
  id: number;
  type: 'carrossel' | 'estatico';
  title: string;
  cards: ParsedCard[];
  caption: string;
  hashtags: string;
}

export default function ContentDocumentParser() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [posts, setPosts] = useState<ParsedPost[]>([]);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPosts([]);
    }
  };

  const parseDocument = async () => {
    if (!file) return;
    setParsing(true);
    try {
      // Extract text from .docx using mammoth
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const textContent = result.value;

      if (!textContent || textContent.length < 50) {
        toast.error('Documento vazio ou com pouco conteúdo');
        return;
      }

      // Send to edge function for AI parsing
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await supabase.functions.invoke('parse-content-document', {
        body: { textContent },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao parsear documento');
      }

      const { posts: parsedPosts, totalPosts } = response.data;
      setPosts(parsedPosts || []);
      toast.success(`${totalPosts} posts identificados no documento!`);
    } catch (err: any) {
      console.error('Parse error:', err);
      toast.error(err.message || 'Erro ao processar documento');
    } finally {
      setParsing(false);
    }
  };

  const copyPostContent = (post: ParsedPost) => {
    const lines: string[] = [];
    lines.push(`📌 ${post.title}`);
    lines.push(`Tipo: ${post.type === 'carrossel' ? 'Carrossel' : 'Estático'}`);
    lines.push(`Cards: ${post.cards.length}`);
    lines.push('');
    post.cards.forEach(c => {
      lines.push(`--- Card ${c.cardNumber} ---`);
      lines.push(c.text);
      if (c.imageDirection) lines.push(`🖼️ ${c.imageDirection}`);
      lines.push('');
    });
    lines.push('📝 Legenda:');
    lines.push(post.caption);
    lines.push('');
    lines.push(post.hashtags);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId(post.id);
    toast.success('Conteúdo copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-purple-400" />
        Parser de Documento de Conteúdo
      </h3>

      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all hover:bg-white/[0.04]"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)' }}
      >
        <Upload className="w-8 h-8 text-white/20" />
        <div className="text-center">
          <p className="text-white/60 text-sm">{file ? file.name : 'Arraste ou clique para enviar'}</p>
          <p className="text-white/25 text-[11px] mt-1">Aceita .docx com posts formatados</p>
        </div>
        <input ref={fileRef} type="file" accept=".docx" onChange={handleFile} className="hidden" />
      </div>

      {file && (
        <button
          onClick={parseDocument}
          disabled={parsing}
          className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#7B50DC' }}
        >
          {parsing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando documento...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Identificar Posts ({file.name})
            </>
          )}
        </button>
      )}

      {/* Results */}
      {posts.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-xs">{posts.length} post(s) identificados</p>
          </div>

          {posts.map(post => (
            <div
              key={post.id}
              className="rounded-xl overflow-hidden transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                    style={{
                      backgroundColor: post.type === 'carrossel' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                      color: post.type === 'carrossel' ? '#60a5fa' : '#34d399',
                    }}
                  >
                    {post.type === 'carrossel' ? 'CARROSSEL' : 'ESTÁTICO'}
                  </span>
                  <p className="text-white/80 text-sm truncate">{post.title}</p>
                  <span className="text-white/25 text-[11px] shrink-0">{post.cards.length} card(s)</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyPostContent(post); }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Copiar conteúdo"
                  >
                    {copiedId === post.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {expandedPost === post.id ? (
                    <ChevronUp className="w-4 h-4 text-white/30" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/30" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {expandedPost === post.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {/* Cards */}
                      <div className="pt-3 space-y-2">
                        {post.cards.map(card => (
                          <div
                            key={card.cardNumber}
                            className="rounded-lg p-3"
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                          >
                            <p className="text-[10px] text-white/30 font-medium mb-1">CARD {card.cardNumber}</p>
                            <p className="text-white/70 text-sm">{card.text}</p>
                            {card.imageDirection && (
                              <p className="text-white/30 text-[11px] mt-1.5 italic">🖼️ {card.imageDirection}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Caption */}
                      {post.caption && (
                        <div>
                          <p className="text-[10px] text-white/30 font-medium mb-1">LEGENDA</p>
                          <p className="text-white/50 text-xs leading-relaxed">{post.caption}</p>
                        </div>
                      )}

                      {/* Hashtags */}
                      {post.hashtags && (
                        <p className="text-purple-400/60 text-[11px]">{post.hashtags}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
