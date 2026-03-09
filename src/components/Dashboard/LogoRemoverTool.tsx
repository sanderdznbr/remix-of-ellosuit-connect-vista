import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import {
  Upload, X, Download, Loader2, AlertCircle,
  CheckCircle2, Eraser, Plus, RotateCcw, Package,
  ImageOff, ArrowRight, ZoomIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import LogoRegionEditor from './LogoRegionEditor';

interface LogoRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

interface CropParams {
  ox: number; oy: number; w: number; h: number;
  origW: number; origH: number;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  mimeType: string;
  status: 'idle' | 'ready' | 'removing' | 'done' | 'error';
  regions: LogoRegion[];
  resultBase64?: string;
  resultMimeType?: string;
  error?: string;
}

type Phase = 'upload' | 'selecting' | 'processing' | 'done';

// ──────────────── Canvas helpers ────────────────

/**
 * Letterbox image into 1024×1024, generate DALL-E-2-compatible RGBA PNG image + mask.
 * Mask: opaque white = preserve, transparent = edit (inpaint).
 */
const prepareForInpainting = (
  file: File,
  regions: LogoRegion[],
): Promise<{ imagePng: string; maskPng: string; crop: CropParams }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const SIZE = 1024;
      const origW = img.width;
      const origH = img.height;
      const scale = Math.min(SIZE / origW, SIZE / origH);
      const w = Math.round(origW * scale);
      const h = Math.round(origH * scale);
      const ox = Math.round((SIZE - w) / 2);
      const oy = Math.round((SIZE - h) / 2);

      // ── Image canvas (RGBA) ──
      const imgCanvas = document.createElement('canvas');
      imgCanvas.width = SIZE;
      imgCanvas.height = SIZE;
      const iCtx = imgCanvas.getContext('2d')!;
      // Black letterbox background
      iCtx.fillStyle = 'rgba(0,0,0,255)';
      iCtx.fillRect(0, 0, SIZE, SIZE);
      iCtx.drawImage(img, ox, oy, w, h);

      // ── Mask canvas (RGBA): white = preserve, transparent = inpaint ──
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = SIZE;
      maskCanvas.height = SIZE;
      const mCtx = maskCanvas.getContext('2d')!;
      mCtx.fillStyle = 'rgba(255,255,255,1)';
      mCtx.fillRect(0, 0, SIZE, SIZE);
      // Cut out (make transparent) the selected regions
      mCtx.globalCompositeOperation = 'destination-out';
      for (const r of regions) {
        const rx = ox + (r.x / 100) * w;
        const ry = oy + (r.y / 100) * h;
        const rw = (r.width / 100) * w;
        const rh = (r.height / 100) * h;
        mCtx.fillStyle = 'rgba(0,0,0,1)';
        mCtx.fillRect(rx, ry, rw, rh);
      }

      resolve({
        imagePng: imgCanvas.toDataURL('image/png').split(',')[1],
        maskPng: maskCanvas.toDataURL('image/png').split(',')[1],
        crop: { ox, oy, w, h, origW, origH },
      });
    };
    img.onerror = reject;
    img.src = objUrl;
  });

/**
 * Create a 1024×1024 letterboxed image with semi-transparent red overlays indicating
 * the regions to remove (Gemini edit-friendly).
 */
const prepareForRedAnnotation = (
  file: File,
  regions: LogoRegion[],
): Promise<{ originalPng: string; annotatedPng: string; crop: CropParams }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const SIZE = 1024;
      const origW = img.width;
      const origH = img.height;
      const scale = Math.min(SIZE / origW, SIZE / origH);
      const w = Math.round(origW * scale);
      const h = Math.round(origH * scale);
      const ox = Math.round((SIZE - w) / 2);
      const oy = Math.round((SIZE - h) / 2);

      // Clean original (letterboxed)
      const origCanvas = document.createElement('canvas');
      origCanvas.width = SIZE;
      origCanvas.height = SIZE;
      const oCtx = origCanvas.getContext('2d')!;
      oCtx.fillStyle = '#000';
      oCtx.fillRect(0, 0, SIZE, SIZE);
      oCtx.drawImage(img, ox, oy, w, h);

      // Annotated copy with red overlays
      const annCanvas = document.createElement('canvas');
      annCanvas.width = SIZE;
      annCanvas.height = SIZE;
      const aCtx = annCanvas.getContext('2d')!;
      aCtx.drawImage(origCanvas, 0, 0);
      aCtx.fillStyle = 'rgba(255,0,0,0.55)';
      for (const r of regions) {
        const rx = ox + (r.x / 100) * w;
        const ry = oy + (r.y / 100) * h;
        const rw = (r.width / 100) * w;
        const rh = (r.height / 100) * h;
        const pad = 4;
        aCtx.fillRect(rx - pad, ry - pad, rw + pad * 2, rh + pad * 2);
      }

      resolve({
        originalPng: origCanvas.toDataURL('image/png').split(',')[1],
        annotatedPng: annCanvas.toDataURL('image/png').split(',')[1],
        crop: { ox, oy, w, h, origW, origH },
      });
    };
    img.onerror = reject;
    img.src = objUrl;
  });

