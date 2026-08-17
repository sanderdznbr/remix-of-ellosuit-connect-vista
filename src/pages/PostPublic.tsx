import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, Copy, Heart, Loader2, MessageCircle, Send, User, ChevronLeft, ChevronRight, Flag, ShieldAlert, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { communityReportReasons, type CommunityReportReason, validateCommunityText } from '@/lib/communityModeration';

interface CommunityPost {
  id: string;
  user_id: string;
  carousel_id: string;
  caption: string | null;
  cover_url: string | null;
  likes_count: number;
  created_at: string;
  moderation_status?: string;
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
  moderation_status?: string;
}

function PostContent() {
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
  const [carouselCards, setCarouselCards] = useState<{ imageUrl?: string; title?: string; body?: string }[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [safetyTarget, setSafetyTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState<CommunityReportReason>('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingSafetyAction, setSubmittingSafetyAction] = useState(false);

  const shareLink = useMemo(() => `${window.location.origin}/post/${postId}`, [postId]);

  useEffect(() => { loadPost(); }, [postId, user?.id]);

  const loadPost = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .select('id, user_id, carousel_id, caption, cover_url, likes_count, created_at, moderation_status')
        .eq('id', postId)
        .maybeSingle();

      if (postError) throw postError;
      if (!postData) { setPost(null); return; }

      setPost(postData as CommunityPost);
      setLikesCount(postData.likes_count || 0);

      const [authorRes, commentsRes, likeRes, carouselRes, blocksRes] = await Promise.all([
        supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', postData.user_id).maybeSingle(),
        supabase.from('community_post_comments').select('id, user_id, content, created_at, moderation_status').eq('post_id', postId).eq('moderation_status', 'visible').order('created_at', { ascending: false }),
        user ? supabase.from('community_post_likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
        (postData as any).carousel_id
          ? (supabase.from('generated_carousels').select('id, carousel_data').eq('id', (postData as any).carousel_id).maybeSingle() as any)
          : Promise.resolve({ data: null, error: null }),
        user
          ? supabase.from('community_user_blocks').select('blocked_user_id').eq('blocker_user_id', user.id)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const blockedIds = new Set<string>(((blocksRes as any).data || []).map((row: any) => row.blocked_user_id));
      if (blockedIds.has(postData.user_id) && postData.user_id !== user?.id) {
        setPost(null);
        return;
      }

      setAuthor((authorRes.data as Profile) || null);
      setLiked(Boolean(likeRes.data));

      if (carouselRes.data?.carousel_data?.cards) {
        setCarouselCards(carouselRes.data.carousel_data.cards);
      }

      const commentRows = (((commentsRes.data as CommentRow[]) || []).filter((comment) => !blockedIds.has(comment.user_id)));
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
    if (!user || !postId) { toast.error('Faça login para curtir'); return; }
    try {
      if (liked) {
        await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        setLiked(false);
        setLikesCount((prev) => Math.max(prev - 1, 0));
      } else {
        await supabase.from('community_post_likes').insert({ post_id: postId, user_id: user.id } as any);
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
    const moderation = validateCommunityText(commentText);
    if (!moderation.allowed) {
      toast.error(moderation.message);
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
        .from('profiles').select('id, username, display_name, avatar_url').eq('id', user.id).maybeSingle();
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
    } catch { toast.error('Não foi possível copiar o link'); }
  };

  const submitReport = async () => {
    if (!user || !safetyTarget) {
      toast.error('Faça login para denunciar conteúdo');
      return;
    }

    setSubmittingSafetyAction(true);
    try {
      const table = safetyTarget.type === 'post' ? 'community_post_reports' : 'community_comment_reports';
      const foreignKey = safetyTarget.type === 'post' ? 'post_id' : 'comment_id';
      const { error } = await supabase.from(table).insert({
        [foreignKey]: safetyTarget.id,
        reporter_user_id: user.id,
        reason: reportReason,
        details: reportDetails.trim().slice(0, 400) || null,
      } as any);

      if (error?.code === '23505') {
        toast.info('Você já denunciou este conteúdo. Nossa equipe fará a análise.');
      } else if (error) {
        throw error;
      } else {
        toast.success('Denúncia recebida. Obrigado por ajudar a manter a comunidade segura.');
      }
      setSafetyTarget(null);
      setReportDetails('');
      setReportReason('spam');
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível enviar a denúncia');
    } finally {
      setSubmittingSafetyAction(false);
    }
  };

  const blockAuthor = async () => {
    if (!user || !post || post.user_id === user.id) return;
    setSubmittingSafetyAction(true);
    try {
      const { error } = await supabase.from('community_user_blocks').upsert({
        blocker_user_id: user.id,
        blocked_user_id: post.user_id,
      } as any, { onConflict: 'blocker_user_id,blocked_user_id' });
      if (error) throw error;
      toast.success('Usuário bloqueado. O conteúdo dele não aparecerá mais para você.');
      navigate('/comunidade', { replace: true });
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível bloquear este usuário');
    } finally {
      setSubmittingSafetyAction(false);
      setSafetyTarget(null);
    }
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / 3600000);
    if (diffH < 1) return 'agora há pouco';
    if (diffH < 24) return `${diffH}h atrás`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Determine images to show
  const images = carouselCards.length > 0
    ? carouselCards.map(c => c.imageUrl).filter(Boolean) as string[]
    : post?.cover_url ? [post.cover_url] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-white/20" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-white/30 text-sm">Post não encontrado.</p>
        <button onClick={() => navigate('/comunidade')} className="px-4 py-2 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/15 cursor-pointer">Voltar</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/60 cursor-pointer transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Image viewer */}
        <div className="flex-1 min-w-0">
          <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {images.length > 0 ? (
              <>
                <img
                  src={images[activeSlide] || images[0]}
                  alt=""
                  className="w-full object-contain"
                  style={{ maxHeight: '600px' }}
                />
                {images.length > 1 && (
                  <>
                    {activeSlide > 0 && (
                      <button
                        onClick={() => setActiveSlide(prev => prev - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/70 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                    {activeSlide < images.length - 1 && (
                      <button
                        onClick={() => setActiveSlide(prev => prev + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/70 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/70 text-[11px]">
                      {activeSlide + 1} / {images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full flex items-center justify-center text-white/10 text-sm" style={{ aspectRatio: '4/5' }}>Sem imagem</div>
            )}
          </div>
        </div>

        {/* Right: Info + comments */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => author?.username && navigate(`/perfil/${author.username}`)}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center overflow-hidden shrink-0">
                {author?.avatar_url ? (
                  <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-purple-400" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm text-white/80 font-medium">{author?.display_name || 'Usuário'}</p>
                <p className="text-[10px] text-white/25">@{author?.username || 'usuario'} · {fmtDate(post.created_at)}</p>
              </div>
            </button>
          </div>

          {/* Caption */}
          {post.caption && (
            <p className="text-sm text-white/50 leading-relaxed">{post.caption}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLike}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors"
              style={{
                backgroundColor: liked ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                color: liked ? '#ef4444' : 'rgba(255,255,255,0.4)',
                border: '1px solid ' + (liked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'),
              }}
            >
              <Heart className="w-4 h-4" fill={liked ? '#ef4444' : 'none'} /> {likesCount}
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Copy className="w-4 h-4" /> Compartilhar
            </button>
            {user && post.user_id !== user.id && (
              <button
                onClick={() => setSafetyTarget({ type: 'post', id: post.id })}
                aria-label="Denunciar ou bloquear"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <ShieldAlert className="w-4 h-4" /> Segurança
              </button>
            )}
          </div>

          {/* Comments section */}
          <div className="rounded-2xl overflow-hidden flex flex-col flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <MessageCircle className="w-4 h-4 text-white/30" />
              <span className="text-sm font-medium text-white/50">Comentários ({comments.length})</span>
            </div>

            {/* Comment input */}
            <div className="px-3 py-3 flex gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addComment()}
                placeholder="Escreva um comentário..."
                className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                onClick={addComment}
                disabled={commenting || !commentText.trim()}
                className="p-2.5 rounded-xl cursor-pointer disabled:opacity-30 transition-opacity"
                style={{ backgroundColor: '#7B50DC' }}
              >
                {commenting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto max-h-72 px-3 py-3 space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-white/15 text-xs py-6">Seja o primeiro a comentar.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {c.profile?.avatar_url ? (
                        <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold text-purple-400">{(c.profile?.display_name || '?')[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <button
                          onClick={() => c.profile?.username && navigate(`/perfil/${c.profile.username}`)}
                          className="font-medium text-white/60 hover:text-white cursor-pointer mr-1.5"
                        >
                          {c.profile?.display_name || 'Usuário'}
                        </button>
                        <span className="text-white/40">{c.content}</span>
                      </p>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="text-[10px] text-white/30">{fmtDate(c.created_at)}</p>
                        {user && c.user_id !== user.id && (
                          <button
                            onClick={() => setSafetyTarget({ type: 'comment', id: c.id })}
                            aria-label="Denunciar comentário"
                            className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[10px] text-white/45 hover:bg-white/5 hover:text-white/70"
                          >
                            <Flag className="h-3 w-3" /> Denunciar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {safetyTarget && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="community-safety-title"
          onClick={() => !submittingSafetyAction && setSafetyTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#171727] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="community-safety-title" className="text-lg font-semibold text-white">Segurança da comunidade</h2>
                <p className="mt-1 text-sm text-white/55">
                  Denúncias são analisadas e conteúdo com múltiplas denúncias é ocultado preventivamente.
                </p>
              </div>
              <button
                onClick={() => setSafetyTarget(null)}
                disabled={submittingSafetyAction}
                aria-label="Fechar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/55 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-medium text-white/80" htmlFor="community-report-reason">
              Motivo da denúncia
            </label>
            <select
              id="community-report-reason"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value as CommunityReportReason)}
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-purple-400"
            >
              {communityReportReasons.map((reason) => (
                <option key={reason.value} value={reason.value} className="bg-[#171727]">{reason.label}</option>
              ))}
            </select>

            <label className="mt-4 block text-sm font-medium text-white/80" htmlFor="community-report-details">
              Detalhes opcionais
            </label>
            <textarea
              id="community-report-details"
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value.slice(0, 400))}
              placeholder="Explique brevemente o problema"
              className="mt-2 h-24 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400"
            />

            <button
              onClick={submitReport}
              disabled={submittingSafetyAction}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            >
              {submittingSafetyAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              Enviar denúncia
            </button>

            {safetyTarget.type === 'post' && user && post.user_id !== user.id && (
              <button
                onClick={blockAuthor}
                disabled={submittingSafetyAction}
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-white/70 hover:bg-white/5 disabled:opacity-50"
              >
                <UserX className="h-4 w-4" /> Bloquear usuário e ocultar conteúdo
              </button>
            )}

            <p className="mt-4 text-center text-xs text-white/45">
              Precisa de ajuda? Escreva para <a href="mailto:sander@criativize.com" className="text-purple-300 underline">sander@criativize.com</a>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const PostPublic: React.FC = () => {
  return (
    <DashboardLayout>
      <PostContent />
    </DashboardLayout>
  );
};

export default PostPublic;
