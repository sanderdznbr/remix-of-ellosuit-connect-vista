import React from 'react';
import { ImageSettings } from './types';

interface Props {
  settings: ImageSettings;
  onChange: (s: ImageSettings) => void;
}

const HIGGSFIELD_MODELS = [
  { value: 'higgsfield-ai/soul/standard', label: 'Soul Standard', desc: 'Flagship — melhor qualidade' },
  { value: 'reve/text-to-image', label: 'Reve', desc: 'Versátil, estilo variado' },
  { value: 'bytedance/seedream/v4/edit', label: 'Seedream Edit', desc: 'Edição avançada' },
];

const IMAGE_TYPES = [
  { value: 'photo', label: 'Foto real' },
  { value: 'cinematic', label: 'Cinemático' },
  { value: 'illustration', label: 'Ilustração' },
  { value: 'print', label: 'Print/Screenshot' },
  { value: '3d-render', label: '3D Render' },
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

  return (
    <div className="space-y-8" style={{ minHeight: '460px' }}>
      {/* Model */}
      <div>
        <SectionLabel>Modelo de IA</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <ModelCard selected={settings.model === 'auto'} onClick={() => update({ model: 'auto' })} title="Automático" desc="IA inteligente por contexto" />
          <ModelCard selected={settings.model === 'gpt-image-2'} onClick={() => update({ model: 'gpt-image-2' })} title="GPT Image 2" desc="Pipeline 2-etapas: Gemini gera base + GPT aplica texto perfeito" />
          <ModelCard selected={settings.model === 'nano-banana'} onClick={() => update({ model: 'nano-banana' })} title="Nano Banana Pro" desc="Alta qualidade Gemini" />
          <ModelCard selected={settings.model === 'gemini'} onClick={() => update({ model: 'gemini' })} title="Gemini Flash" desc="Rápido, boa qualidade" />
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
    </div>
  );
};

export default StepImageSettings;
