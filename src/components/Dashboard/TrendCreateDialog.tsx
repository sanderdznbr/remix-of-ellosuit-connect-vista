import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Palette, Image as ImageIcon, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Switch } from '@/components/ui/switch';
import type { TrendData } from './TrendsPanel';

interface MarketplaceStyle {
  id: string;
  name: string;
  preview_images: any;
  cover_url?: string;
  category?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  trendData: TrendData | null;
  onConfirm: (trendData: TrendData, styleId: string, useBrandColors: boolean) => void;
}

const TrendCreateDialog: React.FC<Props> = ({ open, onClose, trendData, onConfirm }) => {
  const { user } = useAuth();
  const [styles, setStyles] = useState<MarketplaceStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [useBrandColors, setUseBrandColors] = useState(true);
  const [brandConfig, setBrandConfig] = useState<{ logo_url?: string; brand_colors?: string[] } | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    loadData();
  }, [open, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cu } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user!.id)
        .single();

      if (!cu) return;

      const [stylesRes, configRes] = await Promise.all([
        supabase.from('marketplace_styles').select('id, name, preview_images, category')
          .eq('is_active', true).order('sort_order', { ascending: true }) as any,
        supabase.from('trend_configs').select('logo_url, brand_colors')
          .eq('company_id', cu.company_id).single(),
      ]);

      // Filter to purchased + free styles
      const { data: purchased } = await supabase
        .from('purchased_styles').select('style_id').eq('user_id', user!.id);
      const { data: freeStyles } = await supabase
        .from('marketplace_styles').select('id').eq('is_active', true).eq('is_free', true);
      
      const { data: isAdmin } = await supabase.rpc('is_adminmaster', { _user_id: user!.id });
      
      const purchasedIds = new Set((purchased || []).map((p: any) => p.style_id));
      const freeIds = new Set((freeStyles || []).map((f: any) => f.id));
      
      const available = isAdmin 
        ? (stylesRes.data || [])
        : (stylesRes.data || []).filter(s => purchasedIds.has(s.id) || freeIds.has(s.id));
      
      setStyles(available);
      if (available.length > 0 && !selectedStyle) setSelectedStyle(available[0].id);
      setBrandConfig(configRes.data || null);
    } catch (e) {
      console.error('TrendCreateDialog loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getPreviewUrl = (style: MarketplaceStyle) => {
    if (style.cover_url) return style.cover_url;
    const imgs = style.preview_images;
    if (Array.isArray(imgs) && imgs.length > 0) return typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url;
    return null;
  };

  if (!open || !trendData) return null;

  const isCarousel = trendData.format === 'carrossel';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08]"
          style={{ backgroundColor: '#111118' }}>
          
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
            style={{ backgroundColor: '#111118' }}>
            <div>
              <h2 className="text-base font-semibold text-white">Criar conteúdo</h2>
              <p className="text-[11px] text-white/25 mt-0.5">
                {isCarousel ? 'Carrossel' : 'Post estático'} · {trendData.cardTexts?.length || 1} {isCarousel ? 'slides' : 'card'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Topic summary */}
            <div className="rounded-xl border border-white/[0.06] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs text-white/70 leading-relaxed line-clamp-2">{trendData.topic.split(': ').slice(0, 1).join(': ')}</p>
            </div>

            {/* Style selection */}
            <div>
              <p className="text-xs text-white/40 font-medium mb-3">Selecione o estilo</p>
              {loading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                  <span className="text-xs text-white/20">Carregando estilos...</span>
                </div>
              ) : styles.length === 0 ? (
                <p className="text-xs text-white/20 text-center py-6">Nenhum estilo disponível. Adquira estilos no Marketplace.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {styles.map(style => {
                    const preview = getPreviewUrl(style);
                    const isSelected = selectedStyle === style.id;
                    return (
                      <button key={style.id} onClick={() => setSelectedStyle(style.id)}
                        className="relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group aspect-square"
                        style={{
                          borderColor: isSelected ? '#8B5CF6' : 'rgba(255,255,255,0.06)',
                        }}>
                        {preview ? (
                          <img src={preview} alt={style.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.08)' }}>
                            <ImageIcon className="w-5 h-5 text-white/15" />
                          </div>
                        )}
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-[9px] text-white/70 font-medium truncate">{style.name}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#8B5CF6' }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Branding */}
            <div className="rounded-xl border border-white/[0.06] p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {brandConfig?.logo_url && (
                    <img src={brandConfig.logo_url} alt="Logo" className="w-6 h-6 rounded-md object-contain"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                  )}
                  <div>
                    <p className="text-xs text-white/60 font-medium">Marca configurada</p>
                    <p className="text-[10px] text-white/20">Logo e cores do Trends</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-white/25" />
                  <span className="text-[11px] text-white/35">Usar cores da marca</span>
                </div>
                <Switch checked={useBrandColors} onCheckedChange={setUseBrandColors} className="scale-75" />
              </div>

              {useBrandColors && brandConfig?.brand_colors && brandConfig.brand_colors.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  {brandConfig.brand_colors.slice(0, 6).map((c, i) => (
                    <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 border-t border-white/[0.06]" style={{ backgroundColor: '#111118' }}>
            <button
              onClick={() => selectedStyle && trendData && onConfirm(trendData, selectedStyle, useBrandColors)}
              disabled={!selectedStyle || loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-30"
              style={{ backgroundColor: '#8B5CF6' }}>
              <Sparkles className="w-4 h-4" />
              Criar conteúdo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TrendCreateDialog;
