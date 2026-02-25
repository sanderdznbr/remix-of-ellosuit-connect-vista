import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageSettings } from './types';
import { Upload, X } from 'lucide-react';

interface Props {
  settings: ImageSettings;
  onChange: (s: ImageSettings) => void;
}

const BODY_POSITIONS = [
  { value: '', label: 'Automático' },
  { value: 'standing', label: 'Em pé' },
  { value: 'sitting', label: 'Sentado(a)' },
  { value: 'walking', label: 'Andando' },
  { value: 'leaning', label: 'Encostado(a)' },
  { value: 'arms-crossed', label: 'Braços cruzados' },
  { value: 'presenting', label: 'Apresentando' },
  { value: 'pointing', label: 'Apontando' },
];

const HAND_OBJECTS = [
  { value: '', label: 'Nada' },
  { value: 'smartphone', label: '📱 Celular' },
  { value: 'laptop', label: '💻 Notebook' },
  { value: 'tablet', label: '📲 Tablet' },
  { value: 'coffee', label: '☕ Café' },
  { value: 'pen', label: '🖊️ Caneta' },
  { value: 'microphone', label: '🎤 Microfone' },
  { value: 'product', label: '📦 Produto' },
  { value: 'document', label: '📄 Documento' },
];

const IMAGE_TYPES = [
  { value: 'photo', label: 'Foto real' },
  { value: 'cinematic', label: 'Cinemático' },
  { value: 'illustration', label: 'Ilustração' },
  { value: 'print', label: 'Print/Screenshot' },
  { value: '3d-render', label: '3D Render' },
];

const HIGGSFIELD_MODELS = [
  { value: 'higgsfield-ai/soul/standard', label: 'Soul Standard', desc: 'Flagship — melhor qualidade' },
  { value: 'reve/text-to-image', label: 'Reve', desc: 'Versátil, estilo variado' },
  { value: 'bytedance/seedream/v4/edit', label: 'Seedream Edit', desc: 'Edição avançada' },
];

const LIGHTING_STYLES = [
  { value: 'cinematic', label: 'Cinemático' },
  { value: 'natural', label: 'Natural' },
  { value: 'studio', label: 'Estúdio' },
  { value: 'dramatic', label: 'Dramático' },
  { value: 'soft', label: 'Suave' },
  { value: 'neon', label: 'Neon' },
];

const CAMERA_ANGLES = [
  { value: 'front', label: 'Frontal' },
  { value: 'side', label: 'Perfil' },
  { value: 'low-angle', label: 'De baixo' },
  { value: 'high-angle', label: 'De cima' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'full-body', label: 'Corpo inteiro' },
];

