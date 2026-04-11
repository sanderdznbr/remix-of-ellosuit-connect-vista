import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingBag, Sparkles, Check, Search, Crown, Pencil, Plus, Star, EyeOff, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminStyleDialog from './AdminStyleDialog';
import { useIsMobile } from '@/hooks/use-mobile';

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
  is_active?: boolean;
  tags: string[];
  strict_instructions?: string;
}

/* ─── Horizontal scroll row (Netflix-style) ─── */
const StyleRow: React.FC<{
  title: string;
  icon?: React.ReactNode;
  styles: MarketplaceStyle[];
  purchasedIds: Set<string>;
  onClickStyle: (id: string) => void;
  isAdmin: boolean;
  onEdit: (s: MarketplaceStyle) => void;
  onToggleVisibility: (s: MarketplaceStyle) => void;
}> = ({ title, icon, styles, purchasedIds, onClickStyle, isAdmin, onEdit, onToggleVisibility }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => { el?.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll); };
  }, [styles]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  if (styles.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-white/60 flex items-center gap-2">
          {icon}
          {title}
          <span className="text-[10px] text-white/20 font-normal">{styles.length}</span>
        </h3>
        <div className="flex items-center gap-1">
          {canScrollLeft && (
            <button onClick={() => scroll(-1)}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {canScrollRight && (
            <button onClick={() => scroll(1)}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {styles.map(style => (
          <StyleCard key={style.id} style={style} owned={purchasedIds.has(style.id)}
            onClick={() => onClickStyle(style.id)}
            isAdmin={isAdmin}
            onEdit={() => onEdit(style)}
            onToggleVisibility={() => onToggleVisibility(style)} />
        ))}
      </div>
    </div>
  );
};

/* ─── Style Card (compact Netflix poster) ─── */
const StyleCard: React.FC<{
  style: MarketplaceStyle;
  owned: boolean;
  onClick: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onToggleVisibility?: () => void;
}> = ({ style, owned, onClick, isAdmin, onEdit, onToggleVisibility }) => {
  const isHidden = style.is_active === false;
  const previewImage = style.style_config?.cover_image || style.preview_images?.[0];

  return (
    <div onClick={onClick}
      className="group relative shrink-0 cursor-pointer transition-all duration-200 hover:scale-[1.03]"
      style={{ width: '150px' }}>
      <div className="relative rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04] group-hover:border-white/[0.12] transition-colors"
        style={{ aspectRatio: '3/4' }}>
        {previewImage ? (
          <img src={previewImage} alt={style.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white/[0.06]" />
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badges */}
        {style.is_featured && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/90 text-black text-[8px] font-bold">
            <Crown className="w-2.5 h-2.5" /> TOP
          </div>
        )}
        {style.style_config?.is_beta && (
          <div className="absolute top-2 flex items-center px-1.5 py-0.5 rounded bg-blue-500/90 text-white text-[8px] font-bold"
            style={{ left: style.is_featured ? '3.2rem' : '0.5rem' }}>
            BETA
          </div>
        )}
        {owned && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-500/80 text-white text-[8px] font-bold">
            <Check className="w-2.5 h-2.5" />
          </div>
        )}

        {/* Admin hidden overlay */}
        {isAdmin && isHidden && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[5] pointer-events-none">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/80 text-white text-[9px] font-bold">
              <EyeOff className="w-3 h-3" /> OCULTO
            </div>
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(); }}
              className={`p-1 rounded text-[8px] font-bold cursor-pointer shadow transition-colors ${
                isHidden ? 'bg-green-500/90 text-white' : 'bg-red-500/80 text-white'
              }`}>
              {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="p-1 rounded bg-yellow-500/90 text-black cursor-pointer hover:bg-yellow-400 shadow">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-[2]">
          <h4 className="text-[11px] font-semibold text-white leading-tight truncate">{style.name}</h4>
          {!owned && (
            <span className="text-[10px] font-bold text-purple-300/80 mt-0.5 block">
              {(style as any).is_free ? 'Grátis' : `R$ ${style.price_brl?.toFixed(2) || '0,00'}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const MarketplaceContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [styles, setStyles] = useState<MarketplaceStyle[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStyle, setEditStyle] = useState<MarketplaceStyle | null>(null);

  useEffect(() => {
    if (user) { fetchPurchased(); checkAdmin(); } else { fetchStyles(); }
  }, [user]);

  useEffect(() => { fetchStyles(); }, [isAdmin]);

  const checkAdmin = async () => {
    const { data } = await supabase.auth.getUser();
    setIsAdmin(data.user?.email === ADMIN_EMAIL);
  };

  const toggleStyleVisibility = async (style: MarketplaceStyle) => {
    const currentlyActive = style.is_active !== false;
    const { error } = await supabase.from('marketplace_styles').update({ is_active: !currentlyActive }).eq('id', style.id);
    if (error) toast.error('Erro ao alterar visibilidade');
    else { toast.success(currentlyActive ? 'Estilo ocultado' : 'Estilo visível novamente'); fetchStyles(); }
  };

  const fetchStyles = async () => {
    setLoading(true);
    const query = supabase.from('marketplace_styles').select('*').order('sort_order', { ascending: true });
    if (!isAdmin) query.eq('is_active', true);
    const { data } = await query;
    setStyles((data as any[]) || []);
    setLoading(false);
  };

  const fetchPurchased = async () => {
    if (!user) return;
    const { data } = await supabase.from('purchased_styles').select('style_id').eq('user_id', user.id);
    setPurchasedIds(new Set((data as any[])?.map((p: any) => p.style_id) || []));
  };

  // Filter by search
  const filtered = styles.filter(s => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by category
  const featured = filtered.filter(s => s.is_featured);
  const categories = Array.from(new Set(filtered.filter(s => !s.is_featured).map(s => s.category)));
  const byCat = categories.map(cat => ({
    category: cat,
    styles: filtered.filter(s => !s.is_featured && s.category === cat),
  }));

  const handleClick = (id: string) => navigate(`/marketplace/${id}`);
  const handleEdit = (s: MarketplaceStyle) => { setEditStyle(s); setDialogOpen(true); };

  return (
    <div className="flex-1 h-full overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      <div className={`max-w-7xl mx-auto ${isMobile ? 'px-4 py-5' : 'px-6 py-6'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-white/90">Estilos</h1>
            <p className="text-[11px] text-white/25 mt-0.5">Escolha uma identidade visual para seu post</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] w-48">
              <Search className="w-3.5 h-3.5 text-white/20" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/15 outline-none" />
            </div>
          </div>
        </div>

        {/* Admin bar */}
        {isAdmin && (
          <div className="mb-5 flex items-center justify-between px-3 py-2 rounded-lg border border-yellow-500/20 bg-yellow-500/[0.03]">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] font-bold text-yellow-300">Admin</span>
              <span className="text-[9px] text-yellow-300/40">{styles.length} estilos</span>
            </div>
            <button onClick={() => { setEditStyle(null); setDialogOpen(true); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-yellow-500/20 text-yellow-300 text-[10px] font-medium hover:bg-yellow-500/30 transition-colors cursor-pointer">
              <Plus className="w-3 h-3" /> Novo
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-8 h-8 text-white/[0.06] mx-auto mb-2" />
            <p className="text-white/20 text-sm">Nenhum estilo encontrado</p>
          </div>
        ) : (
          <>
            {/* Featured row */}
            <StyleRow
              title="Destaques"
              icon={<Crown className="w-3.5 h-3.5 text-yellow-400/70" />}
              styles={featured}
              purchasedIds={purchasedIds}
              onClickStyle={handleClick}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onToggleVisibility={toggleStyleVisibility}
            />

            {/* Category rows */}
            {byCat.map(({ category, styles: catStyles }) => (
              <StyleRow
                key={category}
                title={category.charAt(0).toUpperCase() + category.slice(1)}
                styles={catStyles}
                purchasedIds={purchasedIds}
                onClickStyle={handleClick}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onToggleVisibility={toggleStyleVisibility}
              />
            ))}
          </>
        )}
      </div>

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

export default MarketplaceContent;
