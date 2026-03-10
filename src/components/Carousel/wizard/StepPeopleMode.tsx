import React from 'react';
import { UserX, User } from 'lucide-react';
import { PeopleMode } from './StepVisualStyle';

interface Props {
  peopleMode: PeopleMode;
  setPeopleMode: (mode: PeopleMode) => void;
  randomFaceCount: number | null;
  setRandomFaceCount: (v: number | null) => void;
  cardCount: number;
}

const PEOPLE_OPTIONS: { value: PeopleMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'none', label: 'Sem pessoas', icon: <UserX className="h-5 w-5" />, desc: 'Apenas elementos visuais, sem rostos' },
  { value: 'random-female', label: 'Mulher aleatória', icon: <User className="h-5 w-5" />, desc: 'Rosto feminino gerado pela IA' },
  { value: 'random-male', label: 'Homem aleatório', icon: <User className="h-5 w-5" />, desc: 'Rosto masculino gerado pela IA' },
  { value: 'random-auto', label: 'Pessoa aleatória', icon: <User className="h-5 w-5" />, desc: 'A IA escolhe o gênero' },
];

const StepPeopleMode: React.FC<Props> = ({
  peopleMode, setPeopleMode,
  randomFaceCount, setRandomFaceCount,
  cardCount,
}) => {
  const effectiveRandomFaceCount = randomFaceCount != null ? randomFaceCount : cardCount;
  const showRandomFaceCount = peopleMode !== 'none' && cardCount >= 2;

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Pessoas na imagem</h2>
        <p className="text-sm text-white/40">Deseja incluir pessoas nos posts? Escolha o tipo.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PEOPLE_OPTIONS.map(opt => {
          const isSelected = peopleMode === opt.value;
          return (
            <button key={opt.value} onClick={() => setPeopleMode(opt.value)}
              className={`p-4 rounded-xl text-left transition-all border ${
                isSelected
                  ? 'bg-purple-500/15 border-purple-500/40 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
              }`}>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className={isSelected ? 'text-purple-400' : 'text-white/40'}>{opt.icon}</span>
                <span className={`text-sm font-semibold ${isSelected ? 'text-purple-300' : 'text-white/60'}`}>{opt.label}</span>
              </div>
              <span className="text-[11px] text-white/30 leading-tight">{opt.desc}</span>
            </button>
          );
        })}
      </div>

      {showRandomFaceCount && (
        <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.05] space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-purple-400" />
            <p className="text-sm font-semibold text-white/80">Cards com pessoa</p>
          </div>
          <p className="text-xs text-white/40">
            Quantos slides devem mostrar uma pessoa? O restante terá apenas elementos visuais.
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-bold text-purple-300 tabular-nums">{effectiveRandomFaceCount}</span>
            <span className="text-sm text-white/30">de {cardCount}</span>
          </div>
          <div className="px-2">
            <input
              type="range"
              min={1}
              max={cardCount}
              value={effectiveRandomFaceCount}
              onChange={(e) => setRandomFaceCount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8B5CF6 0%, #A78BFA ${((effectiveRandomFaceCount - 1) / Math.max(cardCount - 1, 1)) * 100}%, rgba(255,255,255,0.06) ${((effectiveRandomFaceCount - 1) / Math.max(cardCount - 1, 1)) * 100}%, rgba(255,255,255,0.06) 100%)`,
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[1, Math.ceil(cardCount / 2), cardCount].filter((v, i, a) => a.indexOf(v) === i).map(n => (
              <button key={n} onClick={() => setRandomFaceCount(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  effectiveRandomFaceCount === n
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                    : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
                }`}>
                {n === cardCount ? `Todos (${n})` : n}
              </button>
            ))}
          </div>
          <div className="flex gap-3 text-[10px] text-white/30">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500/60" />
              <span>{effectiveRandomFaceCount} com pessoa</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <span>{cardCount - effectiveRandomFaceCount} sem pessoa</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepPeopleMode;
