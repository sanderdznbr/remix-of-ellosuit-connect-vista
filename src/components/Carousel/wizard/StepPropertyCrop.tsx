import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Crop, ChevronLeft, ChevronRight, Check, Move } from 'lucide-react';
import { PropertyData } from './StepProperty';

interface StepPropertyCropProps {
  properties: PropertyData[];
  setProperties: React.Dispatch<React.SetStateAction<PropertyData[]>>;
}

const TARGET_RATIO = 1080 / 1350; // 0.8 — portrait

const StepPropertyCrop: React.FC<StepPropertyCropProps> = ({ properties, setProperties }) => {
  // Collect all photos across properties with their indices
  const allPhotos = properties.flatMap((prop, pi) =>
    prop.photos.map((photo, phi) => ({ propIdx: pi, photoIdx: phi, photo, propId: prop.id }))
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const current = allPhotos[currentIdx];

  if (allPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/40">
        <Crop className="w-8 h-8 mb-2" />
        <p className="text-sm">Nenhuma foto para ajustar</p>
        <p className="text-xs mt-1">Volte e adicione fotos do imóvel</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Crop className="w-5 h-5 text-white/50" />
        <div>
          <h3 className="text-sm font-semibold text-white">Ajustar Enquadramento</h3>
          <p className="text-[10px] text-white/30">
            Arraste a foto para posicionar. Foto {currentIdx + 1} de {allPhotos.length}
          </p>
        </div>
      </div>

      <CropEditor
        key={`${current.propId}-${current.photoIdx}`}
        photo={current.photo}
        onChange={(offsetY) => {
          setProperties(prev => prev.map((p, pi) => {
            if (pi !== current.propIdx) return p;
            return {
              ...p,
              photos: p.photos.map((ph, phi) =>
                phi === current.photoIdx ? { ...ph, cropOffsetY: offsetY } : ph
              ),
            };
          }));
        }}
      />

      {/* Navigation */}
      {allPhotos.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="p-2 rounded-lg bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {allPhotos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === currentIdx ? 'bg-purple-400 scale-125' : 'bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIdx(i => Math.min(allPhotos.length - 1, i + 1))}
            disabled={currentIdx === allPhotos.length - 1}
            className="p-2 rounded-lg bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// ========== CROP EDITOR (drag to reposition) ==========
interface CropEditorProps {
  photo: { url: string; cropOffsetY?: number; focalPoint?: string };
  onChange: (offsetY: number) => void;
}

const CropEditor: React.FC<CropEditorProps> = ({ photo, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [offset, setOffset] = useState(photo.cropOffsetY ?? 0.5);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ pos: 0, startOffset: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = photo.url;
  }, [photo.url]);

  // Auto-set initial offset based on focal point
  useEffect(() => {
    if (photo.cropOffsetY !== undefined) {
      setOffset(photo.cropOffsetY);
    } else if (photo.focalPoint === 'top') {
      setOffset(0);
    } else if (photo.focalPoint === 'bottom') {
      setOffset(1);
    } else {
      setOffset(0.5);
    }
  }, [photo.focalPoint, photo.cropOffsetY]);

  const FRAME_W = 320;
  const FRAME_H = FRAME_W / TARGET_RATIO; // ~400px

  // Use "cover" mode: scale so the image fully covers the frame
  const imgRatio = imgSize.w / (imgSize.h || 1);
  const frameRatio = FRAME_W / FRAME_H;

  // If image is wider relative to frame → fit height, pan horizontally
  // If image is taller relative to frame → fit width, pan vertically
  const isHorizontalPan = imgRatio > frameRatio;

  let displayW: number, displayH: number;
  if (isHorizontalPan) {
    // Fit height, image wider than frame
    displayH = FRAME_H;
    displayW = imgRatio * FRAME_H;
  } else {
    // Fit width, image taller than frame
    displayW = FRAME_W;
    displayH = FRAME_W / imgRatio;
  }

  const maxPan = isHorizontalPan
    ? Math.max(0, displayW - FRAME_W)
    : Math.max(0, displayH - FRAME_H);

  const currentPan = offset * maxPan;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    const pos = isHorizontalPan ? e.clientX : e.clientY;
    dragStartRef.current = { pos, startOffset: offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset, isHorizontalPan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const pos = isHorizontalPan ? e.clientX : e.clientY;
    const delta = pos - dragStartRef.current.pos;
    // Moving pointer in positive direction → image moves that way → offset decreases
    const newOffset = Math.max(0, Math.min(1, dragStartRef.current.startOffset - delta / (maxPan || 1)));
    setOffset(newOffset);
  }, [dragging, maxPan, isHorizontalPan]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const pos = isHorizontalPan ? e.clientX : e.clientY;
    const delta = pos - dragStartRef.current.pos;
    const newOffset = Math.max(0, Math.min(1, dragStartRef.current.startOffset - delta / (maxPan || 1)));
    setOffset(newOffset);
    onChange(newOffset);
  }, [dragging, maxPan, onChange, isHorizontalPan]);

  // If no overflow at all, auto-confirm
  useEffect(() => {
    if (imgSize.w && maxPan === 0) {
      onChange(0.5);
    }
  }, [imgSize.w, maxPan]);

  if (!imgSize.w) {
    return <div className="flex items-center justify-center" style={{ width: FRAME_W, height: FRAME_H }}>
      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>;
  }

  const imgStyle: React.CSSProperties = {
    width: displayW,
    height: displayH,
    position: 'absolute' as const,
    ...(isHorizontalPan
      ? { top: 0, left: -currentPan }
      : { left: 0, top: -currentPan }),
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border-2 border-purple-500/40 mx-auto touch-none"
        style={{ width: FRAME_W, height: FRAME_H, cursor: maxPan > 0 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        onPointerDown={maxPan > 0 ? handlePointerDown : undefined}
        onPointerMove={maxPan > 0 ? handlePointerMove : undefined}
        onPointerUp={maxPan > 0 ? handlePointerUp : undefined}
        onPointerCancel={maxPan > 0 ? handlePointerUp : undefined}
      >
        <img
          src={photo.url}
          alt=""
          draggable={false}
          className="select-none pointer-events-none"
          style={imgStyle}
        />
        {/* Overlay guides */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 right-0 border-t border-white/10" style={{ top: '33.33%' }} />
          <div className="absolute left-0 right-0 border-t border-white/10" style={{ top: '66.66%' }} />
          <div className="absolute top-0 bottom-0 border-l border-white/10" style={{ left: '33.33%' }} />
          <div className="absolute top-0 bottom-0 border-l border-white/10" style={{ left: '66.66%' }} />
        </div>
        {/* Drag hint */}
        {maxPan > 0 && !dragging && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 text-white/70 text-[10px]">
            <Move className="w-3 h-3" /> {isHorizontalPan ? 'Arraste ↔ para ajustar' : 'Arraste ↕ para ajustar'}
          </div>
        )}
        {maxPan === 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-600/70 text-white text-[10px]">
            <Check className="w-3 h-3" /> Enquadramento perfeito
          </div>
        )}
        {/* Corner marks */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-purple-400/60 rounded-tl" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-purple-400/60 rounded-tr" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-purple-400/60 rounded-bl" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-purple-400/60 rounded-br" />
      </div>

      {/* Info */}
      <div className="flex items-center gap-4 text-[10px] text-white/30">
        <span>1080 × 1350px</span>
        <span>•</span>
        <span>4:5 Instagram</span>
        {maxPan > 0 && (
          <>
            <span>•</span>
            <span className="text-purple-400/60">Posição: {Math.round(offset * 100)}%</span>
          </>
        )}
      </div>
    </div>
  );
};

export default StepPropertyCrop;
