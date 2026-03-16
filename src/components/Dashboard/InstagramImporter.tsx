import React, { useState } from 'react';
import { Instagram, Loader2, Check, ArrowRight, X, Download, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface InstagramImporterProps {
  onSendToLogoRemover: (files: File[]) => void;
}

interface InstaImage {
  url: string;
  selected: boolean;
  loading: boolean;
  loaded: boolean;
  error: boolean;
}

const InstagramImporter: React.FC<InstagramImporterProps> = ({ onSendToLogoRemover }) => {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [images, setImages] = useState<InstaImage[]>([]);
  const [sending, setSending] = useState(false);

  const fetchPost = async () => {
    if (!url.includes('instagram.com/p/') && !url.includes('instagram.com/reel/')) {
      const isProfileUrl = /instagram\.com\/[a-zA-Z0-9._]+\/?(\?.*)?$/.test(url);
      toast.error(
        isProfileUrl
          ? 'Links de perfil não são suportados. Abra um post específico e cole o link dele (ex: instagram.com/p/...)'
          : 'Cole um link válido de um post do Instagram (ex: https://www.instagram.com/p/...)'
      );
      return;
    }
    setFetching(true);
    setImages([]);
    setPostTitle('');
    try {
      const { data, error } = await supabase.functions.invoke('instagram-scraper', {
        body: { url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.images?.length) {
        toast.error('Nenhuma imagem encontrada neste post');
        return;
      }
      setPostTitle(data.title || 'Post do Instagram');
      setImages(data.images.map((u: string) => ({
        url: u,
        selected: false,
        loading: true,
        loaded: false,
        error: false,
      })));
      toast.success(`${data.images.length} imagens encontradas!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar post');
    } finally {
      setFetching(false);
    }
  };

  const toggleSelect = (index: number) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, selected: !img.selected } : img));
  };

  const selectAll = () => {
    const allSelected = images.filter(i => i.loaded).every(i => i.selected);
    setImages(prev => prev.map(img => img.loaded ? { ...img, selected: !allSelected } : img));
  };

  const selectedCount = images.filter(i => i.selected).length;

  const handleSend = async () => {
    const selected = images.filter(i => i.selected);
    if (!selected.length) return;

    setSending(true);
    toast.info(`Baixando ${selected.length} imagens via servidor...`);

    try {
      const { data, error } = await supabase.functions.invoke('instagram-scraper', {
        body: { action: 'download', urls: selected.map(s => s.url) },
      });

      if (error) throw error;
      if (!data?.images?.length) throw new Error('Falha ao baixar imagens');

      const files: File[] = [];
      for (const img of data.images) {
        try {
          const binary = atob(img.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: img.mimeType || 'image/jpeg' });
          const name = `instagram-${Date.now()}-${files.length}.${img.mimeType?.split('/')[1] || 'jpg'}`;
          files.push(new File([blob], name, { type: blob.type }));
        } catch {
          console.warn('Failed to process image');
        }
      }

      if (files.length === 0) {
        toast.error('Não foi possível processar nenhuma imagem');
        return;
      }
      toast.success(`${files.length} imagens prontas! Enviando ao removedor...`);
      onSendToLogoRemover(files);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao baixar imagens');
    } finally {
      setSending(false);
    }
  };

  const handleImageLoad = (index: number) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, loading: false, loaded: true } : img));
  };

  const handleImageError = (index: number) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, loading: false, error: true } : img));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchPost();
  };

  const clearPost = () => {
    setImages([]);
    setPostTitle('');
    setUrl('');
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white/90 flex items-center gap-3">
            <Instagram className="w-6 h-6 text-pink-400" />
            Importar do Instagram
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Cole o link de um post do Instagram para importar as imagens e enviar ao removedor de logo.
          </p>
        </div>

        {/* URL Input */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://www.instagram.com/p/..."
              className="w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          <button
            onClick={fetchPost}
            disabled={fetching || !url}
            className="h-12 px-6 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {fetching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Post title + controls */}
        {images.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white/80 line-clamp-1 max-w-md">{postTitle}</h2>
              <span className="text-xs text-white/30 bg-white/[0.06] px-2 py-1 rounded-md">
                {images.filter(i => i.loaded).length} imagens
              </span>
              <button onClick={clearPost} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
              >
                {images.filter(i => i.loaded).every(i => i.selected) ? 'Desmarcar tudo' : 'Selecionar tudo'}
              </button>
              {selectedCount > 0 && (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="h-9 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Enviar {selectedCount} ao Removedor
                </button>
              )}
            </div>
          </div>
        )}

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <AnimatePresence>
              {images.map((img, i) => (
                <motion.div
                  key={img.url}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                    img.selected
                      ? 'border-purple-500 ring-2 ring-purple-500/30'
                      : 'border-white/[0.06] hover:border-white/[0.15]'
                  } ${img.error ? 'opacity-30 pointer-events-none' : ''}`}
                  onClick={() => !img.error && img.loaded && toggleSelect(i)}
                >
                  {img.loading && (
                    <div className="absolute inset-0 bg-white/[0.04] animate-pulse flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-white/10" />
                    </div>
                  )}

                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onLoad={() => handleImageLoad(i)}
                    onError={() => handleImageError(i)}
                  />

                  {img.selected && (
                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  {!img.selected && img.loaded && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="w-8 h-8 rounded-full border-2 border-white/60 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white/60" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && !fetching && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-4">
              <Instagram className="w-8 h-8 text-pink-400/60" />
            </div>
            <p className="text-white/30 text-sm max-w-md">
              Cole o link de um post do Instagram acima para importar as imagens.
              Depois selecione as que deseja enviar ao removedor de logo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstagramImporter;
