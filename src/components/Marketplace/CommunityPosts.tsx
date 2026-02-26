import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface CommunityPost {
  id: string;
  title: string;
  carousel_data: any;
  cover_url: string | null;
  card_count: number;
  created_at: string;
}

const CommunityPosts: React.FC<{ styleId: string }> = ({ styleId }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPost, setViewingPost] = useState<CommunityPost | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, [styleId]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await (supabase
      .from('generated_carousels')
      .select('id, title, carousel_data, cover_url, card_count, created_at') as any)
      .eq('marketplace_style_id', styleId)
      .order('created_at', { ascending: false })
      .limit(30);
    setPosts((data as any[]) || []);
    setLoading(false);
  };

  const openSlider = (post: CommunityPost) => {
    setViewingPost(post);
    setActiveSlide(0);
  };

  const cards = viewingPost?.carousel_data?.cards || [];

  if (loading) {
    return (
      <div className="mt-12">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Posts da Comunidade
        </h3>
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="mt-12">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Posts da Comunidade
        </h3>
        <p className="text-white/20 text-sm">Nenhum post gerado com este estilo ainda.</p>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Users className="w-4 h-4" /> Posts da Comunidade ({posts.length})
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {posts.map(post => (
          <button
            key={post.id}
            onClick={() => openSlider(post)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer"
          >
            {post.cover_url ? (
              <img src={post.cover_url} alt={post.title || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">
                {post.title?.slice(0, 30) || 'Sem capa'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <span className="text-white text-[11px] font-medium line-clamp-2">{post.title || 'Sem título'}</span>
            </div>
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white/70 text-[10px]">
              {post.card_count} cards
            </div>
          </button>
        ))}
      </div>

      {/* Slider Modal */}
      {viewingPost && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={() => setViewingPost(null)}>
          <div className="relative max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button
              onClick={() => setViewingPost(null)}
              className="absolute -top-10 right-0 text-white/50 hover:text-white text-sm cursor-pointer"
            >
              Fechar ✕
            </button>

            {/* Card display */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-white/[0.03]">
              {cards[activeSlide]?.imageUrl ? (
                <img src={cards[activeSlide].imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6 text-center">
                  <div>
                    <p className="text-white font-bold text-lg mb-2">{cards[activeSlide]?.title || ''}</p>
                    <p className="text-white/60 text-sm">{cards[activeSlide]?.body || ''}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            {cards.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                  disabled={activeSlide === 0}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-white/50 text-sm">{activeSlide + 1} / {cards.length}</span>
                <button
                  onClick={() => setActiveSlide(Math.min(cards.length - 1, activeSlide + 1))}
                  disabled={activeSlide === cards.length - 1}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            <p className="text-center text-white/30 text-xs mt-3">{viewingPost.title || 'Sem título'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPosts;
