import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Upload, Instagram, UserPlus, BadgeCheck, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ReferenceImage, FamousPerson } from './types';

interface Props {
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  famousList: FamousPerson[];
  setFamousList: React.Dispatch<React.SetStateAction<FamousPerson[]>>;
  famousImages: { username: string; images: any[] }[];
  setFamousImages: React.Dispatch<React.SetStateAction<{ username: string; images: any[] }[]>>;
}

const StepFaceRef: React.FC<Props> = ({
  referenceImages, setReferenceImages,
  famousList, setFamousList,
  famousImages, setFamousImages,
}) => {
  const [famousInput, setFamousInput] = useState('');
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [showFamousPhotos, setShowFamousPhotos] = useState<string | null>(null);

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
    if (famousList.some(f => f.username.toLowerCase() === username.toLowerCase())) return;
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
    } catch { /* silent */ }
    finally { setFetchingProfile(false); }
  };

  const removeFamous = (username: string) => {
    setFamousList(prev => prev.filter(f => f.username !== username));
    setFamousImages(prev => prev.filter(f => f.username !== username));
    setReferenceImages(prev => prev.filter(r => r.label !== `@${username}`));
    if (showFamousPhotos === username) setShowFamousPhotos(null);
  };

  const faceRefs = referenceImages.filter(r => r.category === 'face');

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">O post deve ter algum rosto?</h2>
        <p className="text-sm text-white/40">Anexe fotos de quem deve aparecer ou busque no Instagram.</p>
      </div>

      {/* Upload */}
      <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition-colors">
        <Upload className="h-6 w-6 text-white/20" />
        <span className="text-sm font-medium text-white/50">Subir fotos do rosto</span>
        <span className="text-xs text-white/20">JPG, PNG — múltiplas fotos para melhor resultado</span>
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
          <p className="text-xs font-medium text-white/40 mb-3">Referências ({faceRefs.length})</p>
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
  );
};

export default StepFaceRef;
