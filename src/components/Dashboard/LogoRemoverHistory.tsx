import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Clock, Trash2, Loader2, ImageOff, Sparkles,
  ChevronLeft, Download, Package, ZoomIn, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import CreateStyleFromImages from './CreateStyleFromImages';

interface SessionRow {
  id: string;
  title: string;
  total_images: number;
  processed_images: number;
  created_at: string;
  cover_url?: string;
}

interface SessionImage {
  id: string;
  original_url: string;
  result_url: string | null;
  status: string;
}

const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';

const LogoRemoverHistory: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionImages, setSessionImages] = useState<SessionImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [createStyleOpen, setCreateStyleOpen] = useState(false);
  const [styleBase64s, setStyleBase64s] = useState<string[]>([]);
  const [preparingStyle, setPreparingStyle] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('logo_removal_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      // Fetch cover image for each session (first image)
      const sessionsWithCovers: SessionRow[] = [];
      for (const s of (data || [])) {
        const { data: imgs } = await supabase
          .from('logo_removal_images')
          .select('result_url, original_url')
          .eq('session_id', s.id)
          .limit(1);
        sessionsWithCovers.push({
          ...s,
          cover_url: imgs?.[0]?.result_url || imgs?.[0]?.original_url || undefined,
        });
      }
      setSessions(sessionsWithCovers);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const openSession = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setLoadingImages(true);
    try {
      const { data, error } = await supabase
        .from('logo_removal_images')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setSessionImages(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar imagens');
    } finally {
      setLoadingImages(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir esta sessão e todas as imagens?')) return;
    try {
      await supabase.from('logo_removal_sessions').delete().eq('id', sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSession === sessionId) {
        setSelectedSession(null);
        setSessionImages([]);
      }
      toast.success('Sessão excluída');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir');
    }
  };

  const downloadAll = async () => {
    const urls = sessionImages.filter(i => i.result_url).map(i => i.result_url!);
    if (urls.length === 0) return;
    if (urls.length === 1) {
      window.open(urls[0], '_blank');
      return;
    }
    toast.info('Preparando ZIP...');
    const zip = new JSZip();
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i]);
        const blob = await res.blob();
        zip.file(`sem-logo-${i + 1}.png`, blob);
      } catch { /* skip */ }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logos-removidas.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateStyle = async () => {
    const urls = sessionImages.filter(i => i.result_url).map(i => i.result_url!);
    if (urls.length === 0) { toast.error('Nenhuma imagem processada'); return; }

    setPreparingStyle(true);
    try {
      const base64s: string[] = [];
      for (const url of urls.slice(0, 15)) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const reader = new FileReader();
          const b64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
          base64s.push(b64);
        } catch { /* skip */ }
      }
      if (base64s.length === 0) { toast.error('Não foi possível carregar as imagens'); return; }
      setStyleBase64s(base64s);
      setCreateStyleOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao preparar imagens');
    } finally {
      setPreparingStyle(false);
    }
  };

  // ─── Session Detail View ───
  if (selectedSession) {
    const session = sessions.find(s => s.id === selectedSession);
    const resultImages = sessionImages.filter(i => i.result_url);

    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#0a0a0f' }}>
        {lightboxSrc && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }} onClick={() => setLightboxSrc(null)}>
            <button onClick={() => setLightboxSrc(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer z-10" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
              <X className="w-5 h-5" />
            </button>
            <img src={lightboxSrc} alt="" className="rounded-xl shadow-2xl" style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
          </div>
        )}

        <div className="shrink-0 px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedSession(null); setSessionImages([]); }} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {session?.title || 'Sessão'}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {session && format(new Date(session.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                {' · '}{resultImages.length} imagens processadas
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loadingImages ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sessionImages.map(img => (
                <div key={img.id} className="relative rounded-xl overflow-hidden group" style={{ border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#111116' }}>
                  <div className="w-full aspect-[4/5] overflow-hidden">
                    <img
                      src={img.result_url || img.original_url}
                      alt=""
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={() => setLightboxSrc(img.result_url || img.original_url)}
                    />
                  </div>
                  <div className="px-2.5 py-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                      {img.result_url ? 'Logo removida ✓' : 'Original'}
                    </span>
                    {img.result_url && (
                      <a href={img.result_url} download className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        <Download className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {resultImages.length > 0 && (
          <div className="shrink-0 px-6 py-4 flex items-center justify-end gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#0d0d12' }}>
            <button onClick={handleCreateStyle} disabled={preparingStyle}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'rgba(123,80,220,0.15)', color: '#a78bfa', border: '1px solid rgba(123,80,220,0.25)' }}>
              {preparingStyle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Criar Estilo
            </button>
            {resultImages.length > 1 && (
              <button onClick={downloadAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Package className="w-4 h-4" />
                Baixar ZIP ({resultImages.length})
              </button>
            )}
          </div>
        )}

        <CreateStyleFromImages open={createStyleOpen} onOpenChange={setCreateStyleOpen} imageBase64s={styleBase64s} />
      </div>
    );
  }

  // ─── Sessions List View ───
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="shrink-0 px-6 pt-6 pb-4">
        <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
          Histórico de Remoções
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {sessions.length} sessão{sessions.length !== 1 ? 'es' : ''} salva{sessions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <ImageOff className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhuma sessão salva ainda</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>As sessões são salvas automaticamente ao finalizar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <AnimatePresence>
              {sessions.map(session => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="rounded-xl overflow-hidden cursor-pointer transition-all group hover:ring-1 hover:ring-purple-500/30"
                  style={{ border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#111116' }}
                  onClick={() => openSession(session.id)}
                >
                  <div className="w-full aspect-[16/10] overflow-hidden relative" style={{ backgroundColor: '#0a0a0f' }}>
                    {session.cover_url ? (
                      <img src={session.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.1)' }} />
                      </div>
                    )}
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#f87171' }}
                      title="Excluir sessão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {format(new Date(session.created_at), "d MMM, HH:mm", { locale: ptBR })}
                      </span>
                      <span className="text-[10px]" style={{ color: 'rgba(16,185,129,0.7)' }}>
                        {session.processed_images}/{session.total_images} imagens
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoRemoverHistory;
