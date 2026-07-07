import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Loader2, Pencil, X, MessageSquareText, Image as ImageIcon, ChevronDown, Upload, Monitor, User, Palette, Sparkles, HelpCircle, Camera, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

interface PromptMedia {
  id: string;
  prompt_id: string;
  file_url: string;
  file_name: string;
  media_type: string;
  sort_order: number;
}

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  avatar_url: string | null;
  created_at: string;
}

const MEDIA_TYPES = [
  { value: 'screenshot', label: 'Screenshot / Print', icon: Monitor, description: 'Prints do app ou site para mockups' },
  { value: 'logo', label: 'Logomarca', icon: Palette, description: 'Logo da marca para branding' },
  { value: 'face', label: 'Pessoa / Rosto', icon: User, description: 'Foto de rosto para personalizar' },
  { value: 'reference', label: 'Referência / Produto', icon: Package, description: 'Fotos de produto ou referência visual' },
];

const PromptGallery: React.FC = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [promptMedia, setPromptMedia] = useState<Record<string, PromptMedia[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [uploadingMediaFor, setUploadingMediaFor] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState('screenshot');
  // For modal media uploads (before prompt is saved)
  const [modalMedia, setModalMedia] = useState<{ file: File; type: string; preview: string }[]>([]);
  const [uploadingModalMedia, setUploadingModalMedia] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (data) setCompanyId(data.company_id);
    };
    fetch();
  }, [user]);

  const fetchPrompts = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [{ data: promptsData }, { data: mediaData }] = await Promise.all([
        supabase.from('saved_prompts').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('saved_prompt_media').select('*').eq('company_id', companyId).order('sort_order', { ascending: true }),
      ]);
      setPrompts((promptsData as any[]) || []);
      const grouped: Record<string, PromptMedia[]> = {};
      ((mediaData as any[]) || []).forEach((m: PromptMedia) => {
        if (!grouped[m.prompt_id]) grouped[m.prompt_id] = [];
        grouped[m.prompt_id].push(m);
      });
      setPromptMedia(grouped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setAvatarUrl('');
    setEditingId(null);
    setShowModal(false);
    setModalMedia([]);
    setShowTips(false);
    setSelectedMediaType('screenshot');
  };

  const openNewPrompt = () => {
    resetForm();
    setShowModal(true);
  };

  const handleUploadAvatar = async (file: File) => {
    if (!companyId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${companyId}/prompt-avatars/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('brand-assets').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleAddModalMedia = (files: FileList) => {
    const newMedia = Array.from(files).map(file => ({
      file,
      type: selectedMediaType,
      preview: URL.createObjectURL(file),
    }));
    setModalMedia(prev => [...prev, ...newMedia]);
  };

  const handleRemoveModalMedia = (index: number) => {
    setModalMedia(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadMediaForPrompt = async (promptId: string, mediaItems: { file: File; type: string }[]) => {
    if (!companyId || mediaItems.length === 0) return;
    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];
      const ext = item.file.name.split('.').pop();
      const path = `${companyId}/prompt-media/${promptId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('brand-assets').upload(path, item.file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path);
      const { error: insertError } = await supabase.from('saved_prompt_media').insert({
        prompt_id: promptId,
        company_id: companyId,
        file_url: publicUrl,
        file_name: item.file.name,
        media_type: item.type,
        sort_order: i,
      } as any);
      if (insertError) throw insertError;
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !companyId || !user) return;
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('saved_prompts').update({
          title: title.trim(),
          content: content.trim(),
          avatar_url: avatarUrl || null,
        } as any).eq('id', editingId);
        // Upload any new modal media
        if (modalMedia.length > 0) {
          await uploadMediaForPrompt(editingId, modalMedia);
        }
        toast.success('Prompt atualizado!');
      } else {
        const { data: newPrompt, error } = await supabase.from('saved_prompts').insert({
          company_id: companyId,
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          avatar_url: avatarUrl || null,
        } as any).select().single();
        if (error) throw error;
        // Upload modal media for the new prompt
        if (modalMedia.length > 0 && newPrompt) {
          await uploadMediaForPrompt((newPrompt as any).id, modalMedia);
        }
        toast.success('Prompt criado!');
      }
      resetForm();
      fetchPrompts();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: SavedPrompt) => {
    setEditingId(p.id);
    setTitle(p.title);
    setContent(p.content);
    setAvatarUrl(p.avatar_url || '');
    setModalMedia([]);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este prompt?')) return;
    await supabase.from('saved_prompts').delete().eq('id', id);
    fetchPrompts();
    toast.success('Prompt excluído');
  };

  const handleUploadMedia = async (files: FileList, promptId: string) => {
    if (!companyId) return;
    setUploadingMediaFor(promptId);
    try {
      const existingCount = (promptMedia[promptId] || []).length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `${companyId}/prompt-media/${promptId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('brand-assets').upload(path, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path);
        const { error: insertError } = await supabase.from('saved_prompt_media').insert({
          prompt_id: promptId,
          company_id: companyId,
          file_url: publicUrl,
          file_name: file.name,
          media_type: selectedMediaType,
          sort_order: existingCount + i,
        } as any);
        if (insertError) throw insertError;
      }
      toast.success(`${files.length} arquivo(s) adicionado(s)`);
      fetchPrompts();
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploadingMediaFor(null);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    await supabase.from('saved_prompt_media').delete().eq('id', mediaId);
    fetchPrompts();
  };

  const existingMedia = editingId ? (promptMedia[editingId] || []) : [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Hero */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-8 sm:pt-14 pb-6 shrink-0 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-5" style={{ backgroundColor: 'rgba(124,58,237,0.12)', color: '#A78BFA' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Prompts salvos
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">Meus prompts</h1>
          <p className="text-white/40 text-base max-w-xl">
            Contextos reutilizáveis para suas marcas. Use <span className="text-purple-400">@</span> no wizard para mencionar.
          </p>
        </div>
        <button
          onClick={openNewPrompt}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white transition-all cursor-pointer"
          style={{ backgroundColor: '#8B5CF6' }}
        >
          <Plus className="w-3.5 h-3.5" /> Novo
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999]"
              onClick={resetForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div
                className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08] shadow-2xl"
                style={{ backgroundColor: '#111118' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h2 className="text-base font-semibold text-white">{editingId ? 'Editar prompt' : 'Novo prompt'}</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowTips(prev => !prev)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                      title="Dicas"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    <button onClick={resetForm} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tips section */}
                <AnimatePresence>
                  {showTips && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-5 mb-3 p-3 rounded-xl border border-purple-500/20" style={{ backgroundColor: 'rgba(123,80,220,0.06)' }}>
                        <p className="text-xs font-medium text-purple-300 mb-2">💡 Como usar prompts</p>
                        <ul className="text-[11px] text-white/40 space-y-1.5">
                          <li>• <span className="text-white/60">Título:</span> Nome da marca, persona ou contexto (ex: "Clínica Saury")</li>
                          <li>• <span className="text-white/60">Conteúdo:</span> Descreva tudo sobre a marca — tom de voz, público, valores, serviços</li>
                          <li>• <span className="text-white/60">Mídias:</span> Vincule logo, prints do app, fotos de produto ou rosto. Serão usadas automaticamente na geração</li>
                          <li>• <span className="text-white/60">Uso:</span> No wizard, digite <span className="text-purple-400">@</span> para mencionar e aplicar o contexto completo</li>
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form body */}
                <div className="px-5 pb-5 space-y-4">
                  {/* Avatar + Title */}
                  <div className="flex items-center gap-3">
                    <label className="w-14 h-14 rounded-2xl border border-white/[0.08] flex items-center justify-center cursor-pointer overflow-hidden hover:border-purple-500/30 transition-colors shrink-0"
                      style={{ backgroundColor: '#0d0d12' }}>
                      {uploading ? (
                        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                      ) : avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-white/15" />
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadAvatar(f);
                      }} />
                    </label>
                    <div className="flex-1">
                      <label className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1 block">Título / Marca</label>
                      <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ex: Clínica Saury, Empresa X..."
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-purple-500/30 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1 block">Contexto do prompt</label>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Descreva o contexto: informações da marca, tom de voz, público-alvo, serviços, diferenciais..."
                      rows={5}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-purple-500/30 resize-none transition-colors"
                    />
                  </div>

                  {/* Media section */}
                  <div>
                    <label className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-2 block">Mídias vinculadas</label>

                    {/* Existing media (when editing) */}
                    {existingMedia.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {existingMedia.map(m => {
                          const typeInfo = MEDIA_TYPES.find(t => t.value === m.media_type);
                          return (
                            <div key={m.id} className="relative group/media rounded-lg overflow-hidden border border-white/[0.06]" style={{ aspectRatio: '1' }}>
                              <img src={m.file_url} alt={m.file_name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  onClick={() => handleDeleteMedia(m.id)}
                                  className="p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                                <span className="text-[8px] text-white/50 truncate block">{typeInfo?.label || m.media_type}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* New modal media previews */}
                    {modalMedia.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {modalMedia.map((m, idx) => {
                          const typeInfo = MEDIA_TYPES.find(t => t.value === m.type);
                          return (
                            <div key={idx} className="relative group/media rounded-lg overflow-hidden border border-purple-500/20" style={{ aspectRatio: '1' }}>
                              <img src={m.preview} alt={m.file.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  onClick={() => handleRemoveModalMedia(idx)}
                                  className="p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                                <span className="text-[8px] text-white/50 truncate block">{typeInfo?.label || m.type}</span>
                              </div>
                              <div className="absolute top-1 right-1">
                                <span className="text-[7px] px-1 py-0.5 rounded bg-purple-500/30 text-purple-200">novo</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Media type picker + upload */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {MEDIA_TYPES.map(t => {
                        const Icon = t.icon;
                        const isSelected = selectedMediaType === t.value;
                        return (
                          <button
                            key={t.value}
                            onClick={() => setSelectedMediaType(t.value)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? 'rgba(123,80,220,0.1)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isSelected ? 'rgba(123,80,220,0.25)' : 'rgba(255,255,255,0.04)'}`,
                            }}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: isSelected ? '#a78bfa' : 'rgba(255,255,255,0.25)' }} />
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium truncate" style={{ color: isSelected ? '#c4b5fd' : 'rgba(255,255,255,0.5)' }}>{t.label}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <label
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed transition-all cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/[0.03]"
                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.5)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(168,85,247,0.05)'; }}
                      onDragLeave={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; if (e.dataTransfer.files?.length) handleAddModalMedia(e.dataTransfer.files); }}
                    >
                      <Upload className="w-4 h-4 text-white/20" />
                      <span className="text-xs text-white/30">Arraste ou clique para adicionar {MEDIA_TYPES.find(t => t.value === selectedMediaType)?.label.toLowerCase()}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.length) handleAddModalMedia(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!title.trim() || !content.trim() || saving}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {editingId ? 'Salvar alterações' : 'Criar prompt'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Prompt list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-white/15" />
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <MessageSquareText className="w-6 h-6 text-white/10" />
            </div>
            <p className="text-sm text-white/25">Nenhum prompt salvo</p>
            <p className="text-[11px] text-white/12 mt-1">Crie contextos reutilizáveis para suas marcas</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {prompts.map(p => {
              const media = promptMedia[p.id] || [];
              const isExpanded = expandedPromptId === p.id;
              const coverImage = p.avatar_url || (media.length > 0 ? media[0].file_url : null);
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer"
                  style={{ backgroundColor: '#111118' }}
                  onClick={() => setExpandedPromptId(isExpanded ? null : p.id)}
                >
                  {/* Cover */}
                  <div className="relative w-full" style={{ aspectRatio: '1' }}>
                    {coverImage ? (
                      <img src={coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #141420 0%, #1a1a2e 100%)' }}>
                        <MessageSquareText className="w-8 h-8 text-white/[0.06]" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    {/* Actions on hover */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); handleEdit(p); }}
                        className="p-1.5 rounded-lg backdrop-blur-sm text-white/60 hover:text-white transition-colors cursor-pointer"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                        className="p-1.5 rounded-lg backdrop-blur-sm text-red-400/60 hover:text-red-400 transition-colors cursor-pointer"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Media badge */}
                    {media.length > 0 && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <ImageIcon className="w-2.5 h-2.5 text-purple-300/70" />
                        <span className="text-[9px] text-white/50">{media.length}</span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-medium text-white/75 truncate">{p.title}</p>
                    <p className="text-[10px] text-white/25 mt-0.5 line-clamp-1">{p.content}</p>
                  </div>

                  {/* Expanded media panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 border-t border-white/[0.04] pt-2.5">
                          {media.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5 mb-2">
                              {media.map(m => (
                                <div key={m.id} className="relative group/media rounded-md overflow-hidden border border-white/[0.06]" style={{ aspectRatio: '1' }}>
                                  <img src={m.file_url} alt={m.file_name} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={e => { e.stopPropagation(); handleDeleteMedia(m.id); }} className="p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 cursor-pointer">
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <label
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-dashed cursor-pointer hover:border-purple-500/30 transition-colors"
                            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            {uploadingMediaFor === p.id ? (
                              <Loader2 className="w-3 h-3 text-white/30 animate-spin" />
                            ) : (
                              <Upload className="w-3 h-3 text-white/20" />
                            )}
                            <span className="text-[10px] text-white/25">Adicionar</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) handleUploadMedia(e.target.files, p.id); e.target.value = ''; }} />
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptGallery;
