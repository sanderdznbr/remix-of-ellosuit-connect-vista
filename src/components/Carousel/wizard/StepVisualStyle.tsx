import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Loader2, X, Check, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ReferenceImage } from './types';

import img3dObjects from '@/assets/visual-styles/3d-objects.jpg';
import img2dIllustrations from '@/assets/visual-styles/2d-illustrations.jpg';
import img3dScenes from '@/assets/visual-styles/3d-scenes.jpg';
import imgLandscapes from '@/assets/visual-styles/landscapes.jpg';
import imgAbstract from '@/assets/visual-styles/abstract.jpg';
import imgManipulations from '@/assets/visual-styles/manipulations.jpg';
import imgPatterns from '@/assets/visual-styles/patterns.jpg';
import imgMinimalist from '@/assets/visual-styles/minimalist.jpg';
import imgCollage from '@/assets/visual-styles/collage.jpg';

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
  { id: '3d-objects', label: 'Objetos 3D', description: 'Renderizados em 3D', searchHint: '3D rendered object', previewUrl: img3dObjects },
  { id: '2d-illustrations', label: 'Ilustrações 2D', description: 'Flat, vetorial ou artístico', searchHint: '2D illustration', previewUrl: img2dIllustrations },
  { id: '3d-scenes', label: 'Cenários 3D', description: 'Ambientes e cenas', searchHint: '3D scene environment', previewUrl: img3dScenes },
  { id: 'landscapes', label: 'Paisagens', description: 'Naturais ou urbanas', searchHint: 'landscape photography', previewUrl: imgLandscapes },
  { id: 'abstract', label: 'Abstrato', description: 'Formas e gradientes', searchHint: 'abstract art design', previewUrl: imgAbstract },
  { id: 'manipulations', label: 'Manipulações', description: 'Composições digitais', searchHint: 'digital manipulation art', previewUrl: imgManipulations },
  { id: 'patterns', label: 'Padrões', description: 'Geométricos e repetitivos', searchHint: 'geometric pattern design', previewUrl: imgPatterns },
  { id: 'minimalist', label: 'Minimalista', description: 'Clean, poucos elementos', searchHint: 'minimalist design clean', previewUrl: imgMinimalist },
  { id: 'collage', label: 'Colagem', description: 'Mix de fotos e gráficos', searchHint: 'collage art design', previewUrl: imgCollage },
];

/** Detect the best visual category + refined search query from the topic */
function detectVisualSuggestion(topic: string, mentionedPrompts?: { title?: string; content?: string }[]): { category: VisualCategory; query: string } | null {
  const parts = [topic || ''];
  if (mentionedPrompts?.length) {
    mentionedPrompts.forEach(m => { parts.push(m.title || '', m.content || ''); });
  }
  const t = parts.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // App / Mobile / Digital product → 3D iPhone/device mockup
  if (/\b(app|aplicativo|mobile|ios|android|play store|app store|saas|plataforma digital)\b/.test(t) || /lancamento.*(app|aplicativo|plataforma)/.test(t)) {
    return { category: '3d-objects', query: '3D iPhone mockup app screen floating' };
  }
  // Website / Landing page → Macbook/laptop mockup
  if (/\b(site|website|landing page|pagina|plataforma web|dashboard|painel)\b/.test(t)) {
    return { category: '3d-objects', query: '3D MacBook laptop mockup website screen' };
  }
  // E-commerce / Product → 3D product
  if (/\b(produto|ecommerce|e-commerce|loja online|dropshipping|embalagem|packaging)\b/.test(t)) {
    return { category: '3d-objects', query: '3D product packaging mockup floating' };
  }
  // Food / Restaurant
  if (/\b(comida|food|restaurante|receita|culinaria|gastronomia|delivery|cardapio|hamburguer|pizza|sushi)\b/.test(t)) {
    return { category: 'manipulations', query: 'food photography dramatic lighting' };
  }
  // Travel / Nature
  if (/\b(viagem|travel|turismo|destino|praia|montanha|aventura|natureza)\b/.test(t)) {
    return { category: 'landscapes', query: 'travel destination landscape cinematic' };
  }
  // Finance / Business
  if (/\b(financ|investimento|dinheiro|negocio|business|empreend|startup|empresa|marketing)\b/.test(t)) {
    return { category: 'abstract', query: 'abstract business gradient dark premium' };
  }
  // Education / Course
  if (/\b(curso|educacao|aprender|aula|treinamento|mentoria|coaching|workshop)\b/.test(t)) {
    return { category: '3d-objects', query: '3D books study objects floating' };
  }
  // Fitness / Health
  if (/\b(fitness|treino|academia|saude|health|exercicio|musculacao|gym|crossfit|yoga)\b/.test(t)) {
    return { category: 'manipulations', query: 'fitness gym dramatic dark lighting' };
  }
  // Beauty / Fashion
  if (/\b(beleza|beauty|moda|fashion|roupa|maquiagem|skincare|cosmetico)\b/.test(t)) {
    return { category: 'minimalist', query: 'beauty cosmetics minimalist elegant' };
  }
  // Technology / AI
  if (/\b(tecnologia|tech|ia\b|inteligencia artificial|ai\b|machine learning|automacao|codigo|programacao|software)\b/.test(t)) {
    return { category: 'abstract', query: 'futuristic technology abstract neon gradient' };
  }
  // Music / Entertainment
  if (/\b(musica|music|podcast|entretenimento|show|festival|evento)\b/.test(t)) {
    return { category: 'abstract', query: 'music neon lights abstract colorful' };
  }

  return null;
}

