import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Camera, Edit3, Globe, Instagram, Loader2, Heart, ExternalLink, Share2, X, Check, Plus, Copy, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { isNativeIOS } from '@/lib/platform';

const PLAN_BADGES: Record<string, { label: string; color: string }> = {
  starter: { label: 'STARTER', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  base: { label: 'STARTER', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  pro: { label: 'PRO', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  growth: { label: 'GROWTH', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  business: { label: 'BUSINESS', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  website: string | null;
  instagram: string | null;
}

interface CarouselItem {
  id: string;
  title: string;
  cover_url: string | null;
  card_count: number;
  created_at: string;
  carousel_data: any;
  is_published?: boolean;
}

interface CommunityPostItem {
  id: string;
  carousel_id: string;
  caption: string | null;
  cover_url: string | null;
  likes_count: number;
  created_at: string;
}

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const nativeIOS = isNativeIOS();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [carousels, setCarousels] = useState<CarouselItem[]>([]);
  const [communityPosts, setCommunityPosts] = useState<Set<string>>(new Set());
  const [publishedPosts, setPublishedPosts] = useState<CommunityPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [selectedCarouselId, setSelectedCarouselId] = useState<string | null>(null);
  const [creatingPost, setCreatingPost] = useState(false);
  const [planType, setPlanType] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user && profile && user.id === profile.id;
  

  useEffect(() => {
    if (authLoading) return;
    loadProfile();
  }, [username, user, authLoading]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      let profileData: Profile | null = null;

      if (username) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle();
        profileData = data as Profile | null;
      } else if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        profileData = data as Profile | null;

        if (!profileData && user) {
          const newProfile: any = {
            id: user.id,
            display_name: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
            username: (user.email?.split('@')[0] || 'user') + '_' + user.id.substring(0, 4),
          };
          await supabase.from('profiles').insert(newProfile);
          profileData = newProfile;
        }
      }

      setProfile(profileData);

      if (profileData) {
        // Parallelize all queries
        const [carouselsRes, postsRes, companyRes] = await Promise.all([
          supabase
            .from('generated_carousels')
            .select('id, title, cover_url, card_count, created_at, carousel_data')
            .eq('user_id', profileData.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('community_posts')
            .select('id, carousel_id, cover_url, caption, likes_count, created_at')
            .eq('user_id', profileData.id)
            .order('created_at', { ascending: false }),
          user ? supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', profileData.id)
            .limit(1)
            .maybeSingle() : Promise.resolve({ data: null }),
        ]);

        let carouselsData = carouselsRes.data || [];

        // If no carousels by user_id, try company_id
        if (carouselsData.length === 0 && companyRes.data?.company_id && user?.id === profileData.id) {
          const { data: companyCarousels } = await supabase
            .from('generated_carousels')
            .select('id, title, cover_url, card_count, created_at, carousel_data')
            .eq('company_id', companyRes.data.company_id)
            .order('created_at', { ascending: false })
            .limit(50);
          carouselsData = companyCarousels || [];
        }

        setCarousels(carouselsData as CarouselItem[]);

        const postList = (postsRes.data as CommunityPostItem[]) || [];
        setPublishedPosts(postList);
        setCommunityPosts(new Set(postList.map((p) => p.carousel_id)));

        // Fetch subscription for badge
        if (companyRes.data?.company_id) {
          const [subRes, elloRes] = await Promise.all([
            supabase.from('subscriptions').select('plan_type, status').eq('company_id', companyRes.data.company_id).maybeSingle(),
            supabase.from('ellocontent_subscriptions').select('plan_name, status').eq('company_id', companyRes.data.company_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          ]);
          const ello = elloRes.data as any;
          const sub = subRes.data as any;
          if (ello?.status === 'active' || ello?.status === 'trialing') {
            const normalizedPlan = String(ello.plan_name || '').toLowerCase();
            setPlanType(Object.keys(PLAN_BADGES).find((key) => normalizedPlan.includes(key)) || normalizedPlan);
            setPlanStatus(ello.status);
          } else if (sub && sub.status !== 'free') {
            setPlanType(sub.plan_type);
            setPlanStatus(sub.status);
          }
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (type: 'avatar' | 'banner', file: File) => {
    if (!user || !profile) return;
    setUploading(type);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${type}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = urlData.publicUrl;

      await supabase.from('profiles').update({ [`${type}_url`]: url } as any).eq('id', user.id);
      setProfile(prev => prev ? { ...prev, [`${type}_url`]: url } : prev);
      toast.success(`${type === 'avatar' ? 'Foto' : 'Banner'} atualizado!`);
    } catch (err: any) {
      toast.error('Erro ao enviar imagem: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const normalizedUsername = (editForm.username || '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    if (!normalizedUsername) {
      toast.error('Defina um nome de usuário válido');
      return;
    }

    try {
      const { error } = await supabase.from('profiles').update({
        display_name: editForm.display_name,
        username: normalizedUsername,
        bio: editForm.bio,
        website: editForm.website,
        instagram: editForm.instagram,
      } as any).eq('id', user.id);
      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...editForm, username: normalizedUsername } : prev);
      setEditing(false);
      toast.success('Perfil atualizado!');
      navigate('/perfil');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const handlePublishToCommunity = async (carousel: CarouselItem) => {
    if (!user) return;
    setPublishingId(carousel.id);
    try {
      const isPublished = communityPosts.has(carousel.id);
      if (isPublished) {
        const postToRemove = publishedPosts.find((p) => p.carousel_id === carousel.id);
        if (postToRemove) {
          await supabase.from('community_posts').delete().eq('id', postToRemove.id).eq('user_id', user.id);
          setPublishedPosts((prev) => prev.filter((p) => p.id !== postToRemove.id));
        }
        setCommunityPosts(prev => { const n = new Set(prev); n.delete(carousel.id); return n; });
        toast.success('Post removido da comunidade');
      } else {
        const coverUrl = carousel.cover_url || carousel.carousel_data?.cards?.[0]?.imageUrl || null;
        const { data: insertedPost, error } = await supabase
          .from('community_posts')
          .insert({
            user_id: user.id,
            carousel_id: carousel.id,
            cover_url: coverUrl,
            caption: carousel.title,
          } as any)
          .select('id, carousel_id, cover_url, caption, likes_count, created_at')
          .single();

        if (error) throw error;
        if (insertedPost) {
          setPublishedPosts((prev) => [insertedPost as CommunityPostItem, ...prev]);
        }
        setCommunityPosts(prev => new Set([...prev, carousel.id]));
        toast.success('Post publicado na comunidade! 🎉');
      }
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setPublishingId(null);
    }
  };

  const getCoverImage = (c: CarouselItem) => {
    return c.cover_url || c.carousel_data?.cards?.[0]?.imageUrl || null;
  };

  const handleCreatePost = async () => {
    if (!user || !selectedCarouselId) return;
    setCreatingPost(true);
    try {
      const carousel = carousels.find(c => c.id === selectedCarouselId);
      if (!carousel) return;

      if (communityPosts.has(carousel.id)) {
        toast.error('Este projeto já foi publicado');
        return;
      }

      const coverUrl = getCoverImage(carousel);
      const { data: insertedPost, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          carousel_id: carousel.id,
          cover_url: coverUrl,
          caption: postCaption || carousel.title,
        } as any)
        .select('id, carousel_id, cover_url, caption, likes_count, created_at')
        .single();

      if (error) throw error;

      if (insertedPost) {
        setPublishedPosts((prev) => [insertedPost as CommunityPostItem, ...prev]);
      }

      setCommunityPosts(prev => new Set([...prev, carousel.id]));
      setShowPostDialog(false);
      setPostCaption('');
      setSelectedCarouselId(null);
      toast.success('Post publicado na comunidade! 🎉');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setCreatingPost(false);
    }
  };

  const unpublishedCarousels = carousels.filter((c) => !communityPosts.has(c.id));

  const copyPostLink = async (postId: string) => {
    const link = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-white/30" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full text-white/40">
          <p className="text-lg font-medium">Perfil não encontrado</p>
          <button onClick={() => navigate('/')} className="mt-4 text-purple-400 text-sm hover:underline cursor-pointer">Voltar</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-20">
        {/* Banner */}
        <div className="relative h-48 sm:h-64 rounded-b-2xl overflow-hidden group">
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 50%, #6B3FA0 100%)' }} />
          )}
          {isOwnProfile && (
            <>
              <button
                onClick={() => bannerInputRef.current?.click()}
                aria-label="Alterar banner do perfil"
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 text-white/70 hover:text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm"
              >
                {uploading === 'banner' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadImage('banner', e.target.files[0])} />
            </>
          )}
        </div>

        {/* Avatar + Info */}
        <div className="px-4 sm:px-6 -mt-16 relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative group self-start shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-4 overflow-hidden" style={{ borderColor: '#0a0a0f', background: '#1a1a24' }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.display_name || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white/20">
                    {(profile.display_name || '?')[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Alterar foto do perfil"
                    className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploading === 'avatar' ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadImage('avatar', e.target.files[0])} />
                </>
              )}
            </div>
            <div className="w-full min-w-0 flex-1 sm:pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-xl sm:text-2xl font-bold text-white break-words">{profile.display_name || 'Usuário'}</h1>
                {!nativeIOS && planType && PLAN_BADGES[planType] && (planStatus === 'active' || planStatus === 'trialing') && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${PLAN_BADGES[planType].color}`}>
                    <Crown className="w-3 h-3" />
                    {PLAN_BADGES[planType].label}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/30">@{profile.username}</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
              {isOwnProfile && !nativeIOS && (
                <button
                  onClick={() => navigate('/configuracoes')}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-center text-[11px] font-medium text-purple-300 border border-purple-500/20 hover:bg-purple-500/10 transition-colors cursor-pointer sm:flex-none"
                >
                  Ver detalhes de assinatura
                </button>
              )}
              {isOwnProfile && !editing && (
                <button
                  onClick={() => { setEditing(true); setEditForm({ display_name: profile.display_name, username: profile.username, bio: profile.bio, website: profile.website, instagram: profile.instagram }); }}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/60 border border-white/[0.08] hover:bg-white/[0.04] transition-colors cursor-pointer sm:flex-none"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar perfil
                </button>
              )}
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="mt-6 p-5 rounded-2xl border border-white/[0.08]" style={{ backgroundColor: '#111116' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-white/30 font-medium mb-1 block">Nome</label>
                  <input value={editForm.display_name || ''} onChange={e => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white outline-none focus:border-purple-500/40" />
                </div>
                <div>
                  <label className="text-[11px] text-white/30 font-medium mb-1 block">Usuário</label>
                  <input value={editForm.username || ''} onChange={e => setEditForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} placeholder="meu_usuario"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white outline-none focus:border-purple-500/40" />
                </div>
                <div>
                  <label className="text-[11px] text-white/30 font-medium mb-1 block">Instagram</label>
                  <input value={editForm.instagram || ''} onChange={e => setEditForm(prev => ({ ...prev, instagram: e.target.value }))} placeholder="@usuario"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white outline-none focus:border-purple-500/40" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-white/30 font-medium mb-1 block">Bio</label>
                  <textarea value={editForm.bio || ''} onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))} rows={2} placeholder="Conte um pouco sobre você..."
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white outline-none focus:border-purple-500/40 resize-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-white/30 font-medium mb-1 block">Website</label>
                  <input value={editForm.website || ''} onChange={e => setEditForm(prev => ({ ...prev, website: e.target.value }))} placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white outline-none focus:border-purple-500/40" />
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 cursor-pointer">Cancelar</button>
                <button onClick={handleSaveProfile} className="px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #7B50DC, #9B6BFF)' }}>
                  <Check className="w-3.5 h-3.5 inline mr-1" /> Salvar
                </button>
              </div>
            </div>
          )}

          {/* Bio + links */}
          {!editing && (profile.bio || profile.website || profile.instagram) && (
            <div className="mt-4 space-y-2">
              {profile.bio && <p className="text-sm text-white/50 leading-relaxed">{profile.bio}</p>}
              <div className="flex items-center gap-4">
                {profile.instagram && (
                  <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                    <Instagram className="w-3.5 h-3.5" /> {profile.instagram}
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Website
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Posts grid */}
        <div className="px-4 sm:px-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              {isOwnProfile ? 'Meus Posts' : 'Posts'} 
              <span className="text-white/20 text-sm font-normal ml-2">{publishedPosts.length}</span>
            </h2>
            {isOwnProfile && (
              <button
                onClick={() => setShowPostDialog(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7B50DC, #9B6BFF)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Criar Post
              </button>
            )}
          </div>

          {/* Create Post Dialog */}
          {showPostDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPostDialog(false)}>
              <div className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] p-6" style={{ backgroundColor: '#111116' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-white">Criar Post</h3>
                  <button onClick={() => setShowPostDialog(false)} aria-label="Fechar criação de post" className="text-white/30 hover:text-white/60 cursor-pointer"><X className="w-5 h-5" /></button>
                </div>

                {/* Project Selection */}
                <label className="text-[11px] text-white/30 font-medium mb-2 block">Selecione um projeto</label>
                <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto mb-4 pr-1">
                  {carousels.map(c => {
                    const cover = getCoverImage(c);
                    const isSelected = selectedCarouselId === c.id;
                    const alreadyPublished = communityPosts.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => !alreadyPublished && setSelectedCarouselId(c.id)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all ${alreadyPublished ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-white/[0.06] hover:border-white/15'}`}
                      >
                        <div style={{ aspectRatio: '4/5' }} className="bg-white/[0.03]">
                          {cover ? <img src={cover} alt={c.title} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center text-white/10 text-[10px]">Sem capa</div>}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                          <p className="text-[9px] text-white/70 truncate">{c.title}</p>
                        </div>
                        {alreadyPublished && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-green-500/80 text-[8px] text-white font-medium">Publicado</div>
                        )}
                        {isSelected && <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center"><Check className="w-5 h-5 text-purple-300" /></div>}
                      </button>
                    );
                  })}
                  {carousels.length === 0 && (
                    <p className="col-span-3 text-center text-white/20 text-xs py-4">Nenhum projeto encontrado. Crie um carrossel primeiro!</p>
                  )}
                </div>

                {/* Caption */}
                <label className="text-[11px] text-white/30 font-medium mb-1 block">Comentário (opcional)</label>
                <textarea
                  value={postCaption}
                  onChange={e => setPostCaption(e.target.value)}
                  rows={2}
                  placeholder="Escreva algo sobre esse post..."
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white outline-none focus:border-purple-500/40 resize-none mb-4"
                />

                <button
                  onClick={handleCreatePost}
                  disabled={!selectedCarouselId || creatingPost}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 cursor-pointer transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7B50DC, #9B6BFF)' }}
                >
                  {creatingPost ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Publicar na Comunidade'}
                </button>
              </div>
            </div>
          )}

          {publishedPosts.length === 0 ? (
            <div className="text-center py-16 text-white/20">
              <p className="text-sm">Nenhum post criado ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {publishedPosts.map(post => {
                return (
                  <div key={post.id} className="relative group rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/15 transition-all cursor-pointer" onClick={() => navigate(`/post/${post.id}`)}>
                    <div style={{ aspectRatio: '4/5' }} className="bg-white/[0.03]">
                      {post.cover_url ? (
                        <img src={post.cover_url} alt={post.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">Sem capa</div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                      <p className="text-white text-xs font-medium text-center line-clamp-2">{post.caption || 'Post'}</p>
                      <div className="flex items-center gap-1 text-white/40 text-[10px]">
                        <Heart className="w-3 h-3" /> {post.likes_count || 0}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          aria-label="Copiar link do post"
                          onClick={(e) => { e.stopPropagation(); copyPostLink(post.id); }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3 inline mr-1" /> Link
                        </button>
                        {isOwnProfile && (
                          <button
                            aria-label="Remover post da comunidade"
                            onClick={(e) => {
                              e.stopPropagation();
                              const carousel = carousels.find(c => c.id === post.carousel_id);
                              if (carousel) handlePublishToCommunity(carousel);
                            }}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3 inline mr-1" /> Remover
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
                      <Heart className="w-2.5 h-2.5 text-white/50" />
                      <span className="text-[9px] text-white/50">{post.likes_count || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ver comunidade button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate('/comunidade')}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 transition-colors cursor-pointer"
            >
              Ver Comunidade
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
