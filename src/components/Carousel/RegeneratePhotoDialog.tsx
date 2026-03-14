import React, { useRef, useState } from 'react';
import { X, Upload, Image, Loader2, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface RegeneratePhotoDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (instruction: string, attachedImageUrl: string | null) => void;
  cardIndex: number;
  loading?: boolean;
}

const RegeneratePhotoDialog: React.FC<RegeneratePhotoDialogProps> = ({
  open, onClose, onConfirm, cardIndex, loading
}) => {
  const [instruction, setInstruction] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setAttachedImage(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    onConfirm(instruction.trim(), attachedImage);
    setInstruction('');
    setAttachedImage(null);
  };

  const handleClose = () => {
    setInstruction('');
    setAttachedImage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Regenerar Foto — Card {cardIndex + 1}</span>
          </div>
          <button onClick={handleClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-white/50 mb-2 block">
              Instrução para a IA (opcional)
            </label>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ex: coloque a pessoa segurando um notebook, mude o fundo para um escritório moderno..."
              className="!bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/25 rounded-xl min-h-[90px] resize-none text-sm focus:!border-blue-500/40 focus:!ring-0"
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="text-xs font-medium text-white/50 mb-2 block">
              Anexar imagem de referência (opcional)
            </label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            
            {attachedImage ? (
              <div className="relative inline-block">
                <img
                  src={attachedImage}
                  alt="Anexo"
                  className="h-20 rounded-xl border border-white/[0.08] object-contain bg-white/[0.02]"
                />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-2 -right-2 bg-white/10 hover:bg-white/20 text-white rounded-full p-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.10] text-sm text-white/30 hover:bg-white/[0.04] hover:text-white/50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Enviar imagem
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/[0.06] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Regenerar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegeneratePhotoDialog;