const Chip = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
      selected
        ? 'bg-white text-black'
        : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
    }`}>
    {children}
  </button>
);

const ModelCard = ({ selected, onClick, title, desc }: { selected: boolean; onClick: () => void; title: string; desc: string }) => (
  <button onClick={onClick}
    className={`p-4 rounded-xl text-left transition-all border ${
      selected
        ? 'bg-white/[0.08] border-white/20'
        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
    }`}>
    <span className="text-sm font-semibold text-white/90">{title}</span>
    <span className="block text-[11px] text-white/40 mt-1">{desc}</span>
  </button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-sm font-medium text-white/80 mb-3 block">{children}</label>
);

const StepImageSettings: React.FC<Props> = ({ settings, onChange }) => {
  const update = (patch: Partial<ImageSettings>) => onChange({ ...settings, ...patch });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasScreenDevice = ['smartphone', 'tablet', 'laptop'].includes(settings.handObject);

  return (
    <div className="space-y-8">
      {/* Model */}
      <div>
        <SectionLabel>Modelo de IA</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <ModelCard selected={settings.model === 'auto'} onClick={() => update({ model: 'auto' })} title="Automático" desc="Sistema escolhe o melhor" />
          <ModelCard selected={settings.model === 'gemini'} onClick={() => update({ model: 'gemini' })} title="Gemini Flash" desc="Rápido, boa qualidade" />
          <ModelCard selected={settings.model === 'nano-banana'} onClick={() => update({ model: 'nano-banana' })} title="Nano Banana Pro" desc="Alta qualidade Gemini" />
          <ModelCard selected={settings.model === 'higgsfield'} onClick={() => update({ model: 'higgsfield' })} title="Higgsfield" desc="Multi-modelo externo" />
        </div>
      </div>

      {/* Higgsfield sub-model */}
      {settings.model === 'higgsfield' && (
        <div>
          <SectionLabel>Modelo Higgsfield</SectionLabel>
          <div className="space-y-2">
            {HIGGSFIELD_MODELS.map(m => (
              <ModelCard key={m.value} selected={settings.higgsFieldModel === m.value} onClick={() => update({ higgsFieldModel: m.value })} title={m.label} desc={m.desc} />
            ))}
          </div>
        </div>
      )}

      {/* Fidelity */}
      <div>
        <SectionLabel>Fidelidade vs criatividade</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <ModelCard selected={settings.fidelity === 'high'} onClick={() => update({ fidelity: 'high' })} title="Alta Fidelidade" desc="Segue referências ao máximo" />
          <ModelCard selected={settings.fidelity === 'balanced'} onClick={() => update({ fidelity: 'balanced' })} title="Equilibrado" desc="Mix de referência e criatividade" />
          <ModelCard selected={settings.fidelity === 'creative'} onClick={() => update({ fidelity: 'creative' })} title="Criativo" desc="Mais liberdade artística" />
        </div>
      </div>

      {/* Image type */}
      <div>
        <SectionLabel>Tipo de imagem</SectionLabel>
        <div className="flex gap-2 flex-wrap">
          {IMAGE_TYPES.map(t => (
            <Chip key={t.value} selected={settings.imageType === t.value} onClick={() => update({ imageType: t.value as ImageSettings['imageType'] })}>
              {t.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Lighting */}
      <div>
        <SectionLabel>Iluminação</SectionLabel>
        <div className="flex gap-2 flex-wrap">
          {LIGHTING_STYLES.map(l => (
            <Chip key={l.value} selected={settings.lightingStyle === l.value} onClick={() => update({ lightingStyle: l.value as ImageSettings['lightingStyle'] })}>
              {l.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Camera angle */}
      <div>
        <SectionLabel>Ângulo da câmera</SectionLabel>
        <div className="flex gap-2 flex-wrap">
          {CAMERA_ANGLES.map(a => (
            <Chip key={a.value} selected={settings.cameraAngle === a.value} onClick={() => update({ cameraAngle: a.value as ImageSettings['cameraAngle'] })}>
              {a.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Body position */}
      <div>
        <SectionLabel>Posição do corpo</SectionLabel>
        <div className="flex gap-2 flex-wrap">
          {BODY_POSITIONS.map(p => (
            <Chip key={p.value} selected={settings.bodyPosition === p.value} onClick={() => update({ bodyPosition: p.value })}>
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Hand object */}
      <div>
        <SectionLabel>Segurando nas mãos</SectionLabel>
        <div className="flex gap-2 flex-wrap">
          {HAND_OBJECTS.map(h => (
            <Chip key={h.value} selected={settings.handObject === h.value} onClick={() => update({ handObject: h.value })}>
              {h.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Phone screen content */}
      {hasScreenDevice && (
        <div className="space-y-4">
          <SectionLabel>
            Tela do {settings.handObject === 'smartphone' ? 'celular' : settings.handObject === 'tablet' ? 'tablet' : 'notebook'}
          </SectionLabel>
          <Input value={settings.phoneScreen} onChange={(e) => update({ phoneScreen: e.target.value })}
            placeholder="Ex: Dashboard, conversa WhatsApp..."
            className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-xl h-11 text-sm focus:!border-white/20 focus:!ring-0" />
          
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => { if (ev.target?.result) update({ screenImageUrl: ev.target.result as string }); };
            reader.readAsDataURL(file);
          }} />
          {settings.screenImageUrl ? (
            <div className="relative inline-block">
              <img src={settings.screenImageUrl} alt="Screen" className="h-24 rounded-xl border border-white/[0.06] object-contain bg-white/[0.02]" />
              <button onClick={() => update({ screenImageUrl: '' })}
                className="absolute -top-2 -right-2 bg-white/10 hover:bg-white/20 text-white rounded-full p-1 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.08] text-sm text-white/30 hover:bg-white/[0.03] hover:text-white/50 transition-colors">
              <Upload className="h-4 w-4" />
              Enviar screenshot
            </button>
          )}
        </div>
      )}

      {/* Negative prompt */}
      <div>
        <SectionLabel>Prompt negativo</SectionLabel>
        <Textarea value={settings.negativePrompt} onChange={(e) => update({ negativePrompt: e.target.value })}
          placeholder="O que NÃO deve aparecer: texto, marca d'água, baixa qualidade..."
          className="!bg-white/[0.03] !border-white/[0.06] !text-white !placeholder-white/20 rounded-xl min-h-[80px] resize-none text-sm focus:!border-white/20 focus:!ring-0" />
      </div>
    </div>
  );
};

export default StepImageSettings;
