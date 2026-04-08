import React from 'react';
import { Sparkles, Zap, Type, Film, Flame, Heart } from 'lucide-react';

export type AnimationStyleType = 'slide-fade' | 'scale-bounce' | 'typewriter' | 'cinematic' | 'kinetic' | 'elegant';

interface Props {
  selected: AnimationStyleType;
  onChange: (style: AnimationStyleType) => void;
}

const styles: { key: AnimationStyleType; icon: any; label: string; desc: string }[] = [
  { key: 'slide-fade', icon: Sparkles, label: 'Slide & Fade', desc: 'Elementos surgem de várias direções com fade suave' },
  { key: 'scale-bounce', icon: Zap, label: 'Scale & Bounce', desc: 'Elementos crescem com efeito elástico' },
  { key: 'typewriter', icon: Type, label: 'Typewriter', desc: 'Texto aparece letra por letra como máquina de escrever' },
  { key: 'cinematic', icon: Film, label: 'Cinematic', desc: 'Revelações lentas e dramáticas com profundidade' },
  { key: 'kinetic', icon: Flame, label: 'Kinetic', desc: 'Movimentos rápidos e energéticos' },
  { key: 'elegant', icon: Heart, label: 'Elegant', desc: 'Transições suaves e refinadas' },
];

const StepAnimationStyle: React.FC<Props> = ({ selected, onChange }) => {
  return (
    <div className="space-y-4" style={{ minHeight: '200px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Estilo de animação</h2>
        <p className="text-sm text-white/40">Escolha como os elementos vão se mover em cada card.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {styles.map((s) => {
          const Icon = s.icon;
          const isSelected = selected === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onChange(s.key)}
              className={`flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all border ${
                isSelected
                  ? 'bg-purple-500/[0.08] border-purple-500/40'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isSelected ? 'bg-purple-500/20' : 'bg-white/[0.04]'
              }`}>
                <Icon className={`h-5 w-5 ${isSelected ? 'text-purple-400' : 'text-white/30'}`} />
              </div>
              <div>
                <span className="text-sm font-semibold text-white/90 block">{s.label}</span>
                <span className="text-[10px] text-white/30 block mt-0.5">{s.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StepAnimationStyle;
