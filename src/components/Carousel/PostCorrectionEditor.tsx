import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Trash2, Plus, Info, Pencil, Loader2, Send, Undo2, Paperclip, Image as ImageIcon } from 'lucide-react';

interface Region {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  imageUrl: string;
  onClose: () => void;
  onImageEdited: (newImageUrl: string) => void;
  editFn: (originalUrl: string, maskDataUrl: string, prompt: string, attachmentBase64?: string) => Promise<string>;
}

const PostCorrectionEditor: React.FC<Props> = ({ imageUrl, onClose, onImageEdited, editFn }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isDrawingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawBox, setDrawBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImgLoaded(false);
    setRegions([]);
    setSelectedId(null);
    setDrawBox(null);
    setEditPrompt('');
    setAttachmentPreview(null);
    setAttachmentBase64(null);
  }, [imageUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAttachmentPreview(dataUrl);
      setAttachmentBase64(dataUrl.replace(/^data:[^;]+;base64,/, ''));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getPercent = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

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
          setRegions(rs => [...rs, { id: crypto.randomUUID(), x: prev.x, y: prev.y, width: prev.w, height: prev.h }]);
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
          setRegions(rs => [...rs, { id: crypto.randomUUID(), x: prev.x, y: prev.y, width: prev.w, height: prev.h }]);
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

  const getMaskDataUrl = (): string => {
    const img = imgRef.current;
    if (!img || regions.length === 0) return '';

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Black = preserve, White = edit
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    for (const r of regions) {
      const rx = (r.x / 100) * canvas.width;
      const ry = (r.y / 100) * canvas.height;
      const rw = (r.width / 100) * canvas.width;
      const rh = (r.height / 100) * canvas.height;
      ctx.fillRect(rx, ry, rw, rh);
    }

    return canvas.toDataURL('image/png');
  };

  const isExactAttachmentReplacePrompt = (prompt: string) => {
    const normalized = prompt.toLowerCase();
    return /(substit|troca|troque|replace|anexad|exat|id[êe]ntic|igual)/i.test(normalized);
  };

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const applyExactAttachmentReplace = async (originalSrc: string, attachmentSrc: string): Promise<string> => {
    const [originalImg, attachmentImg] = await Promise.all([
      loadImage(originalSrc),
      loadImage(attachmentSrc),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = originalImg.naturalWidth;
    canvas.height = originalImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Falha ao preparar canvas');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);

    for (const r of regions) {
      const rx = (r.x / 100) * canvas.width;
      const ry = (r.y / 100) * canvas.height;
      const rw = (r.width / 100) * canvas.width;
      const rh = (r.height / 100) * canvas.height;

      const regionRatio = rw / rh;
      const attachmentRatio = attachmentImg.naturalWidth / attachmentImg.naturalHeight;

      let sx = 0;
      let sy = 0;
      let sw = attachmentImg.naturalWidth;
      let sh = attachmentImg.naturalHeight;

      if (attachmentRatio > regionRatio) {
        sh = attachmentImg.naturalHeight;
        sw = sh * regionRatio;
        sx = (attachmentImg.naturalWidth - sw) / 2;
      } else {
        sw = attachmentImg.naturalWidth;
        sh = sw / regionRatio;
        sy = (attachmentImg.naturalHeight - sh) / 2;
      }

      ctx.drawImage(attachmentImg, sx, sy, sw, sh, rx, ry, rw, rh);
    }

    return canvas.toDataURL('image/png');
  };

  const handleSubmit = async () => {
    if (!editPrompt.trim() || regions.length === 0) return;
    setIsProcessing(true);
    try {
      const shouldUseExactAttachmentReplace =
        !!attachmentPreview && isExactAttachmentReplacePrompt(editPrompt);

      if (shouldUseExactAttachmentReplace) {
        const newUrl = await applyExactAttachmentReplace(imageUrl, attachmentPreview);
        onImageEdited(newUrl);
        return;
      }

      const maskDataUrl = getMaskDataUrl();
      if (!maskDataUrl) throw new Error('Falha ao gerar máscara');
      const newUrl = await editFn(imageUrl, maskDataUrl, editPrompt, attachmentBase64 || undefined);
      onImageEdited(newUrl);
    } catch (err: any) {
      console.error('Post correction error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 p-4">
      {/* Header */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: '#fb923c' }}>
            <Pencil className="w-3 h-3" />
            {regions.length} área{regions.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {regions.length > 0 && (
            <button onClick={() => { setRegions([]); setSelectedId(null); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
              <Trash2 className="w-3 h-3" /> Limpar
            </button>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tip */}
      <div className="w-full max-w-3xl mb-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
          <Info className="w-3.5 h-3.5 shrink-0" style={{ color: '#fb923c' }} />
          <span className="text-xs" style={{ color: 'rgba(251,146,60,0.8)' }}>
            <strong style={{ color: '#fb923c' }}>Arraste</strong> na imagem para selecionar a área que deseja alterar ·{' '}
            <strong style={{ color: '#fb923c' }}>Clique</strong> numa caixa para remover
          </span>
        </div>
      </div>

      {/* Image + regions */}
      <div
        ref={containerRef}
        className="relative inline-block select-none shrink-0"
        style={{ maxWidth: '100%', cursor: 'crosshair', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Selecionar área para correção"
          className="block rounded-xl"
          style={{ maxWidth: '85vw', maxHeight: '50vh', objectFit: 'contain', pointerEvents: 'none' }}
          crossOrigin="anonymous"
          draggable={false}
          onLoad={() => setImgLoaded(true)}
        />

        {imgLoaded && regions.map(r => {
          const isSelected = selectedId === r.id;
          return (
            <div key={r.id} data-region="1" className="absolute transition-all"
              style={{
                left: `${r.x}%`, top: `${r.y}%`,
                width: `${r.width}%`, height: `${r.height}%`,
                border: `2px solid ${isSelected ? '#f59e0b' : '#fb923c'}`,
                backgroundColor: isSelected ? 'rgba(245,158,11,0.2)' : 'rgba(251,146,60,0.18)',
                cursor: 'pointer', zIndex: 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isSelected) deleteRegion(r.id);
                else setSelectedId(r.id);
              }}
            >
              {isSelected && (
                <button data-region="1"
                  className="absolute -top-3 -right-3 w-5 h-5 rounded-full flex items-center justify-center z-20 cursor-pointer"
                  style={{ backgroundColor: '#f59e0b', color: '#000' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); deleteRegion(r.id); }}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {drawBox && drawBox.w > 0 && drawBox.h > 0 && (
          <div className="absolute pointer-events-none"
            style={{
              left: `${drawBox.x}%`, top: `${drawBox.y}%`,
              width: `${drawBox.w}%`, height: `${drawBox.h}%`,
              border: '2px dashed #fb923c',
              backgroundColor: 'rgba(251,146,60,0.18)',
              zIndex: 20,
            }}>
            <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px]"
              style={{ backgroundColor: 'rgba(251,146,60,0.8)', color: '#fff' }}>
              <Plus className="w-2 h-2" /> Nova área
            </div>
          </div>
        )}
      </div>

      {/* Prompt input */}
      {regions.length > 0 && (
        <div className="w-full max-w-xl mt-4 shrink-0">
          {attachmentPreview && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-orange-500/30 shrink-0">
                <img src={attachmentPreview} alt="Anexo" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setAttachmentPreview(null); setAttachmentBase64(null); }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
              <span className="text-xs" style={{ color: 'rgba(251,146,60,0.7)' }}>Imagem anexada — mencione no prompt</span>
            </div>
          )}
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl transition-colors cursor-pointer shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: attachmentPreview ? '#fb923c' : 'rgba(255,255,255,0.4)' }}
              title="Anexar imagem de referência"
              disabled={isProcessing}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder={attachmentPreview ? "Ex: troque a foto do celular pela imagem anexada" : "Descreva o que mudar... Ex: trocar texto para X, remover objeto"}
              className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-orange-500/40 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={isProcessing}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!editPrompt.trim() || isProcessing}
              className="px-5 py-3 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              style={{ backgroundColor: '#ea580c' }}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isProcessing ? 'Editando...' : 'Aplicar'}
            </button>
          </div>
          <p className="text-[10px] mt-2 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
            📎 Anexe uma imagem e descreva a substituição · A IA edita apenas as áreas em laranja
          </p>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-30">
          <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: '#fb923c' }} />
          <p className="text-white/70 text-sm">Processando edição...</p>
          <p className="text-white/30 text-xs mt-1">Isso pode levar até 30 segundos</p>
        </div>
      )}
    </div>
  );
};

export default PostCorrectionEditor;
