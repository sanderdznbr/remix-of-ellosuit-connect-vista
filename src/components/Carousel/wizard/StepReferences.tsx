import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Search, X, Loader2, Instagram, UserPlus, BadgeCheck, ImageIcon } from 'lucide-react';
import { ReferenceImage, FamousPerson } from './types';

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
  brandAssets, webImages,
}) => {
  const { toast } = useToast();
  const [famousInput, setFamousInput] = useState('');
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [showFamousPhotos, setShowFamousPhotos] = useState<string | null>(null);
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [searchingReferences, setSearchingReferences] = useState(false);
  const [refSearchResults, setRefSearchResults] = useState<any[]>([]);
  const [showBrand, setShowBrand] = useState(false);
  const [activeTab, setActiveTab] = useState<'face' | 'style' | 'web'>('web');

  const handleFaceUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setReferenceImages(prev => [...prev, {
            url: e.target!.result as string, thumb: e.target!.result as string,
            label: file.name, source: 'upload', category: 'face',
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
      toast({ title: 'Perfil já adicionado', variant: 'destructive' }); return;
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
    } finally { setFetchingProfile(false); }
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
    } catch { toast({ title: 'Erro na busca', variant: 'destructive' }); }
    finally { setSearchingReferences(false); }
  };

  const faceRefs = referenceImages.filter(r => r.category === 'face');
  const styleRefs = referenceImages.filter(r => r.category === 'style');

  return (
    <div className="space-y-8">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03]">
        {([
          { key: 'web' as const, label: 'Busca Web', count: (webImages?.length || 0) + referenceImages.filter(r => r.category === 'general').length },
          { key: 'face' as const, label: 'Rosto / Pessoa', count: faceRefs.length },
          { key: 'style' as const, label: 'Marca / Estilo', count: styleRefs.length },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 px-4 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white/[0.08] text-white'
                : 'text-white/30 hover:text-white/50'
            }`}>
            {tab.label}
            {tab.count > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/10 text-white/60 text-[10px]">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* FACE TAB */}
      {activeTab === 'face' && (
        <div className="space-y-6">
          <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition-colors">
            <Upload className="h-6 w-6 text-white/20" />
            <span className="text-sm font-medium text-white/50">Subir fotos do rosto</span>
            <span className="text-xs text-white/20">JPG, PNG — múltiplas fotos para melhor fidelidade</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFaceUpload(e.target.files)} />
          </label>

          {/* Instagram */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
              <Instagram className="h-4 w-4" />
              Buscar no Instagram
            </div>
            <div className="flex gap-2">
              <Input value={famousInput} onChange={(e) => setFamousInput(e.target.value)}
                placeholder="@usuario ou link"
                className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg flex-1 text-sm h-10 focus:!border-white/20 focus:!ring-0"
                onKeyDown={(e) => e.key === 'Enter' && fetchInstagramProfile(famousInput)} />
              <button onClick={() => fetchInstagramProfile(famousInput)} disabled={fetchingProfile || !famousInput.trim()}
                className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/60 transition-all disabled:opacity-30">
                {fetchingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </button>
            </div>

            {famousList.map((person) => (
              <div key={person.username} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                {person.avatar && <img src={person.avatar} alt={person.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white/80 truncate">{person.name}</p>
                    {person.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-white/30">@{person.username}</p>
                </div>
                <button onClick={() => setShowFamousPhotos(showFamousPhotos === person.username ? null : person.username)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] transition-all">
                  Fotos
                </button>
                <button onClick={() => removeFamous(person.username)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/20 hover:text-white/50 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {showFamousPhotos && (
              <div className="grid grid-cols-5 gap-2 max-h-[180px] overflow-y-auto">
                {famousImages.find(f => f.username === showFamousPhotos)?.images.map((img: any, i: number) => (
                  <button key={i} onClick={() => {
                    setReferenceImages(prev => [...prev, { url: img.url, thumb: img.thumb || img.url, label: img.label || 'Instagram', source: 'web', category: 'face' }]);
                    toast({ title: 'Foto adicionada!' });
                  }}
                    className="rounded-lg overflow-hidden aspect-square hover:opacity-70 transition-opacity ring-1 ring-white/[0.06]">
                    <img src={img.thumb || img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {faceRefs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/40 mb-3">Referências de rosto ({faceRefs.length})</p>
              <div className="flex gap-2 flex-wrap">
                {faceRefs.map((ref, i) => {
                  const globalIdx = referenceImages.indexOf(ref);
                  return (
                    <div key={i} className="relative group">
                      <div className="w-16 h-16 rounded-lg overflow-hidden ring-1 ring-white/10">
                        <img src={ref.thumb} alt={ref.label} className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== globalIdx))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
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
        <div className="space-y-6">
          <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition-colors">
            <Upload className="h-6 w-6 text-white/20" />
            <span className="text-sm font-medium text-white/50">Subir referências de marca/estilo</span>
            <span className="text-xs text-white/20">Logos, prints, screenshots do produto</span>
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

          {brandAssets.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/60">Biblioteca de Marca</span>
                <button onClick={() => setShowBrand(!showBrand)} className="text-xs text-white/30 hover:text-white/50 transition-colors">
                  {showBrand ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {showBrand && (
                <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto">
                  {brandAssets.map(asset => (
                    <button key={asset.id} onClick={() => {
                      setReferenceImages(prev => {
                        if (prev.some(r => r.url === asset.file_url)) return prev;
                        return [...prev, { url: asset.file_url, thumb: asset.file_url, label: asset.name, source: 'upload', category: 'style' }];
                      });
                      toast({ title: 'Asset adicionado!' });
                    }}
                      className="rounded-lg overflow-hidden aspect-square ring-1 ring-white/[0.06] hover:ring-white/20 transition-all relative group">
                      <img src={asset.file_url} alt={asset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[9px] text-white/80 font-medium">+ Adicionar</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {styleRefs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/40 mb-3">Referências de estilo ({styleRefs.length})</p>
              <div className="flex gap-2 flex-wrap">
                {styleRefs.map((ref, i) => {
                  const globalIdx = referenceImages.indexOf(ref);
                  return (
                    <div key={i} className="relative group">
                      <div className="w-16 h-16 rounded-lg overflow-hidden ring-1 ring-white/10">
                        <img src={ref.thumb} alt={ref.label} className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== globalIdx))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
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
        <div className="space-y-6">
          {webImages && webImages.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-white/40">Imagens encontradas ({webImages.length})</p>
              <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                {webImages.map((imgUrl, i) => {
                  const alreadyAdded = referenceImages.some(r => r.url === imgUrl);
                  return (
                    <div key={i} className="relative group">
                      <button onClick={() => {
                        if (alreadyAdded) return;
                        setReferenceImages(prev => [...prev, {
                          url: imgUrl, thumb: imgUrl, label: `Web image ${i + 1}`, source: 'web', category: 'general',
                        }]);
                        toast({ title: 'Imagem adicionada!' });
                      }}
                        className={`w-full rounded-lg overflow-hidden aspect-video ring-1 ring-white/[0.06] relative ${alreadyAdded ? 'opacity-40' : 'hover:opacity-80'} transition-opacity`}>
                        <img src={imgUrl} alt={`Web ${i + 1}`} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        {alreadyAdded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white/60 text-[10px] font-medium">✓</div>
                        )}
                        {!alreadyAdded && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white/80 text-[10px] font-medium">+ Usar</span>
                          </div>
                        )}
                      </button>
                      {alreadyAdded && (
                        <button onClick={() => setReferenceImages(prev => prev.filter(r => r.url !== imgUrl))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!webImages?.length && (
            <div className="py-12 text-center space-y-2">
              <ImageIcon className="h-8 w-8 text-white/10 mx-auto" />
              <p className="text-sm text-white/30">Pesquise na web na Etapa 1 para encontrar imagens</p>
            </div>
          )}

          {/* Manual search */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-white/40">Buscar imagens na web</p>
            <div className="flex gap-2">
              <Input value={refSearchQuery} onChange={(e) => setRefSearchQuery(e.target.value)}
                placeholder="Buscar imagens..."
                className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg flex-1 text-sm h-10 focus:!border-white/20 focus:!ring-0"
                onKeyDown={(e) => e.key === 'Enter' && searchWebReferences(refSearchQuery)} />
              <button onClick={() => searchWebReferences(refSearchQuery)} disabled={searchingReferences || !refSearchQuery.trim()}
                className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/60 transition-all disabled:opacity-30">
                {searchingReferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {refSearchResults.length > 0 && (
              <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
                {refSearchResults.map((img: any, i: number) => (
                  <button key={i} onClick={() => {
                    setReferenceImages(prev => [...prev, {
                      url: img.url, thumb: img.thumb || img.url, label: img.alt || 'Web', source: 'web', category: 'general',
                    }]);
                    toast({ title: 'Imagem adicionada!' });
                  }}
                    className="rounded-lg overflow-hidden aspect-video ring-1 ring-white/[0.06] hover:ring-white/20 transition-all relative group">
                    <img src={img.thumb || img.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white/80 text-[10px] font-medium">+ Usar</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepReferences;
