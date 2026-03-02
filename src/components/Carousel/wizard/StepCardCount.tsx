import React from 'react';

interface Props {
  cardCount: number;
  setCardCount: (v: number) => void;
  contentMode: 'carousel' | 'single-post';
  setContentMode: (mode: 'carousel' | 'single-post') => void;
}

const StepCardCount: React.FC<Props> = ({ cardCount, setCardCount, contentMode, setContentMode }) => {
  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Qual formato você quer?</h2>
        <p className="text-sm text-white/40">Post único ou carrossel com até 10 slides.</p>
      </div>

      {/* Single post option */}
      <button
        onClick={() => {
          setContentMode('single-post');
          setCardCount(1);
        }}
        className={`w-full p-4 rounded-2xl text-left transition-all ${
          contentMode === 'single-post'
            ? 'bg-purple-500/15 border-purple-500/40 border'
            : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
        }`}
      >
        <p className={`text-sm font-semibold ${contentMode === 'single-post' ? 'text-purple-300' : 'text-white/60'}`}>Post Único</p>
        <p className="text-xs text-white/30 mt-0.5">1 imagem · 1080×1350</p>
      </button>

      {/* Carousel option */}
      <div className="space-y-5">
        <button
          onClick={() => {
            setContentMode('carousel');
            if (cardCount < 2) setCardCount(5);
          }}
          className={`w-full p-4 rounded-2xl text-left transition-all ${
            contentMode === 'carousel'
              ? 'bg-purple-500/15 border-purple-500/40 border'
              : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
          }`}
        >
          <p className={`text-sm font-semibold ${contentMode === 'carousel' ? 'text-purple-300' : 'text-white/60'}`}>Carrossel</p>
        <p className="text-xs text-white/30 mt-0.5">{contentMode === 'carousel' && cardCount >= 2 ? `${cardCount} slides` : '2–10 slides'}</p>
        </button>

        {contentMode === 'carousel' && cardCount >= 2 && (
          <>
            <div className="flex items-center justify-center">
              <span className="text-5xl font-bold text-white tabular-nums">{cardCount}</span>
            </div>
            <div className="px-2">
              <input
                type="range"
                min={2}
                max={10}
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #7B50DC 0%, #9B6BFF ${((cardCount - 2) / 8) * 100}%, rgba(255,255,255,0.08) ${((cardCount - 2) / 8) * 100}%, rgba(255,255,255,0.08) 100%)`,
                }}
              />
              <div className="flex justify-between mt-2 text-[10px] text-white/20 font-medium">
                <span>2</span>
                <span>4</span>
                <span>6</span>
                <span>8</span>
                <span>10</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              {[2, 3, 5, 7, 10].map(n => (
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
