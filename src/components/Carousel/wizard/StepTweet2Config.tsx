import React, { useRef } from 'react';
import { Camera, Check, Globe, Image, Moon, Sun, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface Tweet2Engagement {
  likes: string;
  retweets: string;
  replies: string;
  views: string;
  bookmarks: string;
}

export interface Tweet2Config {
  profilePhoto: string | null;
  displayName: string;
  username: string;
  isVerified: boolean;
  tweetTexts: string[];
  tweetPhotos: (string | null)[];
  photoMode: 'none' | 'manual' | 'web';
  photoFit: 'cover' | 'contain' | 'fill';
  contentMode: 'static' | 'carousel';
  cardCount: number;
  photoCardCount: number;
  theme: 'light' | 'dark';
  engagement: Tweet2Engagement;
  showEngagement: boolean;
}

export const DEFAULT_TWEET2_CONFIG: Tweet2Config = {
  profilePhoto: null,
  displayName: '',
  username: '',
  isVerified: false,
  tweetTexts: [''],
  tweetPhotos: [null],
  photoMode: 'none',
  photoFit: 'cover',
  contentMode: 'static',
  cardCount: 1,
  photoCardCount: 1,
  theme: 'light',
  engagement: { likes: '', retweets: '', replies: '', views: '', bookmarks: '' },
  showEngagement: false,
};

interface Props {
  config: Tweet2Config;
  setConfig: (config: Tweet2Config) => void;
}

const StepTweet2Config: React.FC<Props> = ({ config, setConfig }) => {
  const profileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const update = (partial: Partial<Tweet2Config>) => setConfig({ ...config, ...partial });

  const readAsDataUrl = (file: File, callback: (value: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') callback(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const updateCardCount = (count: number) => {
    const nextTexts = [...config.tweetTexts];
    const nextPhotos = [...config.tweetPhotos];
    while (nextTexts.length < count) {
      nextTexts.push('');
      nextPhotos.push(null);
    }
    const newPhotoCount = Math.min(config.photoCardCount, count);
    update({ cardCount: count, photoCardCount: newPhotoCount, contentMode: count > 1 ? 'carousel' : 'static', tweetTexts: nextTexts.slice(0, count), tweetPhotos: nextPhotos.slice(0, count) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">tweet2</h2>
        <p className="text-sm text-white/40">Fluxo novo e isolado do Tweet Mode antigo.</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Tema visual</p>
        <div className="flex gap-2">
          {[{ value: 'light' as const, icon: Sun, label: 'Claro' }, { value: 'dark' as const, icon: Moon, label: 'Escuro' }].map((option) => (
            <button key={option.value} onClick={() => update({ theme: option.value })} className={`flex-1 flex items-center gap-3 p-4 rounded-xl text-left transition-all border ${config.theme === option.value ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/[0.06]'}`}>
              <option.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Perfil</p>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {config.profilePhoto ? (
              <div className="relative">
                <img src={config.profilePhoto} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-white/10" />
                <button onClick={() => update({ profilePhoto: null })} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
              </div>
            ) : (
              <button onClick={() => profileInputRef.current?.click()} className="w-14 h-14 rounded-full border-2 border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center hover:bg-white/[0.05] transition-colors"><Camera className="w-5 h-5 text-white/30" /></button>
            )}
            <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) readAsDataUrl(file, (value) => update({ profilePhoto: value })); event.target.value = ''; }} />
          </div>

          <div className="flex-1 space-y-2">
            <Input value={config.displayName} onChange={(e) => update({ displayName: e.target.value })} placeholder="Nome de exibição" className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg text-sm h-10 focus:!border-white/20 focus:!ring-0" />
            <div className="flex gap-2">
              <Input value={config.username} onChange={(e) => update({ username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} placeholder="username" className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg text-sm h-10 focus:!border-white/20 focus:!ring-0 flex-1" />
              <button onClick={() => update({ isVerified: !config.isVerified })} className={`px-3 h-10 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${config.isVerified ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:bg-white/[0.06]'}`}><Check className="w-3.5 h-3.5" />Verificado</button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Formato</p>
        <div className="flex gap-2 flex-wrap">
          {[1, 3, 5, 7, 10].map((count) => (
            <button key={count} onClick={() => updateCardCount(count)} className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all border ${config.cardCount === count ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:bg-white/[0.06]'}`}>{count === 1 ? 'Post único' : `${count} slides`}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Fotos</p>
        <div className="flex gap-2 flex-wrap">
          {[{ key: 'none' as const, icon: X, label: 'Sem foto' }, { key: 'manual' as const, icon: Upload, label: 'Upload manual' }, { key: 'web' as const, icon: Globe, label: 'Buscar na web' }].map((option) => (
            <button key={option.key} onClick={() => update({ photoMode: option.key })} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${config.photoMode === option.key ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:bg-white/[0.06]'}`}><option.icon className="w-3.5 h-3.5" />{option.label}</button>
          ))}
        </div>
      </div>

      {config.photoMode === 'manual' && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-white/40">Upload por slide</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: config.cardCount }).map((_, index) => (
              <div key={index}>
                {config.tweetPhotos[index] ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-white/[0.08]">
                    <img src={config.tweetPhotos[index] || ''} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => { const nextPhotos = [...config.tweetPhotos]; nextPhotos[index] = null; update({ tweetPhotos: nextPhotos }); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                  </div>
                ) : (
                  <button onClick={() => photoInputRefs.current[index]?.click()} className="w-full aspect-video rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center gap-1 hover:bg-white/[0.05] transition-colors"><Image className="w-4 h-4 text-white/20" /><span className="text-[10px] text-white/20">Slide {index + 1}</span></button>
                )}
                <input ref={(el) => { photoInputRefs.current[index] = el; }} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) { readAsDataUrl(file, (value) => { const nextPhotos = [...config.tweetPhotos]; nextPhotos[index] = value; update({ tweetPhotos: nextPhotos }); }); } event.target.value = ''; }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepTweet2Config;