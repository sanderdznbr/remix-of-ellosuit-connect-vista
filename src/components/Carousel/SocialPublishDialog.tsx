import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Instagram, Facebook, Sparkles, Link2, Unlink, ExternalLink, CheckCircle2 } from 'lucide-react';

interface SocialConnection {
  id: string;
  platform: string;
  page_name: string;
  instagram_username: string;
  instagram_account_id: string;
  is_active: boolean;
  token_expires_at: string;
  metadata: any;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrls: string[];
  topic: string;
}

export default function SocialPublishDialog({ open, onOpenChange, imageUrls, topic }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ ig?: boolean; fb?: boolean }>({});
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (open && user?.id) loadConnections();
  }, [open, user?.id]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user!.id).limit(1).maybeSingle();
      if (!cu) return;
      setCompanyId(cu.company_id);

      const { data } = await supabase.functions.invoke('facebook-auth', {
        body: { action: 'list_connections', companyId: cu.company_id },
      });
      if (data?.connections) setConnections(data.connections);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/gerador-de-carrosseis?fb_callback=1`;
      const { data } = await supabase.functions.invoke('facebook-auth', {
        body: { action: 'get_login_url', redirectUri },
      });
      if (data?.loginUrl) {
        // Store state for callback
        localStorage.setItem('fb_oauth_state', JSON.stringify({ companyId, userId: user!.id, redirectUri }));
        window.location.href = data.loginUrl;
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (connId: string) => {
    await supabase.functions.invoke('facebook-auth', {
      body: { action: 'disconnect', connectionId: connId },
    });
    setConnections(prev => prev.filter(c => c.id !== connId));
    toast({ title: 'Desconectado' });
  };

  const handleGenerateCaption = async () => {
    setGeneratingCaption(true);
    try {
      const { data } = await supabase.functions.invoke('facebook-auth', {
        body: { action: 'generate_caption', topic, platform: 'Instagram', tone: 'profissional', language: 'pt-BR' },
      });
      if (data?.caption) setCaption(data.caption);
    } catch (err: any) {
      toast({ title: 'Erro ao gerar legenda', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handlePublish = async () => {
    if (!caption.trim()) {
      toast({ title: 'Adicione uma legenda', variant: 'destructive' });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: 'Selecione ao menos uma plataforma', variant: 'destructive' });
      return;
    }

    setPublishing(true);
    try {
      for (const platform of selectedPlatforms) {
        const conn = connections.find(c => c.platform === platform);
        if (!conn) continue;

        const { data, error } = await supabase.functions.invoke('facebook-auth', {
          body: {
            action: platform === 'instagram' ? 'publish_instagram' : 'publish_facebook',
            connectionId: conn.id,
            imageUrls,
            caption,
            companyId,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro ao publicar');

        setPublished(prev => ({ ...prev, [platform === 'instagram' ? 'ig' : 'fb']: true }));
        toast({ title: `✅ Publicado no ${platform === 'instagram' ? 'Instagram' : 'Facebook'}!` });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao publicar', description: err.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const igConn = connections.find(c => c.platform === 'instagram');
  const fbConn = connections.find(c => c.platform === 'facebook');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" /> Publicar nas Redes Sociais
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : connections.length === 0 ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Conecte sua conta do Facebook/Instagram para publicar diretamente.
            </p>
            <Button onClick={handleConnect} disabled={connecting} className="w-full gap-2" style={{ backgroundColor: '#1877F2' }}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
              Conectar com Facebook
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected accounts */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Contas conectadas</p>
              {igConn && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium">@{igConn.instagram_username}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant={selectedPlatforms.includes('instagram') ? 'default' : 'outline'} size="sm"
                      onClick={() => togglePlatform('instagram')} className="text-xs h-7">
                      {selectedPlatforms.includes('instagram') ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                      {selectedPlatforms.includes('instagram') ? 'Selecionado' : 'Selecionar'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDisconnect(igConn.id)}>
                      <Unlink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {fbConn && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border">
                  <div className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{fbConn.page_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant={selectedPlatforms.includes('facebook') ? 'default' : 'outline'} size="sm"
                      onClick={() => togglePlatform('facebook')} className="text-xs h-7">
                      {selectedPlatforms.includes('facebook') ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                      {selectedPlatforms.includes('facebook') ? 'Selecionado' : 'Selecionar'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDisconnect(fbConn.id)}>
                      <Unlink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleConnect} className="gap-1.5 text-xs">
                <Link2 className="h-3 w-3" /> Conectar outra conta
              </Button>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Legenda</p>
                <Button variant="outline" size="sm" onClick={handleGenerateCaption} disabled={generatingCaption} className="gap-1.5 text-xs">
                  {generatingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Gerar com IA
                </Button>
              </div>
              <Textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Escreva ou gere uma legenda..."
                rows={6}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">{caption.length}/2200 caracteres</p>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Imagens ({imageUrls.length})</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {imageUrls.slice(0, 6).map((url, i) => (
                  <img key={i} src={url} alt="" className="h-16 w-12 rounded-lg object-cover flex-shrink-0 border" />
                ))}
                {imageUrls.length > 6 && (
                  <div className="h-16 w-12 rounded-lg bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                    +{imageUrls.length - 6}
                  </div>
                )}
              </div>
            </div>

            {/* Publish button */}
            <Button onClick={handlePublish} disabled={publishing || selectedPlatforms.length === 0}
              className="w-full gap-2 h-12 text-base font-semibold"
              style={{ background: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' }}>
              {publishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ExternalLink className="h-5 w-5" />}
              Publicar {selectedPlatforms.length > 0 ? `(${selectedPlatforms.join(' + ')})` : ''}
            </Button>

            {(published.ig || published.fb) && (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 text-center">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  ✅ Publicado com sucesso!
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