/**
 * Crop the 1024×1024 DALL-E result back to original image dimensions.
 */
const applyInpaintResult = (
  resultB64: string,
  crop: CropParams,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = crop.origW;
      canvas.height = crop.origH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, crop.ox, crop.oy, crop.w, crop.h, 0, 0, crop.origW, crop.origH);
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = reject;
    img.src = `data:image/png;base64,${resultB64}`;
  });

const STATUS_COLOR: Record<string, string> = {
  idle: 'rgba(255,255,255,0.1)',
  ready: 'rgba(16,185,129,0.4)',
  removing: '#a855f7',
  done: '#10b981',
  error: '#ef4444',
};

// ──────────────── ImageCard ────────────────
interface CardProps {
  item: ImageItem;
  phase: Phase;
  selectionIndex: number;
  itemIndex: number;
  onRemoveImage: () => void;
  onDownload: () => void;
  onZoom: (src: string) => void;
}

const ImageCard: React.FC<CardProps> = ({
  item, phase, selectionIndex, itemIndex,
  onRemoveImage, onDownload, onZoom,
}) => {
  const showResult = item.status === 'done' && item.resultBase64;
  const displaySrc = showResult
    ? `data:${item.resultMimeType || 'image/png'};base64,${item.resultBase64}`
    : item.previewUrl;

  const isCurrentlySelecting = phase === 'selecting' && itemIndex === selectionIndex;
  const isSelectionDone = phase === 'selecting' && item.status === 'ready';

  return (
    <div
      className="relative rounded-xl overflow-hidden flex flex-col transition-all"
      style={{
        border: `1px solid ${isCurrentlySelecting ? 'rgba(123,80,220,0.6)' : STATUS_COLOR[item.status] + '55'}`,
        backgroundColor: '#111116',
        boxShadow: isCurrentlySelecting ? '0 0 0 2px rgba(123,80,220,0.3)' : 'none',
      }}
    >
        <div className="relative w-full aspect-[4/5] overflow-hidden select-none">
          <img
            src={displaySrc}
            alt=""
            className="w-full h-full object-contain"
            style={{
              filter: phase === 'selecting' && itemIndex > selectionIndex && item.status === 'idle'
                ? 'brightness(0.4)' : 'none',
            }}
            draggable={false}
          />

          {/* Region boxes preview (only during selection/processing, never in final done state) */}
          {item.status !== 'done' && item.regions.map(r => (
            <div key={r.id} className="absolute pointer-events-none" style={{
              left: `${r.x}%`, top: `${r.y}%`,
              width: `${r.width}%`, height: `${r.height}%`,
              border: '2px solid #ef4444',
              backgroundColor: 'rgba(239,68,68,0.15)',
            }} />
          ))}

        {item.status === 'removing' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="text-white/60" style={{ fontSize: '10px' }}>Removendo...</span>
            </div>
          </div>
        )}
        {item.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-3" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <span className="text-red-300" style={{ fontSize: '10px' }}>{item.error || 'Erro'}</span>
            </div>
          </div>
        )}
        {item.status === 'done' && !item.resultBase64 && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium bg-emerald-500/20 text-emerald-400" style={{ fontSize: '9px' }}>
              <ImageOff className="w-2.5 h-2.5" /> Sem logo
            </div>
          </div>
        )}
        {item.status === 'done' && item.resultBase64 && (
          <>
            <div className="absolute top-2 right-2">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium bg-emerald-500/20 text-emerald-400" style={{ fontSize: '9px' }}>
                <CheckCircle2 className="w-2.5 h-2.5" /> Pronta
              </div>
            </div>
            {/* Zoom button */}
            <button
              onClick={() => onZoom(displaySrc)}
              className="absolute bottom-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer opacity-0 hover:opacity-100 group-hover:opacity-100"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff' }}
              title="Ver em tela cheia"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {isCurrentlySelecting && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(123,80,220,0.12)' }}>
            <div className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-300 font-medium" style={{ fontSize: '9px' }}>Selecionando...</span>
            </div>
          </div>
        )}
        {isSelectionDone && (
          <div className="absolute top-2 left-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium bg-emerald-500/20 text-emerald-400" style={{ fontSize: '9px' }}>
              <CheckCircle2 className="w-2.5 h-2.5" />
              {item.regions.length > 0 ? `${item.regions.length} área${item.regions.length > 1 ? 's' : ''}` : 'Pulado'}
            </div>
          </div>
        )}
        {phase === 'upload' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveImage(); }}
            className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        )}

        {/* Clickable zoom overlay for done images */}
        {item.status === 'done' && item.resultBase64 && (
          <button
            onClick={() => onZoom(displaySrc)}
            className="absolute inset-0 w-full h-full flex items-end justify-end p-2 cursor-zoom-in group"
            style={{ backgroundColor: 'transparent' }}
            title="Ver em tela cheia"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff' }}>
              <ZoomIn className="w-3.5 h-3.5" />
            </div>
          </button>
        )}
      </div>

      <div className="px-2.5 py-2 flex items-center justify-between gap-1.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
          {item.status === 'idle' && item.file.name.slice(0, 18) + (item.file.name.length > 18 ? '…' : '')}
          {item.status === 'ready' && (item.regions.length > 0 ? `${item.regions.length} área${item.regions.length > 1 ? 's' : ''}` : 'Sem logo')}
          {item.status === 'removing' && 'Processando...'}
          {item.status === 'done' && (item.resultBase64 ? 'Logo removida ✓' : 'Sem logos')}
          {item.status === 'error' && 'Erro'}
        </span>
        <div className="flex items-center gap-1">
          {item.status === 'done' && item.resultBase64 && (
            <button
              onClick={onDownload}
              className="w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer"
              style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}
              title="Baixar imagem"
            >
              <Download className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ──────────────── Lightbox ────────────────
const Lightbox: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer z-10"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
      >
        <X className="w-5 h-5" />
      </button>
      <motion.img
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        src={src}
        alt="Resultado"
        className="rounded-xl shadow-2xl"
        style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain' }}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </motion.div>
  </AnimatePresence>
);

