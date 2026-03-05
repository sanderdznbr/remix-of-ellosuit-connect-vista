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
  const pathsRef = useRef<{ x: number; y: number }[][]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);

  // Setup canvas after image loads
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current || !containerRef.current) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    setCanvasSize({ w: rect.width, h: rect.height });
    const canvas = canvasRef.current;
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, [imgLoaded]);

  const getCanvasPos = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allPaths = [...pathsRef.current, currentPathRef.current.length > 0 ? currentPathRef.current : null].filter(Boolean) as { x: number; y: number }[][];

    for (const path of allPaths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.strokeStyle = 'rgba(255, 50, 50, 0.7)';
      ctx.lineWidth = 30;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
      ctx.lineWidth = 50;
      ctx.stroke();
    }
  }, []);

  const startStroke = (clientX: number, clientY: number) => {
    const pos = getCanvasPos(clientX, clientY);
    if (!pos) return;
    isDrawingRef.current = true;
    currentPathRef.current = [pos];
  };

  const moveStroke = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return;
    const pos = getCanvasPos(clientX, clientY);
    if (!pos) return;
    currentPathRef.current.push(pos);
    redrawAll();
  };

  const endStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentPathRef.current.length > 1) {
      pathsRef.current.push([...currentPathRef.current]);
      setHasDrawn(true);
    }
    currentPathRef.current = [];
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (canvas) {
      try { canvas.setPointerCapture(e.pointerId); } catch {}
    }

    startStroke(e.clientX, e.clientY);

    const handleWindowMove = (event: PointerEvent) => {
      event.preventDefault();
      moveStroke(event.clientX, event.clientY);
    };

    const handleWindowUp = (event: PointerEvent) => {
      event.preventDefault();
      endStroke();
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };

    window.addEventListener('pointermove', handleWindowMove, { passive: false });
    window.addEventListener('pointerup', handleWindowUp, { passive: false });
    window.addEventListener('pointercancel', handleWindowUp, { passive: false });
  };

  const undoLast = () => {
    pathsRef.current.pop();
    if (pathsRef.current.length === 0) setHasDrawn(false);
    redrawAll();
  };

  const getMaskDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    // Create a clean mask canvas (white on black)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const ctx = maskCanvas.getContext('2d')!;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    for (const path of pathsRef.current) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 50;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    return maskCanvas.toDataURL('image/png');
  };

  const getCompositeDataUrl = (): string => {
    // Create composite: original image with red mask overlay
    const canvas = document.createElement('canvas');
    const img = imgRef.current!;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    // Scale and draw mask paths onto the composite
    const scaleX = img.naturalWidth / canvasSize.w;
    const scaleY = img.naturalHeight / canvasSize.h;

    for (const path of pathsRef.current) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x * scaleX, path[0].y * scaleY);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * scaleX, path[i].y * scaleY);
      }
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 50 * scaleX;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleSubmit = async () => {
    if (!editPrompt.trim() || !hasDrawn) return;
    setIsProcessing(true);
    try {
      const compositeDataUrl = getCompositeDataUrl();
      const newUrl = await editFn(imageUrl, compositeDataUrl, editPrompt);
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
          <span className="text-sm text-white/70">Desenhe sobre a área que deseja alterar</span>
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
            className="absolute inset-0 z-20 rounded-xl"
            style={{ width: canvasSize.w, height: canvasSize.h, cursor: 'crosshair', touchAction: 'none', pointerEvents: 'auto' }}
            onPointerDown={handlePointerDown}
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
              placeholder="Descreva o que mudar na área marcada... Ex: trocar a roupa por um terno preto"
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
          <p className="text-[10px] text-white/20 mt-2 text-center">A IA irá alterar apenas a região marcada em vermelho</p>
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
