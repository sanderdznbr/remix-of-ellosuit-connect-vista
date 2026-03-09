import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import {
  Upload, X, Scan, Download, Loader2, AlertCircle,
  CheckCircle2, Eraser, Plus, RotateCcw, Package,
  MousePointer2, Pencil, ImageOff
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface LogoRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  base64?: string;
  mimeType: string;
  status: 'idle' | 'detecting' | 'detected' | 'removing' | 'done' | 'error';
  regions: LogoRegion[];
  resultBase64?: string;
  resultMimeType?: string;
  error?: string;
}

type Phase = 'upload' | 'detecting' | 'ready' | 'processing' | 'done';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const STATUS_COLOR: Record<string, string> = {
  idle: 'rgba(255,255,255,0.1)',
  detecting: '#f59e0b',
  detected: '#10b981',
  removing: '#a855f7',
  done: '#10b981',
  error: '#ef4444',
};

// ──────────────── ImageCard ────────────────
interface CardProps {
  item: ImageItem;
  phase: Phase;
  isEditing: boolean;
  onToggleEdit: () => void;
  onRemoveImage: () => void;
  onRemoveRegion: (regionId: string) => void;
  onAddRegion: (region: Omit<LogoRegion, 'id'>) => void;
  onDownload: () => void;
}

