import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Edit3, Upload, Search, Wand2, SlidersHorizontal, X, Loader2,
  Type, Maximize, LayoutGrid, ImageIcon, Palette, ChevronDown, ChevronUp, Info, Paperclip,
  Home, DollarSign, BedDouble, Bath, Car, Ruler, MapPin,
  AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import { FLOW_COLOR } from '../wizard/types';

interface FontOption {
  label: string;
  value: string;
  google: string;
}

interface CarouselCard {
  type: 'cover' | 'content' | 'cta' | 'tweet';
  title?: string;
  subtitle?: string;
  body?: string;
  bodyTop?: string;
  bodyBottom?: string;
  imageUrl?: string;
  imagePrompt?: string;
  searchTerms?: string[];
  needsImage?: boolean;
  layout?: 'dark' | 'light' | 'accent';
  fontScale?: number;
  paddingScale?: number;
  textAlign?: 'left' | 'center' | 'right';
  cardFontIndex?: number;
}

interface Props {
  card: CarouselCard;
  cardIndex: number;
  totalCards: number;
  bgColor: string;
  accentColor: string;
  textColor: string;
  onUpdateCard: (index: number, updates: Partial<CarouselCard>) => void;
  onUpdateAllCards: (updates: Partial<CarouselCard>) => void;
  onClose: () => void;
  onUploadImage: (index: number, file: File) => void;
  onOpenImagePicker: (index: number) => void;
  onGenerateAiImage: (index: number) => void;
  generatingAiImage: boolean;
  aiImagePrompt: string;
  setAiImagePrompt: (v: string) => void;
  onChangeBgColor: (c: string) => void;
  onChangeAccentColor: (c: string) => void;
  onChangeTextColor: (c: string) => void;
  fontOptions: FontOption[];
  selectedFont: number;
  onChangeFont: (index: number) => void;
  referenceImageUrl: string | null;
  onUploadReferenceImage: (file: File) => void;
  onRemoveReferenceImage: () => void;
  isRealEstate?: boolean;
  propertyData?: {
    price: string; area: string; bedrooms: string; bathrooms: string;
    parking: string; location: string; neighborhood: string; highlights: string; title: string;
  };
  onPropertyFieldChange?: (field: string, value: string) => void;
  isContentStyle?: boolean;
}

