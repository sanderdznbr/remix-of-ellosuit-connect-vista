import React, { useState, useEffect } from 'react';
import { Search, Loader2, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ReferenceImage } from './types';

export type VisualCategory = 
  | '3d-objects' | '2d-illustrations' | '3d-scenes' | 'landscapes' 
  | 'abstract' | 'manipulations' | 'patterns' | 'minimalist' | 'collage';

export type PeopleMode = 'none' | 'random-female' | 'random-male' | 'random-auto';

export interface VisualCategoryOption {
  id: VisualCategory;
  label: string;
  description: string;
  searchHint: string;
  previewUrl: string;
}

const VISUAL_CATEGORIES: VisualCategoryOption[] = [
  { 
    id: '3d-objects', label: 'Objetos 3D', 
    description: 'Objetos renderizados em 3D',
    searchHint: '3D rendered object',
    previewUrl: 'https://images.unsplash.com/photo-1633899306328-c5e70574aaa2?w=400&h=500&fit=crop',
  },
  { 
    id: '2d-illustrations', label: 'Ilustrações 2D', 
    description: 'Flat, vetorial ou artístico',
    searchHint: '2D illustration',
    previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=500&fit=crop',
  },
  { 
    id: '3d-scenes', label: 'Cenários 3D', 
    description: 'Ambientes e cenas completas',
    searchHint: '3D scene environment',
    previewUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=500&fit=crop',
  },
  { 
    id: 'landscapes', label: 'Paisagens', 
    description: 'Naturais ou urbanas',
    searchHint: 'landscape photography',
    previewUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop',
  },
  { 
    id: 'abstract', label: 'Abstrato', 
    description: 'Formas, gradientes e texturas',
    searchHint: 'abstract art design',
    previewUrl: 'https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=400&h=500&fit=crop',
  },
  { 
    id: 'manipulations', label: 'Manipulações', 
    description: 'Composições digitais',
    searchHint: 'digital manipulation art',
    previewUrl: 'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=400&h=500&fit=crop',
  },
  { 
    id: 'patterns', label: 'Padrões', 
    description: 'Geométricos e repetitivos',
    searchHint: 'geometric pattern design',
    previewUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=500&fit=crop',
  },
  { 
    id: 'minimalist', label: 'Minimalista', 
    description: 'Clean, poucos elementos',
    searchHint: 'minimalist design clean',
    previewUrl: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=500&fit=crop',
  },
  { 
    id: 'collage', label: 'Colagem', 
    description: 'Mix de fotos e gráficos',
    searchHint: 'collage art design',
    previewUrl: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400&h=500&fit=crop',
  },
];

interface Props {
  selectedCategory: VisualCategory | null;
  setSelectedCategory: (cat: VisualCategory | null) => void;
  visualSearchQuery: string;
  setVisualSearchQuery: (q: string) => void;
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
}

