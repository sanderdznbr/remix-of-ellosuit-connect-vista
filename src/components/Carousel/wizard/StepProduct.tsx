import React, { useState } from 'react';
import { Upload, X, Loader2, ShoppingBag, Check, RefreshCw, Folder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import GalleryPicker from './GalleryPicker';
import { useAuth } from '@/components/AuthProvider';
import { autoSaveFilesToGallery } from '@/utils/autoSaveUpload';

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
  const { user } = useAuth();
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

  return (
    <div className="space-y-4" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Seu post é sobre algum produto?</h2>
        <p className="text-sm text-white/40">Se sim, envie fotos do produto para a IA recriá-lo no carrossel.</p>
      </div>

      {/* Upload area */}
      <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border border-dashed border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition-colors">
        <ShoppingBag className="h-5 w-5 text-white/20" />
        <span className="text-sm font-medium text-white/50">Subir fotos do produto</span>
        <span className="text-xs text-white/20">JPG, PNG — várias fotos de ângulos diferentes</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
      </label>

      {/* Gallery picker button - only for logged in users */}
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

          {/* Compact size selector */}
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
