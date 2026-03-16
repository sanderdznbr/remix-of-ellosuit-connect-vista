import React, { useState } from 'react';
import { Instagram, Loader2, Check, ArrowRight, X, Download, ImageIcon, ArrowLeft, User, Grid3X3 } from 'lucide-react';
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

interface ProfilePost {
  shortcode: string;
  thumbnail: string;
  caption: string;
  isVideo: boolean;
  selected: boolean;
}

interface ProfileData {
  username: string;
  profileName: string;
  profilePic: string;
  posts: ProfilePost[];
}

type ViewMode = 'input' | 'profile' | 'post-images';

const InstagramImporter: React.FC<InstagramImporterProps> = ({ onSendToLogoRemover }) => {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [images, setImages] = useState<InstaImage[]>([]);
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('input');

  // Profile state
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [fetchingPosts, setFetchingPosts] = useState(false);

  const isProfileUrl = (inputUrl: string) => {
    if (inputUrl.includes('instagram.com/p/') || inputUrl.includes('instagram.com/reel/')) return false;
    return /instagram\.com\/[a-zA-Z0-9._]+\/?(\?.*)?$/.test(inputUrl);
  };

  const fetchPost = async () => {
    if (!url.includes('instagram.com')) {
      toast.error('Cole um link válido do Instagram');
      return;
    }

    // Detect if it's a profile URL
    if (isProfileUrl(url)) {
      await fetchProfile();
      return;
    }

    if (!url.includes('instagram.com/p/') && !url.includes('instagram.com/reel/')) {
      toast.error('Cole um link válido de um post (instagram.com/p/...) ou perfil (instagram.com/usuario)');
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
      setViewMode('post-images');
      toast.success(`${data.images.length} imagens encontradas!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar post');
    } finally {
      setFetching(false);
    }
  };

  const fetchProfile = async () => {
    setFetching(true);
    setProfileData(null);
    try {
      const { data, error } = await supabase.functions.invoke('instagram-scraper', {
        body: { action: 'profile', url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.posts?.length) {
        toast.error('Nenhum post encontrado neste perfil. O perfil pode ser privado.');
        return;
      }
      setProfileData({
        ...data,
        posts: data.posts.map((p: any) => ({ ...p, selected: false })),
      });
      setViewMode('profile');
      toast.success(`${data.posts.length} posts encontrados de @${data.username}!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar perfil');
    } finally {
      setFetching(false);
    }
  };

  const openPostFromProfile = async (shortcode: string) => {
    const postUrl = `https://www.instagram.com/p/${shortcode}/`;
    setFetchingPosts(true);
    try {
      const { data, error } = await supabase.functions.invoke('instagram-scraper', {
        body: { url: postUrl },
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
      setViewMode('post-images');
      toast.success(`${data.images.length} imagens encontradas!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar post');
    } finally {
      setFetchingPosts(false);
    }
  };

  // Select multiple posts from profile and fetch all their images
  const toggleProfilePost = (index: number) => {
    setProfileData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, posts: prev.posts.map((p, i) => i === index ? { ...p, selected: !p.selected } : p) };
      return updated;
    });
  };

  const selectedProfilePosts = profileData?.posts.filter(p => p.selected) || [];

  const fetchSelectedProfilePosts = async () => {
    if (selectedProfilePosts.length === 0) return;
    setFetchingPosts(true);
    const allImages: string[] = [];
    let successCount = 0;

    for (const post of selectedProfilePosts) {
      try {
        const postUrl = `https://www.instagram.com/p/${post.shortcode}/`;
        const { data, error } = await supabase.functions.invoke('instagram-scraper', {
          body: { url: postUrl },
        });
        if (error) continue;
        if (data?.images?.length) {
          allImages.push(...data.images);
          successCount++;
        }
      } catch {
        // continue with next
      }
    }

    if (allImages.length > 0) {
      setPostTitle(`${successCount} posts de @${profileData?.username}`);
      setImages(allImages.map((u: string) => ({
        url: u,
        selected: false,
        loading: true,
        loaded: false,
        error: false,
      })));
      setViewMode('post-images');
      toast.success(`${allImages.length} imagens encontradas de ${successCount} posts!`);
    } else {
      toast.error('Nenhuma imagem encontrada nos posts selecionados');
    }
    setFetchingPosts(false);
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

  const goBack = () => {
    if (viewMode === 'post-images' && profileData) {
      setViewMode('profile');
      setImages([]);
      setPostTitle('');
    } else {
      setViewMode('input');
      setImages([]);
      setPostTitle('');
      setProfileData(null);
    }
  };

  const clearAll = () => {
    setImages([]);
    setPostTitle('');
    setUrl('');
    setProfileData(null);
    setViewMode('input');
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            {viewMode !== 'input' && (
              <button onClick={goBack} className="text-white/40 hover:text-white/70 transition-colors cursor-pointer p-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-white/90 flex items-center gap-3">
              <Instagram className="w-6 h-6 text-pink-400" />
              Importar do Instagram
            </h1>
          </div>
          <p className="text-white/40 text-sm mt-1">
            {viewMode === 'input' && 'Cole o link de um post ou perfil do Instagram para importar as imagens.'}
            {viewMode === 'profile' && `Selecione os posts de @${profileData?.username} para importar.`}
            {viewMode === 'post-images' && 'Selecione as imagens para enviar ao removedor de logo.'}
          </p>
        </div>

        {/* URL Input — only on input view */}
        {viewMode === 'input' && (
          <>
            <div className="flex gap-3 mb-6">
              <div className="flex-1 relative">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://www.instagram.com/p/... ou https://www.instagram.com/usuario"
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

            {/* Empty state */}
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-4">
                <Instagram className="w-8 h-8 text-pink-400/60" />
              </div>
              <p className="text-white/30 text-sm max-w-md mb-3">
                Cole o link de um <strong className="text-white/50">post</strong> ou <strong className="text-white/50">perfil</strong> do Instagram acima.
              </p>
              <div className="flex items-center gap-6 text-white/20 text-xs">
                <span className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> instagram.com/p/...</span>
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> instagram.com/usuario</span>
              </div>
            </div>
          </>
        )}

        {/* Profile posts grid */}
        {viewMode === 'profile' && profileData && (
          <>
            {/* Profile header */}
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              {profileData.profilePic ? (
                <img src={profileData.profilePic} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-pink-500/30" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-pink-400/60" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white/90">{profileData.profileName}</h2>
                <p className="text-sm text-white/40">@{profileData.username} · {profileData.posts.length} posts</p>
              </div>
              <div className="flex items-center gap-3">
                {selectedProfilePosts.length > 0 && (
                  <button
                    onClick={fetchSelectedProfilePosts}
                    disabled={fetchingPosts}
                    className="h-9 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {fetchingPosts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Grid3X3 className="w-4 h-4" />}
                    {fetchingPosts ? 'Buscando...' : `Importar ${selectedProfilePosts.length} posts`}
                  </button>
                )}
                <button onClick={clearAll} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-white/30 mb-4">
              Clique em um post para ver suas imagens, ou selecione vários e clique "Importar" para buscar todos de uma vez.
            </p>

            {/* Posts grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              <AnimatePresence>
                {profileData.posts.map((post, i) => (
                  <motion.div
                    key={post.shortcode}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
                      post.selected
                        ? 'border-purple-500 ring-2 ring-purple-500/30'
                        : 'border-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    {post.thumbnail ? (
                      <img
                        src={post.thumbnail}
                        alt={post.caption}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/[0.04] flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-white/10" />
                      </div>
                    )}

                    {post.isVideo && (
                      <div className="absolute top-1.5 right-1.5 bg-black/60 rounded px-1.5 py-0.5 text-[10px] text-white/70 font-medium">
                        REEL
                      </div>
                    )}

                    {/* Click handler: left half selects, right half opens */}
                    <div className="absolute inset-0 flex">
                      <div className="flex-1" onClick={() => toggleProfilePost(i)} />
                      <div className="flex-1" onClick={() => openPostFromProfile(post.shortcode)} />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                      <span className="text-[10px] text-white/70 bg-black/50 rounded px-1.5 py-0.5 line-clamp-1 max-w-[70%]">
                        {post.caption || 'Abrir post →'}
                      </span>
                    </div>

                    {/* Selection indicator */}
                    {post.selected && (
                      <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center pointer-events-none">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    {!post.selected && (
                      <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full border-2 border-white/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Post images view */}
        {viewMode === 'post-images' && images.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white/80 line-clamp-1 max-w-md">{postTitle}</h2>
                <span className="text-xs text-white/30 bg-white/[0.06] px-2 py-1 rounded-md">
                  {images.filter(i => i.loaded).length} imagens
                </span>
                <button onClick={clearAll} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
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
          </>
        )}

        {/* Loading states */}
        {fetchingPosts && viewMode === 'profile' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-pink-400 mb-3" />
            <p className="text-white/40 text-sm">Buscando imagens dos posts selecionados...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstagramImporter;
