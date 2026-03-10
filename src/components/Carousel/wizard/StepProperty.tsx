import React, { useRef } from 'react';
import { Building2, Plus, X, Upload, Home, DollarSign, MapPin, Ruler, BedDouble, Bath, Car } from 'lucide-react';

export interface PropertyData {
  id: string;
  photos: { url: string; file?: File }[];
  title: string;
  type: 'apartment' | 'house' | 'commercial' | 'land' | 'studio' | 'penthouse' | 'farm';
  mode: 'sale' | 'rent';
  price: string;
  area: string;
  bedrooms: string;
  suites: string;
  bathrooms: string;
  parking: string;
  location: string;
  neighborhood: string;
  highlights: string;
}

export const createEmptyProperty = (): PropertyData => ({
  id: crypto.randomUUID(),
  photos: [],
  title: '',
  type: 'apartment',
  mode: 'sale',
  price: '',
  area: '',
  bedrooms: '',
  suites: '',
  bathrooms: '',
  parking: '',
  location: '',
  neighborhood: '',
  highlights: '',
});

interface StepPropertyProps {
  properties: PropertyData[];
  setProperties: React.Dispatch<React.SetStateAction<PropertyData[]>>;
  realEstateMode: 'single' | 'multiple';
  cardCount?: number;
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento', house: 'Casa', commercial: 'Comercial',
  land: 'Terreno', studio: 'Studio', penthouse: 'Cobertura', farm: 'Chácara/Sítio',
};

