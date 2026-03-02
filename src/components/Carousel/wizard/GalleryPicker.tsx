import React, { useState, useEffect } from 'react';
import { Folder, Loader2, X, Check, ImageIcon, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectFiles: (files: { url: string; name: string }[]) => void;
  label?: string;
  /** When set, user must pick exactly this many files from a folder */
  maxFiles?: number;
}

interface PickerFolder {
  id: string;
  name: string;
  color: string;
  fileCount: number;
}

interface PickerFile {
  id: string;
  name: string;
  file_url: string;
  folder_id: string | null;
}

const GalleryPicker: React.FC<GalleryPickerProps> = ({ open, onClose, onSelectFiles, label = 'Selecionar da Galeria', maxFiles }) => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [folders, setFolders] = useState<PickerFolder[]>([]);
  const [files, setFiles] = useState<PickerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !open) return;
    const init = async () => {
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).single();
      if (data) setCompanyId(data.company_id);
    };
    init();
  }, [user, open]);

  useEffect(() => {
    if (!companyId || !open) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: foldersData }, { data: filesData }] = await Promise.all([
        supabase.from('brand_asset_folders').select('*').eq('company_id', companyId).order('name'),
        supabase.from('brand_assets').select('id, name, file_url, folder_id').eq('company_id', companyId),
      ]);
      const mapped = (foldersData || []).map(f => ({
        ...f,
        fileCount: (filesData || []).filter(file => file.folder_id === f.id).length,
      }));
      setFolders(mapped);
      setFiles(filesData || []);
      setLoading(false);
    };
    fetchData();
  }, [companyId, open]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setOpenFolderId(null);
      setSelectedFileIds(new Set());
    }
  }, [open]);

  const selectFolder = (folderId: string) => {
    if (maxFiles) {
      // Open folder to let user pick individual files
      setOpenFolderId(folderId);
      setSelectedFileIds(new Set());
    } else {
      // Legacy: send all files from folder
      const folderFiles = files.filter(f => f.folder_id === folderId);
      onSelectFiles(folderFiles.map(f => ({ url: f.file_url, name: f.name })));
      onClose();
    }
  };

  const toggleFile = (fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else if (!maxFiles || next.size < maxFiles) {
        next.add(fileId);
      }
      return next;
    });
  };

  const confirmSelection = () => {
    const selected = files.filter(f => selectedFileIds.has(f.id));
    onSelectFiles(selected.map(f => ({ url: f.file_url, name: f.name })));
    onClose();
  };

  const folderFiles = openFolderId ? files.filter(f => f.folder_id === openFolderId) : [];
  const openFolder = openFolderId ? folders.find(f => f.id === openFolderId) : null;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md mx-4 rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              {openFolderId && (
                <button onClick={() => { setOpenFolderId(null); setSelectedFileIds(new Set()); }}
                  className="p-1 text-white/30 hover:text-white/60 cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <h3 className="text-base font-semibold text-white">
                {openFolderId ? openFolder?.name || 'Pasta' : label}
              </h3>
            </div>
            <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              </div>
            ) : openFolderId ? (
              /* === FILE SELECTION VIEW === */
              <div className="space-y-3">
                <p className="text-xs text-white/40">
                  {maxFiles
                    ? `Selecione até ${maxFiles} imagem(ns) · ${selectedFileIds.size}/${maxFiles} selecionada(s)`
                    : 'Selecione as imagens:'}
                </p>

                {folderFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-sm text-white/30">Pasta vazia</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {folderFiles.map(file => {
                      const isSelected = selectedFileIds.has(file.id);
                      const isDisabled = !isSelected && !!maxFiles && selectedFileIds.size >= maxFiles;
                      return (
                        <button
                          key={file.id}
                          onClick={() => toggleFile(file.id)}
                          disabled={isDisabled}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-purple-500 ring-2 ring-purple-500/30'
                              : isDisabled
                              ? 'border-white/[0.04] opacity-30 cursor-not-allowed'
                              : 'border-white/[0.06] hover:border-white/[0.15]'
                          }`}
                        >
                          <img src={file.file_url} alt={file.name} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                            <p className="text-[9px] text-white/70 truncate">{file.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Confirm button */}
                {selectedFileIds.size > 0 && (
                  <button
                    onClick={confirmSelection}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
                  >
                    Confirmar {selectedFileIds.size} foto(s)
                  </button>
                )}
              </div>
            ) : folders.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-10 h-10 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">Nenhuma pasta criada ainda</p>
                <p className="text-xs text-white/20 mt-1">Crie pastas na Galeria de Marca</p>
              </div>
            ) : (
              /* === FOLDER LIST VIEW === */
              <div className="space-y-2">
                <p className="text-xs text-white/30 mb-3">
                  {maxFiles
                    ? `Selecione uma pasta para escolher ${maxFiles} foto(s):`
                    : 'Selecione uma pasta para importar todos os arquivos:'}
                </p>
                {folders.map(folder => (
                  <button key={folder.id} onClick={() => selectFolder(folder.id)}
                    disabled={folder.fileCount === 0}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-white/[0.04] hover:border-white/[0.08]">
                    <Folder className="w-8 h-8 shrink-0" style={{ color: folder.color }} fill={folder.color} fillOpacity={0.15} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{folder.name}</p>
                      <p className="text-[10px] text-white/30">{folder.fileCount} arquivo(s)</p>
                    </div>
                    <Check className="w-4 h-4 text-white/20" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GalleryPicker;
