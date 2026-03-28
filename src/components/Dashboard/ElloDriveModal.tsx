import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDrive, X, Loader2, FolderOpen, ArrowLeft, Check, Download, FileIcon, ImageIcon, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StorageFile {
  name: string;
  id: string | null;
  metadata?: { size?: number; mimetype?: string };
  created_at?: string;
}

interface ElloDriveModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  onImport: (files: { name: string; url: string; type: string }[]) => Promise<void>;
}

const BROWSABLE_BUCKETS = [
  { id: 'documents', label: 'Documentos' },
  { id: 'logos', label: 'Logos' },
  { id: 'brand-assets', label: 'Marca' },
  { id: 'contract-assets', label: 'Contratos' },
  { id: 'avatars', label: 'Avatares' },
  { id: 'covers', label: 'Capas' },
  { id: 'whatsapp-media', label: 'WhatsApp' },
  { id: 'tutorials', label: 'Tutoriais' },
];

const ElloDriveModal: React.FC<ElloDriveModalProps> = ({ open, onClose, companyId, onImport }) => {
  const [currentBucket, setCurrentBucket] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [items, setItems] = useState<StorageFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const fullPath = currentPath.join('/');

  const fetchContents = useCallback(async (bucket: string, path: string) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.storage.from(bucket).list(path || '', {
        limit: 200,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      const fileItems: StorageFile[] = [];
      const folderItems: string[] = [];

      (data || []).forEach(item => {
        if (item.id === null) {
          // It's a folder
          folderItems.push(item.name);
        } else {
          fileItems.push(item);
        }
      });

      setFolders(folderItems);
      setItems(fileItems);
    } catch (err) {
      console.error('[ElloDrive] Error listing:', err);
      setFolders([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && currentBucket) {
      fetchContents(currentBucket, fullPath);
    }
  }, [open, currentBucket, fullPath, fetchContents]);

  const openBucket = (bucketId: string) => {
    setCurrentBucket(bucketId);
    setCurrentPath([]);
  };

  const openFolder = (folderName: string) => {
    setCurrentPath(prev => [...prev, folderName]);
  };

  const goBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(prev => prev.slice(0, -1));
    } else {
      setCurrentBucket(null);
      setFolders([]);
      setItems([]);
    }
  };

  const goToBreadcrumb = (index: number) => {
    if (index < 0) {
      setCurrentBucket(null);
      setFolders([]);
      setItems([]);
    } else {
      setCurrentPath(prev => prev.slice(0, index + 1));
    }
  };

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleImport = async () => {
    if (!currentBucket || selected.size === 0) return;
    setImporting(true);
    try {
      const filesToImport: { name: string; url: string; type: string }[] = [];
      for (const name of selected) {
        const filePath = fullPath ? `${fullPath}/${name}` : name;
        const { data: { publicUrl } } = supabase.storage.from(currentBucket).getPublicUrl(filePath);
        const item = items.find(i => i.name === name);
        const mimetype = item?.metadata?.mimetype || '';
        const type = mimetype.startsWith('image/') ? 'image' : 'file';
        filesToImport.push({ name, url: publicUrl, type });
      }
      await onImport(filesToImport);
      toast.success(`${filesToImport.length} arquivo(s) importado(s) para o ellocontent`);
      setSelected(new Set());
    } catch {
      toast.error('Erro ao importar arquivos');
    } finally {
      setImporting(false);
    }
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name);

  const getFileUrl = (name: string) => {
    if (!currentBucket) return '';
    const filePath = fullPath ? `${fullPath}/${name}` : name;
    return supabase.storage.from(currentBucket).getPublicUrl(filePath).data.publicUrl;
  };

  if (!open) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
          style={{ backgroundColor: '#111118' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-3">
              {currentBucket && (
                <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-semibold text-white">ElloDrive</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Puxar pro ellocontent ({selected.size})
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          {currentBucket && (
            <div className="flex items-center gap-1 px-5 py-2 text-xs text-white/30 border-b border-white/[0.04] shrink-0">
              <button onClick={() => goToBreadcrumb(-1)} className="hover:text-white/60 cursor-pointer transition-colors">ElloDrive</button>
              <ChevronRight className="w-3 h-3 text-white/15" />
              <button
                onClick={() => { setCurrentPath([]); }}
                className={`hover:text-white/60 cursor-pointer transition-colors ${currentPath.length === 0 ? 'text-white/50 font-medium' : ''}`}
              >
                {BROWSABLE_BUCKETS.find(b => b.id === currentBucket)?.label || currentBucket}
              </button>
              {currentPath.map((segment, i) => (
                <React.Fragment key={i}>
                  <ChevronRight className="w-3 h-3 text-white/15" />
                  <button
                    onClick={() => goToBreadcrumb(i)}
                    className={`hover:text-white/60 cursor-pointer transition-colors ${i === currentPath.length - 1 ? 'text-white/50 font-medium' : ''}`}
                  >
                    {segment}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {!currentBucket ? (
              /* Bucket list */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {BROWSABLE_BUCKETS.map(bucket => (
                  <button
                    key={bucket.id}
                    onClick={() => openBucket(bucket.id)}
                    className="flex flex-col items-center gap-2 p-5 rounded-xl border border-white/[0.06] hover:border-purple-500/20 hover:bg-purple-500/[0.03] transition-all cursor-pointer group"
                  >
                    <FolderOpen className="w-8 h-8 text-white/20 group-hover:text-purple-400 transition-colors" />
                    <span className="text-sm text-white/50 group-hover:text-white/70 font-medium">{bucket.label}</span>
                  </button>
                ))}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-white/20" />
              </div>
            ) : folders.length === 0 && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="w-10 h-10 text-white/10 mb-3" />
                <p className="text-sm text-white/30">Nenhum arquivo encontrado aqui</p>
              </div>
            ) : (
              <>
                {/* Folders */}
                {folders.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                    {folders.map(name => (
                      <button
                        key={name}
                        onClick={() => openFolder(name)}
                        className="flex items-center gap-2 p-3 rounded-xl border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.03] transition-all cursor-pointer text-left"
                      >
                        <FolderOpen className="w-5 h-5 text-purple-400/60 shrink-0" />
                        <span className="text-xs text-white/60 truncate">{name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Files */}
                {items.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {items.map(item => {
                      const isSelected = selected.has(item.name);
                      const isImg = isImage(item.name);
                      return (
                        <div
                          key={item.name}
                          onClick={() => toggleSelect(item.name)}
                          className={`relative rounded-xl overflow-hidden cursor-pointer transition-all border ${
                            isSelected
                              ? 'border-purple-500/50 bg-purple-500/10 ring-1 ring-purple-500/20'
                              : 'border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]'
                          }`}
                        >
                          <div className="aspect-square">
                            {isImg ? (
                              <img src={getFileUrl(item.name)} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileIcon className="w-8 h-8 text-white/15" />
                              </div>
                            )}
                          </div>
                          <div className="px-2 py-1.5">
                            <p className="text-[10px] text-white/40 truncate">{item.name}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-purple-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-5 py-3 border-t border-white/[0.04] shrink-0">
            <p className="text-[11px] text-white/20 text-center">
              Navegue pelos arquivos do elloSuit e selecione para importar ao ellocontent
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ElloDriveModal;
