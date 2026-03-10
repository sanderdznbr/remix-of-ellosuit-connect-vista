import React from 'react';
import { Building2, DollarSign, MapPin, Ruler, BedDouble, Bath, Car } from 'lucide-react';
import { PropertyData } from './StepProperty';

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento', house: 'Casa', commercial: 'Comercial',
  land: 'Terreno', studio: 'Studio', penthouse: 'Cobertura', farm: 'Chácara/Sítio',
};

interface StepPropertyInfoProps {
  properties: PropertyData[];
  setProperties: React.Dispatch<React.SetStateAction<PropertyData[]>>;
  realEstateMode: 'single' | 'multiple';
}

const StepPropertyInfo: React.FC<StepPropertyInfoProps> = ({ properties, setProperties, realEstateMode }) => {
  const updateProperty = (id: string, updates: Partial<PropertyData>) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const renderPropertyInfo = (prop: PropertyData, index: number) => (
    <div key={prop.id} className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03]">
      {realEstateMode === 'multiple' && (
        <div className="flex items-center gap-2 mb-3">
          {prop.photos[0] && (
            <img src={prop.photos[0].url} alt="" className="w-8 h-8 rounded-md object-cover" />
          )}
          <span className="text-xs font-medium text-white/60">Imóvel {index + 1}</span>
        </div>
      )}

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
        <Building2 className="w-5 h-5 text-white/50" />
        <div>
          <h3 className="text-sm font-semibold text-white">Informações do Imóvel</h3>
          <p className="text-[10px] text-white/30">
            Preencha os detalhes que aparecerão no carrossel
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {properties.map((prop, i) => renderPropertyInfo(prop, i))}
      </div>
    </div>
  );
};

export default StepPropertyInfo;
