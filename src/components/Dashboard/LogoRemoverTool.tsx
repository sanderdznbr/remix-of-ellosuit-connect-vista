import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import {
  Upload, X, Download, Loader2, AlertCircle,
  CheckCircle2, Eraser, Plus, RotateCcw, Package,
  ImageOff, ArrowRight,
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

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  base64?: string;
  mimeType: string;
  status: 'idle' | 'ready' | 'removing' | 'done' | 'error';
  regions: LogoRegion[];
  resultBase64?: string;
  resultMimeType?: string;
  error?: string;
}

type Phase = 'upload' | 'selecting' | 'processing' | 'done';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
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
}

const ImageCard: React.FC<CardProps> = ({ item, phase, selectionIndex, itemIndex, onRemoveImage, onDownload }) => {
  const showResult = item.status === 'done' && item.resultBase64;
  const displaySrc = showResult
    ? `data:${item.resultMimeType || 'image/png'};base64,${item.resultBase64}`
    : item.previewUrl;

  // In selecting phase, highlight current/done/pending
  const isCurrentlySelecting = phase === 'selecting' && itemIndex === selectionIndex;
  const isSelectionDone = phase === 'selecting' && item.status === 'ready';
  const isSelectionPending = phase === 'selecting' && item.status === 'idle';

  return (
    <div
      className="relative rounded-xl overflow-hidden flex flex-col transition-all"
      style={{
        border: `1px solid ${isCurrentlySelecting ? 'rgba(123,80,220,0.6)' : STATUS_COLOR[item.status] + '55'}`,
        backgroundColor: '#111116',
        boxShadow: isCurrentlySelecting ? '0 0 0 2px rgba(123,80,220,0.3)' : 'none',
      }}
    >
      {/* Image area */}
      <div className="relative w-full aspect-square overflow-hidden select-none">
        <img
          src={displaySrc}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: isSelectionPending && phase === 'selecting' && itemIndex > selectionIndex ? 'brightness(0.4)' : 'none' }}
          draggable={false}
        />

        {/* Region boxes (read-only preview) */}
        {item.regions.map(r => (
          <div
            key={r.id}
            className="absolute pointer-events-none"
            style={{
              left: `${r.x}%`, top: `${r.y}%`,
              width: `${r.width}%`, height: `${r.height}%`,
              border: '2px solid #ef4444',
              backgroundColor: 'rgba(239,68,68,0.15)',
            }}
          />
        ))}

        {/* Status overlays */}
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
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium bg-emerald-500/20 text-emerald-400" style={{ fontSize: '9px' }}>
              <CheckCircle2 className="w-2.5 h-2.5" /> Pronta
            </div>
          </div>
        )}

        {/* Current selection indicator */}
        {isCurrentlySelecting && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(123,80,220,0.12)' }}>
            <div className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-300 font-medium" style={{ fontSize: '9px' }}>Selecionando...</span>
            </div>
          </div>
        )}

        {/* Selection done badge */}
        {isSelectionDone && (
          <div className="absolute top-2 left-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium bg-emerald-500/20 text-emerald-400" style={{ fontSize: '9px' }}>
              <CheckCircle2 className="w-2.5 h-2.5" />
              {item.regions.length > 0 ? `${item.regions.length} área${item.regions.length > 1 ? 's' : ''}` : 'Pulado'}
            </div>
          </div>
        )}

        {/* Remove image button (upload phase only) */}
        {phase === 'upload' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveImage(); }}
            className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        )}
      </div>

      {/* Card footer */}
      <div
        className="px-2.5 py-2 flex items-center justify-between gap-1.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
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

// ──────────────── Main Component ────────────────
const LogoRemoverTool: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('upload');
  const [items, setItems] = useState<ImageItem[]>([]);
  const [selectionIndex, setSelectionIndex] = useState(0);

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

  // ── Start selection flow ──
  const startSelecting = () => {
    if (items.length === 0) return;
    setSelectionIndex(0);
    setPhase('selecting');
  };

  // ── Handle save from region editor (step mode) ──
  const handleSelectionSave = (regions: LogoRegion[]) => {
    const currentItem = items[selectionIndex];
    if (!currentItem) return;
    updateItem(currentItem.id, { regions, status: 'ready' });
  };

  const handleSelectionClose = () => {
    const nextIndex = selectionIndex + 1;
    if (nextIndex >= items.length) {
      // All images selected — start processing
      startRemoving();
    } else {
      setSelectionIndex(nextIndex);
    }
  };

  // ── Remove ──
  const startRemoving = async () => {
    setPhase('processing');

    // Get latest items snapshot
    setItems(currentItems => {
      const toProcess = currentItems.filter(i => i.status === 'ready');
      
      // Kick off async processing
      (async () => {
        const removeOne = async (item: ImageItem) => {
          if (item.regions.length === 0) {
            updateItem(item.id, { status: 'done' });
            return;
          }
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
        setItems(latest => {
          const successCount = latest.filter(i => i.status === 'done').length;
          toast.success(`${successCount} imagem${successCount !== 1 ? 'ns' : ''} processada${successCount !== 1 ? 's' : ''} com sucesso!`);
          return latest;
        });
      })();

      return currentItems;
    });
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
    setSelectionIndex(0);
  };

  // ── Derived ──
  const doneCount = items.filter(i => i.status === 'done').length;
  const processingCount = items.filter(i => i.status === 'removing').length;
  const withResultCount = items.filter(i => i.status === 'done' && i.resultBase64).length;
  const readyCount = items.filter(i => i.status === 'ready').length;
  const totalRegions = items.reduce((s, i) => s + i.regions.length, 0);

  // ── Current selection item ──
  const selectingItem = phase === 'selecting' ? items[selectionIndex] : null;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0a0a0f' }}>

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
                  {isDragActive ? 'Solte as imagens aqui' : 'Arraste imagens aqui ou clique para selecionar'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  JPG, PNG, WEBP · Máx. 5MB por imagem · Até 15 imagens
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

            {/* Progress bar (selecting/processing phase) */}
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

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <AnimatePresence>
                {items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ImageCard
                      item={item}
                      phase={phase}
                      selectionIndex={selectionIndex}
                      itemIndex={idx}
                      onRemoveImage={() => removeImage(item.id)}
                      onDownload={() => downloadSingle(item)}
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
          {/* Avançar button */}
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
