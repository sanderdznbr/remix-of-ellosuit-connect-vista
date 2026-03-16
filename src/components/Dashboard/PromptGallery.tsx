import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Loader2, Pencil, X, MessageSquareText, Image as ImageIcon, ChevronDown, Upload, Monitor, User, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

interface PromptMedia {
  id: string;
  prompt_id: string;
  file_url: string;
  file_name: string;
  media_type: string; // 'screenshot' | 'logo' | 'face' | 'reference'
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
  { value: 'screenshot', label: 'Screenshot / Print', icon: Monitor },
  { value: 'logo', label: 'Logomarca', icon: Palette },
  { value: 'face', label: 'Pessoa / Rosto', icon: User },
  { value: 'reference', label: 'Referência visual', icon: ImageIcon },
];

const PromptGallery: React.FC = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [promptMedia, setPromptMedia] = useState<Record<string, PromptMedia[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState('screenshot');

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
      // Group media by prompt_id
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
    setShowForm(false);
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
        toast.success('Prompt atualizado!');
      } else {
        await supabase.from('saved_prompts').insert({
          company_id: companyId,
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          avatar_url: avatarUrl || null,
        } as any);
        toast.success('Prompt salvo!');
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
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este prompt?')) return;
    await supabase.from('saved_prompts').delete().eq('id', id);
    fetchPrompts();
    toast.success('Prompt excluído');
  };

  const handleUploadMedia = async (files: FileList, promptId: string) => {
    if (!companyId) return;
    setUploadingMedia(true);
    try {
      const existingCount = (promptMedia[promptId] || []).length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `${companyId}/prompt-media/${promptId}/${crypto.randomUUID()}.${ext}`;
        console.log('[PromptMedia] Uploading file:', file.name, 'to path:', path, 'size:', file.size);
        const { error: uploadError } = await supabase.storage.from('brand-assets').upload(path, file);
        if (uploadError) {
          console.error('[PromptMedia] Upload error:', uploadError);
          throw uploadError;
        }
        const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path);
        const { error: insertError } = await supabase.from('saved_prompt_media').insert({
          prompt_id: promptId,
          company_id: companyId,
          file_url: publicUrl,
          file_name: file.name,
          media_type: selectedMediaType,
          sort_order: existingCount + i,
        } as any);
        if (insertError) {
          console.error('[PromptMedia] Insert error:', insertError);
          throw insertError;
        }
      }
      toast.success(`${files.length} arquivo(s) adicionado(s)`);
      fetchPrompts();
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    await supabase.from('saved_prompt_media').delete().eq('id', mediaId);
    fetchPrompts();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-white mb-1">Galeria de Prompts</h1>
        <p className="text-sm text-white/30">Salve prompts reutilizáveis com mídias e use com @ no wizard.</p>
      </div>

      {/* Action bar */}
      <div className="px-6 pb-4 shrink-0">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo prompt
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 pb-4 shrink-0 overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-white/[0.08] space-y-3" style={{ backgroundColor: '#111118' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white/70">{editingId ? 'Editar prompt' : 'Novo prompt'}</p>
                <button onClick={resetForm} className="p-1 text-white/30 hover:text-white/60 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-3">
                <label className="w-12 h-12 rounded-full border border-white/[0.08] flex items-center justify-center cursor-pointer overflow-hidden hover:border-white/20 transition-colors shrink-0"
                  style={{ backgroundColor: '#0d0d12' }}>
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-white/20" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadAvatar(f);
                  }} />
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Título do prompt (ex: Saury, Empresa X...)"
                  className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/15"
                />
              </div>

              {/* Content */}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Conteúdo do prompt (informações, contexto, descrições...)"
                rows={4}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/15 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim() || !content.trim() || saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 transition-all cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prompt list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-white/20" />
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquareText className="w-12 h-12 text-white/10 mb-3" />
            <p className="text-sm text-white/30">Nenhum prompt salvo ainda</p>
            <p className="text-xs text-white/15 mt-1">Crie prompts reutilizáveis para agilizar seu workflow</p>
          </div>
        ) : (
          <div className="space-y-2">
            {prompts.map(p => {
              const media = promptMedia[p.id] || [];
              const isExpanded = expandedPromptId === p.id;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-colors overflow-hidden"
                  style={{ backgroundColor: '#111118' }}
                >
                  {/* Main row */}
                  <div className="flex items-start gap-3 p-3 group">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#1a1a24' }}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <MessageSquareText className="w-4 h-4 text-white/20" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{p.title}</p>
                      <p className="text-xs text-white/30 mt-0.5 line-clamp-2">{p.content}</p>
                      {/* Media count badge */}
                      {media.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <ImageIcon className="w-3 h-3 text-purple-400/60" />
                          <span className="text-[10px] text-purple-400/60">{media.length} mídia{media.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setExpandedPromptId(isExpanded ? null : p.id)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] cursor-pointer"
                        title="Mídias vinculadas"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded media section */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 border-t border-white/[0.04] pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Mídias vinculadas</p>
                          </div>

                          {/* Media grid */}
                          {media.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {media.map(m => {
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

                          {/* Upload area */}
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedMediaType}
                              onChange={e => setSelectedMediaType(e.target.value)}
                              className="text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white/60 outline-none cursor-pointer"
                            >
                              {MEDIA_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                            <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/[0.1] hover:border-white/[0.2] cursor-pointer transition-colors">
                              {uploadingMedia ? (
                                <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5 text-white/25" />
                              )}
                              <span className="text-[11px] text-white/30">Adicionar mídia</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={e => {
                                  if (e.target.files?.length) handleUploadMedia(e.target.files, p.id);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
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
