import React from 'react';
import { Zap, SlidersHorizontal } from 'lucide-react';

interface Props {
  wizardMode: 'simple' | 'advanced';
  setWizardMode: (v: 'simple' | 'advanced') => void;
}

const StepMode: React.FC<Props> = ({ wizardMode, setWizardMode }) => {
  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Como você quer criar?</h2>
        <p className="text-sm text-white/40">Escolha o nível de controle sobre a geração.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => setWizardMode('simple')}
          className={`flex items-center gap-4 p-5 rounded-2xl text-left transition-all border ${
            wizardMode === 'simple'
              ? 'bg-purple-500/[0.08] border-purple-500/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            wizardMode === 'simple' ? 'bg-purple-500/20' : 'bg-white/[0.04]'
          }`}>
            <Zap className={`h-6 w-6 ${wizardMode === 'simple' ? 'text-purple-400' : 'text-white/30'}`} />
          </div>
          <div>
            <span className="text-base font-semibold text-white/90 block">Simples</span>
            <span className="text-xs text-white/40 block mt-0.5">6 etapas · Rápido e direto</span>
            <span className="text-[10px] text-white/25 block mt-0.5">Ideal para quem quer resultados rápidos</span>
          </div>
        </button>

        <button
          onClick={() => setWizardMode('advanced')}
          className={`flex items-center gap-4 p-5 rounded-2xl text-left transition-all border ${
            wizardMode === 'advanced'
              ? 'bg-purple-500/[0.08] border-purple-500/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            wizardMode === 'advanced' ? 'bg-purple-500/20' : 'bg-white/[0.04]'
          }`}>
            <SlidersHorizontal className={`h-6 w-6 ${wizardMode === 'advanced' ? 'text-purple-400' : 'text-white/30'}`} />
          </div>
          <div>
            <span className="text-base font-semibold text-white/90 block">Avancado</span>
            <span className="text-xs text-white/40 block mt-0.5">12 etapas · Controle total</span>
            <span className="text-[10px] text-white/25 block mt-0.5">Cores, fontes, roteiro, produto e mais</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default StepMode;
