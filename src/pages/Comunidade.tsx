import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Loader2, User, Plus, X, Search } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { toast } from 'sonner';

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

function BentoGrid({ posts }: { posts: Post[] }) {
  const navigate = useNavigate();

  const getColumns = (count: number) => {
    const cols: Post[][] = Array.from({ length: count }, () => []);
    posts.forEach((post, i) => {
      cols[i % count].push(post);
    });
    return cols;
  };

  const columns = getColumns(3);

  return (
    <div className="flex gap-3 w-full">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex-1 flex flex-col gap-3">
          {col.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="group relative rounded-xl overflow-hidden cursor-pointer bg-white/[0.03]"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              {post.cover_url ? (
                <img
                  src={post.cover_url}
                  alt={post.caption || ''}
                  className="w-full object-cover block"
                  loading="lazy"
                  style={{ minHeight: '180px' }}
                />
              ) : (
                <div className="w-full flex items-center justify-center text-white/10 text-xs" style={{ aspectRatio: '4/5' }}>
                  Sem capa
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden shrink-0">
                    {post.profile?.avatar_url ? (
                      <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3 h-3 text-white/70" />
                    )}
                  </div>
                  <span className="text-white text-xs font-medium truncate">
                    {post.profile?.display_name || 'Usuário'}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1.5 text-white/60">
                  <Heart className="w-3 h-3" />
                  <span className="text-[11px]">{post.likes_count || 0}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}

function BentoGridMobile({ posts }: { posts: Post[] }) {
  const navigate = useNavigate();

  const columns = [
    posts.filter((_, i) => i % 2 === 0),
    posts.filter((_, i) => i % 2 === 1),
  ];

  return (
    <div className="flex gap-2 w-full">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex-1 flex flex-col gap-2">
          {col.map((post) => (
            <div
              key={post.id}
              className="relative rounded-lg overflow-hidden cursor-pointer bg-white/[0.03]"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              {post.cover_url ? (
                <img
                  src={post.cover_url}
                  alt=""
                  className="w-full object-cover block"
                  loading="lazy"
                  style={{ minHeight: '120px' }}
                />
              ) : (
                <div className="w-full flex items-center justify-center text-white/10 text-xs" style={{ aspectRatio: '4/5' }}>
                  Sem capa
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                  {post.profile?.avatar_url ? (
                    <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-2.5 h-2.5 text-white/70" />
                  )}
                </div>
                <span className="text-white text-[10px] font-medium truncate flex-1">{post.profile?.display_name || 'Usuário'}</span>
                <div className="flex items-center gap-0.5 text-white/50">
                  <Heart className="w-2.5 h-2.5" />
                  <span className="text-[9px]">{post.likes_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CreatePostModal({ open, onClose, onPublished }: { open: boolean; onClose: () => void; onPublished: () => void }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoading(true);
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).single();
      if (!cu) { setLoading(false); return; }
      const { data } = await supabase
        .from('generated_carousels')
        .select('id, title, topic, cover_url, card_count, created_at, carousel_data')
        .eq('company_id', cu.company_id)
        .order('created_at', { ascending: false })
        .limit(100) as any;
      setProjects(data || []);
      setLoading(false);
    };
    load();
  }, [open, user]);

  const filtered = projects.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.title || '').toLowerCase().includes(q) || (p.topic || '').toLowerCase().includes(q);
  });

  const handlePublish = async () => {
    if (!user || !selected) return;
    setPublishing(true);
    try {
      const coverUrl = selected.cover_url || selected.carousel_data?.cards?.[0]?.imageUrl || null;
      const { error } = await supabase.from('community_posts').insert({
        user_id: user.id,
        carousel_id: selected.id,
        cover_url: coverUrl,
        caption: caption || selected.title || selected.topic || '',
      } as any);
      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          toast.info('Este projeto já foi publicado na comunidade');
        } else throw error;
      } else {
        toast.success('Publicado na comunidade! 🎉');
        onPublished();
      }
    } catch (err: any) {
      toast.error('Erro ao publicar: ' + err.message);
    } finally {
      setPublishing(false);
      onClose();
      setSelected(null);
      setCaption('');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Criar Post</h3>
            <p className="text-white/40 text-xs mt-0.5">Selecione um projeto para publicar</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        {!selected ? (
          <>
            <div className="px-5 pt-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar projeto..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2" style={{ maxHeight: '400px' }}>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-10">Nenhum projeto encontrado</p>
              ) : (
                filtered.map(p => {
                  const cover = p.cover_url || p.carousel_data?.cards?.[0]?.imageUrl;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelected(p); setCaption(p.title || p.topic || ''); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] transition-all text-left"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/[0.05] shrink-0">
                        {cover ? (
                          <img src={cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10 text-[9px]">Sem capa</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.title || p.topic || 'Sem título'}</p>
                        <p className="text-white/30 text-[11px] mt-0.5">{p.card_count || 1} cards · {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/[0.05] shrink-0">
                {(selected.cover_url || selected.carousel_data?.cards?.[0]?.imageUrl) ? (
                  <img src={selected.cover_url || selected.carousel_data?.cards?.[0]?.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">Sem capa</div>
                )}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{selected.title || selected.topic || 'Sem título'}</p>
                <button onClick={() => setSelected(null)} className="text-blue-400 text-xs mt-1 hover:underline">Trocar projeto</button>
              </div>
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Legenda (opcional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm resize-none h-20 focus:outline-none focus:border-white/20"
            />
            <button
              disabled={publishing}
              onClick={handlePublish}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
            >
              {publishing ? 'Publicando...' : 'Publicar na Comunidade'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CommunityContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuth();

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60) as any;

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Comunidade</h1>
          <p className="text-white/30 text-xs">Descubra e inspire-se com criações de outros usuários</p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          >
            <Plus className="w-4 h-4" /> Criar Post
          </button>
        )}
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-white/20 text-sm">Nenhum post na comunidade ainda. Seja o primeiro!</div>
      ) : (
        <>
          <div className="hidden sm:block">
            <BentoGrid posts={posts} />
          </div>
          <div className="block sm:hidden">
            <BentoGridMobile posts={posts} />
          </div>
        </>
      )}

      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPublished={() => { setShowCreateModal(false); loadPosts(); }}
      />
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
