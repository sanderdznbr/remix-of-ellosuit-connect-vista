import React from 'react';
import { Lightbulb } from 'lucide-react';

interface Props {
  visualIdea: string;
  setVisualIdea: (v: string) => void;
}

const StepVisualIdea: React.FC<Props> = ({ visualIdea, setVisualIdea }) => {
  return (
    <div className="space-y-4" style={{ minHeight: '260px' }}>
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Ideia Visual</h2>
        <p className="text-sm text-white/40">
          Descreva como você imagina o post. A IA vai tentar seguir sua visão.
        </p>
      </div>

      <div className="relative">
        <textarea
          value={visualIdea}
          onChange={(e) => setVisualIdea(e.target.value)}
          placeholder="Ex: Quero um post com fundo escuro, tipografia grande e moderna, com uma foto de produto centralizada e efeito de luz neon azul ao redor..."
          rows={6}
          className="w-full bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-4 py-3 rounded-xl outline-none focus:border-red-500/30 transition-colors resize-none"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-white/20">
          <Lightbulb className="h-3.5 w-3.5" />
          <span className="text-[10px]">Opcional</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] text-white/25 uppercase tracking-wider">Dicas</p>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            'Descreva cores, estilo e atmosfera',
            'Mencione referências visuais (ex: estilo Apple, Nubank)',
            'Indique composição e posicionamento de elementos',
          ].map((tip, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-white/30">
              <div className="w-1 h-1 rounded-full bg-red-500/40 flex-shrink-0" />
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StepVisualIdea;
