import React, { useState } from 'react';
import { Search, Loader2, X, Check, UserX, User } from 'lucide-react';
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
  emoji: string;
  description: string;
  searchHint: string;
}

const VISUAL_CATEGORIES: VisualCategoryOption[] = [
  { id: '3d-objects', label: 'Objetos 3D', emoji: '🎲', description: 'Objetos renderizados em 3D realista', searchHint: '3D rendered object' },
  { id: '2d-illustrations', label: 'Ilustrações 2D', emoji: '🎨', description: 'Ilustrações flat, vetoriais ou artísticas', searchHint: '2D illustration' },
  { id: '3d-scenes', label: 'Cenários 3D', emoji: '🏙️', description: 'Ambientes e cenas em 3D completas', searchHint: '3D scene environment' },
  { id: 'landscapes', label: 'Paisagens', emoji: '🌄', description: 'Fotos de paisagens naturais ou urbanas', searchHint: 'landscape photography' },
  { id: 'abstract', label: 'Abstrato', emoji: '🌀', description: 'Formas abstratas, gradientes e texturas', searchHint: 'abstract art design' },
  { id: 'manipulations', label: 'Manipulações', emoji: '✨', description: 'Composições e manipulações digitais', searchHint: 'digital manipulation art' },
  { id: 'patterns', label: 'Padrões', emoji: '🔲', description: 'Padrões geométricos e repetitivos', searchHint: 'geometric pattern design' },
  { id: 'minimalist', label: 'Minimalista', emoji: '◻️', description: 'Visual limpo, com poucos elementos', searchHint: 'minimalist design clean' },
  { id: 'collage', label: 'Colagem', emoji: '📐', description: 'Mix de fotos e gráficos sobrepostos', searchHint: 'collage art design' },
];

interface Props {
  selectedCategory: VisualCategory | null;
  setSelectedCategory: (cat: VisualCategory | null) => void;
  visualSearchQuery: string;
  setVisualSearchQuery: (q: string) => void;
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  peopleMode: PeopleMode;
  setPeopleMode: (mode: PeopleMode) => void;
  randomFaceCount: number | null;
  setRandomFaceCount: (v: number | null) => void;
  cardCount: number;
}

const PEOPLE_OPTIONS: { value: PeopleMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'none', label: 'Sem pessoas', icon: <UserX className="h-4 w-4" />, desc: 'Apenas elementos visuais, sem rostos' },
  { value: 'random-female', label: 'Mulher aleatória', icon: <User className="h-4 w-4" />, desc: 'Rosto feminino gerado pela IA' },
  { value: 'random-male', label: 'Homem aleatório', icon: <User className="h-4 w-4" />, desc: 'Rosto masculino gerado pela IA' },
  { value: 'random-auto', label: 'Pessoa aleatória', icon: <User className="h-4 w-4" />, desc: 'A IA escolhe o gênero' },
];

const StepVisualStyle: React.FC<Props> = ({
  selectedCategory, setSelectedCategory,
  visualSearchQuery, setVisualSearchQuery,
  referenceImages, setReferenceImages,
  peopleMode, setPeopleMode,
  randomFaceCount, setRandomFaceCount,
  cardCount,
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
  const effectiveRandomFaceCount = randomFaceCount != null ? randomFaceCount : cardCount;
  const showRandomFaceCount = peopleMode !== 'none' && cardCount >= 2;

  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">O que deve aparecer no post?</h2>
        <p className="text-sm text-white/40">Escolha o estilo visual e se deseja incluir pessoas.</p>
      </div>

      {/* People mode selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/80 block">Pessoas na imagem</label>
        <div className="grid grid-cols-2 gap-2">
          {PEOPLE_OPTIONS.map(opt => {
            const isSelected = peopleMode === opt.value;
            return (
              <button key={opt.value} onClick={() => setPeopleMode(opt.value)}
                className={`p-3 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-purple-500/15 border-purple-500/40'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={isSelected ? 'text-purple-400' : 'text-white/40'}>{opt.icon}</span>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-purple-300' : 'text-white/60'}`}>{opt.label}</span>
                </div>
                <span className="text-[10px] text-white/30 leading-tight">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Random face count slider */}
      {showRandomFaceCount && (
        <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.05] space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-purple-400" />
            <p className="text-sm font-semibold text-white/80">Cards com pessoa</p>
          </div>
          <p className="text-xs text-white/40">
            Quantos slides devem mostrar uma pessoa? O restante terá apenas elementos visuais.
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-bold text-purple-300 tabular-nums">{effectiveRandomFaceCount}</span>
            <span className="text-sm text-white/30">de {cardCount}</span>
          </div>
          <div className="px-2">
            <input
              type="range"
              min={1}
              max={cardCount}
              value={effectiveRandomFaceCount}
              onChange={(e) => setRandomFaceCount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8B5CF6 0%, #A78BFA ${((effectiveRandomFaceCount - 1) / Math.max(cardCount - 1, 1)) * 100}%, rgba(255,255,255,0.06) ${((effectiveRandomFaceCount - 1) / Math.max(cardCount - 1, 1)) * 100}%, rgba(255,255,255,0.06) 100%)`,
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[1, Math.ceil(cardCount / 2), cardCount].filter((v, i, a) => a.indexOf(v) === i).map(n => (
              <button key={n} onClick={() => setRandomFaceCount(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  effectiveRandomFaceCount === n
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                    : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
                }`}>
                {n === cardCount ? `Todos (${n})` : n}
              </button>
            ))}
          </div>
          <div className="flex gap-3 text-[10px] text-white/30">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500/60" />
              <span>{effectiveRandomFaceCount} com pessoa</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <span>{cardCount - effectiveRandomFaceCount} sem pessoa</span>
            </div>
          </div>
        </div>
      )}

      {/* Category grid */}
      <div>
        <label className="text-sm font-medium text-white/80 mb-3 block">Estilo visual</label>
        <div className="grid grid-cols-3 gap-2">
          {VISUAL_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => handleSelectCategory(cat.id)}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                  isSelected
                    ? 'border-purple-500/60 bg-purple-500/10 shadow-[0_0_12px_rgba(139,92,246,0.2)]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]'
                }`}>
                <span className="text-2xl">{cat.emoji}</span>
                <span className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-white' : 'text-white/60'}`}>{cat.label}</span>
                <span className="text-[9px] text-white/30 leading-tight">{cat.description}</span>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
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
              className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/60 transition-all disabled:opacity-30">
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
            className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/60 transition-all disabled:opacity-30">
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
                    className={`w-full rounded-lg overflow-hidden aspect-square transition-all ${
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
            className="text-xs text-white/20 hover:text-white/40 transition-colors flex items-center gap-1">
            <X className="h-3 w-3" /> Limpar
          </button>
        </div>
      )}
    </div>
  );
};

export default StepVisualStyle;