const CarouselEditorSidebar: React.FC<Props> = ({
  card, cardIndex, totalCards, bgColor, accentColor, textColor,
  onUpdateCard, onUpdateAllCards, onClose,
  onUploadImage, onOpenImagePicker, onGenerateAiImage,
  generatingAiImage, aiImagePrompt, setAiImagePrompt,
  onChangeBgColor, onChangeAccentColor, onChangeTextColor,
  fontOptions, selectedFont, onChangeFont,
  referenceImageUrl, onUploadReferenceImage, onRemoveReferenceImage,
  isRealEstate, propertyData, onPropertyFieldChange,
  isContentStyle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const [showGlobal, setShowGlobal] = React.useState(false);
  const [showStyle, setShowStyle] = React.useState(false);
  const [showTypography, setShowTypography] = React.useState(isContentStyle ? true : false);
  const [globalFontScale, setGlobalFontScale] = React.useState(100);
  const [globalPaddingScale, setGlobalPaddingScale] = React.useState(100);

  const applyGlobalFont = (val: number) => {
    setGlobalFontScale(val);
    onUpdateAllCards({ fontScale: val / 100 });
  };

  const applyGlobalPadding = (val: number) => {
    setGlobalPaddingScale(val);
    onUpdateAllCards({ paddingScale: val / 100 });
  };

  const applyGlobalLayout = (layout: 'dark' | 'light' | 'accent') => {
    onUpdateAllCards({ layout });
  };

  const PRESET_COLORS = ['#0F0F1A', '#1A1A2E', '#16213E', '#0F3460', '#533483', '#E94560', '#E84D1A', '#F38181', '#FCE38A', '#95E1D3', '#EAFFD0', '#F8F4EF', '#FFFFFF'];

  const currentAlign = card.textAlign || 'left';
  const currentCardFont = card.cardFontIndex ?? selectedFont;

  return (
    <div className="w-full md:w-[340px] flex-shrink-0 border-t md:border-t-0 md:border-l flex flex-col min-h-0 flex-1 md:h-full" style={{ backgroundColor: '#111118', borderColor: 'rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <Edit3 className="h-4 w-4" style={{ color: FLOW_COLOR }} />
          <h3 className="font-bold text-sm text-white">Card {cardIndex + 1}/{totalCards}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <X className="h-4 w-4 text-white/40" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* ===== GLOBAL CONTROLS ===== */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setShowGlobal(!showGlobal)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" style={{ color: FLOW_COLOR }} />
                <span className="text-sm font-semibold text-white">Todos os Cards</span>
              </div>
              {showGlobal ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
            </button>
            {showGlobal && (
              <div className="px-4 pb-4 space-y-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Type className="h-3 w-3" /> Fonte (todos)</span>
                    <span className="text-[10px] font-mono">{globalFontScale}%</span>
                  </label>
                  <input type="range" min="50" max="200" step="5" value={globalFontScale}
                    onChange={(e) => applyGlobalFont(parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Maximize className="h-3 w-3" /> Margens (todos)</span>
                    <span className="text-[10px] font-mono text-white/50">{globalPaddingScale}%</span>
                  </label>
                  <input type="range" min="30" max="200" step="5" value={globalPaddingScale}
                    onChange={(e) => applyGlobalPadding(parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 block">Layout (todos)</label>
                  <div className="flex gap-2">
                    {(['dark', 'light', 'accent'] as const).map(l => (
                      <button key={l} onClick={() => applyGlobalLayout(l)}
                        className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all hover:scale-105"
                        style={{
                          backgroundColor: l === 'dark' ? bgColor : l === 'accent' ? accentColor : bgColor,
                          color: l === 'light' ? '#1A1A1A' : '#FFF',
                          borderColor: l === 'light' ? '#ddd' : 'transparent'
                        }}>
                        {l === 'dark' ? 'Escuro' : l === 'light' ? 'Claro' : 'Destaque'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== TYPOGRAPHY (Content style only) ===== */}
          {isContentStyle && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setShowTypography(!showTypography)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" style={{ color: FLOW_COLOR }} />
                  <span className="text-sm font-semibold text-white">Tipografia</span>
                </div>
                {showTypography ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
              </button>
              {showTypography && (
                <div className="px-4 pb-4 space-y-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Font family per card */}
                  <div>
                    <label className="text-xs font-medium text-white/40 mb-1.5 block">Fonte deste card</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {fontOptions.map((font, i) => (
                        <button key={i} onClick={() => onUpdateCard(cardIndex, { cardFontIndex: i })}
                          className={`px-2.5 py-2 rounded-xl text-xs border transition-all text-left truncate ${currentCardFont === i ? 'ring-2 ring-white/50 border-white/20 bg-white/[0.08] font-bold text-white' : 'border-white/[0.06] text-white/40 hover:bg-white/[0.04]'}`}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font size */}
                  <div>
                    <label className="text-xs font-medium text-white/40 mb-1 flex items-center justify-between">
                      <span>Tamanho da Fonte</span>
                      <span className="text-[10px] font-mono text-white/50">{Math.round((card.fontScale ?? 1) * 100)}%</span>
                    </label>
                    <input type="range" min="50" max="200" step="5"
                      value={Math.round((card.fontScale ?? 1) * 100)}
                      onChange={(e) => onUpdateCard(cardIndex, { fontScale: parseInt(e.target.value) / 100 })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>

                  {/* Text alignment */}
                  <div>
                    <label className="text-xs font-medium text-white/40 mb-1.5 block">Alinhamento</label>
                    <div className="flex gap-2">
                      {([
                        { value: 'left' as const, icon: AlignLeft, label: 'Esquerda' },
                        { value: 'center' as const, icon: AlignCenter, label: 'Centro' },
                        { value: 'right' as const, icon: AlignRight, label: 'Direita' },
                      ]).map(({ value, icon: Icon, label }) => (
                        <button key={value} onClick={() => onUpdateCard(cardIndex, { textAlign: value })}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all ${currentAlign === value ? 'ring-2 ring-white/50 border-white/20 bg-white/[0.08] text-white' : 'border-white/[0.06] text-white/40 hover:bg-white/[0.04]'}`}>
                          <Icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Margins */}
                  <div>
                    <label className="text-xs font-medium text-white/40 mb-1 flex items-center justify-between">
                      <span>Margens</span>
                      <span className="text-[10px] font-mono text-white/50">{Math.round((card.paddingScale ?? 1) * 100)}%</span>
                    </label>
                    <input type="range" min="30" max="200" step="5"
                      value={Math.round((card.paddingScale ?? 1) * 100)}
                      onChange={(e) => onUpdateCard(cardIndex, { paddingScale: parseInt(e.target.value) / 100 })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== STYLE / COLORS ===== */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setShowStyle(!showStyle)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" style={{ color: FLOW_COLOR }} />
                <span className="text-sm font-semibold text-white">Cores & Estilo</span>
              </div>
              {showStyle ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
            </button>
            {showStyle && (
              <div className="px-4 pb-4 space-y-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Background color */}
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 flex items-center gap-1.5">
                    Cor de Fundo
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={bgColor} onChange={(e) => onChangeBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent" />
                    <Input value={bgColor} onChange={(e) => onChangeBgColor(e.target.value)}
                      className="rounded-xl text-xs h-8 font-mono flex-1 !bg-white/[0.04] !border-white/[0.08] !text-white" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PRESET_COLORS.slice(0, 7).map(c => (
                      <button key={c} onClick={() => onChangeBgColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${bgColor === c ? 'border-white scale-110' : 'border-white/10'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                {/* Accent color */}
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 flex items-center gap-1.5">
                    Cor de Destaque
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={(e) => onChangeAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent" />
                    <Input value={accentColor} onChange={(e) => onChangeAccentColor(e.target.value)}
                      className="rounded-xl text-xs h-8 font-mono flex-1 !bg-white/[0.04] !border-white/[0.08] !text-white" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['#E84D1A', '#E94560', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#007DE3'].map(c => (
                      <button key={c} onClick={() => onChangeAccentColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${accentColor === c ? 'border-white scale-110' : 'border-white/10'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                {/* Text color */}
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 flex items-center gap-1.5">
                    Cor do Texto
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={textColor} onChange={(e) => onChangeTextColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent" />
                    <Input value={textColor} onChange={(e) => onChangeTextColor(e.target.value)}
                      className="rounded-xl text-xs h-8 font-mono flex-1 !bg-white/[0.04] !border-white/[0.08] !text-white" />
                  </div>
                </div>

                {/* Font selector (global) */}
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 flex items-center gap-1.5">
                    <Type className="h-3 w-3" /> Fonte (todos os cards)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {fontOptions.map((font, i) => (
                      <button key={i} onClick={() => onChangeFont(i)}
                        className={`px-2.5 py-2 rounded-xl text-xs border transition-all text-left truncate ${selectedFont === i ? 'ring-2 ring-white/50 border-white/20 bg-white/[0.08] font-bold text-white' : 'border-white/[0.06] text-white/40 hover:bg-white/[0.04]'}`}>
                        <span style={{ fontFamily: font.value }}>{font.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== CARD-SPECIFIC CONTENT ===== */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Type className="h-4 w-4 text-white/40" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Conteúdo</span>
            </div>

            {/* Accent text hint */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl text-[11px] text-white/50 leading-relaxed" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: FLOW_COLOR }} />
              <span>Use <code className="px-1 py-0.5 rounded font-mono text-[10px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>**texto**</code> para destacar em <span style={{ color: accentColor, fontWeight: 700 }}>cor de destaque</span></span>
            </div>

            {card.type === 'cover' && (
              <>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 block">Título</label>
                  <Textarea value={card.title || ''} onChange={(e) => onUpdateCard(cardIndex, { title: e.target.value })}
                    placeholder="Título da capa" className="rounded-xl min-h-[80px] resize-none text-sm !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 block">Subtítulo</label>
                  <Input value={card.subtitle || ''} onChange={(e) => onUpdateCard(cardIndex, { subtitle: e.target.value })}
                    placeholder="Subtítulo" className="rounded-xl text-sm !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
              </>
            )}

            {card.type === 'content' && (
              <>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 block">Texto principal</label>
                  <Textarea value={card.bodyTop || ''} onChange={(e) => onUpdateCard(cardIndex, { bodyTop: e.target.value })}
                    placeholder="Texto superior" className="rounded-xl min-h-[100px] resize-none text-sm !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 block">Texto complementar</label>
                  <Textarea value={card.bodyBottom || ''} onChange={(e) => onUpdateCard(cardIndex, { bodyBottom: e.target.value })}
                    placeholder="Texto inferior" className="rounded-xl min-h-[70px] resize-none text-sm !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
              </>
            )}

            {card.type === 'tweet' && (
              <>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 block">Texto do tweet</label>
                  <Textarea value={card.body || ''} onChange={(e) => onUpdateCard(cardIndex, { body: e.target.value })}
                    placeholder="Escreva o tweet..." className="rounded-xl min-h-[140px] resize-none text-sm !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
              </>
            )}

            {card.type === 'cta' && (
              <>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 block">Título CTA</label>
                  <Input value={card.title || ''} onChange={(e) => onUpdateCard(cardIndex, { title: e.target.value })}
                    placeholder="Título" className="rounded-xl text-sm !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 block">Mensagem</label>
                  <Textarea value={card.body || ''} onChange={(e) => onUpdateCard(cardIndex, { body: e.target.value })}
                    placeholder="Mensagem" className="rounded-xl min-h-[70px] resize-none text-sm !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
              </>
            )}
          </div>

          {/* ===== REAL ESTATE PROPERTY FIELDS ===== */}
          {isRealEstate && propertyData && onPropertyFieldChange && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Home className="h-4 w-4 text-white/40" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Dados do Imóvel</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-white/40 mb-0.5 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Preço</label>
                  <Input value={propertyData.price || ''} onChange={(e) => onPropertyFieldChange('price', e.target.value)}
                    placeholder="250000" className="rounded-xl text-xs h-8 !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-white/40 mb-0.5 flex items-center gap-1"><Ruler className="h-3 w-3" /> Área (m²)</label>
                  <Input value={propertyData.area || ''} onChange={(e) => onPropertyFieldChange('area', e.target.value)}
                    placeholder="120" className="rounded-xl text-xs h-8 !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-white/40 mb-0.5 flex items-center gap-1"><BedDouble className="h-3 w-3" /> Quartos</label>
                  <Input value={propertyData.bedrooms || ''} onChange={(e) => onPropertyFieldChange('bedrooms', e.target.value)}
                    placeholder="3" className="rounded-xl text-xs h-8 !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-white/40 mb-0.5 flex items-center gap-1"><Bath className="h-3 w-3" /> Banheiros</label>
                  <Input value={propertyData.bathrooms || ''} onChange={(e) => onPropertyFieldChange('bathrooms', e.target.value)}
                    placeholder="2" className="rounded-xl text-xs h-8 !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-white/40 mb-0.5 flex items-center gap-1"><Car className="h-3 w-3" /> Vagas</label>
                  <Input value={propertyData.parking || ''} onChange={(e) => onPropertyFieldChange('parking', e.target.value)}
                    placeholder="2" className="rounded-xl text-xs h-8 !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-white/40 mb-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> Bairro</label>
                  <Input value={propertyData.neighborhood || ''} onChange={(e) => onPropertyFieldChange('neighborhood', e.target.value)}
                    placeholder="Centro" className="rounded-xl text-xs h-8 !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-white/40 mb-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> Localização</label>
                <Input value={propertyData.location || ''} onChange={(e) => onPropertyFieldChange('location', e.target.value)}
                  placeholder="São Paulo, SP" className="rounded-xl text-xs h-8 !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-white/40 mb-0.5 block">Destaques</label>
                <Input value={propertyData.highlights || ''} onChange={(e) => onPropertyFieldChange('highlights', e.target.value)}
                  placeholder="Financiável, Aceita FGTS" className="rounded-xl text-xs h-8 !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Palette className="h-4 w-4 text-white/40" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Layout</span>
            </div>
            <div className="flex gap-2">
              {(['dark', 'light', 'accent'] as const).map(l => (
                <button key={l} onClick={() => onUpdateCard(cardIndex, { layout: l })}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${card.layout === l ? 'ring-2 ring-primary scale-105' : 'hover:scale-[1.02]'}`}
                  style={{
                    backgroundColor: l === 'dark' ? bgColor : l === 'accent' ? accentColor : bgColor,
                    color: l === 'light' ? '#1A1A1A' : '#FFF',
                    borderColor: l === 'light' ? '#ddd' : 'transparent'
                  }}>
                  {l === 'dark' ? 'Escuro' : l === 'light' ? 'Claro' : 'Destaque'}
                </button>
              ))}
            </div>
          </div>

          {/* ===== FONT & PADDING (non-Content styles) ===== */}
          {!isContentStyle && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <SlidersHorizontal className="h-4 w-4 text-white/40" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Ajustes</span>
              </div>
              <div>
                <label className="text-xs font-medium text-white/40 mb-1 flex items-center justify-between">
                  <span>Tamanho da Fonte</span>
                  <span className="text-[10px] font-mono text-white/50">{Math.round((card.fontScale ?? 1) * 100)}%</span>
                </label>
                <input type="range" min="70" max="260" step="5"
                  value={Math.round((card.fontScale ?? 1) * 100)}
                  onChange={(e) => onUpdateCard(cardIndex, { fontScale: parseInt(e.target.value) / 100 })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-white/40 mb-1 flex items-center justify-between">
                  <span>Margens</span>
                  <span className="text-[10px] font-mono text-white/50">{Math.round((card.paddingScale ?? 1) * 100)}%</span>
                </label>
                <input type="range" min="60" max="220" step="5"
                  value={Math.round((card.paddingScale ?? 1) * 100)}
                  onChange={(e) => onUpdateCard(cardIndex, { paddingScale: parseInt(e.target.value) / 100 })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary" />
              </div>
              {card.type === 'tweet' && (
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 block">Alinhamento</label>
                  <div className="flex gap-2">
                    {([
                      { value: 'left' as const, icon: AlignLeft, label: 'Esquerda' },
                      { value: 'center' as const, icon: AlignCenter, label: 'Centro' },
                      { value: 'right' as const, icon: AlignRight, label: 'Direita' },
                    ]).map(({ value, icon: Icon, label }) => (
                      <button key={value} onClick={() => onUpdateCard(cardIndex, { textAlign: value })}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all ${currentAlign === value ? 'ring-2 ring-white/50 border-white/20 bg-white/[0.08] text-white' : 'border-white/[0.06] text-white/40 hover:bg-white/[0.04]'}`}>
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== IMAGE ===== */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="h-4 w-4 text-white/40" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Imagem</span>
            </div>

            <div>
              <label className="text-xs font-medium text-white/40 mb-1 block">Prompt da imagem</label>
              <Textarea value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)}
                placeholder="Descreva a imagem que deseja gerar..." className="rounded-xl min-h-[60px] resize-none text-sm !bg-white/[0.04] !border-white/[0.08] !text-white !placeholder-white/20" />
            </div>

            {/* Reference image */}
            <div>
              <label className="text-xs font-medium text-white/40 mb-1.5 flex items-center gap-1.5">
                <Paperclip className="h-3 w-3" /> Foto de Referência (opcional)
              </label>
              <input ref={refImageInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadReferenceImage(f); }} />
              {referenceImageUrl ? (
                <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img src={referenceImageUrl} alt="Referência" className="w-full h-24 object-cover" />
                  <button onClick={onRemoveReferenceImage}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => refImageInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed text-sm text-white/40 hover:bg-white/[0.04] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Paperclip className="h-4 w-4" /> Anexar referência
                </button>
              )}
            </div>

            <Button onClick={() => onGenerateAiImage(cardIndex)} disabled={generatingAiImage}
              className="w-full gap-2 rounded-xl" style={{ backgroundColor: accentColor }}>
              {generatingAiImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generatingAiImage ? 'Gerando...' : 'Gerar com IA'}
            </Button>

            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(cardIndex, f); }} />
              <button onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm text-white/40 hover:bg-white/[0.04] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <Upload className="h-4 w-4" /> Upload
              </button>
              <button onClick={() => onOpenImagePicker(cardIndex)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm text-white/40 hover:bg-white/[0.04] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <Search className="h-4 w-4" /> Buscar
              </button>
            </div>

            {card.imageUrl && (
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <img src={card.imageUrl} alt="Preview" className="w-full h-32 object-cover" />
                <button onClick={() => onUpdateCard(cardIndex, { imageUrl: undefined })}
                  className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CarouselEditorSidebar;
