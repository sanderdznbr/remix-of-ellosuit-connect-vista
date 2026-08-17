import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Plus, Clock, Star, Grid3X3, List, Trash2, Share2, Loader2, Pencil, Check, Sparkles, X, CheckSquare, Calendar as CalendarIcon, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface DashboardProjectsProps {
  onStartCarousel: (topic?: string) => void;
  onLoadCarousel?: (carouselItem: any) => void;
  filterMode?: 'all' | 'starred';
  searchQuery?: string;
}

const DashboardProjects: React.FC<DashboardProjectsProps> = ({ onStartCarousel, onLoadCarousel, filterMode = 'all', searchQuery = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const goCreate = () => navigate('/criar');
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [carousels, setCarousels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishDialogItem, setPublishDialogItem] = useState<any | null>(null);
  const [publishCaption, setPublishCaption] = useState('');
  const [visibleCount, setVisibleCount] = useState(9);
  const [scheduleItem, setScheduleItem] = useState<any | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);

  const openScheduleDialog = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setScheduleItem(item);
    setScheduleDate(new Date().toISOString().slice(0, 10));
  };

  const confirmSchedule = () => {
    if (!scheduleItem || !scheduleDate) return;
    try {
      const raw = localStorage.getItem('editorial_calendar_posts_v1');
      const existing = raw ? JSON.parse(raw) : [];
      const cover = scheduleItem.cover_url || scheduleItem.carousel_data?.cards?.[0]?.imageUrl || null;
      const next = [
        ...existing.filter((p: any) => p.carouselId !== scheduleItem.id),
        {
          id: crypto.randomUUID(),
          date: scheduleDate,
          carouselId: scheduleItem.id,
          title: scheduleItem.title || scheduleItem.topic || 'Post',
          cover,
        },
      ];
      localStorage.setItem('editorial_calendar_posts_v1', JSON.stringify(next));
      toast.success('Post vinculado ao calendário!');
      setScheduleItem(null);
    } catch {
      toast.error('Erro ao vincular ao calendário');
    }
  };

  // Selection & create-style state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [styleName, setStyleName] = useState('');
  const [styleDescription, setStyleDescription] = useState('');
  const [styleCoverUrl, setStyleCoverUrl] = useState<string | null>(null);
  const [creatingStyle, setCreatingStyle] = useState(false);

  const toggleSelected = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const openStyleDialog = () => {
    if (selectedIds.size === 0) return;
    const first = carousels.find(c => selectedIds.has(c.id));
    setStyleName(first?.title || first?.topic || 'Meu estilo');
    setStyleDescription('');
    setStyleCoverUrl(first?.cover_url || null);
    setStyleDialogOpen(true);
  };

  const confirmCreateStyle = async () => {
    if (!styleName.trim() || selectedIds.size === 0) return;
    setCreatingStyle(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-style-from-posts', {
        body: {
          carouselIds: Array.from(selectedIds),
          name: styleName.trim(),
          description: styleDescription.trim() || null,
          coverUrl: styleCoverUrl,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Estilo criado! Disponível só pra você em Estilos.');
      setStyleDialogOpen(false);
      exitSelection();
    } catch (err: any) {
      toast.error('Erro ao criar estilo: ' + (err?.message || 'tente novamente'));
    } finally {
      setCreatingStyle(false);
    }
  };

  const recoverCover = async (itemId: string, companyId: string) => {
    try {
      // Fetch only the first card image lazily (avoid loading full carousel_data in listing)
      const { data: carouselRow } = await supabase
        .from('generated_carousels')
        .select('carousel_data')
        .eq('id', itemId)
        .single();
      const firstImage = (carouselRow?.carousel_data as any)?.cards?.[0]?.imageUrl;
      if (!firstImage || firstImage.startsWith('data:')) {
        await supabase.functions.invoke('generate-cover-thumbnail', { body: { carousel_id: itemId } });
        const { data: updated } = await supabase.from('generated_carousels').select('cover_url').eq('id', itemId).single();
        if (updated?.cover_url) {
          setCarousels(prev => prev.map(c => c.id === itemId ? { ...c, cover_url: updated.cover_url } : c));
        }
        return;
      }
      const res = await fetch(firstImage);
      if (!res.ok) return;
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const fileName = `${companyId}/${itemId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('covers').upload(fileName, blob, { contentType: blob.type, upsert: true });
      if (uploadError) return;
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(fileName);
      if (urlData?.publicUrl) {
        const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        await supabase.from('generated_carousels').update({ cover_url: coverUrl }).eq('id', itemId);
        setCarousels(prev => prev.map(c => c.id === itemId ? { ...c, cover_url: coverUrl } : c));
      }
    } catch (err) {
      console.warn('Cover recovery failed for', itemId, err);
    }
  };

  const title = filterMode === 'starred' ? 'Favoritos' : 'Projetos';

  useEffect(() => {
    const fetchCarousels = async () => {
      if (!user) return;
      try {
        const { data: companyData } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        if (!companyData) return;

        let query = supabase
          .from('generated_carousels')
          .select('id, title, topic, created_at, card_count, cover_url, is_starred')
          .eq('company_id', companyData.company_id);

        if (filterMode === 'starred') {
          query = query.eq('is_starred', true);
        }

        const { data } = await query.order('created_at', { ascending: false }).limit(100);
        setCarousels(data || []);

        // Auto-recover missing covers in background (lazy, max 3)
        if (data) {
          const missing = data.filter(c => !c.cover_url);
          for (const item of missing.slice(0, 3)) {
            recoverCover(item.id, companyData.company_id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCarousels();
  }, [user, filterMode]);

  const toggleStar = async (e: React.MouseEvent, id: string, currentValue: boolean) => {
    e.stopPropagation();
    const newValue = !currentValue;
    setCarousels(prev => prev.map(c => c.id === id ? { ...c, is_starred: newValue } : c));
    await supabase.from('generated_carousels').update({ is_starred: newValue }).eq('id', id);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (deleteConfirmId === id) {
      const carouselToDelete = carousels.find(c => c.id === id);
      setCarousels(prev => prev.filter(c => c.id !== id));
      setDeleteConfirmId(null);
      try {
        const { error } = await supabase.from('generated_carousels').delete().eq('id', id);
        if (error) {
          // Restore on failure
          if (carouselToDelete) setCarousels(prev => [...prev, carouselToDelete]);
          toast.error('Erro ao excluir projeto');
          console.error('Delete error:', error);
        } else {
          toast.success('Projeto excluído');
        }
      } catch (err) {
        if (carouselToDelete) setCarousels(prev => [...prev, carouselToDelete]);
        toast.error('Erro ao excluir projeto');
        console.error('Delete exception:', err);
      }
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 5000);
    }
  };

  const openPublishDialog = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setPublishDialogItem(item);
    setPublishCaption(item.title || item.topic || '');
  };

  const confirmPublish = async () => {
    if (!user || !publishDialogItem) return;
    const item = publishDialogItem;
    setPublishingId(item.id);
    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          carousel_id: item.id,
          cover_url: item.cover_url || null,
          caption: publishCaption || item.title || item.topic,
        } as any);
      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          toast.info('Este projeto já foi publicado na comunidade');
        } else {
          throw error;
        }
      } else {
        toast.success('Publicado na comunidade! 🎉');
      }
    } catch (err: any) {
      toast.error('Erro ao publicar: ' + err.message);
    } finally {
      setPublishingId(null);
      setPublishDialogItem(null);
      setPublishCaption('');
    }
  };

  // Filter & sort
  const filtered = carousels.filter(c => {
    if (!localSearch) return true;
    const q = localSearch.toLowerCase();
    return (c.title || '').toLowerCase().includes(q) || (c.topic || '').toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex-1" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 md:pt-8 pb-4">
        <motion.h1
          className="text-xl md:text-2xl font-semibold mb-5"
          style={{ color: '#ffffff' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {title}
        </motion.h1>

        <motion.div
          className="flex items-center gap-3 flex-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar projetos..."
              className="w-full rounded-lg pl-9 pr-4 py-2 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
              }}
              autoFocus={!!searchQuery}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <option value="recent">Mais recentes</option>
            <option value="name">Nome A-Z</option>
            <option value="oldest">Mais antigos</option>
          </select>

          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Visualização em grade"
              aria-pressed={viewMode === 'grid'}
              className="p-2 transition-colors cursor-pointer"
              style={{ backgroundColor: viewMode === 'grid' ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'rgba(255,255,255,0.3)' }}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="Visualização em lista"
              aria-pressed={viewMode === 'list'}
              className="p-2 transition-colors cursor-pointer"
              style={{ backgroundColor: viewMode === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === 'list' ? '#fff' : 'rgba(255,255,255,0.3)' }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => selectionMode ? exitSelection() : setSelectionMode(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: selectionMode ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${selectionMode ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: selectionMode ? '#C4B5FD' : 'rgba(255,255,255,0.6)',
            }}
          >
            {selectionMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
            {selectionMode ? 'Cancelar' : 'Selecionar'}
          </button>
        </motion.div>
      </div>

      {/* Selection action bar */}
      {selectionMode && (
        <div className="px-4 md:px-8 pb-2">
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl"
            style={{ backgroundColor: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {selectedIds.size === 0 ? 'Toque nos posts para selecionar' : `${selectedIds.size} selecionado${selectedIds.size > 1 ? 's' : ''}`}
            </span>
            <button
              onClick={openStyleDialog}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Criar estilo
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 md:px-8 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}>
        <motion.div
          className={viewMode === 'grid' ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5 mt-4' : 'flex flex-col gap-1.5 mt-4'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Create new */}
          <div
            onClick={goCreate}
            className={`${
              viewMode === 'grid'
                ? 'aspect-[3/4] rounded-lg flex flex-col items-center justify-center gap-2'
                : 'rounded-lg flex items-center gap-3 px-3 py-3'
            } transition-all cursor-pointer hover:bg-white/[0.06]`}
            style={{ border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}
          >
            <Plus className="w-5 h-5" />
            <span className="text-[11px]">Novo projeto</span>
          </div>

          {/* Project cards */}
          {sorted.slice(0, visibleCount).map((item) => {
            const cover = item.cover_url && !item.cover_url.startsWith('data:') ? item.cover_url : null;

            if (viewMode === 'list') {
              return (
                <div
                  key={item.id}
                  className="rounded-lg flex items-center gap-3 px-3 py-2 transition-all cursor-pointer group hover:bg-white/[0.06]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  onClick={() => onLoadCarousel ? onLoadCarousel(item) : onStartCarousel()}
                >
                  <div
                    className="w-10 h-12 rounded-md shrink-0 overflow-hidden relative"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    {cover && (
                      <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.title || item.topic}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {item.card_count || '?'} cards · {formatDate(item.created_at)}
                    </p>
                  </div>
                  <button aria-label={item.is_starred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onClick={(e) => toggleStar(e, item.id, item.is_starred)} className="p-1 rounded-md transition-colors cursor-pointer" style={{ color: item.is_starred ? '#facc15' : 'rgba(255,255,255,0.12)' }}>
                    <Star className="w-3.5 h-3.5" fill={item.is_starred ? '#facc15' : 'none'} />
                  </button>
                  <button aria-label={deleteConfirmId === item.id ? 'Confirmar exclusão' : 'Excluir projeto'} onClick={(e) => handleDelete(e, item.id)} className="p-1 rounded-md transition-colors cursor-pointer" style={{ color: deleteConfirmId === item.id ? '#ef4444' : 'rgba(255,255,255,0.12)' }} title={deleteConfirmId === item.id ? 'Clique novamente para confirmar' : 'Excluir'}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button aria-label="Publicar na comunidade" onClick={(e) => openPublishDialog(e, item)} className="p-1 rounded-md transition-colors cursor-pointer" style={{ color: publishingId === item.id ? 'rgba(255,255,255,0.12)' : 'rgba(168,85,247,0.5)' }} title="Publicar na comunidade" disabled={publishingId === item.id}>
                    {publishingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            }

            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                className="rounded-lg overflow-hidden relative group transition-all hover:scale-[1.02] cursor-pointer aspect-[3/4]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  outline: selectionMode && isSelected ? '2px solid #8B5CF6' : undefined,
                  outlineOffset: selectionMode && isSelected ? '-2px' : undefined,
                }}
                onClick={(e) => {
                  if (selectionMode) {
                    toggleSelected(e, item.id);
                    return;
                  }
                  setActiveActionsId(null);
                  onLoadCarousel ? onLoadCarousel(item) : onStartCarousel();
                }}
              >
                {cover && (
                  <img
                    src={cover}
                    alt={item.title || item.topic}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                {/* Selection checkbox */}
                {selectionMode && (
                  <div
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-md flex items-center justify-center z-10"
                    style={{
                      backgroundColor: isSelected ? '#8B5CF6' : 'rgba(0,0,0,0.55)',
                      border: `1.5px solid ${isSelected ? '#8B5CF6' : 'rgba(255,255,255,0.5)'}`,
                    }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                )}
                {/* Starred indicator (visible when not hovering) */}
                {item.is_starred && !selectionMode && (
                  <div className="absolute top-1.5 left-1.5 p-0.5 group-hover:opacity-0 transition-opacity" style={{ color: '#facc15' }}>
                    <Star className="w-3 h-3" fill="#facc15" />
                  </div>
                )}
                {!selectionMode && (
                  <button
                    type="button"
                    aria-label={`Ações de ${item.title || item.topic || 'projeto'}`}
                    aria-expanded={activeActionsId === item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveActionsId((current) => current === item.id ? null : item.id);
                    }}
                    className="absolute top-1.5 right-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/65 text-white/70 opacity-100 backdrop-blur-sm transition-all md:opacity-0 md:group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}
                {/* Hover overlay (hidden in selection mode) */}
                {!selectionMode && (
                  <div
                    className={`absolute inset-0 flex flex-col justify-end transition-all duration-300 ${
                      activeActionsId === item.id
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto'
                    }`}
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 80%)',
                    }}
                  >
                    <div className="flex flex-col gap-0.5 px-3 pb-3">
                      <button
                        aria-label={`Editar ${item.title || item.topic || 'projeto'}`}
                        onClick={(e) => { e.stopPropagation(); setActiveActionsId(null); onLoadCarousel ? onLoadCarousel(item) : onStartCarousel(); }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Editar</span>
                      </button>
                      <button
                        aria-label={`Compartilhar ${item.title || item.topic || 'projeto'}`}
                        onClick={(e) => openPublishDialog(e, item)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                        disabled={publishingId === item.id}
                      >
                        {publishingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span className="text-[11px]">Compartilhar</span>
                      </button>
                      <button
                        aria-label={`Mover ${item.title || item.topic || 'projeto'} para o calendário`}
                        onClick={(e) => openScheduleDialog(e, item)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Mover para calendário</span>
                      </button>
                      <button
                        aria-label={deleteConfirmId === item.id ? `Confirmar exclusão de ${item.title || item.topic || 'projeto'}` : `Excluir ${item.title || item.topic || 'projeto'}`}
                        onClick={(e) => handleDelete(e, item.id)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer hover:bg-white/10"
                        style={{ color: deleteConfirmId === item.id ? '#ef4444' : 'rgba(255,255,255,0.8)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{deleteConfirmId === item.id ? 'Confirmar' : 'Excluir'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty states */}
          {!loading && sorted.length === 0 && (
            <div className={`${viewMode === 'grid' ? 'col-span-full' : ''} flex flex-col items-center justify-center py-16 text-center`}>
              {filterMode === 'starred' ? (
                <>
                  <Star className="w-8 h-8 mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Nenhum projeto favoritado</p>
                  <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.12)' }}>Favorite projetos para acessá-los rapidamente</p>
                </>
              ) : (
                <>
                  <Clock className="w-8 h-8 mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Nenhum projeto encontrado</p>
                  <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.12)' }}>Crie seu primeiro carrossel para começar</p>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Load more */}
        {sorted.length > visibleCount && (
          <div className="flex justify-center mt-5 pb-4">
            <button
              onClick={() => setVisibleCount(prev => prev + 12)}
              className="px-5 py-2 rounded-lg text-[11px] font-medium text-white/50 hover:text-white/80 transition-all cursor-pointer"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Carregar mais
            </button>
          </div>
        )}
      </div>

      {/* Publish Dialog */}
      <Dialog open={!!publishDialogItem} onOpenChange={(open) => { if (!open) { setPublishDialogItem(null); setPublishCaption(''); } }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#fff' }}>Publicar na Comunidade</DialogTitle>
            <DialogDescription style={{ color: 'rgba(255,255,255,0.5)' }}>
              Seu projeto será visível para todos na comunidade. Adicione uma legenda para descrever seu trabalho.
            </DialogDescription>
          </DialogHeader>

          {publishDialogItem?.cover_url && (
            <div className="rounded-lg overflow-hidden aspect-video">
              <img src={publishDialogItem.cover_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Legenda</label>
            <Textarea
              value={publishCaption}
              onChange={(e) => setPublishCaption(e.target.value)}
              placeholder="Descreva seu projeto..."
              className="resize-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setPublishDialogItem(null); setPublishCaption(''); }} style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cancelar
            </Button>
            <Button
              onClick={confirmPublish}
              disabled={publishingId === publishDialogItem?.id}
              className="gap-2"
              style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}
            >
              {publishingId === publishDialogItem?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Style Dialog */}
      <Dialog open={styleDialogOpen} onOpenChange={(open) => { if (!open && !creatingStyle) setStyleDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#0f0f16', border: '1px solid rgba(255,255,255,0.08)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#fff' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#A78BFA' }} />
              Criar estilo a partir da seleção
            </DialogTitle>
            <DialogDescription style={{ color: 'rgba(255,255,255,0.5)' }}>
              {selectedIds.size} post{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}. A IA vai analisar as artes e gerar automaticamente os prompts. Só você verá esse estilo.
            </DialogDescription>
          </DialogHeader>

          {/* Cover picker */}
          <div>
            <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Capa</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {carousels.filter(c => selectedIds.has(c.id)).slice(0, 8).map(c => {
                const url = c.cover_url && !String(c.cover_url).startsWith('data:') ? c.cover_url : null;
                if (!url) return null;
                const active = styleCoverUrl === url;
                return (
                  <button
                    key={c.id}
                    onClick={() => setStyleCoverUrl(url)}
                    className="shrink-0 h-16 w-14 rounded-md overflow-hidden transition-all"
                    style={{ outline: active ? '2px solid #8B5CF6' : '1px solid rgba(255,255,255,0.08)', outlineOffset: active ? '-2px' : undefined }}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Nome</label>
            <input
              type="text"
              value={styleName}
              onChange={(e) => setStyleName(e.target.value)}
              maxLength={80}
              placeholder="Ex: Editorial Minimal Roxo"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Descrição (opcional)</label>
            <Textarea
              value={styleDescription}
              onChange={(e) => setStyleDescription(e.target.value)}
              maxLength={500}
              placeholder="O que caracteriza esse estilo..."
              rows={3}
              className="resize-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setStyleDialogOpen(false)} disabled={creatingStyle} style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cancelar
            </Button>
            <Button
              onClick={confirmCreateStyle}
              disabled={creatingStyle || !styleName.trim()}
              className="gap-2"
              style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
            >
              {creatingStyle ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</> : <><Sparkles className="w-4 h-4" /> Criar estilo</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule to calendar dialog */}
      <Dialog open={!!scheduleItem} onOpenChange={(o) => !o && setScheduleItem(null)}>
        <DialogContent style={{ backgroundColor: '#0f0f15', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-purple-400" /> Mover para o calendário
            </DialogTitle>
            <DialogDescription style={{ color: 'rgba(255,255,255,0.5)' }}>
              Escolha a data em que este post será publicado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', colorScheme: 'dark' }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setScheduleItem(null)} style={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button onClick={confirmSchedule} disabled={!scheduleDate} className="gap-2" style={{ backgroundColor: '#8B5CF6', color: '#fff' }}>
              <CalendarIcon className="w-4 h-4" /> Vincular à data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardProjects;
