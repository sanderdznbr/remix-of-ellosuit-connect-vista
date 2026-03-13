import React, { useState } from 'react';
import { Sparkles, Image, LayoutGrid, Zap, Gem, Loader2 } from 'lucide-react';
import type { ExtremeAnalysis } from './StepExtremeVision';

interface Props {
  analysis: ExtremeAnalysis;
  vision: string;
  formValues: Record<string, any>;
  contentMode: 'single-post' | 'carousel';
  setContentMode: (v: 'single-post' | 'carousel') => void;
  cardCount: number;
  setCardCount: (v: number) => void;
  speed: 'flash' | 'pro';
  setSpeed: (v: 'flash' | 'pro') => void;
  generating: boolean;
  onGenerate: () => void;
  hideGenerateButton?: boolean;
}

const StepExtremeResumo: React.FC<Props> = ({
  analysis,
  vision,
  formValues,
  contentMode,
  setContentMode,
  cardCount,
  setCardCount,
  speed,
  setSpeed,
  generating,
  onGenerate,
  hideGenerateButton,
}) => {
  const filledFields = analysis.fields.filter(f => {
    const v = formValues[f.id];
    if (Array.isArray(v)) return v.length > 0;
    return v && String(v).trim();
  });

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Tudo pronto para criar</h2>
        </div>
        <p className="text-sm text-white/40">
          Revise as configurações e clique para gerar sua criação única.
        </p>
      </div>

      {/* Vision summary */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] uppercase tracking-wider text-orange-400/60 font-semibold">Sua visão</span>
        <p className="text-sm text-white/60 mt-1 line-clamp-3">{vision}</p>
        {filledFields.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {filledFields.map(f => (
              <span key={f.id} className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] text-white/30 border border-white/[0.06]">
                {f.label}: {Array.isArray(formValues[f.id]) ? `${formValues[f.id].length} arquivo(s)` : String(formValues[f.id]).slice(0, 30)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Format selection */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/50">Formato</span>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'single-post' as const, icon: Image, label: 'Post Único', desc: '1 imagem estática' },
            { key: 'carousel' as const, icon: LayoutGrid, label: 'Carrossel', desc: 'Múltiplas imagens' },
          ].map(opt => {
            const Icon = opt.icon;
            const selected = contentMode === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  setContentMode(opt.key);
                  if (opt.key === 'single-post') setCardCount(1);
                  else if (cardCount <= 1) setCardCount(5);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  selected
                    ? 'bg-orange-500/[0.08] border-orange-500/40'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-6 h-6 ${selected ? 'text-orange-400' : 'text-white/25'}`} />
                <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-white/50'}`}>{opt.label}</span>
                <span className="text-[10px] text-white/25">{opt.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Card count for carousel */}
        {contentMode === 'carousel' && (
          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs text-white/40">Cards:</span>
            <div className="flex gap-1.5">
              {[3, 5, 7, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setCardCount(n)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${
                    cardCount === n
                      ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:bg-white/[0.06]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Speed selection */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/50">Velocidade</span>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'flash' as const, icon: Zap, label: 'ELLOIA Flash', desc: 'Rápido, boa qualidade' },
            { key: 'pro' as const, icon: Gem, label: 'ELLOIA Pro', desc: 'Mais detalhado, lento' },
          ].map(opt => {
            const Icon = opt.icon;
            const selected = speed === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSpeed(opt.key)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  selected
                    ? 'bg-orange-500/[0.08] border-orange-500/40'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-5 h-5 ${selected ? 'text-orange-400' : 'text-white/25'}`} />
                <div className="text-left">
                  <span className={`text-xs font-semibold block ${selected ? 'text-white' : 'text-white/50'}`}>{opt.label}</span>
                  <span className="text-[10px] text-white/25">{opt.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
        style={{
          background: generating
            ? 'rgba(255,255,255,0.04)'
            : 'linear-gradient(135deg, #f97316, #ea580c)',
          color: generating ? 'rgba(255,255,255,0.3)' : 'white',
        }}
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Gerar com IA Extreme</>
        )}
      </button>
    </div>
  );
};

export default StepExtremeResumo;
