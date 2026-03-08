import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, Copy, Heart, Loader2, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityPost {
  id: string;
  user_id: string;
  caption: string | null;
  cover_url: string | null;
  likes_count: number;
  created_at: string;
}

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const PostPublic: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<(CommentRow & { profile?: Profile | null })[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const shareLink = useMemo(() => `${window.location.origin}/post/${postId}`, [postId]);

  useEffect(() => {
    loadPost();
  }, [postId, user?.id]);

  const loadPost = async () => {
    if (!postId) return;
    setLoading(true);

    try {
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .select('id, user_id, caption, cover_url, likes_count, created_at')
        .eq('id', postId)
        .maybeSingle();

      if (postError) throw postError;
      if (!postData) {
        setPost(null);
        return;
      }

      setPost(postData as CommunityPost);
      setLikesCount(postData.likes_count || 0);

      const [authorRes, commentsRes, likeRes] = await Promise.all([
        supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', postData.user_id).maybeSingle(),
        supabase.from('community_post_comments').select('id, user_id, content, created_at').eq('post_id', postId).order('created_at', { ascending: false }),
        user ? supabase.from('community_post_likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
      ]);

      setAuthor((authorRes.data as Profile) || null);
      setLiked(Boolean(likeRes.data));

      const commentRows = (commentsRes.data as CommentRow[]) || [];
      if (commentRows.length > 0) {
        const uniqueUserIds = [...new Set(commentRows.map((c) => c.user_id))];
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', uniqueUserIds);

        const byId = new Map((profileRows || []).map((p: any) => [p.id, p]));
        setComments(commentRows.map((c) => ({ ...c, profile: byId.get(c.user_id) || null })));
      } else {
        setComments([]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar post');
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async () => {
    if (!user || !postId) {
      toast.error('Faça login para curtir');
      return;
    }

    try {
      if (liked) {
        const { error } = await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
        setLiked(false);
        setLikesCount((prev) => Math.max(prev - 1, 0));
      } else {
        const { error } = await supabase
          .from('community_post_likes')
          .insert({ post_id: postId, user_id: user.id } as any);

        if (error) throw error;
        setLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao curtir post');
    }
  };

  const addComment = async () => {
    if (!user || !postId || !commentText.trim()) {
      if (!user) toast.error('Faça login para comentar');
      return;
    }

    setCommenting(true);
    try {
      const { data, error } = await supabase
        .from('community_post_comments')
        .insert({ post_id: postId, user_id: user.id, content: commentText.trim() } as any)
        .select('id, user_id, content, created_at')
        .single();

      if (error) throw error;

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      setComments((prev) => [{ ...(data as CommentRow), profile: (currentProfile as Profile) || null }, ...prev]);
      setCommentText('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao comentar');
    } finally {
      setCommenting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Post não encontrado.</p>
        <button onClick={() => navigate('/perfil')} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="font-semibold">{author?.display_name || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground">@{author?.username || 'usuario'}</p>
          </div>

          <div className="aspect-[4/5] bg-muted/30">
            {post.cover_url ? (
              <img src={post.cover_url} alt={post.caption || 'Post'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem capa</div>
            )}
          </div>

          <div className="p-4 space-y-4">
            <p className="text-sm">{post.caption || 'Sem descrição'}</p>

            <div className="flex items-center gap-2">
              <button onClick={toggleLike} className={`px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${liked ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} /> {likesCount}
              </button>

              <button onClick={copyLink} className="px-3 py-2 rounded-lg text-sm bg-secondary text-secondary-foreground inline-flex items-center gap-2">
                <Copy className="w-4 h-4" /> Compartilhar
              </button>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-sm font-medium mb-2 inline-flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Comentários ({comments.length})
              </p>

              <div className="flex gap-2 mb-3">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva um comentário"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
                <button onClick={addComment} disabled={commenting || !commentText.trim()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                  {commenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {comments.length === 0 && <p className="text-xs text-muted-foreground">Seja o primeiro a comentar.</p>}
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-border p-2.5 bg-background/60">
                    <p className="text-xs text-muted-foreground mb-1">
                      {comment.profile?.display_name || 'Usuário'} • {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostPublic;
