import React from 'react';
import { Zap, Sparkles } from 'lucide-react';

interface Props {
  imageModel: 'gemini' | 'nano-banana';
  setImageModel: (v: 'gemini' | 'nano-banana') => void;
  generationMode: 'direct' | 'cloud';
  setGenerationMode: (v: 'direct' | 'cloud') => void;
  accentTheme?: 'purple' | 'red' | 'orange';
}

const StepSpeed: React.FC<Props> = ({ imageModel, setImageModel, generationMode, setGenerationMode, accentTheme = 'purple' }) => {
  // Force direct mode as default
  React.useEffect(() => {
    if (generationMode !== 'direct') setGenerationMode('direct');
  }, []);

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-xl font-semibold text-white/90 tracking-tight">Qualidade da imagem</h2>
        <p className="text-[13px] text-white/35 mt-1">Escolha o equilíbrio entre velocidade e qualidade visual.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Qualidade */}
        <button onClick={() => setImageModel('nano-banana')}
          className={`relative flex items-start gap-4 p-5 rounded-2xl text-left transition-all border ${
            imageModel === 'nano-banana'
              ? 'bg-white/[0.04] border-white/[0.12]'
              : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03]'
          }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            imageModel === 'nano-banana' ? 'bg-purple-500/15' : 'bg-white/[0.03]'
          }`}>
            <Sparkles className={`h-5 w-5 ${imageModel === 'nano-banana' ? 'text-purple-400' : 'text-white/20'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${imageModel === 'nano-banana' ? 'text-white/90' : 'text-white/60'}`}>Qualidade máxima</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300/70">recomendado</span>
            </div>
            <p className={`text-[11px] mt-1 leading-relaxed ${imageModel === 'nano-banana' ? 'text-white/40' : 'text-white/25'}`}>
              Modelo Pro com resolução alta e detalhes refinados. Ideal para publicação profissional em redes sociais.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-white/20">⏱ ~15s por imagem</span>
              <span className="text-[10px] text-purple-300/40">2 créditos</span>
            </div>
          </div>
          {imageModel === 'nano-banana' && (
            <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-purple-500/50 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-purple-300" />
            </div>
          )}
        </button>

        {/* Rápido */}
        <button onClick={() => setImageModel('gemini')}
          className={`relative flex items-start gap-4 p-5 rounded-2xl text-left transition-all border ${
            imageModel === 'gemini'
              ? 'bg-white/[0.04] border-white/[0.12]'
              : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03]'
          }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            imageModel === 'gemini' ? 'bg-emerald-500/15' : 'bg-white/[0.03]'
          }`}>
            <Zap className={`h-5 w-5 ${imageModel === 'gemini' ? 'text-emerald-400' : 'text-white/20'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-semibold ${imageModel === 'gemini' ? 'text-white/90' : 'text-white/60'}`}>Rápido</span>
            <p className={`text-[11px] mt-1 leading-relaxed ${imageModel === 'gemini' ? 'text-white/40' : 'text-white/25'}`}>
              Modelo Flash otimizado para velocidade. Bom para rascunhos, testes e iterações rápidas antes da versão final.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-white/20">⏱ ~5s por imagem</span>
              <span className="text-[10px] text-emerald-300/40">1 crédito</span>
            </div>
          </div>
          {imageModel === 'gemini' && (
            <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-emerald-500/50 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-300" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default StepSpeed;
