import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { ShoppingBag, Loader2, Check, Sparkles, Crown, Zap, X, Search, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
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

/* ─── Netflix-style horizontal row ─── */
const StyleRow: React.FC<{
  title: string;
  children: React.ReactNode;
  badge?: string;
}> = ({ title, children, badge }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll, { passive: true });
    return () => el?.removeEventListener('scroll', checkScroll);
  }, [children]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/row">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-sm font-bold text-white/80 tracking-wide">{title}</h3>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>

      <div className="relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 w-10 z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer"
            style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.9), transparent)' }}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as any }}
        >
          {children}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 w-10 z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer"
            style={{ background: 'linear-gradient(to left, rgba(10,10,10,0.9), transparent)' }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Single style card ─── */
const StyleCard: React.FC<{
  style: MarketplaceStyle;
  isActive: boolean;
  isLocked: boolean;
  previewIndex: number;
  onSelect: () => void;
  onChangePreview: (idx: number) => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
}> = ({ style, isActive, isLocked, previewIndex, onSelect, onChangePreview, themeClasses: t }) => {
  const coverImage = style.style_config?.cover_image;
  const images = style.preview_images || [];
  const currentImg = coverImage || images[previewIndex] || images[0];
  const hasMultiple = images.length > 1;

  return (
    <button
      onClick={onSelect}
      className={`relative shrink-0 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer group
        ${isLocked ? 'opacity-60' : ''}
        ${isActive
          ? `ring-2 ${t.ringFull} scale-[1.03] shadow-lg`
          : 'hover:scale-[1.04] hover:shadow-xl hover:z-10'
        }
      `}
      style={{ width: '160px' }}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/5' }}>
        {currentImg ? (
          <img
            src={currentImg}
            alt={style.name}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isLocked ? 'grayscale' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.04] flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white/10" />
          </div>
        )}

        {/* Dark gradient overlay at bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-16"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}
        />

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Lock className="w-6 h-6 text-white/50" />
          </div>
        )}

        {/* Selected check */}
        {isActive && !isLocked && (
          <div className={`absolute top-2 right-2 w-6 h-6 rounded-full ${t.bg} flex items-center justify-center shadow-lg`}>
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* PRO badge for locked */}
        {isLocked && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-yellow-500/90 text-[9px] font-bold text-black uppercase">
            PRO
          </div>
        )}

        {/* Featured badge */}
        {style.is_featured && !isLocked && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-yellow-500/90 flex items-center gap-0.5">
            <Crown className="w-2.5 h-2.5 text-black" />
            <span className="text-[8px] font-bold text-black">DESTAQUE</span>
          </div>
        )}

        {/* Slider dots */}
        {hasMultiple && !isLocked && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); onChangePreview(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === previewIndex ? 'bg-white scale-125' : 'bg-white/30'}`}
              />
            ))}
          </div>
        )}

        {/* Name on bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
          <p className="text-[12px] font-semibold text-white truncate drop-shadow-lg">{style.name}</p>
        </div>
      </div>
    </button>
  );
};

/* ─── Main Component ─── */
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
  const [previewIndex, setPreviewIndex] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableStyles();
  }, [user]);

  const fetchAvailableStyles = async () => {
    setLoading(true);
    try {
      if (!user) {
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

  const filteredStyles = useMemo(() => {
    if (!searchQuery) return purchasedStyles;
    return purchasedStyles.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [purchasedStyles, searchQuery]);


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

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(purchasedStyles.map(s => s.category).filter(Boolean)));
    return cats;
  }, [purchasedStyles]);


  // Filter by search + category
  const displayStyles = useMemo(() => {
    let result = filteredStyles;
    if (selectedCategory) {
      result = result.filter(s => s.category === selectedCategory);
    }
    return result;
  }, [filteredStyles, selectedCategory]);

  // Group for Netflix rows (no separate featured row)
  const stylesByCategory = useMemo(() => {
    const map: Record<string, MarketplaceStyle[]> = {};
    displayStyles.forEach(s => {
      const cat = s.category || 'Outros';
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      if (!map[label]) map[label] = [];
      map[label].push(s);
    });
    return map;
  }, [displayStyles]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 160px)', minHeight: '400px' }}>
      {/* Header + Search */}
      <div className="shrink-0 mb-4">
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">Selecione o estilo</h2>
        <p className="text-xs text-white/35">
          {user ? 'Escolha um visual para o seu post.' : 'Estilos gratuitos para teste. Crie uma conta para mais.'}
        </p>
      </div>

      {/* Search + Category filters */}
      <div className="shrink-0 space-y-3 mb-4">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] focus-within:border-white/20 transition-colors">
          <Search className="w-4 h-4 text-white/30 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar estilos..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none min-w-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 cursor-pointer">
              <X className="w-3.5 h-3.5 text-white/30" />
            </button>
          )}
        </div>

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !selectedCategory
                  ? `${t.bgLight} ${t.textLight} border ${t.borderLight}`
                  : 'bg-white/[0.05] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? `${t.bgLight} ${t.textLight} border ${t.borderLight}`
                    : 'bg-white/[0.05] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Full-height scrollable Netflix rows */}
      <div
        className="flex-1 min-h-0 overflow-y-auto space-y-7 pb-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-white/20" />
          </div>
        ) : Object.keys(stylesByCategory).length > 0 ? (
          <>
            {Object.entries(stylesByCategory).map(([category, styles]) => (
              <StyleRow
                key={category}
                title={category}
                
              >
                {styles.map(style => {
                  const isFree = (style as any).is_free;
                  const isLocked = !user && !isFree;
                  return (
                    <StyleCard
                      key={style.id}
                      style={style}
                      isActive={activeStyleId === style.id}
                      isLocked={isLocked}
                      previewIndex={previewIndex[style.id] || 0}
                      onSelect={() => {
                        if (isLocked) {
                          setLockedStyleName(style.name);
                          return;
                        }
                        applyMarketplaceStyle(style);
                      }}
                      onChangePreview={(idx) => setPreviewIndex(prev => ({ ...prev, [style.id]: idx }))}
                      themeClasses={t}
                    />
                  );
                })}
              </StyleRow>
            ))}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/20 gap-3">
            <ShoppingBag className="w-10 h-10" />
            <p className="text-sm">{searchQuery ? 'Nenhum estilo encontrado' : 'Nenhum estilo disponível'}</p>
          </div>
        )}
      </div>

      {/* Marketplace CTA */}
      {user && (
        <button
          onClick={() => setShowMarketplace(true)}
          className={`shrink-0 mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed ${t.borderLight} ${t.bgFaint} ${t.textLight} hover:bg-opacity-10 transition-all text-xs font-semibold cursor-pointer`}
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
                const previewImg = (style as any).style_config?.cover_image || style.preview_images?.[0];
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
                        <p className="mt-2 text-[10px] text-green-400/60 text-center">Já adquirido</p>
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
