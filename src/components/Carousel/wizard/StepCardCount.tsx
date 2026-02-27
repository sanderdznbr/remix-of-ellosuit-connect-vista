import React from 'react';

interface Props {
  cardCount: number;
  setCardCount: (v: number) => void;
}

const StepCardCount: React.FC<Props> = ({ cardCount, setCardCount }) => {
  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Qual formato você quer?</h2>
        <p className="text-sm text-white/40">Post único ou carrossel com até 20 slides.</p>
      </div>

      {/* Single post option */}
      <button
        onClick={() => setCardCount(1)}
        className={`w-full p-4 rounded-2xl text-left transition-all ${
          cardCount === 1
            ? 'bg-purple-500/15 border-purple-500/40 border'
            : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
        }`}
      >
        <p className={`text-sm font-semibold ${cardCount === 1 ? 'text-purple-300' : 'text-white/60'}`}>Post Único</p>
        <p className="text-xs text-white/30 mt-0.5">1 imagem · 1080×1350</p>
      </button>

      {/* Carousel slider */}
      <div className="space-y-5">
        <button
          onClick={() => { if (cardCount < 5) setCardCount(7); }}
          className={`w-full p-4 rounded-2xl text-left transition-all ${
            cardCount >= 5
              ? 'bg-purple-500/15 border-purple-500/40 border'
              : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
          }`}
        >
          <p className={`text-sm font-semibold ${cardCount >= 5 ? 'text-purple-300' : 'text-white/60'}`}>Carrossel</p>
          <p className="text-xs text-white/30 mt-0.5">{cardCount >= 5 ? `${cardCount} slides` : '5–20 slides'}</p>
        </button>

        {cardCount >= 5 && (
          <>
            <div className="flex items-center justify-center">
              <span className="text-5xl font-bold text-white tabular-nums">{cardCount}</span>
            </div>
            <div className="px-2">
              <input
                type="range"
                min={5}
                max={20}
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #7B50DC 0%, #9B6BFF ${((cardCount - 5) / 15) * 100}%, rgba(255,255,255,0.08) ${((cardCount - 5) / 15) * 100}%, rgba(255,255,255,0.08) 100%)`,
                }}
              />
              <div className="flex justify-between mt-2 text-[10px] text-white/20 font-medium">
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              {[5, 7, 10, 12, 15, 20].map(n => (
                <button key={n} onClick={() => setCardCount(n)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    cardCount === n
                      ? 'bg-white text-black'
                      : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StepCardCount;
