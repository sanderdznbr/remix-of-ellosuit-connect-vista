import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { ShoppingBag, Loader2, Check, Sparkles, Crown, Zap, X, Search } from 'lucide-react';
import { STYLE_PRESETS, StylePreset } from './StepStyle';

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

interface Props {
  bgColor: string;
  setBgColor: (v: string) => void;
  accentColor: string;
  setAccentColor: (v: string) => void;
  textColor: string;
  setTextColor: (v: string) => void;
  selectedFont: number;
  setSelectedFont: (v: number) => void;
  onApplyPreset?: (preset: StylePreset) => void;
  onApplyMarketplaceStyle?: (styleConfig: any) => void;
}

const StepStyleSelect: React.FC<Props> = ({
  bgColor, setBgColor, accentColor, setAccentColor, textColor, setTextColor,
  selectedFont, setSelectedFont, onApplyPreset, onApplyMarketplaceStyle,
}) => {
  const { user } = useAuth();
  const [purchasedStyles, setPurchasedStyles] = useState<MarketplaceStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>('ellosuit-editorial');
  const [showMarketplace, setShowMarketplace] = useState(false);

  useEffect(() => {
    fetchPurchasedStyles();
  }, [user]);

  const fetchPurchasedStyles = async () => {
    setLoading(true);
    try {
      if (!user) { setLoading(false); return; }
      const { data: purchased } = await supabase
        .from('purchased_styles')
        .select('style_id')
        .eq('user_id', user.id);
      if (!purchased?.length) { setLoading(false); return; }
      const styleIds = (purchased as any[]).map(p => p.style_id);
      const { data: styles } = await supabase
        .from('marketplace_styles')
        .select('id, name, description, preview_images, price_credits, price_brl, category, style_config, is_featured, tags')
        .in('id', styleIds)
        .eq('is_active', true);
      setPurchasedStyles((styles as any[]) || []);
    } catch (err) {
      console.error('Error fetching purchased styles:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: StylePreset) => {
    setActiveStyleId(null);
    setActivePresetId(preset.id);
    setBgColor(preset.bgColor);
    setAccentColor(preset.accentColor);
    setTextColor(preset.textColor);
    setSelectedFont(preset.fontIndex);
    onApplyPreset?.(preset);
  };

  const applyMarketplaceStyle = (style: MarketplaceStyle) => {
    setActivePresetId(null);
    if (activeStyleId === style.id) {
      setActiveStyleId(null);
      return;
    }
    setActiveStyleId(style.id);
    const config = style.style_config;
    if (config?.colors) {
      if (config.colors.primary) setAccentColor(config.colors.primary);
      if (config.colors.secondary) setBgColor(config.colors.secondary);
      if (config.colors.text) setTextColor(config.colors.text);
    }
    onApplyMarketplaceStyle?.({ ...config, id: style.id, _previewImages: style.preview_images, _styleName: style.name });
  };

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Selecione o estilo</h2>
        <p className="text-sm text-white/40">Escolha um estilo visual para seu carrossel.</p>
      </div>

      {/* Built-in presets */}
      <div>
        <p className="text-xs font-medium text-white/40 mb-3">Estilos padrão</p>
        <div className="flex gap-2 flex-wrap">
          {STYLE_PRESETS.filter(p => p.id === 'ellosuit-editorial').map(preset => {
            const isActive = activePresetId === preset.id;
            const displayName = preset.id === 'ellosuit-editorial' ? 'Padrão' : preset.name;
            return (
              <button key={preset.id} onClick={() => applyPreset(preset)}
                className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black'
                    : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
                }`}>
                {preset.emoji} {displayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Purchased marketplace styles */}
      <div>
        <p className="text-xs font-medium text-white/40 mb-3 flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5" /> Meus estilos do Marketplace
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-white/30 text-xs py-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando estilos...
          </div>
        ) : purchasedStyles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {purchasedStyles.map(style => {
              const isActive = activeStyleId === style.id;
              const previewImg = style.preview_images?.[0];
              return (
                <button key={style.id} onClick={() => applyMarketplaceStyle(style)}
                  className={`relative rounded-xl overflow-hidden border transition-all text-left cursor-pointer ${
                    isActive
                      ? 'border-purple-500 ring-1 ring-purple-500/50'
                      : 'border-white/[0.06] hover:border-white/15'
                  }`}>
                  {previewImg && (
                    <div className="aspect-video bg-white/[0.03]">
                      <img src={previewImg} alt={style.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-white truncate">{style.name}</p>
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-white/20 py-2">Nenhum estilo adquirido ainda.</p>
        )}
      </div>

      {/* Marketplace button */}
      <button
        onClick={() => setShowMarketplace(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-purple-500/30 bg-purple-500/[0.05] text-purple-300 hover:bg-purple-500/[0.1] transition-all text-sm font-medium cursor-pointer"
      >
        <ShoppingBag className="w-4 h-4" />
        Explorar Marketplace
      </button>

      {/* Marketplace popup */}
      {showMarketplace && (
        <MarketplacePopup
          onClose={() => { setShowMarketplace(false); fetchPurchasedStyles(); }}
          purchasedStyles={purchasedStyles}
        />
      )}
    </div>
  );
};

// ---- Marketplace Popup (inline) ----
const MarketplacePopup: React.FC<{
  onClose: () => void;
  purchasedStyles: MarketplaceStyle[];
}> = ({ onClose, purchasedStyles: initialPurchased }) => {
  const { user } = useAuth();
  const [styles, setStyles] = useState<MarketplaceStyle[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set(initialPurchased.map(s => s.id)));
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: allStyles }, purchased, credits] = await Promise.all([
      supabase.from('marketplace_styles').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      user ? supabase.from('purchased_styles').select('style_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
      user ? (async () => {
        const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
        if (!cu) return 0;
        const { data: bal } = await supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).maybeSingle();
        return bal?.balance ?? 0;
      })() : Promise.resolve(0),
    ]);
    setStyles((allStyles as any[]) || []);
    setPurchasedIds(new Set(((purchased as any)?.data as any[])?.map((p: any) => p.style_id) || []));
    setCreditBalance(credits as number);
    setLoading(false);
  };

  const handlePurchase = async (style: MarketplaceStyle) => {
    if (!user) return;
    if (purchasedIds.has(style.id)) return;
    if (creditBalance < style.price_credits) return;
    setPurchasing(style.id);
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (!cu) throw new Error('Company not found');
      const { data: consumeResult } = await supabase.rpc('consume_ai_credits', {
        p_company_id: cu.company_id, p_agent_id: null as any,
        p_amount: style.price_credits, p_description: `Compra de estilo: ${style.name}`,
      });
      if (!(consumeResult as any)?.success) return;
      await supabase.from('purchased_styles').insert({
        user_id: user.id, company_id: cu.company_id, style_id: style.id, payment_method: 'credits',
      } as any);
      setPurchasedIds(prev => new Set([...prev, style.id]));
      setCreditBalance(prev => prev - style.price_credits);
    } catch (err) {
      console.error('Purchase error:', err);
    } finally {
      setPurchasing(null);
    }
  };

  const categories = ['all', ...Array.from(new Set(styles.map(s => s.category)))];
  const filtered = styles.filter(s => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08]" style={{ backgroundColor: '#0a0a0f' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-white/[0.06] flex items-center justify-between" style={{ backgroundColor: '#0a0a0f' }}>
          <div>
            <h2 className="text-lg font-bold text-white">Marketplace de Estilos</h2>
            <p className="text-xs text-white/30 mt-0.5">
              Saldo: <span className="text-purple-400 font-semibold">{Math.floor(creditBalance)} créditos</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex-1 max-w-xs">
              <Search className="w-4 h-4 text-white/30" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar estilos..." className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/[0.04] text-white/40 hover:text-white/60 border border-transparent'
                  }`}>
                  {cat === 'all' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-2" />
              <p className="text-white/30 text-sm">Nenhum estilo encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(style => {
                const owned = purchasedIds.has(style.id);
                const previewImg = style.preview_images?.[0];
                return (
                  <div key={style.id} className={`relative rounded-xl overflow-hidden border transition-all ${
                    owned ? 'border-green-500/30' : 'border-white/[0.06] hover:border-white/15'
                  }`}>
                    <div className="aspect-video bg-white/[0.03]">
                      {previewImg ? (
                        <img src={previewImg} alt={style.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Sparkles className="w-8 h-8 text-white/10" /></div>
                      )}
                      {owned && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/90 text-white text-[10px] font-bold">
                          <Check className="w-3 h-3" /> ADQUIRIDO
                        </div>
                      )}
                      {style.is_featured && !owned && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/90 text-black text-[10px] font-bold">
                          <Crown className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-white truncate">{style.name}</p>
                      {!owned ? (
                        <button onClick={() => handlePurchase(style)} disabled={purchasing === style.id || creditBalance < style.price_credits}
                          className="mt-2 w-full py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 flex items-center justify-center gap-1.5">
                          {purchasing === style.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <><Zap className="w-3 h-3" /> {style.price_credits} créditos</>
                          )}
                        </button>
                      ) : (
                        <p className="mt-2 text-[10px] text-green-400/60 text-center">Já adquirido ✓</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepStyleSelect;
