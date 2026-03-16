import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingBag, Sparkles, Check, Search, Crown, Pencil, Plus, Star, EyeOff, Eye } from 'lucide-react';
import AdminStyleDialog from './AdminStyleDialog';

const ADMIN_EMAIL = 'admin@gmail.com';

interface MarketplaceStyle {
  id: string;
  name: string;
  description: string | null;
  preview_images: string[];
  price_credits: number;
  price_brl: number;
  category: string;
  style_config: any;
  is_featured: boolean;
  is_free?: boolean;
  tags: string[];
  strict_instructions?: string;
}

const MarketplaceContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [styles, setStyles] = useState<MarketplaceStyle[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStyle, setEditStyle] = useState<MarketplaceStyle | null>(null);

  useEffect(() => {
    if (user) {
      fetchPurchased();
      checkAdmin();
    } else {
      fetchStyles();
    }
  }, [user]);

  // Refetch styles when admin status is determined (to include hidden ones)
  useEffect(() => {
    fetchStyles();
  }, [isAdmin]);

  const checkAdmin = async () => {
    const { data } = await supabase.auth.getUser();
    setIsAdmin(data.user?.email === ADMIN_EMAIL);
  };

  const toggleStyleVisibility = async (styleId: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from('marketplace_styles')
      .update({ is_active: !currentlyActive })
      .eq('id', styleId);
    if (error) {
      toast.error('Erro ao alterar visibilidade');
    } else {
      toast.success(currentlyActive ? 'Estilo ocultado' : 'Estilo visível novamente');
      fetchStyles();
    }
  };

  const fetchStyles = async () => {
    setLoading(true);
    // Admin sees ALL styles (including hidden ones), normal users only see active
    const query = supabase
      .from('marketplace_styles')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (!isAdmin) {
      query.eq('is_active', true);
    }
    
    const { data } = await query;
    setStyles((data as any[]) || []);
    setLoading(false);
  };

  const fetchPurchased = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('purchased_styles')
      .select('style_id')
      .eq('user_id', user.id);
    setPurchasedIds(new Set((data as any[])?.map((p: any) => p.style_id) || []));
  };

  const categories = ['all', ...Array.from(new Set(styles.map(s => s.category)))];
  const filtered = styles.filter(s => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const featured = filtered.filter(s => s.is_featured);
  const regular = filtered.filter(s => !s.is_featured);

  return (
    <div className="flex-1 h-full overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Marketplace</h1>
          <p className="text-sm text-white/40">Navegue por diferentes estilos</p>
        </div>

        {/* Admin bar */}
        {isAdmin && (
          <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03]">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-300">Admin</span>
              <span className="text-[10px] text-yellow-300/40">{styles.length} estilos</span>
            </div>
            <button onClick={() => { setEditStyle(null); setDialogOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-medium hover:bg-yellow-500/30 transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Novo Estilo
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-white/30" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar estilos..."
              className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/[0.04] text-white/40 hover:text-white/60 border border-transparent hover:border-white/[0.08]'
                }`}>
                {cat === 'all' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-lg">Nenhum estilo encontrado</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-10">
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" /> Destaques
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featured.map(style => (
                    <StyleCard key={style.id} style={style} owned={purchasedIds.has(style.id)}
                      onClick={() => navigate(`/marketplace/${style.id}`)} featured
                      isAdmin={isAdmin} onEdit={() => { setEditStyle(style); setDialogOpen(true); }}
                      onToggleVisibility={() => toggleStyleVisibility(style.id, (style as any).is_active !== false)} />
                  ))}
                </div>
              </div>
            )}
            {regular.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Todos os estilos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {regular.map(style => (
                    <StyleCard key={style.id} style={style} owned={purchasedIds.has(style.id)}
                      onClick={() => navigate(`/marketplace/${style.id}`)}
                      isAdmin={isAdmin} onEdit={() => { setEditStyle(style); setDialogOpen(true); }}
                      onToggleVisibility={() => toggleStyleVisibility(style.id, (style as any).is_active !== false)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Admin dialog */}
      <AdminStyleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editStyle={editStyle as any}
        onSaved={fetchStyles}
        totalStyles={styles.length}
      />
    </div>
  );
};

// ---- Style Card ----
const StyleCard: React.FC<{
  style: MarketplaceStyle & { is_active?: boolean }; owned: boolean; onClick: () => void;
  featured?: boolean; isAdmin?: boolean; onEdit?: () => void;
  onToggleVisibility?: () => void;
}> = ({ style, owned, onClick, featured, isAdmin, onEdit, onToggleVisibility }) => {
  const isHidden = style.is_active === false;
  const previewImage = (style as any).style_config?.cover_image || style.preview_images?.[0];
  return (
    <div onClick={onClick}
      className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
        featured ? 'border-purple-500/30 bg-gradient-to-b from-purple-500/[0.08] to-transparent'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
      }`}>
      <div className="relative overflow-hidden bg-white/[0.03]" style={{ aspectRatio: '1080/1350' }}>
        {previewImage ? (
          <img src={previewImage} alt={style.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-sm font-medium px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm">Ver detalhes</span>
        </div>
        {featured && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/90 text-black text-[10px] font-bold">
            <Crown className="w-3 h-3" /> DESTAQUE
          </div>
        )}
        {style.style_config?.is_beta && (
          <div className="absolute top-3 flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/90 text-white text-[10px] font-bold" style={{ left: featured ? '5.5rem' : '0.75rem' }}>
            BETA
          </div>
        )}
        {owned && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/90 text-white text-[10px] font-bold">
            <Check className="w-3 h-3" /> ADQUIRIDO
          </div>
        )}
        {isAdmin && isHidden && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[5] pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/80 text-white text-xs font-bold">
              <EyeOff className="w-3.5 h-3.5" /> OCULTO
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-lg transition-colors ${
                isHidden
                  ? 'bg-green-500/90 text-white hover:bg-green-400'
                  : 'bg-red-500/80 text-white hover:bg-red-400'
              }`}>
              {isHidden ? <><Eye className="w-3 h-3" /> Mostrar</> : <><EyeOff className="w-3 h-3" /> Ocultar</>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/90 text-black text-xs font-bold cursor-pointer hover:bg-yellow-400 shadow-lg">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="text-sm font-semibold text-white truncate">{style.name}</h4>
        {style.description && <p className="text-xs text-white/30 mt-1 line-clamp-2">{style.description}</p>}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {style.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-white/[0.06] text-white/40">{tag}</span>
            ))}
          </div>
          {!owned && (
            <span className="text-purple-400 text-sm font-bold">
              {(style as any).is_free ? 'Grátis' : `R$ ${style.price_brl?.toFixed(2) || '0,00'}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceContent;
