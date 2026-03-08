import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Loader2, User, Send, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';

interface Post {
  id: string;
  user_id: string;
  carousel_id: string;
  caption: string | null;
  cover_url: string | null;
  likes_count: number;
  created_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
}

function CommunityContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Comments
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50) as any;

      if (!postsData || postsData.length === 0) { setPosts([]); return; }

      const userIds = [...new Set((postsData as Post[]).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

      const enriched = (postsData as Post[]).map(p => ({
        ...p,
        profile: profileMap[p.user_id] || null,
      }));

      setPosts(enriched);

      // Load user likes
      if (user) {
        const { data: likes } = await supabase
          .from('community_post_likes')
          .select('post_id')
          .eq('user_id', user.id) as any;
        setLikedPosts(new Set((likes || []).map((l: any) => l.post_id)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const toggleLike = async (postId: string) => {
    if (!user) { toast.error('Faça login para curtir'); return; }
    const isLiked = likedPosts.has(postId);

    // Optimistic
    setLikedPosts(prev => {
      const n = new Set(prev);
      isLiked ? n.delete(postId) : n.add(postId);
      return n;
    });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p));

    try {
      if (isLiked) {
        await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('community_post_likes').insert({ post_id: postId, user_id: user.id } as any);
      }
    } catch {
      // Revert
      setLikedPosts(prev => {
        const n = new Set(prev);
        isLiked ? n.add(postId) : n.delete(postId);
        return n;
      });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? 1 : -1) } : p));
    }
  };

  const openComments = async (postId: string) => {
    setOpenCommentsId(postId);
    setCommentsLoading(true);
    setComments([]);
    try {
      const { data } = await supabase
        .from('community_post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }) as any;

      if (data && data.length > 0) {
        const userIds = [...new Set((data as Comment[]).map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', userIds);
        const profileMap: Record<string, any> = {};
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
        setComments((data as Comment[]).map(c => ({ ...c, profile: profileMap[c.user_id] || null })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const sendComment = async () => {
    if (!user || !openCommentsId || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const { data, error } = await supabase
        .from('community_post_comments')
        .insert({ post_id: openCommentsId, user_id: user.id, content: newComment.trim() } as any)
        .select('*')
        .single();
      if (error) throw error;

      const { data: profile } = await supabase.from('profiles').select('id, display_name, username, avatar_url').eq('id', user.id).single();
      setComments(prev => [...prev, { ...(data as Comment), profile: profile || null }]);
      setNewComment('');
    } catch (err: any) {
      toast.error('Erro ao comentar');
    } finally {
      setSendingComment(false);
    }
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return 'agora há pouco';
    if (diffH < 24) return `${diffH}h atrás`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white mb-1">Comunidade</h1>
        <p className="text-white/30 text-xs mb-8">Descubra e inspire-se com criações de outros usuários</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-white/20 text-sm">Nenhum post na comunidade ainda. Seja o primeiro!</div>
      ) : (
        <div className="space-y-6">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => post.profile?.username && navigate(`/perfil/${post.profile.username}`)}
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center overflow-hidden shrink-0">
                    {post.profile?.avatar_url ? (
                      <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-white/80 font-medium">{post.profile?.display_name || 'Usuário'}</p>
                    <p className="text-[10px] text-white/25">@{post.profile?.username || '?'} · {fmtDate(post.created_at)}</p>
                  </div>
                </button>
              </div>

              {/* Image */}
              {post.cover_url && (
                <div
                  className="w-full cursor-pointer"
                  style={{ aspectRatio: '4/5', maxHeight: '360px' }}
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <img src={post.cover_url} alt={post.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}

              {/* Actions */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-4 mb-2">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-1.5 cursor-pointer transition-colors"
                    style={{ color: likedPosts.has(post.id) ? '#ef4444' : 'rgba(255,255,255,0.4)' }}
                  >
                    <Heart className="w-5 h-5" fill={likedPosts.has(post.id) ? '#ef4444' : 'none'} />
                    <span className="text-sm font-medium">{post.likes_count || 0}</span>
                  </button>
                  <button
                    onClick={() => openComments(post.id)}
                    className="flex items-center gap-1.5 cursor-pointer text-white/40 hover:text-white/70 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">Comentar</span>
                  </button>
                </div>
                {post.caption && (
                  <p className="text-sm text-white/60 leading-relaxed">
                    <span className="font-medium text-white/80 mr-1.5">{post.profile?.username}</span>
                    {post.caption}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Comments Drawer */}
      <AnimatePresence>
        {openCommentsId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setOpenCommentsId(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-lg rounded-t-2xl border-t border-white/[0.08] max-h-[70vh] flex flex-col"
              style={{ backgroundColor: '#111116' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">Comentários</h3>
                <button onClick={() => setOpenCommentsId(null)} className="text-white/30 hover:text-white/60 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {commentsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-white/20 text-xs py-8">Nenhum comentário ainda. Seja o primeiro!</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {c.profile?.avatar_url ? (
                          <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-purple-400">{(c.profile?.display_name || '?')[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs">
                          <button onClick={() => c.profile?.username && navigate(`/perfil/${c.profile.username}`)} className="font-medium text-white/70 hover:text-white cursor-pointer mr-1.5">
                            {c.profile?.display_name || 'Usuário'}
                          </button>
                          <span className="text-white/50">{c.content}</span>
                        </p>
                        <p className="text-[10px] text-white/20 mt-0.5">{fmtDate(c.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {user && (
                <div className="px-4 py-3 border-t border-white/[0.06] flex gap-2">
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendComment()}
                    placeholder="Escreva um comentário..."
                    className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <button
                    onClick={sendComment}
                    disabled={!newComment.trim() || sendingComment}
                    className="p-2.5 rounded-xl cursor-pointer disabled:opacity-30 transition-opacity"
                    style={{ backgroundColor: '#7B50DC' }}
                  >
                    {sendingComment ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Comunidade() {
  return (
    <DashboardLayout>
      <CommunityContent />
    </DashboardLayout>
  );
}