const ImageCard: React.FC<CardProps> = ({
  item, phase, isEditing, onToggleEdit, onRemoveImage,
  onRemoveRegion, onAddRegion, onDownload
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });

  const getPos = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    const pos = getPos(e);
    setDrawing(true);
    setDrawStart(pos);
    setDrawCurrent(pos);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !isEditing) return;
    setDrawCurrent(getPos(e));
  };
  const onMouseUp = () => {
    if (!drawing || !isEditing) return;
    setDrawing(false);
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);
    if (w > 2 && h > 2) onAddRegion({ x, y, width: w, height: h });
  };

  const drawBox = drawing ? {
    x: Math.min(drawStart.x, drawCurrent.x),
    y: Math.min(drawStart.y, drawCurrent.y),
    w: Math.abs(drawCurrent.x - drawStart.x),
    h: Math.abs(drawCurrent.y - drawStart.y),
  } : null;

  const showResult = item.status === 'done' && item.resultBase64;
  const displaySrc = showResult
    ? `data:${item.resultMimeType || 'image/png'};base64,${item.resultBase64}`
    : item.previewUrl;

  return (
    <div className="relative rounded-xl overflow-hidden flex flex-col"
      style={{ border: `1px solid ${STATUS_COLOR[item.status]}33`, backgroundColor: '#111116' }}>

      {/* Image area */}
      <div
        ref={containerRef}
        className="relative w-full aspect-square overflow-hidden select-none"
        style={{ cursor: isEditing ? 'crosshair' : 'default' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img
          src={displaySrc}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* Region boxes */}
        {(phase === 'detecting' || phase === 'ready' || phase === 'processing') &&
          item.regions.map(r => (
            <div
              key={r.id}
              className="absolute group/box"
              style={{
                left: `${r.x}%`, top: `${r.y}%`,
                width: `${r.width}%`, height: `${r.height}%`,
                border: '2px solid #ef4444',
                backgroundColor: 'rgba(239,68,68,0.15)',
                cursor: isEditing ? 'pointer' : 'default',
              }}
              onClick={(e) => { if (isEditing) { e.stopPropagation(); onRemoveRegion(r.id); } }}
            >
              {isEditing && (
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover/box:opacity-100 transition-opacity">
                  <X className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {r.label && (
                <div className="absolute bottom-0 left-0 right-0 px-1 truncate text-[8px] text-white"
                  style={{ backgroundColor: 'rgba(239,68,68,0.8)' }}>
                  {r.label}
                </div>
              )}
            </div>
          ))}

        {/* Drawing preview */}
        {drawBox && (
          <div className="absolute pointer-events-none"
            style={{
              left: `${drawBox.x}%`, top: `${drawBox.y}%`,
              width: `${drawBox.w}%`, height: `${drawBox.h}%`,
              border: '2px dashed #f59e0b',
              backgroundColor: 'rgba(245,158,11,0.2)',
            }} />
        )}

        {/* Status overlays */}
        {item.status === 'detecting' && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-[10px] text-white/60">Detectando...</span>
            </div>
          </div>
        )}
        {item.status === 'removing' && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="text-[10px] text-white/60">Removendo...</span>
            </div>
          </div>
        )}
        {item.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-3"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <span className="text-[10px] text-red-300">{item.error || 'Erro'}</span>
            </div>
          </div>
        )}
        {item.status === 'done' && !item.resultBase64 && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-emerald-500/20 text-emerald-400">
              <ImageOff className="w-2.5 h-2.5" /> Sem logo
            </div>
          </div>
        )}
        {item.status === 'done' && item.resultBase64 && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-2.5 h-2.5" /> Pronta
            </div>
          </div>
        )}

        {/* Upload phase remove button */}
        {(phase === 'upload' || phase === 'ready') && item.status !== 'removing' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveImage(); }}
            className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        )}
      </div>

      {/* Card footer */}
      <div className="px-2.5 py-2 flex items-center justify-between gap-1.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {item.status === 'idle' ? item.file.name.slice(0, 18) + (item.file.name.length > 18 ? '…' : '') : null}
          {item.status === 'detected' ? `${item.regions.length} logo${item.regions.length !== 1 ? 's' : ''}` : null}
          {item.status === 'detecting' ? 'Analisando...' : null}
          {item.status === 'removing' ? 'Processando...' : null}
          {item.status === 'done' ? (item.resultBase64 ? 'Logo removida ✓' : 'Sem logos') : null}
          {item.status === 'error' ? 'Erro' : null}
        </span>

        <div className="flex items-center gap-1">
          {/* Edit toggle (only in ready phase) */}
          {phase === 'ready' && (item.status === 'detected' || item.status === 'error') && (
            <button
              onClick={onToggleEdit}
              title={isEditing ? 'Sair da edição' : 'Editar regiões (clique para remover, arraste para adicionar)'}
              className="w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer"
              style={{
                backgroundColor: isEditing ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                color: isEditing ? '#f59e0b' : 'rgba(255,255,255,0.35)',
              }}
            >
              {isEditing ? <MousePointer2 className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
            </button>
          )}
          {/* Download (done phase) */}
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

// ──────────────── Main Component ────────────────
const LogoRemoverTool: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('upload');
  const [items, setItems] = useState<ImageItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateItem = useCallback((id: string, updates: Partial<ImageItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  // ── Dropzone ──
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

  // ── Detect ──
  const detectAll = async () => {
    if (items.length === 0) return;
    setPhase('detecting');

    const detectOne = async (item: ImageItem) => {
      updateItem(item.id, { status: 'detecting' });
      try {
        const base64 = await fileToBase64(item.file);
        const { data, error } = await supabase.functions.invoke('logo-removal', {
          body: { action: 'detect', imageBase64: base64, mimeType: item.mimeType }
        });
        if (error) throw new Error(error.message);
        const regions: LogoRegion[] = (data.logos || []).map((l: any) => ({
          id: crypto.randomUUID(),
          x: Number(l.x), y: Number(l.y),
          width: Number(l.width), height: Number(l.height),
          label: l.label,
        }));
        updateItem(item.id, { status: 'detected', base64, regions });
      } catch (err) {
        updateItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Erro ao detectar' });
      }
    };

    await Promise.all(items.map(detectOne));
    setPhase('ready');
    toast.success('Detecção concluída! Revise as marcações e clique em Remover.');
  };

  // ── Remove ──
  const removeAll = async () => {
    const toProcess = items.filter(i => i.status === 'detected' || i.status === 'error');
    if (toProcess.length === 0) { toast.error('Nenhuma imagem pronta para processar'); return; }

    setPhase('processing');
    setEditingId(null);

    const removeOne = async (item: ImageItem) => {
      if (item.regions.length === 0) { updateItem(item.id, { status: 'done' }); return; }
      updateItem(item.id, { status: 'removing' });
      try {
        const base64 = item.base64 || await fileToBase64(item.file);
        const { data, error } = await supabase.functions.invoke('logo-removal', {
          body: {
            action: 'remove',
            imageBase64: base64,
            mimeType: item.mimeType,
            regions: item.regions.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height }))
          }
        });
        if (error) throw new Error(error.message);
        if (!data.processedImageBase64) throw new Error('Sem imagem retornada');
        updateItem(item.id, { status: 'done', resultBase64: data.processedImageBase64, resultMimeType: data.mimeType });
      } catch (err) {
        updateItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Erro ao remover' });
      }
    };

    // Batch 3 at a time
    for (let i = 0; i < toProcess.length; i += 3) {
      await Promise.all(toProcess.slice(i, i + 3).map(removeOne));
      if (i + 3 < toProcess.length) await new Promise(r => setTimeout(r, 1500));
    }

    setPhase('done');
    const successCount = items.filter(i => i.status === 'done').length;
    toast.success(`${successCount} imagem(ns) processada(s) com sucesso!`);
  };

  // ── Download ──
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
    setEditingId(null);
  };

  // ── Derived ──
  const totalRegions = items.reduce((s, i) => s + i.regions.length, 0);
  const doneCount = items.filter(i => i.status === 'done').length;
  const processingCount = items.filter(i => i.status === 'removing' || i.status === 'detecting').length;
  const withResultCount = items.filter(i => i.status === 'done' && i.resultBase64).length;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0a0a0f' }}>

      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Remover Logos
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {phase === 'upload' && 'Carregue até 15 posts — a IA detecta e remove as logos automaticamente'}
            {phase === 'detecting' && 'Analisando imagens com IA...'}
            {phase === 'ready' && `${items.length} imagem(ns) analisada(s) · ${totalRegions} região(ões) marcada(s) · Clique nas caixas vermelhas para remover ou edite manualmente`}
            {phase === 'processing' && `Removendo logos... ${doneCount}/${items.length} concluída(s)`}
            {phase === 'done' && `Concluído! ${withResultCount} imagem(ns) processada(s) sem logos`}
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

        {/* Upload dropzone (empty state) */}
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
                  {isDragActive ? 'Solte as imagens aqui' : 'Arraste posts aqui ou clique para selecionar'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  JPG, PNG, WEBP · Máx. 5MB por imagem · Até 15 posts
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Image grid */}
        {items.length > 0 && (
          <div>
            {/* "Add more" bar when in upload phase */}
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

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <AnimatePresence>
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    className="group"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ImageCard
                      item={item}
                      phase={phase}
                      isEditing={editingId === item.id}
                      onToggleEdit={() => setEditingId(prev => prev === item.id ? null : item.id)}
                      onRemoveImage={() => removeImage(item.id)}
                      onRemoveRegion={(rId) => setItems(prev => prev.map(i =>
                        i.id === item.id ? { ...i, regions: i.regions.filter(r => r.id !== rId) } : i
                      ))}
                      onAddRegion={(r) => setItems(prev => prev.map(i =>
                        i.id === item.id ? { ...i, regions: [...i.regions, { ...r, id: crypto.randomUUID() }] } : i
                      ))}
                      onDownload={() => downloadSingle(item)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Editing hint */}
            {phase === 'ready' && editingId && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
              >
                <Pencil className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-400/80">
                  Modo de edição ativo · <span className="text-amber-400">Clique numa caixa vermelha para remover</span> · <span className="text-amber-400">Arraste na imagem para adicionar nova área</span>
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#0d0d12' }}>

        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {phase === 'upload' && items.length > 0 && `${items.length} imagem(ns) selecionada(s)`}
          {phase === 'ready' && `${totalRegions} área(s) para remover`}
          {phase === 'processing' && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {processingCount > 0 ? `${processingCount} em processamento...` : 'Finalizando...'}
            </span>
          )}
          {phase === 'done' && `${withResultCount} imagem(ns) pronta(s) para download`}
        </div>

        <div className="flex items-center gap-2">
          {/* Detect button */}
          {phase === 'upload' && (
            <button
              onClick={detectAll}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#7B50DC', color: '#fff' }}
            >
              <Scan className="w-4 h-4" />
              Detectar Logos
            </button>
          )}

          {/* Remove button */}
          {phase === 'ready' && (
            <button
              onClick={removeAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
              style={{ backgroundColor: '#7B50DC', color: '#fff' }}
            >
              <Eraser className="w-4 h-4" />
              Remover Logos {totalRegions > 0 && `(${totalRegions})`}
            </button>
          )}

          {/* Processing state */}
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

          {/* Done downloads */}
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
    </div>
  );
};

export default LogoRemoverTool;
