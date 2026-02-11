import React, { useState } from 'react';
import { Link2, Copy, Check, ExternalLink, MousePointer, Globe, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TRACK_COLOR = "#3A9A1C";

export default function LinkShortenerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: companyId } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data?.company_id || null;
    },
    enabled: !!user?.id,
  });

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['tracked-links', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('tracked_links')
        .select('*, link_clicks(id)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const handleCreate = async () => {
    if (!url || !companyId || !user?.id) return;
    setCreating(true);
    try {
      const shortCode = Math.random().toString(36).substring(2, 8);
      const { error } = await supabase.from('tracked_links').insert({
        company_id: companyId,
        user_id: user.id,
        original_url: url.startsWith('http') ? url : `https://${url}`,
        short_code: shortCode,
        title: title || url,
        is_active: true,
      });
      if (error) throw error;
      toast({ title: 'Link criado!', description: 'Seu link rastreável foi gerado.' });
      setUrl('');
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['tracked-links'] });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Falha ao criar link.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (shortCode: string) => {
    const link = `${window.location.origin}/l/${shortCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(shortCode);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalClicks = links.reduce((acc: number, l: any) => acc + (l.link_clicks?.length || 0), 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Encurtador Rastreável</h1>
          <p className="text-sm text-gray-500">Encurte URLs e acompanhe cada clique em tempo real</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Links ativos', value: links.length, icon: Link2 },
            { label: 'Total de cliques', value: totalClicks, icon: MousePointer },
            { label: 'Taxa média', value: links.length > 0 ? `${(totalClicks / links.length).toFixed(1)}` : '0', icon: BarChart3 },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TRACK_COLOR}12` }}>
                  <Icon className="h-5 w-5" style={{ color: TRACK_COLOR }} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Link */}
        <Card className="rounded-3xl border-gray-100 mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Criar novo link</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Cole a URL aqui... ex: https://meusite.com/pagina"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="w-48">
                <Input
                  placeholder="Nome (opcional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!url || creating}
                className="rounded-xl h-12 px-6"
                style={{ backgroundColor: TRACK_COLOR, color: '#000' }}
              >
                {creating ? 'Criando...' : 'Encurtar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Links List */}
        {links.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seus links ({links.length})</h2>
            <div className="space-y-3">
              {links.map((link: any) => {
                const clicks = link.link_clicks?.length || 0;
                return (
                  <div
                    key={link.id}
                    className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-all"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${TRACK_COLOR}12` }}
                    >
                      <Link2 className="h-5 w-5" style={{ color: TRACK_COLOR }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{link.title || link.original_url}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {window.location.origin}/l/{link.short_code} → {link.original_url}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center px-3">
                        <div className="text-lg font-bold text-gray-900">{clicks}</div>
                        <div className="text-[10px] text-gray-400 uppercase">cliques</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-xs gap-1.5"
                        onClick={() => copyLink(link.short_code)}
                      >
                        {copiedId === link.short_code ? (
                          <><Check className="h-3.5 w-3.5 text-green-600" /> Copiado</>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" /> Copiar</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg h-8 w-8"
                        onClick={() => window.open(link.original_url, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {links.length === 0 && !isLoading && (
          <div className="text-center py-16 text-gray-400">
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum link criado</p>
            <p className="text-sm">Cole uma URL acima para criar seu primeiro link rastreável</p>
          </div>
        )}
      </div>
    </div>
  );
}
