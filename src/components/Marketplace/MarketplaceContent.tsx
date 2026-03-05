import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Sparkles, Check, Search, Crown, Zap } from 'lucide-react';
import AdminStyleCreator from './AdminStyleCreator';

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
  tags: string[];
}

const MarketplaceContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [styles, setStyles] = useState<MarketplaceStyle[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStyles();
    if (user) fetchPurchased();
  }, [user]);

  const fetchStyles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketplace_styles')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
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

        <AdminStyleCreator onStylesChanged={fetchStyles} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar estilos..."
              className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/[0.04] text-white/40 hover:text-white/60 border border-transparent hover:border-white/[0.08]'
                }`}
              >
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
            <p className="text-white/15 text-sm mt-1">Em breve novos estilos serão adicionados!</p>
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
                    <StyleCard
                      key={style.id}
                      style={style}
                      owned={purchasedIds.has(style.id)}
                      onClick={() => navigate(`/marketplace/${style.id}`)}
                      featured
                    />
                  ))}
                </div>
              </div>
            )}
            {regular.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Todos os estilos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {regular.map(style => (
                    <StyleCard
                      key={style.id}
                      style={style}
                      owned={purchasedIds.has(style.id)}
                      onClick={() => navigate(`/marketplace/${style.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ---- Style Card ----
const StyleCard: React.FC<{
  style: MarketplaceStyle;
  owned: boolean;
  onClick: () => void;
  featured?: boolean;
}> = ({ style, owned, onClick, featured }) => {
  const previewImage = style.preview_images?.[0];
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
        featured
          ? 'border-purple-500/30 bg-gradient-to-b from-purple-500/[0.08] to-transparent'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
      }`}
    >
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
        {owned && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/90 text-white text-[10px] font-bold">
            <Check className="w-3 h-3" /> ADQUIRIDO
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
              R$ {style.price_brl?.toFixed(2) || '0,00'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceContent;
