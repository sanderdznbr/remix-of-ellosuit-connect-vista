import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderPlus, Upload, ArrowLeft, Trash2, Loader2, 
  Image as ImageIcon, Pencil, X, Folder, Eye, Download, Check, ChevronRight, HardDrive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import ElloDriveModal from './ElloDriveModal';

interface BrandFolder {
  id: string;
  name: string;
  color: string;
  created_at: string;
  parent_folder_id: string | null;
  fileCount?: number;
  subfolderCount?: number;
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

// --- Context Menu Component ---
interface ContextMenuProps {
  x: number;
  y: number;
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[100] min-w-[160px] rounded-xl py-1.5 shadow-2xl border border-white/[0.08]"
      style={{ top: y, left: x, backgroundColor: '#18181f' }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors cursor-pointer ${
            item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>
  );
};

// --- Preview Modal ---
interface PreviewModalProps { file: BrandFile; onClose: () => void; }
const PreviewModal: React.FC<PreviewModalProps> = ({ file, onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <div className="absolute -top-10 right-0 flex gap-2">
          <a href={file.file_url} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
            <Download className="w-4 h-4" />
          </a>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        {file.file_type === 'image' ? (
          <img src={file.file_url} alt={file.name} className="max-w-full max-h-[85vh] rounded-xl object-contain" />
        ) : file.file_url.match(/\.(mp4|webm|mov)$/i) ? (
          <video src={file.file_url} controls className="max-w-full max-h-[85vh] rounded-xl" />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <ImageIcon className="w-16 h-16 text-white/20 mb-3" />
            <p className="text-sm text-white/50">{file.name}</p>
            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs text-purple-400 hover:underline">Abrir em nova aba</a>
          </div>
        )}
        <p className="mt-3 text-xs text-white/40 truncate max-w-md">{file.name}</p>
      </motion.div>
    </motion.div>
  );
};

// --- Main Component ---
const BrandGallery: React.FC = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [folders, setFolders] = useState<BrandFolder[]>([]);
  const [files, setFiles] = useState<BrandFile[]>([]);
  const [folderPath, setFolderPath] = useState<BrandFolder[]>([]); // breadcrumb
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#7B50DC');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isDraggingExternal, setIsDraggingExternal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuProps['items'] } | null>(null);
  const [previewFile, setPreviewFile] = useState<BrandFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [draggingFiles, setDraggingFiles] = useState<string[]>([]);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [showElloDrive, setShowElloDrive] = useState(false);
  const dragCounter = useRef(0);

