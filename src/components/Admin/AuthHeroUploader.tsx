import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';

const SETTING_KEY = 'auth_hero_image';
const PURPLE = '#7B50DC';

const AuthHeroUploader: React.FC = () => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ellocontent_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();
    const v = (data?.value as any)?.url ?? null;
    setUrl(v);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 10MB).');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `hero-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('auth-assets')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('auth-assets').getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: setErr } = await supabase
        .from('ellocontent_settings')
        .upsert({
          key: SETTING_KEY,
          value: { url: publicUrl } as any,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        }, { onConflict: 'key' });
      if (setErr) throw setErr;

      setUrl(publicUrl);
      toast.success('Foto da tela /auth atualizada!');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!confirm('Remover a foto da tela /auth?')) return;
    setUploading(true);
    try {
      const { error } = await supabase
        .from('ellocontent_settings')
        .upsert({
          key: SETTING_KEY,
          value: { url: null } as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
      if (error) throw error;
      setUrl(null);
      toast.success('Foto removida.');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao remover.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-1">
        <ImageIcon className="w-4 h-4 text-purple-400" />
        <h3 className="text-white font-semibold text-sm">Foto da tela de login (/auth)</h3>
      </div>
      <p className="text-white/40 text-xs mb-4">
        Imagem exibida no lado esquerdo da tela <span className="text-white/60">/auth</span> em desktop. Recomendado: 1080×1920 (vertical), JPG ou PNG, até 10MB.
      </p>

      <div
        className="aspect-[3/4] max-w-[260px] rounded-xl overflow-hidden mb-4 flex items-center justify-center text-white/30 text-xs"
        style={{ backgroundColor: '#0d0d12', border: '1px dashed rgba(255,255,255,0.1)' }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : url ? (
          <img src={url} alt="Auth hero" className="w-full h-full object-cover" />
        ) : (
          <span className="uppercase tracking-[0.2em]">Sem imagem</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white cursor-pointer hover:opacity-90"
          style={{ backgroundColor: PURPLE }}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Enviando...' : url ? 'Trocar foto' : 'Enviar foto'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </label>

        {url && (
          <>
            <a
              href="/auth"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.06]"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir /auth
            </a>
            <button
              onClick={remove}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-red-300 hover:text-red-200 hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthHeroUploader;
