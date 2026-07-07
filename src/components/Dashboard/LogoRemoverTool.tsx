import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { useAuth } from '@/components/AuthProvider';
import {
  Upload, X, Download, Loader2, AlertCircle,
  CheckCircle2, Eraser, Plus, RotateCcw, Package, Trash2,
  ImageOff, ArrowRight, ZoomIn, Sparkles, Wand2, MousePointerClick, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import LogoRegionEditor from './LogoRegionEditor';
import CreateStyleFromImages from './CreateStyleFromImages';

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
  attempts?: number;
  lastDiffScore?: number;
}

type Phase = 'upload' | 'mode-select' | 'auto-detecting' | 'selecting' | 'processing' | 'done';
type RemovalMode = 'manual' | 'auto';

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
  opts?: { pad?: number; alpha?: number },
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

      const pad = opts?.pad ?? 4;
      const alpha = Math.max(0.35, Math.min(0.95, opts?.alpha ?? 0.55));
      aCtx.fillStyle = `rgba(255,0,0,${alpha})`;

      for (const r of regions) {
        const rx = ox + (r.x / 100) * w;
        const ry = oy + (r.y / 100) * h;
        const rw = (r.width / 100) * w;
        const rh = (r.height / 100) * h;
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

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Compute how much the selected regions changed after processing.
 * 0 = identical (likely failed), 1 = very different.
 */
const computeRegionDiffScore = async (
  file: File,
  resultBase64: string,
  regions: LogoRegion[],
): Promise<number> => {
  if (regions.length === 0) return 1;

  const origUrl = URL.createObjectURL(file);
  try {
    const [origImg, resultImg] = await Promise.all([
      loadImage(origUrl),
      loadImage(`data:image/png;base64,${resultBase64}`),
    ]);

    const maxSide = 280;
    const scale = Math.min(maxSide / origImg.width, maxSide / origImg.height);
    const w = Math.max(1, Math.round(origImg.width * scale));
    const h = Math.max(1, Math.round(origImg.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 1;

    // Draw original
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(origImg, 0, 0, w, h);
    const origData = ctx.getImageData(0, 0, w, h).data;

    // Draw result
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(resultImg, 0, 0, w, h);
    const resData = ctx.getImageData(0, 0, w, h).data;

    const regionBounds = regions.map(r => ({
      x1: Math.floor((r.x / 100) * w),
      y1: Math.floor((r.y / 100) * h),
      x2: Math.ceil(((r.x + r.width) / 100) * w),
      y2: Math.ceil(((r.y + r.height) / 100) * h),
    }));

    const inRegion = (x: number, y: number) =>
      regionBounds.some(b => x >= b.x1 && x < b.x2 && y >= b.y1 && y < b.y2);

    let sum = 0;
    let count = 0;

    // Sample every 2px for speed
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (!inRegion(x, y)) continue;
        const i = (y * w + x) * 4;
        sum += Math.abs(origData[i] - resData[i]);
        sum += Math.abs(origData[i + 1] - resData[i + 1]);
        sum += Math.abs(origData[i + 2] - resData[i + 2]);
        count++;
      }
    }

    if (count === 0) return 1;
    const max = count * 255 * 3;
    return Math.min(1, Math.max(0, sum / max));
  } catch {
    return 1;
  } finally {
    URL.revokeObjectURL(origUrl);
  }
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
  onDelete: () => void;
  onRegenerate: () => void;
}

const ImageCard: React.FC<CardProps> = ({
  item, phase, selectionIndex, itemIndex,
  onRemoveImage, onDownload, onZoom, onDelete, onRegenerate,
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
          {(item.status === 'done' || item.status === 'error') && item.regions.length > 0 && (
            <button
              onClick={onRegenerate}
              className="w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer"
              style={{ backgroundColor: 'rgba(123,80,220,0.14)', color: '#a78bfa', border: '1px solid rgba(123,80,220,0.18)' }}
              title="Regenerar"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
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
          <button
            onClick={onDelete}
            disabled={phase === 'selecting' || phase === 'processing' || phase === 'auto-detecting'}
            className="w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)' }}
            title={phase === 'selecting' || phase === 'processing' || phase === 'auto-detecting' ? 'Aguarde para excluir' : 'Excluir'}
          >
            <Trash2 className="w-3 h-3" />
          </button>
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
interface LogoRemoverToolProps {
  initialFiles?: File[];
  onInitialFilesConsumed?: () => void;
}

const LogoRemoverTool: React.FC<LogoRemoverToolProps> = ({ initialFiles, onInitialFilesConsumed }) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('upload');
  const [removalMode, setRemovalMode] = useState<RemovalMode | null>(null);
  const [items, setItems] = useState<ImageItem[]>([]);
  const [selectionIndex, setSelectionIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [createStyleOpen, setCreateStyleOpen] = useState(false);
  const [autoDetectProgress, setAutoDetectProgress] = useState({ current: 0, total: 0 });

  const updateItem = useCallback((id: string, updates: Partial<ImageItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const invokeLogoRemovalWithRetry = useCallback(async (
    payload: { action: 'remove'; imageBase64: string; annotatedBase64: string },
    maxAttempts = 3,
  ) => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('logo-removal', { body: payload });
        if (error) throw new Error(error.message || 'Falha ao chamar função de remoção');
        if (!data?.processedImageBase64) throw new Error('Sem imagem retornada');
        return data as { processedImageBase64: string; mimeType?: string };
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1200 * attempt));
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Erro ao remover logo');
  }, []);

  const removeWithAutoRetry = useCallback(async (
    item: ImageItem,
    opts?: { startAttempt?: number; maxAttempts?: number },
  ) => {
    const maxAttempts = opts?.maxAttempts ?? 3;
    let lastError: unknown = null;

    for (let attempt = opts?.startAttempt ?? 1; attempt <= maxAttempts; attempt++) {
      try {
        const pad = 4 + (attempt - 1) * 8;
        const alpha = 0.55 + (attempt - 1) * 0.18;

        // Generate 1024×1024 letterboxed original + annotated with red overlays
        const prep = await prepareForRedAnnotation(item.file, item.regions, { pad, alpha });

        const data = await invokeLogoRemovalWithRetry({
          action: 'remove',
          imageBase64: prep.originalPng,
          annotatedBase64: prep.annotatedPng,
        }, 3);

        // Crop result (1024×1024) back to original image dimensions
        const finalBase64 = await applyInpaintResult(data.processedImageBase64, prep.crop);
        const diff = await computeRegionDiffScore(item.file, finalBase64, item.regions);

        console.log('[logo-remover] attempt', attempt, 'diff', diff.toFixed(4));

        // If the edited region barely changed, likely a failure → retry automatically with stronger mask
        if (diff < 0.02 && attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 700 * attempt));
          continue;
        }

        return { finalBase64, diff, attempts: attempt };
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 900 * attempt));
          continue;
        }
        throw err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Erro ao remover logo');
  }, [invokeLogoRemovalWithRetry]);

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
  // Handle initial files from Behance importer
  React.useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && phase === 'upload') {
      const newItems: ImageItem[] = initialFiles.slice(0, 15).map(file => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        mimeType: file.type || 'image/jpeg',
        status: 'idle' as const,
        regions: [],
      }));
      setItems(newItems);
      onInitialFilesConsumed?.();
    }
  }, [initialFiles]);

  const removeImage = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleDelete = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      if (item.status === 'removing') {
        toast.error('Aguarde finalizar o processamento para excluir');
        return prev;
      }
      URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const regenerate = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (item.status === 'removing') return;
    if (item.regions.length === 0) {
      toast.info('Sem áreas marcadas para remover');
      return;
    }

    updateItem(id, { status: 'removing', error: undefined });

    try {
      const { finalBase64, diff, attempts } = await removeWithAutoRetry(item, { startAttempt: 2, maxAttempts: 3 });
      updateItem(id, {
        status: 'done',
        resultBase64: finalBase64,
        resultMimeType: 'image/png',
        attempts,
        lastDiffScore: diff,
      });
      toast.success('Regenerado!');
    } catch (err) {
      console.error('regenerate error:', err);
      updateItem(id, { status: 'error', error: err instanceof Error ? err.message : 'Erro ao regenerar' });
      toast.error('Falha ao regenerar');
    }
  }, [items, removeWithAutoRetry, updateItem]);

  const startSelecting = () => {
    if (items.length === 0) return;
    setPhase('mode-select');
  };

  const startManualMode = () => {
    setRemovalMode('manual');
    setSelectionIndex(0);
    setPhase('selecting');
  };

  /** Convert a File to a base64 data URL for AI vision */
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /** Resize image to max 800px for AI detection to avoid WORKER_LIMIT */
  const resizeImageForDetection = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          const scale = MAX / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  /** Use AI to detect logos, watermarks, site links, @ mentions in an image */
  const detectRegionsForImage = async (item: ImageItem): Promise<LogoRegion[]> => {
    try {
      const dataUrl = await resizeImageForDetection(item.file);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout na detecção automática')), 20000)
      );

      const invokePromise = supabase.functions.invoke('ai-chat', {
        body: {
          model: 'google/gemini-2.5-flash-lite',
          lightweight: true,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this image and identify ALL of the following elements that should be removed:
1. Logos (company logos, brand marks, watermarks, emblems)
2. Website URLs or domain names visible as text overlays
3. @ mentions or social media handles visible as text overlays
4. Any brand identity text overlaid on the image (not part of the actual content)

For each element found, return its bounding box as percentage coordinates (0-100) relative to the image dimensions.

IMPORTANT: Only detect overlaid/superimposed elements, NOT the main content of the image.

Return a JSON array of objects, each with: x (left %), y (top %), width (%), height (%), label (description).
If nothing is found, return an empty array [].
Return ONLY the JSON array, no other text.`
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl }
                }
              ]
            }
          ],
          temperature: 0.1,
        },
      });

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      if (error) throw error;

      const responseText = data?.response || data?.message || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((r: any) => r.x != null && r.y != null && r.width != null && r.height != null)
        .map((r: any) => ({
          id: crypto.randomUUID(),
          x: Math.max(0, Math.min(100, Number(r.x))),
          y: Math.max(0, Math.min(100, Number(r.y))),
          width: Math.max(1, Math.min(100 - Number(r.x), Number(r.width))),
          height: Math.max(1, Math.min(100 - Number(r.y), Number(r.height))),
          label: r.label || 'Logo',
        }));
    } catch (err) {
      console.error('Auto-detect error for', item.file.name, err);
      return [];
    }
  };

  const startAutoMode = async () => {
    setRemovalMode('auto');
    setPhase('auto-detecting');
    setAutoDetectProgress({ current: 0, total: items.length });

    const updatedItems = [...items];

    // Process ONE at a time to avoid WORKER_LIMIT
    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      const regions = await detectRegionsForImage(item);

      updatedItems[i] = { ...item, regions, status: 'ready' };
      updateItem(item.id, { regions, status: 'ready' });

      setAutoDetectProgress({ current: i + 1, total: updatedItems.length });
    }

    // Go to selecting phase for confirmation
    setSelectionIndex(0);
    setPhase('selecting');
    toast.success('Detecção automática concluída! Confirme as áreas detectadas.');
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
            updateItem(item.id, { status: 'done', attempts: 0, lastDiffScore: 1 });
            return;
          }

          updateItem(item.id, { status: 'removing', error: undefined });

          try {
            const { finalBase64, diff, attempts } = await removeWithAutoRetry(item, { startAttempt: 1, maxAttempts: 3 });
            updateItem(item.id, {
              status: 'done',
              resultBase64: finalBase64,
              resultMimeType: 'image/png',
              attempts,
              lastDiffScore: diff,
            });
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
          // Auto-save to history
          saveSessionToHistory(latest);
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

  const saveSessionToHistory = useCallback(async (finalItems: ImageItem[]) => {
    if (!user) return;
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (!cu) return;

      const withResult = finalItems.filter(i => i.status === 'done' && i.resultBase64);
      if (withResult.length === 0) return;

      const { data: session, error: sErr } = await supabase
        .from('logo_removal_sessions')
        .insert({
          user_id: user.id,
          company_id: cu.company_id,
          title: `Remoção — ${withResult.length} imagens`,
          total_images: finalItems.length,
          processed_images: withResult.length,
        } as any)
        .select('id')
        .single();

      if (sErr || !session) { console.error('Save session error:', sErr); return; }

      for (const item of withResult) {
        try {
          const bytes = Uint8Array.from(atob(item.resultBase64!), c => c.charCodeAt(0));
          const fileName = `logo-removal/${cu.company_id}/${session.id}/${item.id}.png`;
          await supabase.storage.from('brand-assets').upload(fileName, bytes, { contentType: 'image/png', upsert: true });
          const { data: pub } = supabase.storage.from('brand-assets').getPublicUrl(fileName);

          const origBytes = await item.file.arrayBuffer();
          const origName = `logo-removal/${cu.company_id}/${session.id}/orig-${item.id}.${item.file.name.split('.').pop() || 'png'}`;
          await supabase.storage.from('brand-assets').upload(origName, new Uint8Array(origBytes), { contentType: item.mimeType, upsert: true });
          const { data: origPub } = supabase.storage.from('brand-assets').getPublicUrl(origName);

          await supabase.from('logo_removal_images').insert({
            session_id: session.id,
            original_url: origPub.publicUrl,
            result_url: pub.publicUrl,
            status: 'done',
            regions: item.regions,
          } as any);
        } catch (err) {
          console.error('Save image error:', err);
        }
      }

      console.log('✅ Session saved:', session.id);
    } catch (err) {
      console.error('saveSessionToHistory error:', err);
    }
  }, [user]);

  const reset = () => {
    items.forEach(i => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setPhase('upload');
    setSelectionIndex(0);
    setRemovalMode(null);
    setAutoDetectProgress({ current: 0, total: 0 });
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

      {/* Hero */}
      <div className="shrink-0 max-w-5xl mx-auto w-full px-4 sm:px-8 pt-8 sm:pt-14 pb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-5" style={{ backgroundColor: 'rgba(124,58,237,0.12)', color: '#A78BFA' }}>
            <Wand2 className="w-3.5 h-3.5" />
            Ferramenta IA
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">Remover logos</h1>
          <p className="text-white/40 text-base max-w-xl">
            {phase === 'upload' && (items.length === 0
              ? 'Carregue até 15 imagens e marque manualmente as áreas com logo.'
              : `${items.length} imagem${items.length !== 1 ? 'ns' : ''} selecionada${items.length !== 1 ? 's' : ''} — avance para marcar as logos.`
            )}
            {phase === 'mode-select' && 'Escolha como deseja identificar as logos.'}
            {phase === 'auto-detecting' && `Detectando logos automaticamente... ${autoDetectProgress.current}/${autoDetectProgress.total}`}
            {phase === 'selecting' && (removalMode === 'auto'
              ? `Confirme as áreas detectadas — imagem ${selectionIndex + 1} de ${items.length}.`
              : `Marque as áreas com logo — imagem ${selectionIndex + 1} de ${items.length}.`
            )}
            {phase === 'processing' && `Removendo logos com IA... ${doneCount}/${items.length} concluída${doneCount !== 1 ? 's' : ''}.`}
            {phase === 'done' && `Concluído! ${withResultCount} imagem${withResultCount !== 1 ? 'ns' : ''} processada${withResultCount !== 1 ? 's' : ''} sem logos.`}
          </p>
        </div>
        {phase !== 'upload' && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 border border-white/[0.06] hover:border-white/[0.12]"
            style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.6)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Recomeçar
          </button>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto max-w-5xl mx-auto w-full px-4 sm:px-8 pb-14">

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

        {/* Mode selection */}
        {phase === 'mode-select' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-6 py-12"
          >
            <div className="text-center mb-2">
              <h2 className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Como deseja identificar as logos?
              </h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Escolha o modo de detecção para {items.length} imagem{items.length !== 1 ? 'ns' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
              {/* Auto mode */}
              <button
                onClick={startAutoMode}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all cursor-pointer group"
                style={{
                  border: '1px solid rgba(123,80,220,0.2)',
                  backgroundColor: 'rgba(123,80,220,0.06)',
                }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors group-hover:scale-105"
                  style={{ backgroundColor: 'rgba(123,80,220,0.15)' }}>
                  <Wand2 className="w-6 h-6" style={{ color: '#a78bfa' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Automático</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    A IA identifica logos, links, @menções e marcas d'água automaticamente
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(123,80,220,0.12)' }}>
                  <Sparkles className="w-3 h-3" style={{ color: '#a78bfa' }} />
                  <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>Recomendado</span>
                </div>
              </button>

              {/* Manual mode */}
              <button
                onClick={startManualMode}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all cursor-pointer group"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors group-hover:scale-105"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <MousePointerClick className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Manual</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Selecione manualmente as áreas com logo em cada imagem
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <Eye className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Controle total</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Auto-detecting progress */}
        {phase === 'auto-detecting' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-6 py-16"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(123,80,220,0.12)' }}>
              <Wand2 className="w-7 h-7 animate-pulse" style={{ color: '#a78bfa' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Detectando logos automaticamente...
              </p>
              <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Analisando {autoDetectProgress.current} de {autoDetectProgress.total} imagens
              </p>
            </div>
            <div className="w-64 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: '#7B50DC' }}
                animate={{ width: `${autoDetectProgress.total > 0 ? (autoDetectProgress.current / autoDetectProgress.total) * 100 : 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {items.length > 0 && phase !== 'mode-select' && phase !== 'auto-detecting' && (
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
                      ? (removalMode === 'auto'
                        ? `Confirme as detecções — ${selectionIndex + 1} de ${items.length}`
                        : `Marcando áreas — ${selectionIndex + 1} de ${items.length}`)
                      : `Processando com IA — ${doneCount} de ${items.length}`
                    }
                  </span>
                  {phase === 'selecting' && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {readyCount} {removalMode === 'auto' ? 'confirmadas' : 'marcadas'}
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
                      onDelete={() => handleDelete(item.id)}
                      onRegenerate={() => regenerate(item.id)}
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
          {phase === 'mode-select' && 'Escolha o modo de detecção'}
          {phase === 'auto-detecting' && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Detectando logos...
            </span>
          )}
          {phase === 'selecting' && `${totalRegions} área${totalRegions !== 1 ? 's' : ''} ${removalMode === 'auto' ? 'detectada' : 'marcada'}${totalRegions !== 1 ? 's' : ''} até agora`}
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
              <button
                onClick={() => setCreateStyleOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                style={{ backgroundColor: 'rgba(123,80,220,0.15)', color: '#a78bfa', border: '1px solid rgba(123,80,220,0.25)' }}
              >
                <Sparkles className="w-4 h-4" />
                Criar Estilo
              </button>
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

      {/* Create Style Dialog */}
      <CreateStyleFromImages
        open={createStyleOpen}
        onOpenChange={setCreateStyleOpen}
        imageBase64s={items.filter(i => i.status === 'done' && i.resultBase64).map(i => i.resultBase64!)}
      />
    </div>
  );
};

export default LogoRemoverTool;
