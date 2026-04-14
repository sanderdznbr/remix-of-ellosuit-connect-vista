import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';

interface MarketplaceStyle {
  id: string;
  name: string;
  preview_images: string[];
  style_config: any;
}

interface AddCardStylePickerProps {
  onSelectStyle: (config: any) => void;
}

const AddCardStylePicker: React.FC<AddCardStylePickerProps> = ({ onSelectStyle }) => {
  const [styles, setStyles] = useState<MarketplaceStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // Check if user is adminmaster — gets ALL styles
        const { data: isAdmin } = await supabase.rpc('is_adminmaster', { _user_id: userData.user.id });
        if (isAdmin) {
          const { data } = await supabase
            .from('marketplace_styles')
            .select('id, name, preview_images, style_config')
            .eq('is_active', true);
          setStyles((data as any[]) || []);
          return;
        }

        const [{ data: purchased }, { data: freeStyles }] = await Promise.all([
          supabase.from('purchased_styles').select('style_id').eq('user_id', userData.user.id),
          supabase.from('marketplace_styles').select('id').eq('is_active', true).eq('is_free', true),
        ]);
        const purchasedIds = (purchased as any[] || []).map(p => p.style_id);
        const freeIds = (freeStyles as any[] || []).map(s => s.id);
        const allIds = Array.from(new Set([...purchasedIds, ...freeIds]));
        if (!allIds.length) return;
        const { data } = await supabase
          .from('marketplace_styles')
          .select('id, name, preview_images, style_config')
          .in('id', allIds)
          .eq('is_active', true);
        setStyles((data as any[]) || []);
      } catch (err) {
        console.error('Error fetching styles:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSelect = (style: MarketplaceStyle) => {
    setSelectedId(style.id);
  };

  const handleConfirm = () => {
    const style = styles.find(s => s.id === selectedId);
    if (style) {
      onSelectStyle({
        ...style.style_config,
        _previewImages: style.preview_images,
        _styleName: style.name,
        id: style.id,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-white/30" />
      </div>
    );
  }

  if (!styles.length) {
    return (
      <div className="text-center py-8 text-white/30 text-xs">
        Nenhum estilo disponível. Adquira estilos no Marketplace.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 pb-20" style={{ WebkitOverflowScrolling: 'touch' as any }}>
        {styles.map(style => {
          const isActive = selectedId === style.id;
          const coverUrl = style.preview_images?.[0];
          return (
            <button
              key={style.id}
              onClick={() => handleSelect(style)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-[4/5] ${
                isActive
                  ? 'border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]'
                  : 'border-transparent hover:border-white/20'
              }`}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={style.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                  <span className="text-white/20 text-xs">{style.name}</span>
                </div>
              )}
              {/* Name overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-2 py-2" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                <p className="text-white text-[11px] font-semibold truncate">{style.name}</p>
              </div>
              {isActive && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sticky confirm button */}
      {selectedId && (
        <div className="sticky bottom-0 left-0 right-0 pt-3 pb-1" style={{ background: 'linear-gradient(transparent, #111118 30%)' }}>
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 50%, #6B3FA0 100%)' }}
          >
            <Sparkles className="w-4 h-4" /> Gerar card com este estilo
          </button>
        </div>
      )}
    </div>
  );
};

export default AddCardStylePicker;
