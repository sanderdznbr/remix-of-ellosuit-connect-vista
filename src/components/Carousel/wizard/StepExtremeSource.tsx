import React, { useState, useCallback } from 'react';
import { Sparkles, ImagePlus, Paintbrush, Upload, Link, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export type ExtremeSourceMode = 'scratch' | 'art-based';

interface Props {
  sourceMode: ExtremeSourceMode;
  setSourceMode: (mode: ExtremeSourceMode) => void;
  artImages: string[];
  setArtImages: React.Dispatch<React.SetStateAction<string[]>>;
  onContinue: () => void;
}

const StepExtremeSource: React.FC<Props> = ({ sourceMode, setSourceMode, artImages, setArtImages, onContinue }) => {
  const [linkInput, setLinkInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 6)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `extreme-refs/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true });
        if (!error) {
          const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
          if (urlData?.publicUrl) uploaded.push(urlData.publicUrl);
        }
      }
      if (uploaded.length) setArtImages(prev => [...prev, ...uploaded].slice(0, 6));
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [setArtImages]);

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    if (/^https?:\/\/.+/.test(url)) {
      setArtImages(prev => [...prev, url].slice(0, 6));
      setLinkInput('');
    }
  };

  const removeImage = (idx: number) => {
    setArtImages(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <h2 className="text-2xl font-bold text-white">Como quer criar?</h2>
        </div>
        <p className="text-sm text-white/40">
          Escolha se deseja criar do zero ou se basear em uma arte existente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Criar do zero */}
        <button
          onClick={() => { setSourceMode('scratch'); onContinue(); }}
          className={`relative p-5 rounded-xl border-2 text-left transition-all ${
            sourceMode === 'scratch'
              ? 'border-orange-500/60 bg-orange-500/10'
              : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
          }`}
        >
          <Paintbrush className="w-6 h-6 text-orange-400 mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">Criar do zero</h3>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Descreva sua visão e a IA cria algo original com referências do Behance
          </p>
        </button>

        {/* Baseado em arte */}
        <button
          onClick={() => setSourceMode('art-based')}
          className={`relative p-5 rounded-xl border-2 text-left transition-all ${
            sourceMode === 'art-based'
              ? 'border-orange-500/60 bg-orange-500/10'
              : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
          }`}
        >
          <ImagePlus className="w-6 h-6 text-orange-400 mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">Baseado em uma arte</h3>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Envie imagens ou links de referência e a IA recria nesse estilo
          </p>
        </button>
      </div>

      {/* Art-based: show upload area */}
      {sourceMode === 'art-based' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-xs text-white/50">Envie até 6 imagens de referência ou cole links:</p>

          {/* Uploaded images grid */}
          {artImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {artImages.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <label className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-white/[0.12] hover:border-orange-500/40 bg-white/[0.02] hover:bg-orange-500/5 cursor-pointer transition-all">
            {uploading ? (
              <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-orange-400" />
            )}
            <span className="text-sm text-white/60">
              {uploading ? 'Enviando...' : 'Enviar imagens'}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
              disabled={uploading || artImages.length >= 6}
            />
          </label>

          {/* Link input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Cole um link de imagem..."
                className="w-full h-10 pl-9 pr-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/40 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
              />
            </div>
            <button
              onClick={addLink}
              disabled={!linkInput.trim()}
              className="px-4 h-10 rounded-lg bg-orange-500/20 text-orange-400 text-sm font-medium hover:bg-orange-500/30 transition-colors disabled:opacity-30"
            >
              Adicionar
            </button>
          </div>

          {/* Continue button */}
          {artImages.length > 0 && (
            <button
              onClick={onContinue}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: 'white',
              }}
            >
              <Sparkles className="w-4 h-4" />
              Continuar com {artImages.length} referência{artImages.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StepExtremeSource;
