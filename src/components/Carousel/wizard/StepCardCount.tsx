import React from 'react';
import { User, Sparkles, Lock, Layers } from 'lucide-react';

interface Props {
  cardCount: number;
  setCardCount: (v: number) => void;
  contentMode: 'carousel' | 'single-post';
  setContentMode: (mode: 'carousel' | 'single-post') => void;
  hasFacePhotos?: boolean;
  faceCardCount?: number | null;
  setFaceCardCount?: (v: number | null) => void;
  wizardMode?: 'simple' | 'advanced' | 'extreme' | 'tweet' | 'tweet2' | 'animated';
  guestMode?: boolean;
  continuousMode?: boolean;
  setContinuousMode?: (v: boolean) => void;
  maxSlides?: number;
  allowContinuousMode?: boolean;
}

const StepCardCount: React.FC<Props> = ({ cardCount, setCardCount, contentMode, setContentMode, hasFacePhotos, faceCardCount, setFaceCardCount, wizardMode, guestMode, continuousMode, setContinuousMode, maxSlides = 10, allowContinuousMode = true }) => {
  const showFaceSelector = wizardMode === 'advanced' && hasFacePhotos && contentMode === 'carousel' && cardCount >= 2;
  const effectiveFaceCount = faceCardCount != null ? faceCardCount : cardCount;

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Qual formato você quer?</h2>
        <p className="text-sm text-white/40">Post único ou carrossel com até {maxSlides} slides.</p>
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
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-semibold ${contentMode === 'single-post' ? 'text-purple-300' : 'text-white/60'}`}>Post Único</p>
            <p className="text-xs text-white/30 mt-0.5">1 imagem · 1080×1350</p>
          </div>
          {guestMode && (
            <span className="px-2 py-0.5 rounded-md bg-green-500/15 text-green-400 text-[10px] font-bold border border-green-500/20">1 TESTE GRÁTIS</span>
          )}
        </div>
      </button>

      {/* Carousel option */}
      <div className="space-y-5">
        <button
          onClick={() => {
            if (guestMode) return;
            setContentMode('carousel');
            if (cardCount < 2) setCardCount(5);
          }}
          className={`w-full p-4 rounded-2xl text-left transition-all relative ${
            guestMode
              ? 'bg-white/[0.02] border border-white/[0.04] opacity-50 cursor-not-allowed'
              : contentMode === 'carousel'
              ? 'bg-purple-500/15 border-purple-500/40 border'
              : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${contentMode === 'carousel' && !guestMode ? 'text-purple-300' : 'text-white/60'}`}>Carrossel</p>
              <p className="text-xs text-white/30 mt-0.5">
                {guestMode ? 'Recurso PRO' : contentMode === 'carousel' && cardCount >= 2 ? `${cardCount} slides` : `2–${maxSlides} slides`}
              </p>
            </div>
            {guestMode && (
              <span className="px-2 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400 text-[10px] font-bold border border-yellow-500/20">PRO</span>
            )}
          </div>
        </button>

        {contentMode === 'carousel' && cardCount >= 2 && (
          <>
            <div className="flex items-center justify-center">
              <span className="text-5xl font-bold text-white tabular-nums">{cardCount}</span>
            </div>
            {continuousMode ? (
              <p className="text-center text-[11px] text-purple-300/60">Modo contínuo: fixo em 3 slides panorâmicos</p>
            ) : (
              <>
                <div className="px-2">
                  <input
                    type="range"
                    min={2}
                    max={maxSlides}
                    value={cardCount}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCardCount(v);
                      if (setFaceCardCount && faceCardCount != null && faceCardCount > v) {
                        setFaceCardCount(v);
                      }
                    }}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #7B50DC 0%, #9B6BFF ${((cardCount - 2) / (maxSlides - 2)) * 100}%, rgba(255,255,255,0.08) ${((cardCount - 2) / (maxSlides - 2)) * 100}%, rgba(255,255,255,0.08) 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-2 text-[10px] text-white/20 font-medium">
                    {Array.from({ length: Math.min(5, maxSlides - 1) }, (_, i) => {
                      const v = Math.round(2 + (i * (maxSlides - 2)) / Math.min(4, maxSlides - 2));
                      return <span key={i}>{v}</span>;
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {[2, 3, 5, 7, maxSlides].filter((n, i, arr) => arr.indexOf(n) === i && n <= maxSlides).map(n => (
                    <button key={n} onClick={() => {
                      setCardCount(n);
                      if (setFaceCardCount && faceCardCount != null && faceCardCount > n) {
                        setFaceCardCount(n);
                      }
                    }}
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
          </>
        )}

        {/* Continuous mode toggle (advanced only, carousel only) */}
        {wizardMode === 'advanced' && contentMode === 'carousel' && cardCount >= 2 && setContinuousMode && allowContinuousMode && (
          <button
            onClick={() => {
              const newVal = !continuousMode;
              setContinuousMode(newVal);
              // Force 3 cards max when enabling continuous mode
              if (newVal && cardCount > 3) {
                setCardCount(3);
              }
            }}
            className={`w-full p-4 rounded-2xl text-left transition-all border ${
              continuousMode
                ? 'bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border-purple-500/40'
                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl transition-colors ${continuousMode ? 'bg-purple-500/20' : 'bg-white/[0.06]'}`}>
                <Layers className={`h-4 w-4 ${continuousMode ? 'text-purple-400' : 'text-white/40'}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${continuousMode ? 'text-purple-300' : 'text-white/60'}`}>Carrossel Contínuo</p>
                <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed">
                  Arte panorâmica contínua dividida em 3 slides sem corte
                </p>
              </div>
              <div className={`w-10 h-5 rounded-full transition-all relative ${continuousMode ? 'bg-purple-500' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${continuousMode ? 'left-5' : 'left-0.5'}`} />
              </div>
            </div>
            {continuousMode && (
              <div className="mt-3 pt-3 flex items-start gap-2" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
                <Sparkles className="h-3.5 w-3.5 text-purple-400/60 mt-0.5 shrink-0" />
                <p className="text-[10px] text-white/25 leading-relaxed">
                  A IA gera uma composição panorâmica única e fatia automaticamente em 3 slides, com elementos visuais fluindo entre eles.
                </p>
              </div>
            )}
          </button>
        )}
      </div>

      {/* Face card count selector (advanced mode only, when faces are attached) */}
      {showFaceSelector && setFaceCardCount && (
        <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.05] space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-purple-400" />
            <p className="text-sm font-semibold text-white/80">Cards com rosto</p>
          </div>
          <p className="text-xs text-white/40">
            Quantos slides devem mostrar o rosto? O restante será preenchido com textos, efeitos e elementos visuais.
          </p>

          <div className="flex items-center justify-center gap-3">
            <User className="h-4 w-4 text-purple-400/60" />
            <span className="text-3xl font-bold text-purple-300 tabular-nums">{effectiveFaceCount}</span>
            <span className="text-sm text-white/30">de {cardCount}</span>
          </div>

          <div className="px-2">
            <input
              type="range"
              min={1}
              max={cardCount}
              value={effectiveFaceCount}
              onChange={(e) => setFaceCardCount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8B5CF6 0%, #A78BFA ${((effectiveFaceCount - 1) / Math.max(cardCount - 1, 1)) * 100}%, rgba(255,255,255,0.06) ${((effectiveFaceCount - 1) / Math.max(cardCount - 1, 1)) * 100}%, rgba(255,255,255,0.06) 100%)`,
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {Array.from({ length: cardCount }, (_, i) => i + 1).filter(n => n === 1 || n === Math.ceil(cardCount / 2) || n === cardCount).map(n => (
              <button key={n} onClick={() => setFaceCardCount(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  effectiveFaceCount === n
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
              <span>{effectiveFaceCount} com rosto</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <span>{cardCount - effectiveFaceCount} texto/efeitos</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepCardCount;
