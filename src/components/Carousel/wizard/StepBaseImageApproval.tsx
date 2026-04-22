import React, { useState, useEffect } from 'react';
import { Loader2, Check, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  candidates: string[];
  selectedImage: string | null;
  onSelect: (url: string) => void;
  onRegenerate: () => void;
  generating: boolean;
  accentTheme?: string;
}

const StepBaseImageApproval: React.FC<Props> = ({
  candidates,
  selectedImage,
  onSelect,
  onRegenerate,
  generating,
  accentTheme = 'purple'
}) => {
  const themeColor = accentTheme === 'orange' ? '#EA580C' : accentTheme === 'red' ? '#DC2626' : '#8B5CF6';

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <ImageIcon className="h-5 w-5" style={{ color: themeColor }} />
          Aprovação da Imagem Base
        </h3>
        <p className="text-sm text-white/50 max-w-sm mx-auto">
          Geramos 2 opções para o rosto. Escolha a sua favorita para seguir com o post completo.
        </p>
      </div>

      {generating ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-white/20" />
            <Sparkles className="h-6 w-6 absolute inset-0 m-auto animate-pulse" style={{ color: themeColor }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white/80">Gerando opções...</p>
            <p className="text-xs text-white/40 mt-1">Isso leva cerca de 20 segundos</p>
          </div>
        </div>
      ) : candidates.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {candidates.map((url, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onSelect(url)}
                className={`relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                  selectedImage === url ? 'border-white scale-[1.02]' : 'border-white/5 opacity-60 hover:opacity-100 hover:border-white/20'
                }`}
              >
                <img src={url} alt={`Opção ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white border border-white/10">
                  OPÇÃO {i + 1}
                </div>
                {selectedImage === url && (
                  <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                    <div className="bg-white text-black p-2 rounded-full shadow-xl">
                      <Check className="h-6 w-6" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              className="gap-2 text-white/40 hover:text-white/60 border-white/5 hover:bg-white/5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar mais duas
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center">
          <Button onClick={onRegenerate} style={{ background: themeColor }} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar Opções de Imagem
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepBaseImageApproval;
