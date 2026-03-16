import React from 'react';

interface Props {
  webFacePosition: 'cover' | 'last' | 'none';
  setWebFacePosition: (v: 'cover' | 'last' | 'none') => void;
}

const OPTIONS = [
  { value: 'cover' as const, label: '📸 Na Capa', desc: 'Primeiro card' },
  { value: 'last' as const, label: '🎬 No Último', desc: 'Card final (CTA)' },
  { value: 'none' as const, label: '❌ Nenhum', desc: 'Só fotos da web' },
];

const StepFacePosition: React.FC<Props> = ({ webFacePosition, setWebFacePosition }) => {
  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Onde usar seu rosto?</h2>
        <p className="text-sm text-white/40">
          As fotos reais do tema serão usadas nos cards. Escolha onde aplicar seu rosto — a IA recriará um corpo para combinar com o post.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setWebFacePosition(opt.value)}
            className="p-5 rounded-xl text-left transition-all border"
            style={{
              backgroundColor: webFacePosition === opt.value ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
              borderColor: webFacePosition === opt.value ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.06)',
            }}
          >
            <span className="text-lg font-semibold block" style={{
              color: webFacePosition === opt.value ? '#93C5FD' : 'rgba(255,255,255,0.6)',
            }}>
              {opt.label}
            </span>
            <span className="text-xs block mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepFacePosition;