// ──────────────── Main Component ────────────────
const LogoRemoverTool: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('upload');
  const [items, setItems] = useState<ImageItem[]>([]);
  const [selectionIndex, setSelectionIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const updateItem = useCallback((id: string, updates: Partial<ImageItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    noClick: items.length > 0,
    onDrop: (accepted) => {
      if (phase !== 'upload') return;
      const newItems: ImageItem[] = accepted
        .slice(0, 15 - items.length)
        .map(file => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          mimeType: file.type || 'image/jpeg',
          status: 'idle',
          regions: [],
        }));
      setItems(prev => [...prev, ...newItems].slice(0, 15));
    },
    onDropRejected: (r) => {
      if (r.some(f => f.errors.some(e => e.code === 'file-too-large')))
        toast.error('Arquivo muito grande. Máximo 5MB por imagem.');
    },
  });

  const removeImage = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const startSelecting = () => {
    if (items.length === 0) return;
    setSelectionIndex(0);
    setPhase('selecting');
  };

  const handleSelectionSave = (regions: LogoRegion[]) => {
    const currentItem = items[selectionIndex];
    if (!currentItem) return;
    updateItem(currentItem.id, { regions, status: 'ready' });
  };

  const handleSelectionClose = () => {
    const nextIndex = selectionIndex + 1;
    if (nextIndex >= items.length) {
      startRemoving();
    } else {
      setSelectionIndex(nextIndex);
    }
  };

  const startRemoving = async () => {
    setPhase('processing');

    setItems(currentItems => {
      const toProcess = currentItems.filter(i => i.status === 'ready');

      (async () => {
        const removeOne = async (item: ImageItem) => {
          if (item.regions.length === 0) {
            updateItem(item.id, { status: 'done' });
            return;
          }
          updateItem(item.id, { status: 'removing' });
          try {
            // Generate 1024×1024 letterboxed original + annotated with red overlays
            const prep = await prepareForRedAnnotation(item.file, item.regions);

            const { data, error } = await supabase.functions.invoke('logo-removal', {
              body: {
                action: 'remove',
                imageBase64: prep.originalPng,
                annotatedBase64: prep.annotatedPng,
              }
            });
            if (error) throw new Error(error.message);
            if (!data?.processedImageBase64) throw new Error('Sem imagem retornada');

            // Crop DALL-E result (1024×1024) back to original image dimensions
            const finalBase64 = await applyInpaintResult(data.processedImageBase64, prep.crop);
            updateItem(item.id, { status: 'done', resultBase64: finalBase64, resultMimeType: 'image/png' });
          } catch (err) {
            console.error('removeOne error:', err);
            updateItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Erro ao remover' });
          }
        };

        // Process 2 at a time (DALL-E 2 is slower)
        for (let i = 0; i < toProcess.length; i += 2) {
          await Promise.all(toProcess.slice(i, i + 2).map(removeOne));
          if (i + 2 < toProcess.length) await new Promise(r => setTimeout(r, 1000));
        }

        setPhase('done');
        setItems(latest => {
          const successCount = latest.filter(i => i.status === 'done').length;
          toast.success(`${successCount} imagem${successCount !== 1 ? 'ns' : ''} processada${successCount !== 1 ? 's' : ''} com sucesso!`);
          return latest;
        });
      })();

      return currentItems;
    });
  };

  const downloadSingle = (item: ImageItem) => {
    if (!item.resultBase64) return;
    const mime = item.resultMimeType || 'image/png';
    const ext = mime.split('/')[1] || 'png';
    const a = document.createElement('a');
    a.href = `data:${mime};base64,${item.resultBase64}`;
    a.download = `sem-logo-${item.file.name.replace(/\.[^.]+$/, '')}.${ext}`;
    a.click();
  };

  const downloadZip = async () => {
    const doneItems = items.filter(i => i.status === 'done' && i.resultBase64);
    if (doneItems.length === 0) { toast.error('Nenhuma imagem processada'); return; }
    toast.info('Preparando ZIP...');
    const zip = new JSZip();
    doneItems.forEach((item, i) => {
      const ext = (item.resultMimeType || 'image/png').split('/')[1] || 'png';
      zip.file(`sem-logo-${i + 1}.${ext}`, item.resultBase64!, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logos-removidas.zip';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ZIP baixado!');
  };

  const reset = () => {
    items.forEach(i => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setPhase('upload');
    setSelectionIndex(0);
  };

  const doneCount = items.filter(i => i.status === 'done').length;
  const processingCount = items.filter(i => i.status === 'removing').length;
  const withResultCount = items.filter(i => i.status === 'done' && i.resultBase64).length;
  const readyCount = items.filter(i => i.status === 'ready').length;
  const totalRegions = items.reduce((s, i) => s + i.regions.length, 0);
  const selectingItem = phase === 'selecting' ? items[selectionIndex] : null;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0a0a0f' }}>

      {/* Lightbox */}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Remover Logos
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {phase === 'upload' && (items.length === 0
              ? 'Carregue até 15 imagens e marque manualmente as áreas com logo'
              : `${items.length} imagem${items.length !== 1 ? 'ns' : ''} selecionada${items.length !== 1 ? 's' : ''} — clique em Avançar para marcar as logos`
            )}
            {phase === 'selecting' && `Marque as áreas com logo — imagem ${selectionIndex + 1} de ${items.length}`}
            {phase === 'processing' && `Removendo logos com IA... ${doneCount}/${items.length} concluída${doneCount !== 1 ? 's' : ''}`}
            {phase === 'done' && `Concluído! ${withResultCount} imagem${withResultCount !== 1 ? 'ns' : ''} processada${withResultCount !== 1 ? 's' : ''} sem logos`}
          </p>
        </div>
        {phase !== 'upload' && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Recomeçar
          </button>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">

        {phase === 'upload' && items.length === 0 && (
          <div
            {...getRootProps()}
            className="flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer"
            style={{
              border: `2px dashed ${isDragActive ? 'rgba(123,80,220,0.6)' : 'rgba(255,255,255,0.08)'}`,
              backgroundColor: isDragActive ? 'rgba(123,80,220,0.06)' : 'rgba(255,255,255,0.02)',
              minHeight: '320px',
            }}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(123,80,220,0.12)' }}>
                <Upload className="w-6 h-6" style={{ color: 'rgba(123,80,220,0.8)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {isDragActive ? 'Solte as imagens aqui' : 'Arraste imagens aqui ou clique para selecionar'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  JPG, PNG, WEBP · Máx. 5MB por imagem · Até 15 imagens
                </p>
              </div>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div>
            {phase === 'upload' && items.length < 15 && (
              <div
                {...getRootProps()}
                className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-colors"
                style={{ border: '1px dashed rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <input {...getInputProps()} />
                <Plus className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Adicionar mais imagens ({items.length}/15)
                </span>
              </div>
            )}

            {(phase === 'selecting' || phase === 'processing') && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl p-3"
                style={{ backgroundColor: 'rgba(123,80,220,0.06)', border: '1px solid rgba(123,80,220,0.15)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'rgba(167,139,250,0.9)' }}>
                    {phase === 'selecting'
                      ? `Marcando áreas — ${selectionIndex + 1} de ${items.length}`
                      : `Processando com IA — ${doneCount} de ${items.length}`
                    }
                  </span>
                  {phase === 'selecting' && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {readyCount} marcadas
                    </span>
                  )}
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: phase === 'selecting' ? '#7B50DC' : '#10b981' }}
                    animate={{
                      width: phase === 'selecting'
                        ? `${(selectionIndex / items.length) * 100}%`
                        : `${(doneCount / items.length) * 100}%`
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <AnimatePresence>
                {items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="group"
                  >
                    <ImageCard
                      item={item}
                      phase={phase}
                      selectionIndex={selectionIndex}
                      itemIndex={idx}
                      onRemoveImage={() => removeImage(item.id)}
                      onDownload={() => downloadSingle(item)}
                      onZoom={setLightboxSrc}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div
        className="shrink-0 px-6 py-4 flex items-center justify-between gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#0d0d12' }}
      >
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {phase === 'upload' && items.length > 0 && `${items.length} imagem${items.length !== 1 ? 'ns' : ''} pronta${items.length !== 1 ? 's' : ''}`}
          {phase === 'selecting' && `${totalRegions} área${totalRegions !== 1 ? 's' : ''} marcada${totalRegions !== 1 ? 's' : ''} até agora`}
          {phase === 'processing' && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {processingCount > 0 ? `${processingCount} em processamento...` : 'Finalizando...'}
            </span>
          )}
          {phase === 'done' && `${withResultCount} imagem${withResultCount !== 1 ? 'ns' : ''} pronta${withResultCount !== 1 ? 's' : ''} para download`}
        </div>

        <div className="flex items-center gap-2">
          {phase === 'upload' && (
            <button
              onClick={startSelecting}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#7B50DC', color: '#fff' }}
            >
              <ArrowRight className="w-4 h-4" />
              Avançar
            </button>
          )}
          {phase === 'processing' && (
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium opacity-60 cursor-not-allowed"
              style={{ backgroundColor: '#7B50DC', color: '#fff' }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando...
            </button>
          )}
          {phase === 'done' && withResultCount > 0 && (
            <>
              {withResultCount > 1 && (
                <button
                  onClick={downloadZip}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                  style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <Package className="w-4 h-4" />
                  Baixar ZIP ({withResultCount})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Step-mode Region Editor Modal */}
      {selectingItem && (
        <LogoRegionEditor
          imageUrl={selectingItem.previewUrl}
          imageName={selectingItem.file.name}
          initialRegions={selectingItem.regions}
          onSave={handleSelectionSave}
          onClose={handleSelectionClose}
          stepCurrent={selectionIndex + 1}
          stepTotal={items.length}
        />
      )}
    </div>
  );
};

export default LogoRemoverTool;
