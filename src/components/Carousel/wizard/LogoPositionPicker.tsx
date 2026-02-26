import React from 'react';
import { LogoPosition } from './StepStyle';

interface Props {
  logoPosition: LogoPosition;
  setLogoPosition: (v: LogoPosition) => void;
}

const POSITIONS: { key: LogoPosition; row: number; col: number }[] = [
  { key: 'top-left', row: 0, col: 0 },
  { key: 'top-center', row: 0, col: 1 },
  { key: 'top-right', row: 0, col: 2 },
  { key: 'middle-left', row: 1, col: 0 },
  // no middle-center
  { key: 'middle-right', row: 1, col: 2 },
  { key: 'bottom-left', row: 2, col: 0 },
  { key: 'bottom-center', row: 2, col: 1 },
  { key: 'bottom-right', row: 2, col: 2 },
];

const LogoPositionPicker: React.FC<Props> = ({ logoPosition, setLogoPosition }) => {
  return (
    <div>
      <p className="text-[10px] font-medium text-white/30 mb-2">Posição do logo</p>
      <div
        className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden"
        style={{ width: 180, height: 225, aspectRatio: '1080/1350' }}
      >
        {/* Grid of 3x3 with center excluded */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0 p-2">
          {[0, 1, 2].map(row =>
            [0, 1, 2].map(col => {
              if (row === 1 && col === 1) {
                // Center cell — just a subtle card icon
                return (
                  <div key="center" className="flex items-center justify-center">
                    <div className="w-6 h-7 rounded border border-white/[0.06] bg-white/[0.02]" />
                  </div>
                );
              }
              const pos = POSITIONS.find(p => p.row === row && p.col === col)!;
              const isActive = logoPosition === pos.key;
              return (
                <button
                  key={pos.key}
                  onClick={() => setLogoPosition(pos.key)}
                  className="flex items-center justify-center cursor-pointer group transition-all"
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                      isActive
                        ? 'border-purple-500 bg-purple-500 scale-110 shadow-[0_0_10px_rgba(123,80,220,0.4)]'
                        : 'border-white/15 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08] group-hover:scale-105'
                    }`}
                  >
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Decorative lines connecting the grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.06 }}>
          {/* Horizontal */}
          <line x1="30" y1="37" x2="150" y2="37" stroke="white" strokeWidth="1" />
          <line x1="30" y1="112" x2="150" y2="112" stroke="white" strokeWidth="1" />
          <line x1="30" y1="187" x2="150" y2="187" stroke="white" strokeWidth="1" />
          {/* Vertical */}
          <line x1="30" y1="37" x2="30" y2="187" stroke="white" strokeWidth="1" />
          <line x1="90" y1="37" x2="90" y2="187" stroke="white" strokeWidth="1" />
          <line x1="150" y1="37" x2="150" y2="187" stroke="white" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
};

export default LogoPositionPicker;
