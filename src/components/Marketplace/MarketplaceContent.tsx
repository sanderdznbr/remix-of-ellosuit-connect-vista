import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingBag, Sparkles, Check, Search, Crown, Zap } from 'lucide-react';

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
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [selectedStyle, setSelectedStyle] = useState<MarketplaceStyle | null>(null);

  useEffect(() => {
    fetchStyles();
    if (user) fetchPurchasedAndCredits();
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

  const fetchPurchasedAndCredits = async () => {
    if (!user) return;
    const [{ data: purchased }, { data: cu }] = await Promise.all([
      supabase.from('purchased_styles').select('style_id').eq('user_id', user.id),
      supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle(),
    ]);
    setPurchasedIds(new Set((purchased as any[])?.map((p: any) => p.style_id) || []));
    if (cu) {
      const { data: bal } = await supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).maybeSingle();
      setCreditBalance(bal?.balance ?? 0);
    }
  };

  const handlePurchase = async (style: MarketplaceStyle) => {
    if (!user) { navigate('/auth'); return; }
    if (purchasedIds.has(style.id)) { toast.info('Você já possui este estilo!'); return; }
    if (creditBalance < style.price_credits) {
      toast.error('Créditos insuficientes.');
      navigate('/precos');
      return;
    }
    setPurchasing(style.id);
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (!cu) throw new Error('Company not found');
      const { data: consumeResult } = await supabase.rpc('consume_ai_credits', {
        p_company_id: cu.company_id, p_agent_id: null as any,
        p_amount: style.price_credits, p_description: `Compra de estilo: ${style.name}`,
      });
      if (!(consumeResult as any)?.success) { toast.error('Créditos insuficientes.'); return; }
      const { error } = await supabase.from('purchased_styles').insert({
        user_id: user.id, company_id: cu.company_id, style_id: style.id, payment_method: 'credits',
      } as any);
      if (error) throw error;
      setPurchasedIds(prev => new Set([...prev, style.id]));
      setCreditBalance(prev => prev - style.price_credits);
      toast.success(`Estilo "${style.name}" adquirido com sucesso!`);
      setSelectedStyle(null);
    } catch (err: any) {
      toast.error('Erro ao comprar estilo: ' + (err.message || 'Tente novamente'));
    } finally {
      setPurchasing(null);
    }
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
        {/* Header — same style as DashboardProjects */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Marketplace</h1>
          <p className="text-sm text-white/40">Navegue por diferentes estilos</p>
        </div>

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
                    <StyleCard key={style.id} style={style} owned={purchasedIds.has(style.id)} purchasing={purchasing === style.id} onPurchase={() => handlePurchase(style)} onPreview={() => setSelectedStyle(style)} featured />
                  ))}
                </div>
              </div>
            )}
            {regular.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Todos os estilos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {regular.map(style => (
                    <StyleCard key={style.id} style={style} owned={purchasedIds.has(style.id)} purchasing={purchasing === style.id} onPurchase={() => handlePurchase(style)} onPreview={() => setSelectedStyle(style)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedStyle && (
        <StyleDetailModal style={selectedStyle} owned={purchasedIds.has(selectedStyle.id)} purchasing={purchasing === selectedStyle.id} onPurchase={() => handlePurchase(selectedStyle)} onClose={() => setSelectedStyle(null)} />
      )}
    </div>
  );
};

// ---- Style Card ----
const StyleCard: React.FC<{
  style: MarketplaceStyle; owned: boolean; purchasing: boolean;
  onPurchase: () => void; onPreview: () => void; featured?: boolean;
}> = ({ style, owned, purchasing, onPurchase, onPreview, featured }) => {
  const previewImage = style.preview_images?.[0];
  return (
    <div
      onClick={onPreview}
      className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
        featured ? 'border-purple-500/30 bg-gradient-to-b from-purple-500/[0.08] to-transparent' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
      }`}
    >
      <div className="aspect-[4/5] relative overflow-hidden bg-white/[0.03]">
        {previewImage ? (
          <img src={previewImage} alt={style.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Sparkles className="w-10 h-10 text-white/10" /></div>
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
            <div className="flex items-center gap-1 text-purple-400 text-sm font-bold">
              <Zap className="w-3.5 h-3.5" />{style.price_credits}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Detail Modal ----
const StyleDetailModal: React.FC<{
  style: MarketplaceStyle; owned: boolean; purchasing: boolean;
  onPurchase: () => void; onClose: () => void;
}> = ({ style, owned, purchasing, onPurchase, onClose }) => {
  const [activeImage, setActiveImage] = useState(0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08]" style={{ backgroundColor: '#111116' }}>
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2 p-6">
            <div className="aspect-[4/5] rounded-xl overflow-hidden bg-white/[0.03] mb-3">
              {style.preview_images?.[activeImage] ? (
                <img src={style.preview_images[activeImage]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Sparkles className="w-12 h-12 text-white/10" /></div>
              )}
            </div>
            {style.preview_images?.length > 1 && (
              <div className="flex gap-2">
                {style.preview_images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${i === activeImage ? 'border-purple-500' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="md:w-1/2 p-6 flex flex-col">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white cursor-pointer">✕</button>
            <div className="flex items-center gap-2 mb-2">
              {style.is_featured && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold"><Crown className="w-3 h-3" /> DESTAQUE</span>
              )}
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white/40 text-[10px]">{style.category}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{style.name}</h2>
            {style.description && <p className="text-sm text-white/40 mb-6">{style.description}</p>}
            {style.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {style.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] text-white/30 border border-white/[0.06]">{tag}</span>
                ))}
              </div>
            )}
            <div className="mt-auto space-y-4">
              {!owned ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{style.price_credits}</span>
                    <span className="text-sm text-white/40">créditos</span>
                    {style.price_brl > 0 && <span className="text-xs text-white/20 ml-2">(~R$ {style.price_brl.toFixed(2)})</span>}
                  </div>
                  <button onClick={onPurchase} disabled={purchasing} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                    {purchasing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ShoppingBag className="w-4 h-4" />Comprar estilo</>}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
                  <Check className="w-5 h-5" />Você já possui este estilo
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceContent;
