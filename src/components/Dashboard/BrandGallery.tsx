import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderPlus, Upload, ArrowLeft, Trash2, Loader2, 
  Image as ImageIcon, MoreVertical, Pencil, X, Folder
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

interface BrandFolder {
  id: string;
  name: string;
  color: string;
  created_at: string;
  fileCount?: number;
}

interface BrandFile {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  category: string;
  folder_id: string | null;
}

const FOLDER_COLORS = ['#7B50DC', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];

const BrandGallery: React.FC = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [folders, setFolders] = useState<BrandFolder[]>([]);
  const [files, setFiles] = useState<BrandFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<BrandFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#7B50DC');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Fetch company_id
  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).single();
      if (data) setCompanyId(data.company_id);
    };
    fetch();
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data: foldersData } = await supabase
        .from('brand_asset_folders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const { data: filesData } = await supabase
        .from('brand_assets')
        .select('id, name, file_url, file_type, category, folder_id')
        .eq('company_id', companyId);

      // Count files per folder
      const foldersWithCount = (foldersData || []).map(f => ({
        ...f,
        fileCount: (filesData || []).filter(file => file.folder_id === f.id).length,
      }));

      setFolders(foldersWithCount);
      setFiles(filesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createFolder = async () => {
    if (!newFolderName.trim() || !companyId || !user) return;
    const { error } = await supabase.from('brand_asset_folders').insert({
      company_id: companyId,
      name: newFolderName.trim(),
      color: newFolderColor,
      created_by: user.id,
    });
    if (error) { toast.error('Erro ao criar pasta'); return; }
    setNewFolderName('');
    setShowNewFolder(false);
    fetchData();
    toast.success('Pasta criada!');
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Excluir pasta e todos os arquivos?')) return;
    // Delete files in folder first
    await supabase.from('brand_assets').delete().eq('folder_id', id);
    await supabase.from('brand_asset_folders').delete().eq('id', id);
    if (currentFolder?.id === id) setCurrentFolder(null);
    fetchData();
    toast.success('Pasta excluída');
  };

  const renameFolder = async (id: string) => {
    if (!editName.trim()) return;
    await supabase.from('brand_asset_folders').update({ name: editName.trim() }).eq('id', id);
    setEditingFolder(null);
    fetchData();
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || !companyId || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const ext = file.name.split('.').pop();
        const path = `${companyId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('brand-assets').upload(path, file);
        if (uploadErr) { console.error(uploadErr); continue; }
        const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path);
        await supabase.from('brand_assets').insert({
          company_id: companyId,
          name: file.name,
          file_url: publicUrl,
          file_type: file.type.startsWith('image/') ? 'image' : 'file',
          category: 'gallery',
          folder_id: currentFolder?.id || null,
        });
      }
      fetchData();
      toast.success('Arquivos enviados!');
    } catch (err) {
      toast.error('Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    await supabase.from('brand_assets').delete().eq('id', id);
    fetchData();
  };

  const currentFiles = currentFolder
    ? files.filter(f => f.folder_id === currentFolder.id)
    : files.filter(f => !f.folder_id);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          {currentFolder && (
            <button onClick={() => setCurrentFolder(null)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold text-white">
            {currentFolder ? currentFolder.name : 'Galeria de Marca'}
          </h1>
        </div>
        <p className="text-sm text-white/30 ml-0">
          {currentFolder ? `${currentFiles.length} arquivo(s)` : `${folders.length} pasta(s) · ${files.length} arquivo(s)`}
        </p>
      </div>

      {/* Actions bar */}
      <div className="px-6 pb-4 flex gap-2 shrink-0">
        {!currentFolder && (
          <button onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer">
            <FolderPlus className="w-4 h-4" /> Nova pasta
          </button>
        )}
        <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload
          <input type="file" accept="image/*,video/*,.pdf" multiple className="hidden" onChange={e => uploadFiles(e.target.files)} disabled={uploading} />
        </label>
      </div>

      {/* New folder dialog */}
      <AnimatePresence>
        {showNewFolder && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mx-6 mb-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-3">
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta..." autoFocus
              className="w-full bg-white/[0.04] text-white text-sm px-3 py-2 rounded-lg border border-white/[0.06] outline-none focus:border-white/20"
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }} />
            <div className="flex gap-1.5">
              {FOLDER_COLORS.map(c => (
                <button key={c} onClick={() => setNewFolderColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${newFolderColor === c ? 'ring-2 ring-white/40 scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={createFolder} disabled={!newFolderName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-30 cursor-pointer">
                Criar
              </button>
              <button onClick={() => setShowNewFolder(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/40 hover:text-white/60 cursor-pointer">
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : (
          <>
            {/* Folders grid (only when not inside a folder) */}
            {!currentFolder && folders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                {folders.map(folder => (
                  <div key={folder.id}
                    className="group relative rounded-xl p-4 cursor-pointer hover:bg-white/[0.04] transition-all border border-white/[0.04] hover:border-white/[0.08]"
                    onClick={() => setCurrentFolder(folder)}
                  >
                    <Folder className="w-10 h-10 mb-2" style={{ color: folder.color }} fill={folder.color} fillOpacity={0.15} />
                    {editingFolder === folder.id ? (
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full bg-transparent text-sm text-white outline-none border-b border-white/20"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => { if (e.key === 'Enter') renameFolder(folder.id); if (e.key === 'Escape') setEditingFolder(null); }}
                        onBlur={() => renameFolder(folder.id)} />
                    ) : (
                      <p className="text-sm font-medium text-white/80 truncate">{folder.name}</p>
                    )}
                    <p className="text-[10px] text-white/30 mt-0.5">{folder.fileCount || 0} arquivos</p>
                    
                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setEditingFolder(folder.id); setEditName(folder.name); }}
                        className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 cursor-pointer">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                        className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-red-400 cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Files grid */}
            {currentFiles.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {currentFiles.map(file => (
                  <div key={file.id} className="group relative rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all">
                    <div className="aspect-square">
                      {file.file_type === 'image' ? (
                        <img src={file.file_url} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-[10px] text-white/50 truncate">{file.name}</p>
                    </div>
                    <button onClick={() => deleteFile(file.id)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ImageIcon className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-sm text-white/30">
                    {currentFolder ? 'Nenhum arquivo nesta pasta ainda' : 'Crie uma pasta e comece a organizar seus assets'}
                  </p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BrandGallery;
