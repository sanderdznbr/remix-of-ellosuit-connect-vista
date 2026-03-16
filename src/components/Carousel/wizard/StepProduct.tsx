import React, { useState, useMemo } from 'react';
import { Upload, X, Loader2, ShoppingBag, Check, RefreshCw, Folder, Smartphone, Monitor, Utensils, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import GalleryPicker from './GalleryPicker';
import { useAuth } from '@/components/AuthProvider';

import { ImageSettings } from './types';

export type ProductSize = 'tiny' | 'small' | 'medium' | 'large' | 'extra-large';

export const PRODUCT_SIZE_OPTIONS: { value: ProductSize; label: string; desc: string }[] = [
  { value: 'tiny', label: 'Muito pequeno', desc: '~5 cm — cápsulas, pen drives, brincos' },
  { value: 'small', label: 'Pequeno', desc: '~10–15 cm — frascos, cosméticos, celular' },
  { value: 'medium', label: 'Médio', desc: '~20–40 cm — caixa, garrafa, sapato' },
  { value: 'large', label: 'Grande', desc: '~50–100 cm — mochila, cadeira, violão' },
  { value: 'extra-large', label: 'Muito grande', desc: '1 m+ — sofá, geladeira, bicicleta' },
];

export interface ProductAnalysis {
  type: 'clothing' | 'object' | 'food' | 'unknown';
  description: string;
  suggestions: string[];
  confirmed: boolean;
}

type DetectedContext = 'app' | 'website' | 'food' | 'physical' | null;

interface MentionedPrompt {
  id: string;
  title: string;
  content: string;
  avatar_url: string | null;
}

interface Props {
  productImages: { url: string; thumb: string; file: File }[];
  setProductImages: React.Dispatch<React.SetStateAction<{ url: string; thumb: string; file: File }[]>>;
  productAnalysis: ProductAnalysis | null;
  setProductAnalysis: React.Dispatch<React.SetStateAction<ProductAnalysis | null>>;
  analyzingProduct: boolean;
  setAnalyzingProduct: React.Dispatch<React.SetStateAction<boolean>>;
  productSize: ProductSize;
  setProductSize: (v: ProductSize) => void;
  topic?: string;
  imageSettings?: ImageSettings;
  onUpdateImageSettings?: (s: ImageSettings) => void;
  mentionedPrompts?: MentionedPrompt[];
}

const TYPE_LABELS: Record<string, { label: string; emoji: string; desc: string }> = {
  clothing: { label: 'Roupa / Moda', emoji: '👗', desc: 'A IA recriará a peça em diferentes modelos, poses e cenários.' },
  object: { label: 'Objeto / Gadget', emoji: '📦', desc: 'A IA colocará o produto em mockups, cenas lifestyle e contextos variados.' },
  food: { label: 'Alimento / Bebida', emoji: '🍔', desc: 'A IA criará composições food-styling, close-ups e ambientações.' },
  unknown: { label: 'Outro Produto', emoji: '🏷️', desc: 'A IA usará o produto como referência e criará variações contextuais.' },
};

const CONTEXT_HINTS: Record<string, { icon: React.ElementType; title: string; subtitle: string; uploadLabel: string; uploadHint: string; autoHandObject?: string }> = {
  app: {
    icon: Smartphone,
    title: 'Detectamos que seu post é sobre um app',
    subtitle: 'Envie screenshots das telas do app — a IA vai colocá-las em mockups de celular automaticamente.',
    uploadLabel: 'Subir screenshots do app',
    uploadHint: 'PNG ou JPG — prints das telas principais do app',
    autoHandObject: 'smartphone',
  },
  website: {
    icon: Monitor,
    title: 'Detectamos que seu post é sobre um site ou sistema',
    subtitle: 'Envie screenshots das páginas — a IA vai renderizá-las em mockups de notebook/desktop.',
    uploadLabel: 'Subir screenshots do site',
    uploadHint: 'PNG ou JPG — prints das páginas ou dashboards',
    autoHandObject: 'laptop',
  },
  food: {
    icon: Utensils,
    title: 'Detectamos que seu post é sobre alimento/bebida',
    subtitle: 'Envie fotos do prato ou produto — a IA criará composições food-styling.',
    uploadLabel: 'Subir fotos do alimento',
    uploadHint: 'JPG, PNG — fotos do prato, embalagem ou ingredientes',
  },
  physical: {
    icon: Package,
    title: 'Detectamos que seu post é sobre um produto',
    subtitle: 'Envie fotos do produto em diferentes ângulos para melhores resultados.',
    uploadLabel: 'Subir fotos do produto',
    uploadHint: 'JPG, PNG — várias fotos de ângulos diferentes',
  },
};

export function detectContext(topic: string, mentionedPrompts?: MentionedPrompt[]): DetectedContext {
  // Combine topic + all mentioned prompt titles and content for analysis
  const parts = [topic || ''];
  if (mentionedPrompts?.length) {
    mentionedPrompts.forEach(m => {
      parts.push(m.title || '');
      parts.push(m.content || '');
    });
  }
  const t = parts.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (!t.trim()) return null;
  
  // App / mobile — check first (most specific)
  if (/\b(app|aplicativo|mobile|ios|android|play store|app store|saas|plataforma digital)\b/.test(t) ||
      /tela do app|funcionalidade do app|download|baixe o/.test(t) ||
      /lancamento.*(app|aplicativo)|app.*(lancamento|lancar|divulgar)/.test(t) ||
      /divulgar.*(app|aplicativo|plataforma)/.test(t)) return 'app';
  
  // Website / system / dashboard
  if (/\b(site|website|landing page|dashboard|sistema|painel|plataforma web|portal|web app|ferramenta online|software|erp|crm)\b/.test(t) ||
      /lancamento.*(sistema|plataforma|software|ferramenta|portal)|divulgar.*(sistema|plataforma|software)/.test(t)) return 'website';
  
  // Food
  if (/\b(receita|prato|comida|alimento|restaurante|lanche|pizza|hamburguer|bolo|doce|bebida|suco|cafe|cardapio|menu|delivery)\b/.test(t)) return 'food';
  
  // Physical product (broader, checked last)
  if (/\b(produto|colecao|nova linha|embalagem|kit|unboxing|showcase|vitrine)\b/.test(t) ||
      /lancamento.*(produto|colecao|linha)/.test(t)) return 'physical';
  
  return null;
}

const StepProduct: React.FC<Props> = ({
  productImages, setProductImages,
  productAnalysis, setProductAnalysis,
  analyzingProduct, setAnalyzingProduct,
  productSize, setProductSize,
  topic = '',
  imageSettings,
  onUpdateImageSettings,
  mentionedPrompts = [],
}) => {
  const { user } = useAuth();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [contextApplied, setContextApplied] = useState(false);

  const detectedContext = useMemo(() => detectContext(topic, mentionedPrompts), [topic, mentionedPrompts]);
  const hint = detectedContext ? CONTEXT_HINTS[detectedContext] : null;

  // Auto-apply hand object setting when context is detected and user uploads
  const applyContextSettings = () => {
    if (hint?.autoHandObject && imageSettings && onUpdateImageSettings && !contextApplied) {
      onUpdateImageSettings({
        ...imageSettings,
        handObject: hint.autoHandObject,
      });
      setContextApplied(true);
    }
  };

  const handleUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setProductImages(prev => [...prev, {
            url: e.target!.result as string,
            thumb: e.target!.result as string,
            file,
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
    applyContextSettings();
  };

  const handleGalleryFiles = (files: { url: string; name: string }[]) => {
    const newImages = files.map(f => ({
      url: f.url,
      thumb: f.url,
      file: new File([], f.name),
    }));
    setProductImages(prev => [...prev, ...newImages]);
    applyContextSettings();
  };

  const analyzeProduct = async () => {
    if (productImages.length === 0) return;
    setAnalyzingProduct(true);
    try {
      const imageUrl = productImages[0].url;
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'analyze-product', imageUrl },
      });
      if (error) throw error;
      if (data?.success && data?.analysis) {
        setProductAnalysis({ ...data.analysis, confirmed: true });
      }
    } catch (err) {
      console.error('Product analysis error:', err);
      setProductAnalysis({ type: 'unknown', description: 'Não foi possível analisar. Você pode selecionar o tipo manualmente.', suggestions: [], confirmed: true });
    } finally {
      setAnalyzingProduct(false);
    }
  };

  React.useEffect(() => {
    if (productImages.length > 0 && !productAnalysis && !analyzingProduct) {
      analyzeProduct();
    }
  }, [productImages.length]);

  const handleTypeOverride = (type: ProductAnalysis['type']) => {
    if (productAnalysis) {
      setProductAnalysis({ ...productAnalysis, type, confirmed: true });
    }
  };

  const HintIcon = hint?.icon || ShoppingBag;

  return (
    <div className="space-y-4" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {hint ? hint.title : 'Seu post é sobre algum produto?'}
        </h2>
        <p className="text-sm text-white/40">
          {hint ? hint.subtitle : 'Se sim, envie fotos do produto para a IA recriá-lo no carrossel.'}
        </p>
      </div>

      {/* Smart context hint banner */}
      {hint && productImages.length === 0 && (
        <div className="p-4 rounded-xl space-y-2" style={{
          backgroundColor: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
              <HintIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/70">
                {detectedContext === 'app' && 'Envie os prints da tela do app aqui'}
                {detectedContext === 'website' && 'Envie os prints do site/dashboard aqui'}
                {detectedContext === 'food' && 'Envie fotos do prato ou embalagem aqui'}
                {detectedContext === 'physical' && 'Envie fotos do produto aqui'}
              </p>
              <p className="text-xs text-white/35 mt-0.5">
                {detectedContext === 'app' && 'A IA colocará automaticamente em mockup de celular'}
                {detectedContext === 'website' && 'A IA renderizará em mockup de notebook/desktop'}
                {detectedContext === 'food' && 'A IA criará composições profissionais de food-styling'}
                {detectedContext === 'physical' && 'A IA usará as fotos como referência para mockups e cenas'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload area */}
      <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border border-dashed border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition-colors">
        <HintIcon className="h-5 w-5 text-white/20" />
        <span className="text-sm font-medium text-white/50">{hint?.uploadLabel || 'Subir fotos do produto'}</span>
        <span className="text-xs text-white/20">{hint?.uploadHint || 'JPG, PNG — várias fotos de ângulos diferentes'}</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
      </label>

      {/* Gallery picker button */}
      {user && (
        <button onClick={() => setGalleryOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/60 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all cursor-pointer">
          <Folder className="h-4 w-4" /> Importar da Galeria de Marca
        </button>
      )}

      <GalleryPicker open={galleryOpen} onClose={() => setGalleryOpen(false)} onSelectFiles={handleGalleryFiles} label="Selecionar pasta de produto" />

      {/* Uploaded images + size selector inline */}
      {productImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex gap-1.5 flex-wrap flex-1">
              {productImages.map((img, i) => (
                <div key={i} className="relative group">
                  <div className="w-14 h-14 rounded-lg overflow-hidden ring-1 ring-white/10">
                    <img src={img.thumb} alt="Produto" className="w-full h-full object-cover" />
                  </div>
                  <button onClick={() => {
                    setProductImages(prev => prev.filter((_, idx) => idx !== i));
                    if (productImages.length <= 1) setProductAnalysis(null);
                  }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-applied context badge */}
          {contextApplied && hint?.autoHandObject && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{
              backgroundColor: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.15)',
            }}>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-300/80">
                Mockup de {hint.autoHandObject === 'smartphone' ? 'celular' : 'notebook'} configurado automaticamente
              </span>
            </div>
          )}

          {/* Compact size selector — hide for digital products */}
          {detectedContext !== 'app' && detectedContext !== 'website' && (
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_SIZE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setProductSize(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    productSize === opt.value
                      ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30'
                      : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.06]'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {analyzingProduct && (
        <div className="flex items-center gap-3 py-3 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
          <p className="text-sm text-white/50">Analisando produto...</p>
        </div>
      )}

      {/* Compact analysis result */}
      {productAnalysis && !analyzingProduct && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <span className="text-lg">{TYPE_LABELS[productAnalysis.type]?.emoji || '🏷️'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/80">{TYPE_LABELS[productAnalysis.type]?.label || 'Produto'}</p>
              <p className="text-xs text-white/40 truncate">{productAnalysis.description}</p>
            </div>
            <button onClick={analyzeProduct} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all" title="Re-analisar">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Type override - compact pills */}
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(TYPE_LABELS) as ProductAnalysis['type'][]).map(type => (
              <button key={type} onClick={() => handleTypeOverride(type)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  productAnalysis.type === type
                    ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                    : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
                }`}>
                {TYPE_LABELS[type].emoji} {TYPE_LABELS[type].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-emerald-400/70 text-xs font-medium">
            <Check className="h-3.5 w-3.5" /> Produto identificado
          </div>
        </div>
      )}
    </div>
  );
};

export default StepProduct;
