import { useEffect, useState } from 'react';

interface Props {
  label: string;
  avgSeconds?: number;
  themeHex: string;
  compact?: boolean;
}

export const CleanRegenOverlay = ({ label, avgSeconds = 18, themeHex, compact = false }: Props) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed((Date.now() - start) / 1000), 200);
    return () => clearInterval(t);
  }, []);

  const progress = Math.min(0.97, elapsed / avgSeconds);
  const remaining = Math.max(1, Math.ceil(avgSeconds - elapsed));
  const overtime = elapsed > avgSeconds;

  const size = compact ? 'small' : 'large';
  const dotSize = compact ? 6 : 9;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md"
      style={{ backgroundColor: 'rgba(8,8,12,0.72)' }}
    >
      {/* Pulsing orb */}
      <div className="relative" style={{ width: compact ? 42 : 64, height: compact ? 42 : 64 }}>
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: themeHex, opacity: 0.25 }}
        />
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${themeHex}, ${themeHex}00)`,
            boxShadow: `0 0 24px ${themeHex}80`,
          }}
        />
      </div>

      <p
        className={`font-medium text-white/90 mt-4 tracking-wide ${compact ? 'text-[11px]' : 'text-sm'}`}
      >
        {label}
      </p>

      {/* Progress bar */}
      <div
        className="mt-3 rounded-full overflow-hidden"
        style={{
          width: compact ? 90 : 160,
          height: 3,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${themeHex}, ${themeHex}cc)`,
          }}
        />
      </div>

      <p className={`mt-2 text-white/40 ${compact ? 'text-[9px]' : 'text-[10px]'} tabular-nums`}>
        {overtime
          ? `finalizando...`
          : `~${remaining}s restantes`}
      </p>
    </div>
  );
};