interface Props {
  selectedCategory: VisualCategory | null;
  setSelectedCategory: (cat: VisualCategory | null) => void;
  visualSearchQuery: string;
  setVisualSearchQuery: (q: string) => void;
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  topic?: string;
  mentionedPrompts?: { title?: string; content?: string }[];
}

const StepVisualStyle: React.FC<Props> = ({
  selectedCategory, setSelectedCategory,
  visualSearchQuery, setVisualSearchQuery,
  referenceImages, setReferenceImages,
  topic, mentionedPrompts,
}) => {
  const [searchResults, setSearchResults] = useState<{ url: string; thumb: string; alt: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showObjectSearch, setShowObjectSearch] = useState(false);
  const [objectQuery, setObjectQuery] = useState('');
  const [aiSuggested, setAiSuggested] = useState(false);
  const hasAutoSuggested = useRef(false);

  const suggestion = useMemo(() => detectVisualSuggestion(topic || '', mentionedPrompts), [topic, mentionedPrompts]);

  // Auto-suggest on mount if no category selected yet
  useEffect(() => {
    if (hasAutoSuggested.current || selectedCategory) return;
    if (!suggestion) return;
    hasAutoSuggested.current = true;
    setAiSuggested(true);
    setSelectedCategory(suggestion.category);
    setVisualSearchQuery(suggestion.query);
    if (suggestion.category === '3d-objects') {
      setShowObjectSearch(false); // Already has specific query, skip object input
    }
    searchWeb(suggestion.query);
  }, [suggestion, selectedCategory]);

  const handleSelectCategory = (cat: VisualCategory) => {
    setAiSuggested(false);
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

      {/* AI suggestion banner */}
      {aiSuggested && suggestion && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
          <p className="text-xs text-purple-300 flex-1">
            Sugestão automática baseada no tema: <span className="font-semibold text-purple-200">{VISUAL_CATEGORIES.find(c => c.id === suggestion.category)?.label}</span>
          </p>
          <button 
            onClick={() => { setAiSuggested(false); setSelectedCategory(null); setSearchResults([]); setVisualSearchQuery(''); }}
            className="text-[10px] text-white/40 hover:text-white/60 underline cursor-pointer whitespace-nowrap">
            Escolher outro
          </button>
        </div>
      )}

      {/* Category grid */}
      <div className="grid grid-cols-3 gap-3">
        {VISUAL_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => handleSelectCategory(cat.id)}
              className={`relative rounded-xl overflow-hidden transition-all group cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-purple-500 shadow-[0_0_16px_rgba(139,92,246,0.3)] scale-[1.02]'
                  : 'ring-1 ring-white/[0.08] hover:ring-white/[0.2] hover:scale-[1.01]'
              }`}
            >
              <div className="aspect-[4/5] relative">
                <img
                  src={cat.previewUrl}
                  alt={cat.label}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isSelected ? 'brightness-100' : 'brightness-[0.55] group-hover:brightness-75'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-2.5">
                  <p className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-white' : 'text-white/90'}`}>
                    {cat.label}
                  </p>
                  <p className="text-[9px] text-white/50 leading-tight mt-0.5">{cat.description}</p>
                </div>
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

      {/* Manual search refinement */}
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

      {searching && (
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/20 mx-auto mb-2" />
          <p className="text-xs text-white/30">Buscando referências visuais...</p>
        </div>
      )}

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
