import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Loader2, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
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

function BentoGrid({ posts }: { posts: Post[] }) {
  const navigate = useNavigate();

  // Distribute posts into columns for masonry effect
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

              {/* Hover overlay — author + likes */}
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
              {/* Always visible small author bar on mobile */}
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

function CommunityContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Comunidade</h1>
        <p className="text-white/30 text-xs">Descubra e inspire-se com criações de outros usuários</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-white/20 text-sm">Nenhum post na comunidade ainda. Seja o primeiro!</div>
      ) : (
        <>
          {/* Desktop: 3-column masonry */}
          <div className="hidden sm:block">
            <BentoGrid posts={posts} />
          </div>
          {/* Mobile: 2-column */}
          <div className="block sm:hidden">
            <BentoGridMobile posts={posts} />
          </div>
        </>
      )}
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
