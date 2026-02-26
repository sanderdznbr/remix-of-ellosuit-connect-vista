import React, { useState, useEffect } from 'react';
import { Folder, Loader2, X, Check, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectFiles: (files: { url: string; name: string }[]) => void;
  label?: string;
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

const GalleryPicker: React.FC<GalleryPickerProps> = ({ open, onClose, onSelectFiles, label = 'Selecionar da Galeria' }) => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [folders, setFolders] = useState<PickerFolder[]>([]);
  const [files, setFiles] = useState<PickerFile[]>([]);
  const [loading, setLoading] = useState(true);

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
    const fetch = async () => {
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
    fetch();
  }, [companyId, open]);

  const selectFolder = (folderId: string) => {
    const folderFiles = files.filter(f => f.folder_id === folderId);
    onSelectFiles(folderFiles.map(f => ({ url: f.file_url, name: f.name })));
    onClose();
  };

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
            <h3 className="text-base font-semibold text-white">{label}</h3>
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
            ) : folders.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-10 h-10 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">Nenhuma pasta criada ainda</p>
                <p className="text-xs text-white/20 mt-1">Crie pastas na Galeria de Marca</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-white/30 mb-3">Selecione uma pasta para importar todos os arquivos:</p>
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
