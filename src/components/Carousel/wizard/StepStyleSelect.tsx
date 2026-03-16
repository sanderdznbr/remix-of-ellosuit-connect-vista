import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { ShoppingBag, Loader2, Check, Sparkles, Crown, Zap, X, Search, Filter, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { STYLE_PRESETS, StylePreset } from './StepStyle';
import { WizardAccentTheme, getThemeClasses } from './wizardTheme';

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
  accentTheme?: WizardAccentTheme;
}

const StepStyleSelect: React.FC<Props> = ({
  bgColor, setBgColor, accentColor, setAccentColor, textColor, setTextColor,
  selectedFont, setSelectedFont, onApplyPreset, onApplyMarketplaceStyle, accentTheme = 'purple',
}) => {
  const t = getThemeClasses(accentTheme);
  const { user } = useAuth();
  const [purchasedStyles, setPurchasedStyles] = useState<MarketplaceStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [lockedStyleName, setLockedStyleName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewIndex, setPreviewIndex] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAvailableStyles();
  }, [user]);

  const fetchAvailableStyles = async () => {
    setLoading(true);
    try {
      if (!user) {
        // Unauth users: show ALL styles (free ones selectable, paid ones locked)
        const { data: allStyles } = await supabase
          .from('marketplace_styles')
          .select('id, name, description, preview_images, price_credits, price_brl, category, style_config, is_featured, tags, strict_instructions, is_free')
          .eq('is_active', true)
          .order('is_free', { ascending: false })
          .order('sort_order', { ascending: true });
        setPurchasedStyles((allStyles as any[]) || []);
        setLoading(false);
        return;
      }
      // Auth users: show purchased styles + free styles
      const [{ data: purchased }, { data: freeStyles }] = await Promise.all([
        supabase.from('purchased_styles').select('style_id').eq('user_id', user.id),
        supabase.from('marketplace_styles')
          .select('id, name, description, preview_images, price_credits, price_brl, category, style_config, is_featured, tags, strict_instructions, is_free')
          .eq('is_active', true)
          .eq('is_free', true),
      ]);
      const purchasedIds = (purchased as any[] || []).map(p => p.style_id);
      const freeIds = (freeStyles as any[] || []).map(s => s.id);
      const allIds = Array.from(new Set([...purchasedIds, ...freeIds]));
      if (!allIds.length) { setLoading(false); return; }
      const { data: styles } = await supabase
        .from('marketplace_styles')
        .select('id, name, description, preview_images, price_credits, price_brl, category, style_config, is_featured, tags, strict_instructions, is_free')
        .in('id', allIds)
        .eq('is_active', true);
      setPurchasedStyles((styles as any[]) || []);
    } catch (err) {
      console.error('Error fetching styles:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(purchasedStyles.map(s => s.category)));
    return ['all', ...cats];
  }, [purchasedStyles]);

  const filteredStyles = useMemo(() => {
    return purchasedStyles.filter(s => {
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [purchasedStyles, searchQuery, selectedCategory]);

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
    onApplyMarketplaceStyle?.({ ...config, id: style.id, _previewImages: style.preview_images, _styleName: style.name, _strictInstructions: (style as any).strict_instructions || null });
  };

  return (
    <div className="flex flex-col" style={{ height: 'min(70vh, 520px)' }}>
      {/* Header */}
      <div className="shrink-0 pb-3">
        <h2 className="text-xl font-bold text-white mb-1">Selecione o estilo</h2>
        <p className="text-xs text-white/40">
          {user ? 'Selecione um estilo do Marketplace para continuar.' : 'Estilos gratuitos disponíveis para teste. Crie uma conta para acessar mais.'}
        </p>
      </div>

      {/* Search + Filters */}
      <div className="shrink-0 flex flex-col gap-2 pb-3">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <Search className="w-4 h-4 text-white/30 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar estilos..."
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none min-w-0"
          />
        </div>
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? `${t.bgLight} ${t.textLight} border ${t.borderLight}`
                    : 'bg-white/[0.04] text-white/40 hover:text-white/60 border border-transparent'
                }`}>
                {cat === 'all' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : filteredStyles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filteredStyles.map(style => {
              const isActive = activeStyleId === style.id;
              const coverImage = (style as any).style_config?.cover_image;
              const images = style.preview_images || [];
              const currentIdx = previewIndex[style.id] || 0;
              const currentImg = coverImage || images[currentIdx] || images[0];
              const isFree = (style as any).is_free;
              const isLocked = !user && !isFree;
              const hasMultiple = images.length > 1;
              return (
                <button key={style.id}
                  onClick={() => {
                    if (isLocked) {
                      setLockedStyleName(style.name);
                      return;
                    }
                    applyMarketplaceStyle(style);
                  }}
                  className={`relative rounded-xl overflow-hidden border transition-all text-left cursor-pointer group ${
                    isLocked
                      ? 'border-white/[0.04] opacity-70'
                      : isActive
                        ? `border-current ${t.ringFull} ring-1 ${t.ring}`
                        : 'border-white/[0.06] hover:border-white/15'
                  }`}>
                  {currentImg && (
                    <div className="bg-white/[0.03] relative overflow-hidden" style={{ aspectRatio: '4/5' }}>
                      <img src={currentImg} alt={style.name} className={`w-full h-full object-cover ${isLocked ? 'grayscale' : ''}`} loading="eager" />
                      {isLocked && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Lock className="w-5 h-5 text-white/60" />
                        </div>
                      )}
                      {/* Slider arrows */}
                      {hasMultiple && !isLocked && (
                        <>
                          <div
                            className="absolute left-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => ({ ...prev, [style.id]: (currentIdx - 1 + images.length) % images.length })); }}>
                            <ChevronLeft className="w-3 h-3 text-white" />
                          </div>
                          <div
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => ({ ...prev, [style.id]: (currentIdx + 1) % images.length })); }}>
                            <ChevronRight className="w-3 h-3 text-white" />
                          </div>
                          {/* Dots */}
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
                            {images.slice(0, 6).map((_, i) => (
                              <div key={i} className={`w-1 h-1 rounded-full transition-colors ${i === currentIdx ? 'bg-white' : 'bg-white/30'}`} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="p-2 flex items-center justify-between">
                    <p className="text-[11px] font-medium text-white truncate">{style.name}</p>
                    {isLocked && (
                      <span className="text-[9px] text-yellow-400/70 font-medium shrink-0 ml-1">PRO</span>
                    )}
                  </div>
                  {isActive && !isLocked && (
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full ${t.bg} flex items-center justify-center`}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
            <ShoppingBag className="w-8 h-8" />
            <p className="text-xs">{searchQuery ? 'Nenhum estilo encontrado' : user ? 'Nenhum estilo adquirido' : 'Nenhum estilo gratuito disponível'}</p>
          </div>
        )}
      </div>

      {/* Marketplace button - only for logged in users */}
      {user && (
        <button
          onClick={() => setShowMarketplace(true)}
          className={`shrink-0 mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed ${t.borderLight} ${t.bgFaint} ${t.textLight} hover:bg-opacity-10 transition-all text-xs font-medium cursor-pointer`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Explorar Marketplace
        </button>
      )}

      {showMarketplace && (
        <MarketplacePopup
          onClose={() => { setShowMarketplace(false); fetchAvailableStyles(); }}
          purchasedStyles={purchasedStyles}
        />
      )}

      {lockedStyleName && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setLockedStyleName(null)} />
          <div className="relative bg-[#12121a] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Estilo "{lockedStyleName}"</h3>
            <p className="text-sm text-white/50 mb-5">
              Liberado após contratação de um plano pago. Crie sua conta e escolha um plano para desbloquear todos os estilos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setLockedStyleName(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 bg-white/[0.06] hover:bg-white/[0.1] transition-colors cursor-pointer">
                Fechar
              </button>
              <a href="/register"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-colors text-center">
                Criar Conta
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Marketplace Popup ----
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

  useEffect(() => { fetchAll(); }, []);

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
    if (!user || purchasedIds.has(style.id) || creditBalance < style.price_credits) return;
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
      <div className="relative w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl border border-white/[0.08] overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
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

        {/* Filters */}
        <div className="shrink-0 px-6 py-3 border-b border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center gap-2">
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

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
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
                        <img src={previewImg} alt={style.name} className="w-full h-full object-cover" loading="eager" />
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
                      {(style as any).style_config?.is_beta && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/90 text-white text-[10px] font-bold" style={style.is_featured && !owned ? { left: '2rem' } : {}}>
                          BETA
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
