import React, { useRef } from 'react';
import { Upload, X, Smartphone, Monitor, Tablet, Loader2, ImagePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export type DeviceType = 'mobile' | 'web' | 'tablet';

interface Props {
  screenshots: { url: string; thumb: string; file: File }[];
  setScreenshots: React.Dispatch<React.SetStateAction<{ url: string; thumb: string; file: File }[]>>;
  deviceType: DeviceType;
  setDeviceType: (v: DeviceType) => void;
}

const DEVICE_OPTIONS: { value: DeviceType; icon: React.ElementType; label: string; desc: string }[] = [
  { value: 'mobile', icon: Smartphone, label: 'Mobile (iPhone)', desc: 'Mockup de celular' },
  { value: 'web', icon: Monitor, label: 'Desktop (MacBook)', desc: 'Mockup de notebook/monitor' },
  { value: 'tablet', icon: Tablet, label: 'Tablet (iPad)', desc: 'Mockup de tablet' },
];

const StepAppScreenshots: React.FC<Props> = ({ screenshots, setScreenshots, deviceType, setDeviceType }) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleFiles = async (files: FileList) => {
    if (!user) return;
    setUploading(true);
    try {
      const newItems: { url: string; thumb: string; file: File }[] = [];
      for (const file of Array.from(files).slice(0, 6 - screenshots.length)) {
        const ext = file.name.split('.').pop() || 'png';
        const path = `${user.id}/screenshots/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true });
        if (error) { console.error(error); continue; }
        const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
        if (urlData?.publicUrl) {
          newItems.push({ url: urlData.publicUrl, thumb: urlData.publicUrl, file });
        }
      }
      setScreenshots(prev => [...prev, ...newItems]);
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx: number) => setScreenshots(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Screenshots do App</h2>
        <p className="text-sm text-white/40">
          Envie prints da interface do seu app/site. Eles aparecerão dentro de mockups de dispositivos reais.
        </p>
      </div>

      {/* Device type picker */}
      <div>
        <label className="text-xs text-white/50 mb-2 block font-medium">Tipo de dispositivo</label>
        <div className="grid grid-cols-3 gap-2">
          {DEVICE_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = deviceType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setDeviceType(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer ${
                  active
                    ? 'border-purple-500 bg-purple-500/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-purple-400' : ''}`} />
                <span className="text-xs font-medium">{opt.label}</span>
                <span className="text-[10px] text-white/30">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload area */}
      <div>
        <label className="text-xs text-white/50 mb-2 block font-medium">
          Screenshots ({screenshots.length}/6)
        </label>

        {screenshots.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {screenshots.map((s, i) => (
              <div key={i} className="relative group">
                <img src={s.thumb} alt="" className="w-20 h-28 rounded-lg object-cover border border-white/10" />
                <button
                  onClick={() => remove(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {screenshots.length < 6 && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/40 transition-colors cursor-pointer bg-white/[0.02]"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            ) : (
              <ImagePlus className="w-6 h-6 text-white/30" />
            )}
            <span className="text-sm text-white/40">
              {uploading ? 'Enviando...' : 'Clique para enviar screenshots'}
            </span>
            <span className="text-[10px] text-white/20">PNG, JPG • Máx 6 imagens</span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {screenshots.length === 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="text-xs text-amber-300">
            ⚠ Este estilo requer screenshots do app para criar mockups realistas. Envie pelo menos 1 print.
          </span>
        </div>
      )}
    </div>
  );
};

export default StepAppScreenshots;