  const currentFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
  const currentFolderId = currentFolder?.id || null;

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (data) setCompanyId(data.company_id);
    };
    fetch();
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data: foldersData } = await supabase.from('brand_asset_folders').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      const { data: filesData } = await supabase.from('brand_assets').select('id, name, file_url, file_type, category, folder_id').eq('company_id', companyId);
      const foldersWithCount = (foldersData || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        color: f.color || '#7B50DC',
        created_at: f.created_at,
        parent_folder_id: f.parent_folder_id || null,
        fileCount: (filesData || []).filter((file: any) => file.folder_id === f.id).length,
        subfolderCount: (foldersData || []).filter((sf: any) => sf.parent_folder_id === f.id).length,
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

  const navigateIntoFolder = (folder: BrandFolder) => {
    setFolderPath(prev => [...prev, folder]);
    setSelectedFiles(new Set());
  };

  const navigateToIndex = (index: number) => {
    setFolderPath(prev => prev.slice(0, index + 1));
    setSelectedFiles(new Set());
  };

  const navigateBack = () => {
    setFolderPath(prev => prev.slice(0, -1));
    setSelectedFiles(new Set());
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !companyId || !user) return;
    const insertData: Record<string, any> = {
      company_id: companyId,
      name: newFolderName.trim(),
      color: newFolderColor,
      created_by: user.id,
    };
    if (currentFolderId) insertData.parent_folder_id = currentFolderId;
    const { error } = await supabase.from('brand_asset_folders').insert(insertData as any);
    if (error) { toast.error('Erro ao criar pasta'); return; }
    setNewFolderName('');
    setShowNewFolder(false);
    fetchData();
    toast.success('Pasta criada!');
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Excluir pasta e todos os arquivos?')) return;
    await supabase.from('brand_assets').delete().eq('folder_id', id);
    // Move subfolders to parent
    const folder = folders.find(f => f.id === id);
    // Move subfolders up to parent level
    const subfolders = folders.filter(f => f.parent_folder_id === id);
    for (const sf of subfolders) {
      await supabase.from('brand_asset_folders').update({ parent_folder_id: folder?.parent_folder_id || null } as Record<string, any>).eq('id', sf.id);
    }
    await supabase.from('brand_asset_folders').delete().eq('id', id);
    if (currentFolder?.id === id) navigateBack();
    fetchData();
    toast.success('Pasta excluída');
  };

  const renameFolder = async (id: string) => {
    if (!editName.trim()) return;
    await supabase.from('brand_asset_folders').update({ name: editName.trim() }).eq('id', id);
    setEditingFolder(null);
    fetchData();
  };

  const uploadFiles = async (fileList: FileList | File[] | null) => {
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
          company_id: companyId, name: file.name, file_url: publicUrl,
          file_type: file.type.startsWith('image/') ? 'image' : 'file',
          category: 'gallery', folder_id: currentFolderId || null,
        });
      }
      fetchData();
      toast.success('Arquivos enviados!');
    } catch {
      toast.error('Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    await supabase.from('brand_assets').delete().eq('id', id);
    fetchData();
    toast.success('Arquivo excluído');
  };

  const moveFilesToFolder = async (fileIds: string[], folderId: string) => {
    try {
      for (const id of fileIds) {
        await supabase.from('brand_assets').update({ folder_id: folderId }).eq('id', id);
      }
      setSelectedFiles(new Set());
      fetchData();
      const folder = folders.find(f => f.id === folderId);
      toast.success(`${fileIds.length} arquivo(s) movido(s) para ${folder?.name || 'pasta'}`);
    } catch {
      toast.error('Erro ao mover arquivos');
    }
  };

  const moveFolderIntoFolder = async (sourceFolderId: string, targetFolderId: string) => {
    if (sourceFolderId === targetFolderId) return;
    // Prevent moving a folder into its own descendant
    const isDescendant = (parentId: string, checkId: string): boolean => {
      const children = folders.filter(f => f.parent_folder_id === parentId);
      return children.some(c => c.id === checkId || isDescendant(c.id, checkId));
    };
    if (isDescendant(sourceFolderId, targetFolderId)) {
      toast.error('Não é possível mover uma pasta para dentro de si mesma');
      return;
    }
    try {
      await supabase.from('brand_asset_folders').update({ parent_folder_id: targetFolderId } as Record<string, any>).eq('id', sourceFolderId);
      fetchData();
      const source = folders.find(f => f.id === sourceFolderId);
      const target = folders.find(f => f.id === targetFolderId);
      toast.success(`"${source?.name}" movida para "${target?.name}"`);
    } catch {
      toast.error('Erro ao mover pasta');
    }
  };

  const toggleSelect = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  // File drag
  const handleFileDragStart = (e: React.DragEvent, fileId: string) => {
    e.stopPropagation();
    const ids = selectedFiles.has(fileId) ? Array.from(selectedFiles) : [fileId];
    setDraggingFiles(ids);
    e.dataTransfer.setData('application/file-ids', JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.textContent = `${ids.length} arquivo(s)`;
    ghost.style.cssText = 'position:absolute;top:-999px;padding:6px 14px;background:#7B50DC;color:white;border-radius:8px;font-size:12px;font-weight:600;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 40, 16);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  // Folder drag
  const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
    e.stopPropagation();
    setDraggingFolderId(folderId);
    e.dataTransfer.setData('application/folder-id', folderId);
    e.dataTransfer.effectAllowed = 'move';
    const folder = folders.find(f => f.id === folderId);
    const ghost = document.createElement('div');
    ghost.textContent = folder?.name || 'Pasta';
    ghost.style.cssText = 'position:absolute;top:-999px;padding:6px 14px;background:#7B50DC;color:white;border-radius:8px;font-size:12px;font-weight:600;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 40, 16);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingFiles.length > 0 || draggingFolderId) {
      e.dataTransfer.dropEffect = 'move';
      setDropTargetFolder(folderId);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetFolder(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolder(null);

    // Handle folder drop
    const droppedFolderId = e.dataTransfer.getData('application/folder-id');
    if (droppedFolderId) {
      moveFolderIntoFolder(droppedFolderId, folderId);
      setDraggingFolderId(null);
      return;
    }

    // Handle file drop
    if (draggingFiles.length > 0) {
      moveFilesToFolder(draggingFiles, folderId);
      setDraggingFiles([]);
    } else {
      try {
        const raw = e.dataTransfer.getData('application/file-ids');
        const ids = JSON.parse(raw);
        if (Array.isArray(ids) && ids.length) moveFilesToFolder(ids, folderId);
      } catch {
        // External files
      }
    }
  };

  const handleDragEnd = () => {
    setDraggingFiles([]);
    setDraggingFolderId(null);
    setDropTargetFolder(null);
  };

  // External drag (files from OS)
  const handleExternalDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files') && draggingFiles.length === 0 && !draggingFolderId) setIsDraggingExternal(true);
  };
  const handleExternalDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDraggingExternal(false);
  };
  const handleExternalDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleExternalDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDraggingExternal(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files?.length && draggingFiles.length === 0 && !draggingFolderId) uploadFiles(e.dataTransfer.files);
  };

  // Context menus
  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: 'Nova pasta', icon: <FolderPlus className="w-4 h-4" />, onClick: () => setShowNewFolder(true) },
        { label: 'Upload', icon: <Upload className="w-4 h-4" />, onClick: () => document.getElementById('brand-gallery-upload')?.click() },
      ],
    });
  };

  const handleFileContextMenu = (e: React.MouseEvent, file: BrandFile) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: 'Visualizar', icon: <Eye className="w-4 h-4" />, onClick: () => setPreviewFile(file) },
        { label: 'Abrir em nova aba', icon: <Download className="w-4 h-4" />, onClick: () => window.open(file.file_url, '_blank') },
        { label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, onClick: () => deleteFile(file.id), danger: true },
      ],
    });
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folder: BrandFolder) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: 'Abrir', icon: <Folder className="w-4 h-4" />, onClick: () => navigateIntoFolder(folder) },
        { label: 'Renomear', icon: <Pencil className="w-4 h-4" />, onClick: () => { setEditingFolder(folder.id); setEditName(folder.name); } },
        { label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, onClick: () => deleteFolder(folder.id), danger: true },
      ],
    });
  };

  const handleBackgroundClick = () => {
    if (selectedFiles.size > 0) setSelectedFiles(new Set());
  };

  // Current-level folders and files
  const currentFolders = folders.filter(f => f.parent_folder_id === currentFolderId);
  const currentFiles = currentFolderId
    ? files.filter(f => f.folder_id === currentFolderId)
    : files.filter(f => !f.folder_id);

  const hasSelection = selectedFiles.size > 0;

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative"
      style={{ backgroundColor: '#0a0a0f' }}
      onDragEnter={handleExternalDragEnter}
      onDragLeave={handleExternalDragLeave}
      onDragOver={handleExternalDragOver}
      onDrop={handleExternalDrop}
    >
      {/* External drag overlay */}
      <AnimatePresence>
        {isDraggingExternal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-purple-600/10 border-2 border-dashed border-purple-500/50 rounded-xl m-4 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-purple-400" />
              <p className="text-sm font-medium text-purple-300">Solte os arquivos aqui para enviar</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 pt-6 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          {folderPath.length > 0 && (
            <button onClick={navigateBack}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold text-white">
            {currentFolder ? currentFolder.name : 'Galeria de Marca'}
          </h1>
          {hasSelection && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/20 text-purple-300">
              {selectedFiles.size} selecionado(s)
            </span>
          )}
        </div>

        {/* Breadcrumb */}
        {folderPath.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-white/30 mb-2 flex-wrap">
            <button onClick={() => setFolderPath([])} className="hover:text-white/60 cursor-pointer transition-colors">
              Galeria
            </button>
            {folderPath.map((f, i) => (
              <React.Fragment key={f.id}>
                <ChevronRight className="w-3 h-3 text-white/15" />
                <button
                  onClick={() => navigateToIndex(i)}
                  className={`hover:text-white/60 cursor-pointer transition-colors ${i === folderPath.length - 1 ? 'text-white/50 font-medium' : ''}`}
                >
                  {f.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        <p className="text-sm text-white/30">
          {currentFolder
            ? `${currentFolders.length} subpasta(s) · ${currentFiles.length} arquivo(s)`
            : `${currentFolders.length} pasta(s) · ${files.length} arquivo(s)`}
        </p>
        {hasSelection && !currentFolder && (
          <p className="text-xs text-purple-400/70 mt-1">Arraste os arquivos selecionados para uma pasta</p>
        )}
      </div>

      {/* Actions bar */}
      <div className="px-6 pb-4 flex gap-2 shrink-0">
        <button onClick={() => setShowNewFolder(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer">
          <FolderPlus className="w-4 h-4" /> Nova pasta
        </button>
        <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload
          <input id="brand-gallery-upload" type="file" accept="image/*,video/*,.pdf" multiple className="hidden" onChange={e => uploadFiles(e.target.files)} disabled={uploading} />
        </label>
        <button
          onClick={() => setShowElloDrive(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-purple-300 hover:text-purple-200 bg-purple-500/[0.08] hover:bg-purple-500/[0.14] border border-purple-500/20 transition-all cursor-pointer"
        >
          <HardDrive className="w-4 h-4" /> ElloDrive
        </button>
        {hasSelection && (
          <button onClick={() => setSelectedFiles(new Set())}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 transition-all cursor-pointer">
            <X className="w-4 h-4" /> Limpar seleção
          </button>
        )}
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
                  className={`w-6 h-6 rounded-full transition-all cursor-pointer ${newFolderColor === c ? 'ring-2 ring-white/40 scale-110' : ''}`}
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
      <div className="flex-1 overflow-y-auto px-6 pb-6"
        onContextMenu={handleBackgroundContextMenu}
        onClick={handleBackgroundClick}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : (
          <>
            {/* Folders grid */}
            {currentFolders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                {currentFolders.map(folder => (
                  <div key={folder.id}
                    draggable
                    onDragStart={e => handleFolderDragStart(e, folder.id)}
                    onDragEnd={handleDragEnd}
                    className={`group relative rounded-xl p-4 cursor-pointer transition-all border ${
                      draggingFolderId === folder.id
                        ? 'opacity-40 scale-95'
                        : dropTargetFolder === folder.id
                        ? 'bg-purple-500/10 border-purple-500/40 scale-[1.02]'
                        : 'border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.04]'
                    }`}
                    onClick={(e) => { e.stopPropagation(); navigateIntoFolder(folder); }}
                    onContextMenu={e => handleFolderContextMenu(e, folder)}
                    onDragOver={e => {
                      if (draggingFolderId !== folder.id) handleFolderDragOver(e, folder.id);
                    }}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={e => handleFolderDrop(e, folder.id)}
                  >
                    <Folder className="w-10 h-10 mb-2" style={{ color: folder.color }} fill={folder.color} fillOpacity={0.15} />
                    {editingFolder === folder.id ? (
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full bg-transparent text-sm text-white outline-none border-b border-white/20"
                        autoFocus onClick={e => e.stopPropagation()}
                        onKeyDown={e => { if (e.key === 'Enter') renameFolder(folder.id); if (e.key === 'Escape') setEditingFolder(null); }}
                        onBlur={() => renameFolder(folder.id)} />
                    ) : (
                      <p className="text-sm font-medium text-white/80 truncate">{folder.name}</p>
                    )}
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {folder.fileCount || 0} arquivos
                      {(folder.subfolderCount || 0) > 0 && ` · ${folder.subfolderCount} subpasta(s)`}
                    </p>
                    {dropTargetFolder === folder.id && (
                      <div className="absolute inset-0 rounded-xl border-2 border-dashed border-purple-400/50 pointer-events-none" />
                    )}
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
                {currentFiles.map(file => {
                  const isSelected = selectedFiles.has(file.id);
                  const isBeingDragged = draggingFiles.includes(file.id);
                  return (
                    <div key={file.id}
                      draggable
                      onDragStart={e => handleFileDragStart(e, file.id)}
                      onDragEnd={handleDragEnd}
                      className={`group relative rounded-xl overflow-hidden transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-500/10 border-2 border-purple-500/40 ring-1 ring-purple-500/20'
                          : 'bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]'
                      } ${isBeingDragged ? 'opacity-40 scale-95' : ''}`}
                      onClick={e => {
                        if (e.ctrlKey || e.metaKey || e.shiftKey || !currentFolder) {
                          toggleSelect(file.id, e);
                        } else {
                          e.stopPropagation();
                          setPreviewFile(file);
                        }
                      }}
                      onContextMenu={e => handleFileContextMenu(e, file)}
                    >
                      {(!currentFolder || hasSelection) && (
                        <button
                          onClick={e => toggleSelect(file.id, e)}
                          className={`absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-500 text-white'
                              : 'bg-black/50 text-white/30 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      )}
                      <div className="aspect-square">
                        {file.file_type === 'image' ? (
                          <img src={file.file_url} alt={file.name} className="w-full h-full object-cover" draggable={false} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-white/20" />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[10px] text-white/50 truncate">{file.name}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteFile(file.id); }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              !loading && currentFolders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ImageIcon className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-sm text-white/30">
                    {currentFolder ? 'Nenhum arquivo nesta pasta ainda' : 'Crie uma pasta ou arraste arquivos aqui'}
                  </p>
                  <p className="text-xs text-white/20 mt-1">Clique com botão direito para mais opções</p>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
        )}
      </AnimatePresence>

      {/* Preview modal */}
      <AnimatePresence>
        {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      </AnimatePresence>

      {/* ElloDrive modal */}
      <AnimatePresence>
        {showElloDrive && companyId && (
          <ElloDriveModal
            open={showElloDrive}
            onClose={() => setShowElloDrive(false)}
            companyId={companyId}
            onImport={async (importedFiles) => {
              if (!companyId) return;
              for (const f of importedFiles) {
                await supabase.from('brand_assets').insert({
                  company_id: companyId,
                  name: f.name,
                  file_url: f.url,
                  file_type: f.type,
                  category: 'gallery',
                  folder_id: currentFolderId || null,
                });
              }
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BrandGallery;