const StepProperty: React.FC<StepPropertyProps> = ({ properties, setProperties, realEstateMode, cardCount }) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateProperty = (id: string, updates: Partial<PropertyData>) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addPhotos = (id: string, files: FileList) => {
    const newPhotos = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setProperties(prev => prev.map(p =>
      p.id === id ? { ...p, photos: [...p.photos, ...newPhotos] } : p
    ));
  };

  const removePhoto = (propId: string, photoIdx: number) => {
    setProperties(prev => prev.map(p =>
      p.id === propId ? { ...p, photos: p.photos.filter((_, i) => i !== photoIdx) } : p
    ));
  };

  const addProperty = () => {
    if (properties.length >= 10) return;
    setProperties(prev => [...prev, createEmptyProperty()]);
  };

  const removeProperty = (id: string) => {
    if (properties.length <= 1) return;
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  const renderPropertyForm = (prop: PropertyData, index: number) => (
    <div key={prop.id} className="p-4 rounded-xl border border-white/[0.06]" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
      {realEstateMode === 'multiple' && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-amber-300">Imóvel {index + 1}</span>
          {properties.length > 1 && (
            <button onClick={() => removeProperty(prop.id)}
              className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Photos */}
      <div className="mb-3">
        <label className="text-[10px] text-white/40 mb-1.5 flex items-center justify-between">
          <span>Fotos do Imóvel</span>
          {realEstateMode === 'single' && cardCount && (
            <span className={`text-[9px] font-medium ${prop.photos.length >= (cardCount || 1) ? 'text-green-400' : 'text-amber-400'}`}>
              {prop.photos.length}/{cardCount} fotos (1 por card)
            </span>
          )}
        </label>
        {realEstateMode === 'single' && cardCount && prop.photos.length < cardCount && (
          <p className="text-[9px] text-amber-400/70 mb-1.5">
            ⚠️ Adicione {cardCount - prop.photos.length} foto(s) a mais para ter 1 foto por card
          </p>
        )}
        <div className="flex gap-1.5 flex-wrap">
          {prop.photos.map((photo, pi) => (
            <div key={pi} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group">
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(prop.id, pi)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer text-[8px]">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <label className="flex items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-white/10 cursor-pointer hover:border-amber-500/30 transition-colors">
            <div className="text-center">
              <Upload className="w-3.5 h-3.5 text-white/20 mx-auto" />
              <span className="text-[8px] text-white/20">Fotos</span>
            </div>
            <input
              type="file" accept="image/*" multiple className="hidden"
              ref={el => { fileInputRefs.current[prop.id] = el; }}
              onChange={e => { if (e.target.files) addPhotos(prop.id, e.target.files); }}
            />
          </label>
        </div>
      </div>

      {/* Type + Mode */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-[10px] text-white/40 mb-0.5 block">Tipo</label>
          <select value={prop.type} onChange={e => updateProperty(prop.id, { type: e.target.value as any })}
            className="w-full px-2 py-1.5 rounded-lg border border-white/[0.08] text-xs text-white outline-none appearance-none cursor-pointer"
            style={{ backgroundColor: '#1a1a24' }}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k} style={{ backgroundColor: '#1a1a24' }}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-0.5 block">Modalidade</label>
          <div className="flex gap-1">
            <button onClick={() => updateProperty(prop.id, { mode: 'sale' })}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-colors ${prop.mode === 'sale' ? 'bg-green-500/20 text-green-300' : 'bg-white/[0.04] text-white/30'}`}>
              Venda
            </button>
            <button onClick={() => updateProperty(prop.id, { mode: 'rent' })}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-colors ${prop.mode === 'rent' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.04] text-white/30'}`}>
              Aluguel
            </button>
          </div>
        </div>
      </div>

      {/* Price + Area */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-[10px] text-white/40 mb-0.5 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Valor</label>
          <input value={prop.price} onChange={e => updateProperty(prop.id, { price: e.target.value })}
            placeholder="R$ 450.000" className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-0.5 flex items-center gap-1"><Ruler className="w-3 h-3" /> Área (m²)</label>
          <input value={prop.area} onChange={e => updateProperty(prop.id, { area: e.target.value })}
            placeholder="120" className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none" />
        </div>
      </div>

      {/* Rooms */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <div>
          <label className="text-[10px] text-white/40 mb-0.5 flex items-center gap-0.5"><BedDouble className="w-3 h-3" /> Quartos</label>
          <input value={prop.bedrooms} onChange={e => updateProperty(prop.id, { bedrooms: e.target.value })}
            placeholder="3" type="number" className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-0.5">Suítes</label>
          <input value={prop.suites} onChange={e => updateProperty(prop.id, { suites: e.target.value })}
            placeholder="1" type="number" className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-0.5 flex items-center gap-0.5"><Bath className="w-3 h-3" /> Banh.</label>
          <input value={prop.bathrooms} onChange={e => updateProperty(prop.id, { bathrooms: e.target.value })}
            placeholder="2" type="number" className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-0.5 flex items-center gap-0.5"><Car className="w-3 h-3" /> Vagas</label>
          <input value={prop.parking} onChange={e => updateProperty(prop.id, { parking: e.target.value })}
            placeholder="2" type="number" className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none" />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-[10px] text-white/40 mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Cidade/Estado</label>
          <input value={prop.location} onChange={e => updateProperty(prop.id, { location: e.target.value })}
            placeholder="São Paulo, SP" className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-white/40 mb-0.5">Bairro</label>
          <input value={prop.neighborhood} onChange={e => updateProperty(prop.id, { neighborhood: e.target.value })}
            placeholder="Jardins" className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none" />
        </div>
      </div>

      {/* Highlights */}
      <div>
        <label className="text-[10px] text-white/40 mb-0.5 block">Destaques</label>
        <input value={prop.highlights} onChange={e => updateProperty(prop.id, { highlights: e.target.value })}
          placeholder="Piscina, churrasqueira, vista para o mar..."
          className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-amber-400" />
        <div>
          <h3 className="text-sm font-semibold text-white">
            {realEstateMode === 'single' ? 'Dados do Imóvel' : 'Imóveis do Carrossel'}
          </h3>
          <p className="text-[10px] text-white/30">
            {realEstateMode === 'single'
              ? 'Preencha os detalhes e adicione fotos do imóvel'
              : 'Cada card do carrossel apresentará um imóvel diferente'}
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {properties.map((prop, i) => renderPropertyForm(prop, i))}
      </div>

      {realEstateMode === 'multiple' && properties.length < 10 && (
        <button onClick={addProperty}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-white/10 text-xs text-white/30 hover:border-amber-500/30 hover:text-amber-300 cursor-pointer transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar Imóvel ({properties.length}/10)
        </button>
      )}
    </div>
  );
};

export default StepProperty;

export const buildPropertyPromptContext = (properties: PropertyData[], realEstateMode: 'single' | 'multiple', cardIndex: number): string => {
  if (properties.length === 0) return '';

  const prop = realEstateMode === 'multiple'
    ? properties[cardIndex % properties.length]
    : properties[0];

  const typeLabel = TYPE_LABELS[prop.type] || prop.type;
  const modeLabel = prop.mode === 'sale' ? 'VENDA' : 'ALUGUEL';

  const details: string[] = [];
  if (prop.price) details.push(`Valor: ${prop.price}`);
  if (prop.area) details.push(`Área: ${prop.area}m²`);
  if (prop.bedrooms) details.push(`${prop.bedrooms} quartos`);
  if (prop.suites) details.push(`${prop.suites} suítes`);
  if (prop.bathrooms) details.push(`${prop.bathrooms} banheiros`);
  if (prop.parking) details.push(`${prop.parking} vagas`);
  if (prop.location) details.push(`Local: ${prop.location}`);
  if (prop.neighborhood) details.push(`Bairro: ${prop.neighborhood}`);
  if (prop.highlights) details.push(`Destaques: ${prop.highlights}`);

  return `\n\n=== IMÓVEL (${modeLabel}) ===
Tipo: ${typeLabel}
${details.join(' | ')}
Inclua essas informações de forma visualmente atraente no post. Use tipografia de marketing imobiliário premium. O texto deve ser em PORTUGUÊS BRASILEIRO. Crie títulos impactantes como "Seu Novo Lar", "Oportunidade Única", "Viva com Estilo", "Realize Seu Sonho".
${realEstateMode === 'single' ? `Este é o card ${cardIndex + 1} — mostre um ângulo/cômodo diferente do mesmo imóvel.` : `Este card destaca o imóvel ${(cardIndex % properties.length) + 1} de ${properties.length}.`}
NÃO inclua rostos humanos. Foque na arquitetura, interiores e detalhes do imóvel.`;
};
