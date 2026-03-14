import React from 'react';
import { Zap, Sparkles } from 'lucide-react';

interface Props {
  imageModel: 'gemini' | 'nano-banana';
  setImageModel: (v: 'gemini' | 'nano-banana') => void;
  accentTheme?: 'purple' | 'red' | 'orange';
}

const themeClasses = {
  purple: { bg: 'bg-purple-500/[0.08]', border: 'border-purple-500/40', iconBg: 'bg-purple-500/20', icon: 'text-purple-400' },
  red: { bg: 'bg-red-500/[0.08]', border: 'border-red-500/40', iconBg: 'bg-red-500/20', icon: 'text-red-400' },
  orange: { bg: 'bg-orange-500/[0.08]', border: 'border-orange-500/40', iconBg: 'bg-orange-500/20', icon: 'text-orange-400' },
};

const StepSpeed: React.FC<Props> = ({ imageModel, setImageModel, accentTheme = 'purple' }) => {
  const t = themeClasses[accentTheme];
  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Velocidade de geração</h2>
        <p className="text-sm text-white/40">Escolha entre rapidez ou qualidade máxima nas imagens.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button onClick={() => setImageModel('nano-banana')}
          className={`flex items-center gap-4 p-5 rounded-2xl text-left transition-all border ${
            imageModel === 'nano-banana'
              ? `${t.bg} ${t.border}`
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
          }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            imageModel === 'nano-banana' ? t.iconBg : 'bg-white/[0.04]'
          }`}>
            <Sparkles className={`h-6 w-6 ${imageModel === 'nano-banana' ? t.icon : 'text-white/30'}`} />
          </div>
          <div>
            <span className="text-base font-semibold text-white/90 block">Qualidade</span>
            <span className="text-xs text-white/40 block mt-0.5">ELLOIA Pro · ~15s por imagem</span>
            <span className="text-[10px] text-white/25 block mt-0.5">Melhor resultado visual para publicação</span>
          </div>
        </button>

        <button onClick={() => setImageModel('gemini')}
          className={`flex items-center gap-4 p-5 rounded-2xl text-left transition-all border ${
            imageModel === 'gemini'
              ? 'bg-emerald-500/[0.08] border-emerald-500/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
          }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            imageModel === 'gemini' ? 'bg-emerald-500/20' : 'bg-white/[0.04]'
          }`}>
            <Zap className={`h-6 w-6 ${imageModel === 'gemini' ? 'text-emerald-400' : 'text-white/30'}`} />
          </div>
          <div>
            <span className="text-base font-semibold text-white/90 block">Rápido</span>
            <span className="text-xs text-white/40 block mt-0.5">ELLOIA Flash · ~5s por imagem</span>
            <span className="text-[10px] text-white/25 block mt-0.5">Ideal para testes e iterações rápidas</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default StepSpeed;
