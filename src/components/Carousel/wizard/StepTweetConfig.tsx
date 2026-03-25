import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Check, Image, Camera, Globe, Sparkles, Sun, Moon } from 'lucide-react';

export interface TweetConfig {
  profilePhoto: string | null;
  displayName: string;
  username: string;
  isVerified: boolean;
  tweetTexts: string[];
  tweetPhotos: (string | null)[];
  photoMode: 'none' | 'manual' | 'web' | 'ai';
  autoSelectPhotos: boolean;
  contentMode: 'static' | 'carousel';
  cardCount: number;
  theme: 'light' | 'dark';
}

export const DEFAULT_TWEET_CONFIG: TweetConfig = {
  profilePhoto: null,
  displayName: '',
  username: '',
  isVerified: false,
  tweetTexts: [''],
  tweetPhotos: [null],
  photoMode: 'none',
  autoSelectPhotos: true,
  contentMode: 'static',
  cardCount: 1,
  theme: 'light',
};

interface Props {
  config: TweetConfig;
  setConfig: (c: TweetConfig) => void;
}

const StepTweetConfig: React.FC<Props> = ({ config, setConfig }) => {
  const profileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const update = (partial: Partial<TweetConfig>) => setConfig({ ...config, ...partial });

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) update({ profilePhoto: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const handleCardPhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newPhotos = [...config.tweetPhotos];
      newPhotos[index] = URL.createObjectURL(file);
      update({ tweetPhotos: newPhotos });
    }
    e.target.value = '';
  };

  const updateCardCount = (count: number) => {
    const newTexts = [...config.tweetTexts];
    const newPhotos = [...config.tweetPhotos];
    while (newTexts.length < count) { newTexts.push(''); newPhotos.push(null); }
    update({ cardCount: count, tweetTexts: newTexts.slice(0, count), tweetPhotos: newPhotos.slice(0, count), contentMode: count > 1 ? 'carousel' : 'static' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Tweet Mode</h2>
        <p className="text-sm text-white/40">Configure o visual do tweet</p>
      </div>

      {/* Theme toggle */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Tema visual</p>
        <div className="flex gap-2">
          {[
            { value: 'light' as const, icon: Sun, label: 'Claro', desc: 'Fundo branco' },
            { value: 'dark' as const, icon: Moon, label: 'Escuro', desc: 'Dark mode' },
          ].map(opt => (
            <button key={opt.value} onClick={() => update({ theme: opt.value })}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl text-left transition-all border ${
                config.theme === opt.value
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:bg-white/[0.06]'
              }`}>
              <opt.icon className="w-5 h-5" />
              <div>
                <span className="text-sm font-medium block">{opt.label}</span>
                <span className="text-[10px] opacity-60">{opt.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Profile section */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Perfil</p>
        
        <div className="flex items-start gap-4">
          {/* Profile photo */}
          <div className="flex-shrink-0">
            {config.profilePhoto ? (
              <div className="relative">
                <img src={config.profilePhoto} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-white/10" />
                <button onClick={() => update({ profilePhoto: null })}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => profileInputRef.current?.click()}
                className="w-14 h-14 rounded-full border-2 border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center hover:bg-white/[0.05] transition-colors">
                <Camera className="w-5 h-5 text-white/30" />
              </button>
            )}
            <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfileUpload} />
          </div>

          <div className="flex-1 space-y-2">
            <Input value={config.displayName} onChange={(e) => update({ displayName: e.target.value })}
              placeholder="Nome de exibição" 
              className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg text-sm h-10 focus:!border-white/20 focus:!ring-0" />
            <div className="flex gap-2">
              <Input value={config.username} onChange={(e) => update({ username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                placeholder="username" 
                className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-lg text-sm h-10 focus:!border-white/20 focus:!ring-0 flex-1" />
              <button onClick={() => update({ isVerified: !config.isVerified })}
                className={`px-3 h-10 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                  config.isVerified
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:bg-white/[0.06]'
                }`}>
                <Check className="w-3.5 h-3.5" />
                Verificado
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Format */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Formato</p>
        <div className="flex gap-2">
          {[
            { value: 1, label: 'Post único' },
            { value: 3, label: '3 slides' },
            { value: 5, label: '5 slides' },
            { value: 7, label: '7 slides' },
          ].map(opt => (
            <button key={opt.value} onClick={() => updateCardCount(opt.value)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                config.cardCount === opt.value
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:bg-white/[0.06]'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Photo mode */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Fotos nos tweets</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'none' as const, icon: X, label: 'Sem foto' },
            { key: 'manual' as const, icon: Upload, label: 'Upload manual' },
            { key: 'web' as const, icon: Globe, label: 'Buscar na web' },
            { key: 'ai' as const, icon: Sparkles, label: 'Gerar com IA' },
          ].map(opt => (
            <button key={opt.key} onClick={() => update({ photoMode: opt.key })}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                config.photoMode === opt.key
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:bg-white/[0.06]'
              }`}>
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto vs Manual photo selection for web mode */}
      {config.photoMode === 'web' && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Seleção de fotos</p>
          <div className="flex gap-2">
            {[
              { value: true, label: 'Automático', desc: 'IA seleciona as melhores' },
              { value: false, label: 'Manual', desc: 'Eu escolho as fotos' },
            ].map(opt => (
              <button key={String(opt.value)} onClick={() => update({ autoSelectPhotos: opt.value })}
                className={`flex-1 p-3 rounded-xl text-left transition-all border ${
                  config.autoSelectPhotos === opt.value
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                    : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:bg-white/[0.06]'
                }`}>
                <span className="text-sm font-medium block">{opt.label}</span>
                <span className="text-[10px] opacity-60">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual photo uploads per card */}
      {config.photoMode === 'manual' && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-white/40">Upload de fotos por slide</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: config.cardCount }).map((_, i) => (
              <div key={i}>
                {config.tweetPhotos[i] ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-white/[0.08]">
                    <img src={config.tweetPhotos[i]!} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => { const p = [...config.tweetPhotos]; p[i] = null; update({ tweetPhotos: p }); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => photoInputRefs.current[i]?.click()}
                    className="w-full aspect-video rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center gap-1 hover:bg-white/[0.05] transition-colors">
                    <Image className="w-4 h-4 text-white/20" />
                    <span className="text-[10px] text-white/20">Slide {i + 1}</span>
                  </button>
                )}
                <input ref={el => photoInputRefs.current[i] = el} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleCardPhotoUpload(i, e)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepTweetConfig;
