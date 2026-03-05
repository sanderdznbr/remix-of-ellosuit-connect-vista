import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Pencil, Loader2, Send, Undo2 } from 'lucide-react';

interface Props {
  imageUrl: string;
  onClose: () => void;
  onImageEdited: (newImageUrl: string) => void;
  editFn: (originalUrl: string, maskDataUrl: string, prompt: string) => Promise<string>;
}

const ImageInpaintEditor: React.FC<Props> = ({ imageUrl, onClose, onImageEdited, editFn }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const rectsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const currentRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setImgLoaded(false);
    setHasDrawn(false);
    setEditPrompt('');
    rectsRef.current = [];
    currentRectRef.current = null;
    dragStartRef.current = null;

    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, [imageUrl]);

  const syncCanvasToImage = useCallback(() => {
    if (!imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    setCanvasSize({ w: rect.width, h: rect.height });

    const canvas = canvasRef.current;
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  // Setup/resync canvas after image loads and on resize
  useEffect(() => {
    if (!imgLoaded || !imgRef.current) return;

    const runSync = () => requestAnimationFrame(syncCanvasToImage);
    runSync();

    const ro = new ResizeObserver(runSync);
    ro.observe(imgRef.current);
    window.addEventListener('resize', runSync);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', runSync);
    };
  }, [imgLoaded, syncCanvasToImage]);

  const getCanvasPos = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    return { x, y };
  };

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rectsToDraw = currentRectRef.current
      ? [...rectsRef.current, currentRectRef.current]
      : rectsRef.current;

    for (const rect of rectsToDraw) {
      if (rect.w < 1 || rect.h < 1) continue;

      ctx.fillStyle = 'rgba(255, 60, 60, 0.25)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
  }, []);

  useEffect(() => {
    if (!imgLoaded || canvasSize.w <= 0 || canvasSize.h <= 0) return;
    redrawAll();
  }, [imgLoaded, canvasSize.w, canvasSize.h, redrawAll]);

  const startStroke = (clientX: number, clientY: number) => {
    const pos = getCanvasPos(clientX, clientY);
    if (!pos) return;
    isDrawingRef.current = true;
    dragStartRef.current = pos;
    currentRectRef.current = { x: pos.x, y: pos.y, w: 0, h: 0 };
    redrawAll();
  };

  const moveStroke = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current || !dragStartRef.current) return;
    const pos = getCanvasPos(clientX, clientY);
    if (!pos) return;

    const start = dragStartRef.current;
    const x = Math.min(start.x, pos.x);
    const y = Math.min(start.y, pos.y);
    const w = Math.abs(pos.x - start.x);
    const h = Math.abs(pos.y - start.y);

    currentRectRef.current = { x, y, w, h };
    redrawAll();
  };

  const endStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const rect = currentRectRef.current;
    if (rect) {
      const finalRect = (rect.w > 8 && rect.h > 8)
        ? rect
        : {
            x: Math.max(0, Math.min(canvasSize.w - 72, rect.x - 36)),
            y: Math.max(0, Math.min(canvasSize.h - 72, rect.y - 36)),
            w: Math.min(72, canvasSize.w),
            h: Math.min(72, canvasSize.h),
          };

      if (finalRect.w > 0 && finalRect.h > 0) {
        rectsRef.current.push(finalRect);
        setHasDrawn(true);
      }
    }

    currentRectRef.current = null;
    dragStartRef.current = null;
    redrawAll();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    startStroke(e.clientX, e.clientY);

    const handleWindowMove = (event: MouseEvent) => {
      event.preventDefault();
      moveStroke(event.clientX, event.clientY);
    };

    const handleWindowUp = (event: MouseEvent) => {
      event.preventDefault();
      endStroke();
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
    };

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    if (!touch) return;

    startStroke(touch.clientX, touch.clientY);

    const handleWindowTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      const moveTouch = event.touches[0];
      if (!moveTouch) return;
      moveStroke(moveTouch.clientX, moveTouch.clientY);
    };

    const handleWindowTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      endStroke();
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleWindowTouchEnd, { passive: false });
  };

  const undoLast = () => {
    rectsRef.current.pop();
    if (rectsRef.current.length === 0) setHasDrawn(false);
    redrawAll();
  };

  const getMaskDataUrl = (): string => {
    const img = imgRef.current;
    if (!img || !canvasSize.w || !canvasSize.h) return '';

    // Build final mask at original image resolution (white=editable, black=preserve)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = img.naturalWidth;
    maskCanvas.height = img.naturalHeight;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    const scaleX = img.naturalWidth / canvasSize.w;
    const scaleY = img.naturalHeight / canvasSize.h;

    ctx.fillStyle = 'white';
    for (const rect of rectsRef.current) {
      if (rect.w < 1 || rect.h < 1) continue;
      ctx.fillRect(
        rect.x * scaleX,
        rect.y * scaleY,
        rect.w * scaleX,
        rect.h * scaleY,
      );
    }

    return maskCanvas.toDataURL('image/png');
  };

  const handleSubmit = async () => {
    if (!editPrompt.trim() || !hasDrawn) return;
    setIsProcessing(true);
    try {
      const maskDataUrl = getMaskDataUrl();
      if (!maskDataUrl) throw new Error('Falha ao gerar máscara de edição');
      const newUrl = await editFn(imageUrl, maskDataUrl, editPrompt);
      onImageEdited(newUrl);
    } catch (err: any) {
      console.error('Inpaint error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4">
      {/* Top bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-red-400" />
          <span className="text-sm text-white/70">Arraste para selecionar as áreas que deseja alterar</span>
        </div>
        <div className="flex items-center gap-2">
          {hasDrawn && (
            <button onClick={undoLast} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/60 bg-white/[0.08] hover:bg-white/[0.12] transition-colors cursor-pointer">
              <Undo2 className="w-3.5 h-3.5" /> Desfazer
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image + Canvas */}
      <div ref={containerRef} className="relative inline-block" style={{ maxWidth: '90vw', maxHeight: '65vh' }}>
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Editar"
          className="block max-w-full max-h-[65vh] object-contain rounded-xl select-none pointer-events-none"
          crossOrigin="anonymous"
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />
        {imgLoaded && canvasSize.w > 0 && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-20 rounded-xl select-none"
            style={{ width: canvasSize.w, height: canvasSize.h, cursor: 'crosshair', touchAction: 'none', pointerEvents: 'auto', background: 'transparent' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>

      {/* Prompt input (appears after drawing) */}
      {hasDrawn && (
        <div className="w-full max-w-xl mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Descreva o que mudar na área selecionada... Ex: trocar a roupa por um terno preto"
              className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-500/40 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={isProcessing}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!editPrompt.trim() || isProcessing}
              className="px-5 py-3 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isProcessing ? 'Editando...' : 'Aplicar'}
            </button>
          </div>
          <p className="text-[10px] text-white/20 mt-2 text-center">A IA irá alterar apenas as áreas selecionadas em vermelho</p>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-3" />
          <p className="text-white/70 text-sm">Processando edição...</p>
          <p className="text-white/30 text-xs mt-1">Isso pode levar até 30 segundos</p>
        </div>
      )}
    </div>
  );
};

export default ImageInpaintEditor;
