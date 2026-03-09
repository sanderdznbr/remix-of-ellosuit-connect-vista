import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Trash2, Plus, Check, Info, ArrowRight } from 'lucide-react';

interface LogoRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

interface Props {
  imageUrl: string;
  imageName: string;
  initialRegions: LogoRegion[];
  onSave: (regions: LogoRegion[]) => void;
  onClose: () => void;
  // Step mode (sequential flow)
  stepCurrent?: number;
  stepTotal?: number;
}

const LogoRegionEditor: React.FC<Props> = ({
  imageUrl, imageName, initialRegions, onSave, onClose,
  stepCurrent, stepTotal,
}) => {
  const isStepMode = stepCurrent !== undefined && stepTotal !== undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [regions, setRegions] = useState<LogoRegion[]>(initialRegions);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [drawBox, setDrawBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Reset when image changes
  useEffect(() => {
    setRegions(initialRegions);
    setSelectedId(null);
    setDrawBox(null);
    setImgLoaded(false);
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPercent = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  // ── Mouse ──
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.region) return;
    e.preventDefault();
    const pos = getPercent(e.clientX, e.clientY);
    if (!pos) return;
    isDrawingRef.current = true;
    dragStartRef.current = pos;
    setSelectedId(null);

    const handleMove = (ev: MouseEvent) => {
      const p = getPercent(ev.clientX, ev.clientY);
      if (!p || !dragStartRef.current) return;
      const s = dragStartRef.current;
      setDrawBox({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
    };
    const handleUp = () => {
      if (!isDrawingRef.current || !dragStartRef.current) return;
      isDrawingRef.current = false;
      setDrawBox(prev => {
        if (prev && prev.w > 2 && prev.h > 2) {
          setRegions(rs => [...rs, {
            id: crypto.randomUUID(),
            x: prev.x, y: prev.y,
            width: prev.w, height: prev.h,
          }]);
        }
        return null;
      });
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  // ── Touch ──
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.region) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const pos = getPercent(touch.clientX, touch.clientY);
    if (!pos) return;
    isDrawingRef.current = true;
    dragStartRef.current = pos;
    setSelectedId(null);

    const handleTouchMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const t = ev.touches[0];
      if (!t || !dragStartRef.current) return;
      const p = getPercent(t.clientX, t.clientY);
      if (!p) return;
      const s = dragStartRef.current;
      setDrawBox({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
    };
    const handleTouchEnd = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      setDrawBox(prev => {
        if (prev && prev.w > 2 && prev.h > 2) {
          setRegions(rs => [...rs, {
            id: crypto.randomUUID(),
            x: prev.x, y: prev.y,
            width: prev.w, height: prev.h,
          }]);
        }
        return null;
      });
      dragStartRef.current = null;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  };

  const deleteRegion = (id: string) => {
    setRegions(rs => rs.filter(r => r.id !== id));
    setSelectedId(null);
  };

  const clearAll = () => {
    setRegions([]);
    setSelectedId(null);
  };

  const handleConfirm = () => {
    onSave(regions);
    onClose();
  };

  const isLast = isStepMode && stepCurrent === stepTotal;
  const confirmLabel = isStepMode
    ? (isLast ? 'Concluir' : 'Próximo')
    : 'Confirmar seleções';

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 p-4">

      {/* Header */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          {isStepMode ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'rgba(123,80,220,0.15)', color: '#a78bfa' }}>
                {stepCurrent} / {stepTotal}
              </div>
              {/* Step dots */}
              <div className="flex items-center gap-1">
                {Array.from({ length: stepTotal! }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all"
                    style={{
                      width: i + 1 === stepCurrent ? '16px' : '6px',
                      height: '6px',
                      backgroundColor: i + 1 < stepCurrent!
                        ? '#10b981'
                        : i + 1 === stepCurrent
                        ? '#7B50DC'
                        : 'rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              {regions.length} área{regions.length !== 1 ? 's' : ''} selecionada{regions.length !== 1 ? 's' : ''}
            </div>
          )}
          <span className="text-xs max-w-[200px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {imageName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {regions.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}
              title="Limpar todas as seleções"
            >
              <Trash2 className="w-3 h-3" /> Limpar
            </button>
          )}
          {!isStepMode && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tip bar */}
      <div className="w-full max-w-3xl mb-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'rgba(123,80,220,0.08)', border: '1px solid rgba(123,80,220,0.15)' }}>
          <Info className="w-3.5 h-3.5 shrink-0 text-purple-400" />
          <span className="text-xs text-purple-400/80">
            <strong className="text-purple-400">Arraste</strong> na imagem para marcar a área com logo ·{' '}
            <strong className="text-purple-400">Clique</strong> numa caixa selecionada para remover ·{' '}
            {isStepMode
              ? <><strong className="text-purple-400">Pule</strong> se não houver logo nesta imagem</>
              : <><strong className="text-purple-400">Dois cliques</strong> numa caixa para deletar</>
            }
          </span>
        </div>
      </div>

      {/* Image + regions */}
      <div
        ref={containerRef}
        className="relative inline-block select-none shrink-0"
        style={{
          maxWidth: '100%',
          cursor: 'crosshair',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Selecionar área"
          className="block rounded-xl"
          style={{ maxWidth: '80vw', maxHeight: '60vh', objectFit: 'contain', pointerEvents: 'none' }}
          draggable={false}
          onLoad={() => setImgLoaded(true)}
        />

        {imgLoaded && regions.map(r => {
          const isSelected = selectedId === r.id;
          return (
            <div
              key={r.id}
              data-region="1"
              className="absolute transition-all"
              style={{
                left: `${r.x}%`, top: `${r.y}%`,
                width: `${r.width}%`, height: `${r.height}%`,
                border: `2px solid ${isSelected ? '#f59e0b' : '#ef4444'}`,
                backgroundColor: isSelected ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.18)',
                cursor: 'pointer',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isSelected) {
                  deleteRegion(r.id);
                } else {
                  setSelectedId(r.id);
                }
              }}
            >
              {/* Delete X when selected */}
              {isSelected && (
                <button
                  data-region="1"
                  className="absolute -top-3 -right-3 w-5 h-5 rounded-full flex items-center justify-center z-20 cursor-pointer"
                  style={{ backgroundColor: '#f59e0b', color: '#000' }}
                  onMouseDown={(e) => { e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); deleteRegion(r.id); }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Drawing preview */}
        {drawBox && drawBox.w > 0 && drawBox.h > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${drawBox.x}%`, top: `${drawBox.y}%`,
              width: `${drawBox.w}%`, height: `${drawBox.h}%`,
              border: '2px dashed #7B50DC',
              backgroundColor: 'rgba(123,80,220,0.18)',
              zIndex: 20,
            }}
          >
            <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px]"
              style={{ backgroundColor: 'rgba(123,80,220,0.8)', color: '#fff' }}>
              <Plus className="w-2 h-2" /> Nova área
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full max-w-3xl flex items-center justify-between mt-4 shrink-0 gap-3">
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {regions.length === 0
            ? isStepMode ? 'Nenhuma área — clique em Pular se não houver logo' : 'Nenhuma área selecionada'
            : `${regions.length} área${regions.length !== 1 ? 's' : ''} será${regions.length !== 1 ? 'ão' : ''} removida${regions.length !== 1 ? 's' : ''}`
          }
        </p>

        <div className="flex items-center gap-2">
          {isStepMode ? (
            <>
              <button
                onClick={() => { onSave([]); onClose(); }}
                className="px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                Pular
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{ backgroundColor: '#7B50DC', color: '#fff' }}
              >
                {isLast ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                {confirmLabel}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{ backgroundColor: '#7B50DC', color: '#fff' }}
              >
                <Check className="w-4 h-4" />
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoRegionEditor;
