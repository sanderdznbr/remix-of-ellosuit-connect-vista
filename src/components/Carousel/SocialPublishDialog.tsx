import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Instagram, Sparkles, ExternalLink, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrls: string[];
  topic: string;
}

export default function SocialPublishDialog({ open, onOpenChange, imageUrls, topic }: Props) {
  const { toast } = useToast();
  const [caption, setCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

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

    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-auth', {
        body: {
          action: 'publish_instagram_direct',
          imageUrls,
          caption,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao publicar');

      setPublished(true);
      toast({ title: '✅ Publicado no Instagram!' });
    } catch (err: any) {
      toast({ title: 'Erro ao publicar', description: err.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setPublished(false); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" /> Publicar no Instagram
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            <p className="text-xs text-muted-foreground">{caption.length}/600 caracteres</p>
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
          {!published ? (
            <Button onClick={handlePublish} disabled={publishing || !caption.trim()}
              className="w-full gap-2 h-12 text-base font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' }}>
              {publishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Instagram className="h-5 w-5" />}
              {publishing ? 'Publicando...' : 'Publicar no Instagram'}
            </Button>
          ) : (
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Publicado com sucesso no Instagram! 🎉
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