const StepVisualStyle: React.FC<Props> = ({
  selectedCategory, setSelectedCategory,
  visualSearchQuery, setVisualSearchQuery,
  referenceImages, setReferenceImages,
}) => {
  const [searchResults, setSearchResults] = useState<{ url: string; thumb: string; alt: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showObjectSearch, setShowObjectSearch] = useState(false);
  const [objectQuery, setObjectQuery] = useState('');

  const handleSelectCategory = (cat: VisualCategory) => {
    setSelectedCategory(cat);
    setVisualSearchQuery(VISUAL_CATEGORIES.find(c => c.id === cat)?.searchHint || '');
    if (cat === '3d-objects') {
      setShowObjectSearch(true);
      setSearchResults([]);
    } else {
      setShowObjectSearch(false);
      searchWeb(VISUAL_CATEGORIES.find(c => c.id === cat)?.searchHint || cat);
    }
  };

  const searchWeb = async (query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'web-search', query: query.trim() },
      });
      if (error) throw error;
      if (data?.images) setSearchResults(data.images);
    } catch { /* silent */ }
    finally { setSearching(false); }
  };

  const handleObjectSearch = () => {
    if (!objectQuery.trim()) return;
    const cat = VISUAL_CATEGORIES.find(c => c.id === selectedCategory);
    const fullQuery = `${cat?.searchHint || '3D object'} ${objectQuery.trim()}`;
    setVisualSearchQuery(fullQuery);
    searchWeb(fullQuery);
  };

  const toggleImage = (img: { url: string; thumb: string; alt: string }) => {
    const alreadyAdded = referenceImages.some(r => r.url === img.url);
    if (alreadyAdded) {
      setReferenceImages(prev => prev.filter(r => r.url !== img.url));
    } else {
      setReferenceImages(prev => [...prev, {
        url: img.url, thumb: img.thumb || img.url, label: img.alt || 'Visual ref', source: 'web', category: 'style',
      }]);
    }
  };

  const visualRefs = referenceImages.filter(r => r.category === 'style');

  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Estilo visual</h2>
        <p className="text-sm text-white/40">Escolha o tipo de visual para as imagens do post.</p>
      </div>

      {/* Category grid — photo-based */}
      <div className="grid grid-cols-3 gap-2.5">
        {VISUAL_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => handleSelectCategory(cat.id)}
              className={`relative rounded-xl overflow-hidden transition-all group ${
                isSelected
                  ? 'ring-2 ring-purple-500 shadow-[0_0_16px_rgba(139,92,246,0.3)]'
                  : 'ring-1 ring-white/[0.08] hover:ring-white/[0.2]'
              }`}
            >
              {/* Photo */}
              <div className="aspect-[4/5] relative">
                <img
                  src={cat.previewUrl}
                  alt={cat.label}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isSelected ? 'brightness-90' : 'brightness-[0.6] group-hover:brightness-75'
                  }`}
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Label */}
                <div className="absolute bottom-0 inset-x-0 p-2.5">
                  <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-white/90'}`}>
                    {cat.label}
                  </p>
                  <p className="text-[9px] text-white/50 leading-tight mt-0.5">{cat.description}</p>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Object search sub-step */}
      {showObjectSearch && selectedCategory === '3d-objects' && (
        <div className="space-y-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <label className="text-sm font-medium text-white/80 block">Qual objeto deve aparecer?</label>
          <p className="text-xs text-white/30">Ex: notebook, café, livro, celular, óculos...</p>
          <div className="flex gap-2">
            <Input value={objectQuery} onChange={(e) => setObjectQuery(e.target.value)}
              placeholder="Digite o objeto..."
              className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg flex-1 text-sm h-10 focus:!border-white/20 focus:!ring-0"
              onKeyDown={(e) => e.key === 'Enter' && handleObjectSearch()} />
            <button onClick={handleObjectSearch} disabled={searching || !objectQuery.trim()}
              className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/60 transition-all disabled:opacity-30 cursor-pointer">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Manual search for any category */}
      {selectedCategory && !showObjectSearch && (
        <div className="flex gap-2">
          <Input value={visualSearchQuery} onChange={(e) => setVisualSearchQuery(e.target.value)}
            placeholder="Refinar busca..."
            className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg flex-1 text-sm h-10 focus:!border-white/20 focus:!ring-0"
            onKeyDown={(e) => e.key === 'Enter' && searchWeb(visualSearchQuery)} />
          <button onClick={() => searchWeb(visualSearchQuery)} disabled={searching || !visualSearchQuery.trim()}
            className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/60 transition-all disabled:opacity-30 cursor-pointer">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Loading */}
      {searching && (
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/20 mx-auto mb-2" />
          <p className="text-xs text-white/30">Buscando referências visuais...</p>
        </div>
      )}

      {/* Search results grid */}
      {searchResults.length > 0 && !searching && (
        <div className="space-y-2">
          <p className="text-xs text-white/40">Selecione as imagens que combinam com o estilo desejado:</p>
          <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {searchResults.filter((img: any) => img?.url).map((img, i) => {
              const alreadyAdded = referenceImages.some(r => r.url === img.url);
              return (
                <div key={i} className="relative group">
                  <button onClick={() => toggleImage(img)}
                    className={`w-full rounded-lg overflow-hidden aspect-square transition-all cursor-pointer ${
                      alreadyAdded
                        ? 'ring-2 ring-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                        : 'ring-1 ring-white/[0.06] hover:ring-white/20'
                    }`}>
                    <img src={img.thumb || img.url} alt={img.alt || ''} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </button>
                  {alreadyAdded && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected count */}
      {visualRefs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/30">{visualRefs.length} referência(s) visual(is) selecionada(s)</p>
          <button onClick={() => setReferenceImages(prev => prev.filter(r => r.category !== 'style'))}
            className="text-xs text-white/20 hover:text-white/40 transition-colors flex items-center gap-1 cursor-pointer">
            <X className="h-3 w-3" /> Limpar
          </button>
        </div>
      )}
    </div>
  );
};

export default StepVisualStyle;
