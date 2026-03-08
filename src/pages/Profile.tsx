import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Camera, Edit3, Globe, Instagram, Loader2, Heart, ExternalLink, Share2, Upload, X, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';

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

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [carousels, setCarousels] = useState<CarouselItem[]>([]);
  const [communityPosts, setCommunityPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user && profile && user.id === profile.id;
  const profileUserId = username ? null : user?.id;

  useEffect(() => {
    loadProfile();
  }, [username, user]);

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
        
        // Auto-create profile if missing
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
        // Load carousels
        const { data: carouselData } = await supabase
          .from('generated_carousels')
          .select('id, title, cover_url, card_count, created_at, carousel_data')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(50);
        setCarousels((carouselData as any[]) || []);

        // Load community posts
        const { data: posts } = await supabase
          .from('community_posts')
          .select('carousel_id')
          .eq('user_id', profileData.id);
        setCommunityPosts(new Set((posts as any[])?.map(p => p.carousel_id) || []));
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
    try {
      const { error } = await supabase.from('profiles').update({
        display_name: editForm.display_name,
        bio: editForm.bio,
        website: editForm.website,
        instagram: editForm.instagram,
      } as any).eq('id', user.id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...editForm } : prev);
      setEditing(false);
      toast.success('Perfil atualizado!');
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
        await supabase.from('community_posts').delete().eq('carousel_id', carousel.id).eq('user_id', user.id);
        setCommunityPosts(prev => { const n = new Set(prev); n.delete(carousel.id); return n; });
        toast.success('Post removido da comunidade');
      } else {
        const coverUrl = carousel.cover_url || carousel.carousel_data?.cards?.[0]?.imageUrl || null;
        await supabase.from('community_posts').insert({
          user_id: user.id,
          carousel_id: carousel.id,
          cover_url: coverUrl,
          caption: carousel.title,
        } as any);
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
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm"
              >
                {uploading === 'banner' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadImage('banner', e.target.files[0])} />
            </>
          )}
        </div>

        {/* Avatar + Info */}
        <div className="px-4 sm:px-6 -mt-16 relative z-10">
          <div className="flex items-end gap-4">
            <div className="relative group">
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
                    className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploading === 'avatar' ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadImage('avatar', e.target.files[0])} />
                </>
              )}
            </div>
            <div className="flex-1 pb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{profile.display_name || 'Usuário'}</h1>
              <p className="text-sm text-white/30">@{profile.username}</p>
            </div>
            {isOwnProfile && !editing && (
              <button
                onClick={() => { setEditing(true); setEditForm({ display_name: profile.display_name, bio: profile.bio, website: profile.website, instagram: profile.instagram }); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/60 border border-white/[0.08] hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar perfil
              </button>
            )}
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
              <span className="text-white/20 text-sm font-normal ml-2">{carousels.length}</span>
            </h2>
          </div>

          {carousels.length === 0 ? (
            <div className="text-center py-16 text-white/20">
              <p className="text-sm">Nenhum post criado ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {carousels.map(carousel => {
                const cover = getCoverImage(carousel);
                const isPublished = communityPosts.has(carousel.id);
                return (
                  <div key={carousel.id} className="relative group rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/15 transition-all">
                    <div style={{ aspectRatio: '4/5' }} className="bg-white/[0.03]">
                      {cover ? (
                        <img src={cover} alt={carousel.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">Sem capa</div>
                      )}
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                      <p className="text-white text-xs font-medium text-center line-clamp-2">{carousel.title}</p>
                      <p className="text-white/30 text-[10px]">{carousel.card_count} cards</p>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => navigate(`/carousel/${carousel.id}`)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3 inline mr-1" /> Ver
                        </button>
                        {isOwnProfile && (
                          <button
                            onClick={() => handlePublishToCommunity(carousel)}
                            disabled={publishingId === carousel.id}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                              isPublished
                                ? 'bg-green-500/20 text-green-300 hover:bg-red-500/20 hover:text-red-300'
                                : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                            }`}
                          >
                            {publishingId === carousel.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isPublished ? (
                              <><Heart className="w-3 h-3 inline mr-1 fill-current" /> Publicado</>
                            ) : (
                              <><Share2 className="w-3 h-3 inline mr-1" /> Publicar</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Published badge */}
                    {isPublished && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500/80 flex items-center justify-center">
                        <Heart className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
