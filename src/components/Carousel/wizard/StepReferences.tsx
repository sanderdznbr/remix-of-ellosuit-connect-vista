import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Upload, Search, X, Loader2, Instagram, UserPlus, BadgeCheck, ImageIcon, Camera
} from 'lucide-react';
import { ReferenceImage, FamousPerson, FLOW_COLOR } from './types';

interface Props {
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  famousList: FamousPerson[];
  setFamousList: React.Dispatch<React.SetStateAction<FamousPerson[]>>;
  famousImages: { username: string; images: any[] }[];
  setFamousImages: React.Dispatch<React.SetStateAction<{ username: string; images: any[] }[]>>;
  brandAssets: { id: string; name: string; file_url: string; category: string }[];
  webImages?: string[];
}

const StepReferences: React.FC<Props> = ({
  referenceImages, setReferenceImages,
  famousList, setFamousList,
  famousImages, setFamousImages,
  brandAssets,
  webImages,
}) => {
  const { toast } = useToast();
  const [famousInput, setFamousInput] = useState('');
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [showFamousPhotos, setShowFamousPhotos] = useState<string | null>(null);
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [searchingReferences, setSearchingReferences] = useState(false);
  const [refSearchResults, setRefSearchResults] = useState<any[]>([]);
  const [showBrand, setShowBrand] = useState(false);
  const [activeTab, setActiveTab] = useState<'face' | 'style' | 'web'>('face');

  const handleFaceUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setReferenceImages(prev => [...prev, {
            url: e.target!.result as string,
            thumb: e.target!.result as string,
            label: file.name,
            source: 'upload',
            category: 'face',
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const fetchInstagramProfile = async (usernameRaw: string) => {
    const username = usernameRaw.replace(/^@/, '').replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '').trim();
    if (!username) return;
    if (famousList.some(f => f.username.toLowerCase() === username.toLowerCase())) {
      toast({ title: 'Perfil já adicionado', variant: 'destructive' });
      return;
    }
    setFetchingProfile(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'instagram-profile', username },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro');
      setFamousList(prev => [...prev, data.profile]);
      setFamousImages(prev => [...prev, { username: data.profile.username, images: data.images || [] }]);
      if (data.profile.avatar) {
        setReferenceImages(prev => [...prev, {
          url: data.profile.avatar, thumb: data.profile.avatar,
          label: `@${data.profile.username}`, source: 'web', category: 'face',
        }]);
      }
      setFamousInput('');
      toast({ title: `@${data.profile.username} adicionado!` });
    } catch (err: any) {
      toast({ title: 'Erro ao buscar perfil', description: err.message, variant: 'destructive' });
    } finally {
      setFetchingProfile(false);
    }
  };

  const removeFamous = (username: string) => {
    setFamousList(prev => prev.filter(f => f.username !== username));
    setFamousImages(prev => prev.filter(f => f.username !== username));
    setReferenceImages(prev => prev.filter(r => r.label !== `@${username}`));
    if (showFamousPhotos === username) setShowFamousPhotos(null);
  };

  const searchWebReferences = async (query: string) => {
    if (!query.trim()) return;
    setSearchingReferences(true);
    setRefSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'web-search', query: query.trim() },
      });
      if (error) throw error;
      if (data?.images) setRefSearchResults(data.images);
    } catch {
      toast({ title: 'Erro na busca', variant: 'destructive' });
    } finally {
      setSearchingReferences(false);
    }
  };

  const faceRefs = referenceImages.filter(r => r.category === 'face');
  const styleRefs = referenceImages.filter(r => r.category === 'style');

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 text-pink-600 text-sm font-semibold mb-3">
          <Camera className="h-4 w-4" /> Etapa 2 — Referências Visuais
        </div>
        <p className="text-sm text-muted-foreground">Suba fotos do rosto, busque perfis no Instagram ou adicione referências de marca</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted">
        {([
          { key: 'face' as const, label: '👤 Rosto / Pessoa', count: faceRefs.length },
          { key: 'style' as const, label: '🎨 Marca / Estilo', count: styleRefs.length },
          { key: 'web' as const, label: '🌐 Busca Web', count: (webImages?.length || 0) + referenceImages.filter(r => r.category === 'general').length },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label} {tab.count > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px]">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* FACE TAB */}
      {activeTab === 'face' && (
        <div className="space-y-4">
          {/* Upload photos */}
          <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 border-dashed border-pink-300/50 cursor-pointer hover:bg-pink-50/30 dark:hover:bg-pink-950/10 transition-colors">
            <Upload className="h-6 w-6 text-pink-500" />
            <span className="text-sm font-semibold text-foreground">Subir fotos do rosto</span>
            <span className="text-xs text-muted-foreground">JPG, PNG — múltiplas fotos para melhor fidelidade</span>
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handleFaceUpload(e.target.files)} />
          </label>

          {/* Instagram */}
          <div className="p-4 rounded-2xl border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4" style={{ color: '#E1306C' }} />
              <span className="text-sm font-semibold text-foreground">Buscar no Instagram</span>
            </div>
            <div className="flex gap-2">
              <Input value={famousInput} onChange={(e) => setFamousInput(e.target.value)}
                placeholder="@usuario ou link do Instagram"
                className="rounded-xl flex-1 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && fetchInstagramProfile(famousInput)} />
              <Button onClick={() => fetchInstagramProfile(famousInput)} disabled={fetchingProfile || !famousInput.trim()}
                size="sm" className="gap-1.5 rounded-xl" style={{ backgroundColor: '#E1306C' }}>
                {fetchingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {famousList.map((person) => (
              <div key={person.username} className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-muted/30">
                {person.avatar && <img src={person.avatar} alt={person.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-border" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{person.name}</p>
                    {person.is_verified && <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#3897f0' }} />}
                  </div>
                  <p className="text-xs text-muted-foreground">@{person.username}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowFamousPhotos(showFamousPhotos === person.username ? null : person.username)}
                  className="text-xs rounded-xl h-7">Fotos</Button>
                <button onClick={() => removeFamous(person.username)} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {showFamousPhotos && (
              <div className="grid grid-cols-5 gap-1.5 max-h-[180px] overflow-y-auto rounded-xl">
                {famousImages.find(f => f.username === showFamousPhotos)?.images.map((img: any, i: number) => (
                  <button key={i} onClick={() => {
                    setReferenceImages(prev => [...prev, { url: img.url, thumb: img.thumb || img.url, label: img.label || 'Instagram', source: 'web', category: 'face' }]);
                    toast({ title: 'Foto adicionada!' });
                  }}
                    className="rounded-lg overflow-hidden aspect-square hover:opacity-80 transition-opacity ring-1 ring-border">
                    <img src={img.thumb || img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Face refs preview */}
          {faceRefs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Referências de rosto ({faceRefs.length})</p>
              <div className="flex gap-2 flex-wrap">
                {faceRefs.map((ref, i) => {
                  const globalIdx = referenceImages.indexOf(ref);
                  return (
                    <div key={i} className="relative group">
                      <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-pink-400/40">
                        <img src={ref.thumb} alt={ref.label} className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== globalIdx))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STYLE TAB */}
      {activeTab === 'style' && (
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 border-dashed border-blue-300/50 cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors">
            <Upload className="h-6 w-6 text-blue-500" />
            <span className="text-sm font-semibold text-foreground">Subir referências de marca/estilo</span>
            <span className="text-xs text-muted-foreground">Logos, prints, screenshots do produto</span>
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => {
                if (!e.target.files) return;
                Array.from(e.target.files).forEach(file => {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    if (ev.target?.result) {
                      setReferenceImages(prev => [...prev, {
                        url: ev.target!.result as string, thumb: ev.target!.result as string,
                        label: file.name, source: 'upload', category: 'style',
                      }]);
                    }
                  };
                  reader.readAsDataURL(file);
                });
              }} />
          </label>

          {/* Brand assets */}
          {brandAssets.length > 0 && (
            <div className="p-4 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" style={{ color: FLOW_COLOR }} />
                  <span className="text-sm font-semibold text-foreground">Biblioteca de Marca</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowBrand(!showBrand)} className="text-xs h-7">
                  {showBrand ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>
              {showBrand && (
                <div className="grid grid-cols-5 gap-1.5 max-h-[200px] overflow-y-auto">
                  {brandAssets.map(asset => (
                    <button key={asset.id} onClick={() => {
                      setReferenceImages(prev => {
                        if (prev.some(r => r.url === asset.file_url)) return prev;
                        return [...prev, { url: asset.file_url, thumb: asset.file_url, label: asset.name, source: 'upload', category: 'style' }];
                      });
                      toast({ title: 'Asset de marca adicionado!' });
                    }}
                      className="rounded-lg overflow-hidden aspect-square ring-1 ring-border hover:ring-2 hover:ring-primary transition-all relative group">
                      <img src={asset.file_url} alt={asset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[9px] text-white font-medium">+ Adicionar</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {styleRefs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Referências de estilo ({styleRefs.length})</p>
              <div className="flex gap-2 flex-wrap">
                {styleRefs.map((ref, i) => {
                  const globalIdx = referenceImages.indexOf(ref);
                  return (
                    <div key={i} className="relative group">
                      <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-blue-400/40">
                        <img src={ref.thumb} alt={ref.label} className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== globalIdx))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WEB TAB */}
      {activeTab === 'web' && (
        <div className="space-y-4">
          {/* Auto images from Perplexity/Google */}
          {webImages && webImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <ImageIcon className="h-4 w-4" />
                Imagens encontradas na pesquisa ({webImages.length})
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto rounded-xl">
                {webImages.map((imgUrl, i) => {
                  const alreadyAdded = referenceImages.some(r => r.url === imgUrl);
                  return (
                    <button key={i} onClick={() => {
                      if (alreadyAdded) return;
                      setReferenceImages(prev => [...prev, {
                        url: imgUrl, thumb: imgUrl,
                        label: `Web image ${i + 1}`, source: 'web', category: 'general',
                      }]);
                      toast({ title: 'Imagem adicionada como referência!' });
                    }}
                      className={`rounded-xl overflow-hidden aspect-video ring-1 ring-border relative group ${alreadyAdded ? 'opacity-50' : 'hover:opacity-80'} transition-opacity`}>
                      <img src={imgUrl} alt={`Web ${i + 1}`} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      {alreadyAdded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold">✓ Adicionada</div>
                      )}
                      {!alreadyAdded && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-[10px] font-semibold">+ Usar no carrossel</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!webImages?.length && (
            <div className="p-4 rounded-2xl bg-muted/50 border border-dashed border-border text-center space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Nenhuma imagem da pesquisa</p>
              <p className="text-xs text-muted-foreground">Use o botão "Pesquisar na Web" na Etapa 1 para buscar imagens automaticamente</p>
            </div>
          )}

          {/* Manual search */}
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Ou busque manualmente:</p>
            <div className="flex gap-2">
              <Input value={refSearchQuery} onChange={(e) => setRefSearchQuery(e.target.value)}
                placeholder="Ex: Neymar, Cimed logo, escritório moderno..."
                className="rounded-xl flex-1"
                onKeyDown={(e) => e.key === 'Enter' && searchWebReferences(refSearchQuery)} />
              <Button onClick={() => searchWebReferences(refSearchQuery)} disabled={searchingReferences}
                className="gap-2 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                {searchingReferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
              </Button>
            </div>
          </div>

          {refSearchResults.length > 0 && (
            <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto rounded-xl">
              {refSearchResults.map((img: any, i: number) => (
                <button key={i} onClick={() => {
                  setReferenceImages(prev => [...prev, {
                    url: img.url, thumb: img.thumb || img.url,
                    label: img.alt || refSearchQuery, source: 'web', category: 'general',
                  }]);
                  toast({ title: 'Referência adicionada!' });
                }}
                  className="rounded-xl overflow-hidden aspect-square hover:opacity-80 transition-opacity ring-1 ring-border">
                  <img src={img.thumb || img.url} alt={img.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {referenceImages.length > 0 && (
        <div className="p-3 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs font-semibold text-foreground mb-1">
            📎 Total: {referenceImages.length} referências ({faceRefs.length} rosto, {styleRefs.length} marca, {referenceImages.filter(r => r.category === 'general').length} web)
          </p>
        </div>
      )}
    </div>
  );
};

export default StepReferences;
