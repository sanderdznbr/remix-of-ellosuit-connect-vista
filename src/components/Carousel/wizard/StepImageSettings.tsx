import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageSettings, FLOW_COLOR } from './types';
import { Settings2, Sparkles } from 'lucide-react';

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
  { value: '', label: 'Nada / Automático' },
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
  { value: 'photo', label: '📷 Foto real', desc: 'Fotorrealista' },
  { value: 'cinematic', label: '🎬 Cinemático', desc: 'Estilo filme' },
  { value: 'illustration', label: '🎨 Ilustração', desc: 'Arte digital' },
  { value: 'print', label: '🖨️ Print/Screenshot', desc: 'Tela de app' },
  { value: '3d-render', label: '🧊 3D Render', desc: 'Render 3D' },
];

const LIGHTING_STYLES = [
  { value: 'cinematic', label: '🎬 Cinemático' },
  { value: 'natural', label: '☀️ Natural' },
  { value: 'studio', label: '📸 Estúdio' },
  { value: 'dramatic', label: '🌑 Dramático' },
  { value: 'soft', label: '🌤️ Suave' },
  { value: 'neon', label: '💜 Neon' },
];

const CAMERA_ANGLES = [
  { value: 'front', label: 'Frontal' },
  { value: 'side', label: 'Perfil' },
  { value: 'low-angle', label: 'De baixo' },
  { value: 'high-angle', label: 'De cima' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'full-body', label: 'Corpo inteiro' },
];

const StepImageSettings: React.FC<Props> = ({ settings, onChange }) => {
  const update = (patch: Partial<ImageSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 text-orange-600 text-sm font-semibold mb-3">
          <Settings2 className="h-4 w-4" /> Etapa 3 — Configuração de Imagem
        </div>
        <p className="text-sm text-muted-foreground">Controle fino da geração: fidelidade, posição, iluminação e mais</p>
      </div>

      {/* Model */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Modelo de IA</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => update({ model: 'gemini' })}
            className={`p-3 rounded-xl text-left transition-all border ${settings.model === 'gemini' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
            <span className="text-sm font-bold">⚡ Gemini Flash</span>
            <span className="block text-[10px] text-muted-foreground mt-0.5">Rápido, boa qualidade</span>
          </button>
          <button onClick={() => update({ model: 'nano-banana' })}
            className={`p-3 rounded-xl text-left transition-all border ${settings.model === 'nano-banana' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
            <span className="text-sm font-bold">🎨 Nano Banana Pro</span>
            <span className="block text-[10px] text-muted-foreground mt-0.5">Melhor qualidade</span>
          </button>
        </div>
      </div>

      {/* Fidelity */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Nível de fidelidade vs criatividade</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'high' as const, label: '🎯 Alta Fidelidade', desc: 'Segue referências ao máximo' },
            { value: 'balanced' as const, label: '⚖️ Equilibrado', desc: 'Mix de referência e criatividade' },
            { value: 'creative' as const, label: '🎨 Criativo', desc: 'Mais liberdade artística' },
          ]).map(opt => (
            <button key={opt.value} onClick={() => update({ fidelity: opt.value })}
              className={`p-3 rounded-xl text-left transition-all border ${settings.fidelity === opt.value ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
              <span className="text-xs font-bold">{opt.label}</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Image type */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Tipo de imagem</label>
        <div className="flex gap-1.5 flex-wrap">
          {IMAGE_TYPES.map(t => (
            <button key={t.value} onClick={() => update({ imageType: t.value as ImageSettings['imageType'] })}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${settings.imageType === t.value ? 'text-white shadow-md border-transparent' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
              style={settings.imageType === t.value ? { backgroundColor: FLOW_COLOR } : {}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lighting */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Iluminação</label>
        <div className="flex gap-1.5 flex-wrap">
          {LIGHTING_STYLES.map(l => (
            <button key={l.value} onClick={() => update({ lightingStyle: l.value as ImageSettings['lightingStyle'] })}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${settings.lightingStyle === l.value ? 'text-white shadow-md border-transparent' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
              style={settings.lightingStyle === l.value ? { backgroundColor: FLOW_COLOR } : {}}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera angle */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Ângulo da câmera</label>
        <div className="flex gap-1.5 flex-wrap">
          {CAMERA_ANGLES.map(a => (
            <button key={a.value} onClick={() => update({ cameraAngle: a.value as ImageSettings['cameraAngle'] })}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${settings.cameraAngle === a.value ? 'text-white shadow-md border-transparent' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
              style={settings.cameraAngle === a.value ? { backgroundColor: FLOW_COLOR } : {}}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body position */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Posição do corpo (se houver pessoa)</label>
        <div className="flex gap-1.5 flex-wrap">
          {BODY_POSITIONS.map(p => (
            <button key={p.value} onClick={() => update({ bodyPosition: p.value })}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${settings.bodyPosition === p.value ? 'text-white shadow-md border-transparent' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
              style={settings.bodyPosition === p.value ? { backgroundColor: FLOW_COLOR } : {}}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hand object */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Segurando nas mãos</label>
        <div className="flex gap-1.5 flex-wrap">
          {HAND_OBJECTS.map(h => (
            <button key={h.value} onClick={() => update({ handObject: h.value })}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${settings.handObject === h.value ? 'text-white shadow-md border-transparent' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
              style={settings.handObject === h.value ? { backgroundColor: FLOW_COLOR } : {}}>
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phone screen content (conditional) */}
      {settings.handObject === 'smartphone' && (
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">O que aparece na tela do celular?</label>
          <Input value={settings.phoneScreen} onChange={(e) => update({ phoneScreen: e.target.value })}
            placeholder="Ex: Dashboard Ellosuit, conversa WhatsApp, Instagram feed..."
            className="rounded-xl" />
        </div>
      )}

      {/* Negative prompt */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Prompt negativo (o que NÃO deve aparecer)</label>
        <Textarea value={settings.negativePrompt} onChange={(e) => update({ negativePrompt: e.target.value })}
          placeholder="Ex: texto na imagem, marca d'água, baixa qualidade, deformações, mãos deformadas..."
          className="rounded-xl min-h-[60px] resize-none text-sm" />
      </div>
    </div>
  );
};

export default StepImageSettings;
