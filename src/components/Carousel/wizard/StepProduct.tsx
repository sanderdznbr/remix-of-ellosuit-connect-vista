import React, { useState } from 'react';
import { Upload, X, Loader2, ShoppingBag, Check, RefreshCw, Folder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import GalleryPicker from './GalleryPicker';

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

interface Props {
  productImages: { url: string; thumb: string; file: File }[];
  setProductImages: React.Dispatch<React.SetStateAction<{ url: string; thumb: string; file: File }[]>>;
  productAnalysis: ProductAnalysis | null;
  setProductAnalysis: React.Dispatch<React.SetStateAction<ProductAnalysis | null>>;
  analyzingProduct: boolean;
  setAnalyzingProduct: React.Dispatch<React.SetStateAction<boolean>>;
  productSize: ProductSize;
  setProductSize: (v: ProductSize) => void;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string; desc: string }> = {
  clothing: { label: 'Roupa / Moda', emoji: '👗', desc: 'A IA recriará a peça em diferentes modelos, poses e cenários.' },
  object: { label: 'Objeto / Gadget', emoji: '📦', desc: 'A IA colocará o produto em mockups, cenas lifestyle e contextos variados.' },
  food: { label: 'Alimento / Bebida', emoji: '🍔', desc: 'A IA criará composições food-styling, close-ups e ambientações.' },
  unknown: { label: 'Outro Produto', emoji: '🏷️', desc: 'A IA usará o produto como referência e criará variações contextuais.' },
};

const StepProduct: React.FC<Props> = ({
  productImages, setProductImages,
  productAnalysis, setProductAnalysis,
  analyzingProduct, setAnalyzingProduct,
  productSize, setProductSize,
}) => {
  const [galleryOpen, setGalleryOpen] = useState(false);

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
  };

  const handleGalleryFiles = (files: { url: string; name: string }[]) => {
    // For gallery files, we create a dummy File object since we have URLs
    const newImages = files.map(f => ({
      url: f.url,
      thumb: f.url,
      file: new File([], f.name), // placeholder file
    }));
    setProductImages(prev => [...prev, ...newImages]);
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
        setProductAnalysis({ ...data.analysis, confirmed: false });
      }
    } catch (err) {
      console.error('Product analysis error:', err);
      setProductAnalysis({ type: 'unknown', description: 'Não foi possível analisar. Você pode selecionar o tipo manualmente.', suggestions: [], confirmed: false });
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
      setProductAnalysis({ ...productAnalysis, type, confirmed: false });
    }
  };

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Seu post é sobre algum produto?</h2>
        <p className="text-sm text-white/40">Se sim, envie fotos do produto para a IA recriá-lo no carrossel.</p>
      </div>

      {/* Upload area */}
      <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition-colors">
        <ShoppingBag className="h-6 w-6 text-white/20" />
        <span className="text-sm font-medium text-white/50">Subir fotos do produto</span>
        <span className="text-xs text-white/20">JPG, PNG — várias fotos de ângulos diferentes</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
      </label>

      {/* Gallery picker button */}
      <button onClick={() => setGalleryOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white/60 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all cursor-pointer">
        <Folder className="h-4 w-4" /> Importar da Galeria de Marca
      </button>

      <GalleryPicker open={galleryOpen} onClose={() => setGalleryOpen(false)} onSelectFiles={handleGalleryFiles} label="Selecionar pasta de produto" />

      {/* Uploaded images */}
      {productImages.length > 0 && (
        <div>
          <p className="text-xs font-medium text-white/40 mb-3">Fotos do produto ({productImages.length})</p>
          <div className="flex gap-2 flex-wrap">
            {productImages.map((img, i) => (
              <div key={i} className="relative group">
                <div className="w-16 h-16 rounded-lg overflow-hidden ring-1 ring-white/10">
                  <img src={img.thumb} alt="Produto" className="w-full h-full object-cover" />
                </div>
                <button onClick={() => {
                  setProductImages(prev => prev.filter((_, idx) => idx !== i));
                  if (productImages.length <= 1) setProductAnalysis(null);
                }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product size selector */}
      {productImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/50">Tamanho real do produto</p>
          <div className="grid grid-cols-1 gap-1.5">
            {PRODUCT_SIZE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setProductSize(opt.value)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  productSize === opt.value
                    ? 'bg-purple-500/15 border border-purple-500/30'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05]'
                }`}>
                <span className={`text-sm font-semibold min-w-[110px] ${productSize === opt.value ? 'text-purple-300' : 'text-white/50'}`}>
                  {opt.label}
                </span>
                <span className="text-[11px] text-white/30">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {analyzingProduct && (
        <div className="flex items-center gap-3 py-4 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          <div>
            <p className="text-sm font-medium text-white/70">Analisando produto com IA...</p>
            <p className="text-xs text-white/30">Identificando tipo e sugerindo como usar no carrossel</p>
          </div>
        </div>
      )}

      {/* Analysis result */}
      {productAnalysis && !analyzingProduct && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{TYPE_LABELS[productAnalysis.type]?.emoji || '🏷️'}</span>
                <div>
                  <p className="text-sm font-semibold text-white/80">{TYPE_LABELS[productAnalysis.type]?.label || 'Produto'}</p>
                  <p className="text-xs text-white/40">{productAnalysis.description}</p>
                </div>
              </div>
              <button onClick={analyzeProduct} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all" title="Re-analisar">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-white/30">{TYPE_LABELS[productAnalysis.type]?.desc}</p>
            {productAnalysis.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {productAnalysis.suggestions.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300/70 text-[10px] font-medium">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Type override */}
          <div>
            <p className="text-xs text-white/30 mb-2">Não está correto? Selecione manualmente:</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(TYPE_LABELS) as ProductAnalysis['type'][]).map(type => (
                <button key={type} onClick={() => handleTypeOverride(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    productAnalysis.type === type
                      ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                      : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
                  }`}>
                  {TYPE_LABELS[type].emoji} {TYPE_LABELS[type].label}
                </button>
              ))}
            </div>
          </div>

          {!productAnalysis.confirmed && (
            <button onClick={() => setProductAnalysis({ ...productAnalysis, confirmed: true })}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 50%, #6B3FA0 100%)' }}>
              <Check className="h-4 w-4" /> Confirmar e continuar
            </button>
          )}

          {productAnalysis.confirmed && (
            <div className="flex items-center gap-2 py-2 text-emerald-400/70 text-xs font-medium">
              <Check className="h-3.5 w-3.5" /> Produto confirmado — será usado na geração das imagens
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StepProduct;
