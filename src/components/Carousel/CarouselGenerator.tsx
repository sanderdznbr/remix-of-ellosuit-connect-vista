import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Sparkles, Download, Plus, Trash2, Image as ImageIcon, 
  Search, Edit3, Loader2, X, Upload, Wand2, Type, Palette
} from 'lucide-react';
import html2canvas from 'html2canvas';

const FLOW_COLOR = '#007DE3';
const CARD_W = 1080;
const CARD_H = 1350;
const PREVIEW_W = 300;
const PREVIEW_H = PREVIEW_W * (CARD_H / CARD_W);

const FONT_OPTIONS = [
  { label: 'Playfair Display', value: "'Playfair Display', 'Georgia', serif", google: 'Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700' },
  { label: 'Merriweather', value: "'Merriweather', 'Georgia', serif", google: 'Merriweather:wght@400;700;900' },
  { label: 'Lora', value: "'Lora', 'Georgia', serif", google: 'Lora:ital,wght@0,400;0,600;0,700;1,400;1,700' },
  { label: 'DM Serif Display', value: "'DM Serif Display', 'Georgia', serif", google: 'DM+Serif+Display:ital@0;1' },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', 'Georgia', serif", google: 'Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,700' },
  { label: 'Montserrat', value: "'Montserrat', 'Helvetica Neue', sans-serif", google: 'Montserrat:wght@400;500;600;700;800;900' },
  { label: 'Poppins', value: "'Poppins', 'Helvetica Neue', sans-serif", google: 'Poppins:wght@400;500;600;700;800;900' },
  { label: 'Bebas Neue', value: "'Bebas Neue', 'Impact', sans-serif", google: 'Bebas+Neue' },
  { label: 'Oswald', value: "'Oswald', 'Impact', sans-serif", google: 'Oswald:wght@400;500;600;700' },
  { label: 'Raleway', value: "'Raleway', 'Helvetica Neue', sans-serif", google: 'Raleway:wght@400;500;600;700;800;900' },
];

interface CarouselCard {
  type: 'cover' | 'content' | 'cta';
  title?: string;
  subtitle?: string;
  body?: string;
  bodyTop?: string;
  bodyBottom?: string;
  imageUrl?: string;
  imagePrompt?: string;
  layout?: 'dark' | 'light' | 'accent';
}

interface CarouselData {
  title: string;
  cards: CarouselCard[];
}

interface PexelsImage {
  id: number;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
}

const CarouselGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [cardCount, setCardCount] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [carouselData, setCarouselData] = useState<CarouselData | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  const [searchingImages, setSearchingImages] = useState(false);
  const [pexelsImages, setPexelsImages] = useState<PexelsImage[]>([]);
  const [showImagePicker, setShowImagePicker] = useState<number | null>(null);
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState('');

  const [editingCard, setEditingCard] = useState<number | null>(null);

  const [brandName, setBrandName] = useState('Powered by ellosuit');
  const [userName, setUserName] = useState('');
  const [dateLabel, setDateLabel] = useState(() => {
    const d = new Date();
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${months[d.getMonth()]} ${d.getFullYear()} ®`;
  });
  const [bgColor, setBgColor] = useState('#0F0F1A');
  const [accentColor, setAccentColor] = useState('#E84D1A');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [selectedFont, setSelectedFont] = useState(0); // index into FONT_OPTIONS
  const [showStylePanel, setShowStylePanel] = useState(false);

  const currentFont = FONT_OPTIONS[selectedFont];
  const serif = currentFont.value;
  const sans = "'Inter', 'Helvetica Neue', sans-serif";

  // Build Google Fonts URL
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${FONT_OPTIONS.map(f => f.google).join('&family=')}&family=Inter:wght@400;500;600;700;800&display=swap`;

  // Generate AI image for a specific card
  const generateAiImageForCard = async (cardIndex: number, cards: CarouselCard[]): Promise<string | null> => {
    const card = cards[cardIndex];
    const imgPrompt = card?.imagePrompt || card?.title || card?.bodyTop || topic;
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-ai-image',
          prompt: `Professional editorial photo, magazine quality, cinematic lighting, 4:5 aspect ratio: ${imgPrompt}`,
          imageSize: '3:4',
          topic: imgPrompt,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro');
      return data.imageUrl;
    } catch (err) {
      console.error('Image gen error for card', cardIndex, err);
      return null;
    }
  };

  const generateContent = async () => {
    if (!topic.trim()) {
      toast({ title: 'Insira um tópico', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-content',
          topic: topic.trim(),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar');

      const cards: CarouselCard[] = data.data.cards.map((c: any, i: number) => {
        if (c.type === 'cover') return { ...c, layout: 'dark' as const };
        if (c.type === 'cta') return { ...c, layout: 'accent' as const };
        const layouts: CarouselCard['layout'][] = ['dark', 'dark', 'light', 'accent', 'dark'];
        return { ...c, layout: layouts[(i - 1) % layouts.length] };
      });

      setCarouselData({ ...data.data, cards });
      setActiveCardIndex(0);
      toast({ title: 'Conteúdo gerado!', description: `${cards.length} cards criados. Gerando imagens...` });

      setGeneratingAllImages(true);
      const updatedCards = [...cards];
      
      for (let i = 0; i < updatedCards.length; i++) {
        const card = updatedCards[i];
        if (card.imagePrompt || card.type === 'cover') {
          setImageGenProgress(`Gerando imagem ${i + 1}/${updatedCards.length}...`);
          const url = await generateAiImageForCard(i, updatedCards);
          if (url) {
            updatedCards[i] = { ...updatedCards[i], imageUrl: url };
            setCarouselData(prev => prev ? { ...prev, cards: [...updatedCards] } : null);
          }
        }
      }
      setGeneratingAllImages(false);
      setImageGenProgress('');
      toast({ title: 'Carrossel completo!', description: 'Conteúdo e imagens prontos' });

    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro', description: err.message || 'Não foi possível gerar', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const searchImages = async (kws?: string[]) => {
    setSearchingImages(true);
    try {
      const searchKeywords = kws || keywords.split(',').map(k => k.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'search-images', topic: topic.trim(), keywords: searchKeywords },
      });
      if (error) throw error;
      if (data?.images) setPexelsImages(data.images);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingImages(false);
    }
  };

  const setCardImage = (cardIndex: number, imageUrl: string) => {
    if (!carouselData) return;
    const newCards = [...carouselData.cards];
    newCards[cardIndex] = { ...newCards[cardIndex], imageUrl };
    setCarouselData({ ...carouselData, cards: newCards });
    setShowImagePicker(null);
  };

  const generateAiImage = async (cardIndex: number) => {
    const promptText = aiImagePrompt.trim() || carouselData?.cards[cardIndex]?.imagePrompt || carouselData?.cards[cardIndex]?.title || topic;
    if (!promptText) {
      toast({ title: 'Insira um prompt', variant: 'destructive' });
      return;
    }
    setGeneratingAiImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-ai-image',
          prompt: `Professional editorial photo, magazine quality, cinematic: ${promptText}`,
          imageSize: '3:4',
          topic: promptText,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro');
      setCardImage(cardIndex, data.imageUrl);
      setAiImagePrompt('');
      toast({ title: 'Imagem gerada!' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingAiImage(false);
    }
  };

  const updateCard = (index: number, updates: Partial<CarouselCard>) => {
    if (!carouselData) return;
    const newCards = [...carouselData.cards];
    newCards[index] = { ...newCards[index], ...updates };
    setCarouselData({ ...carouselData, cards: newCards });
  };

  const addCard = () => {
    if (!carouselData) return;
    const newCard: CarouselCard = { type: 'content', bodyTop: 'Texto principal aqui...', bodyBottom: 'Texto complementar...', layout: 'dark' };
    const cards = [...carouselData.cards];
    cards.splice(cards.length - 1, 0, newCard);
    setCarouselData({ ...carouselData, cards });
  };

  const removeCard = (index: number) => {
    if (!carouselData || carouselData.cards.length <= 2) return;
    const cards = carouselData.cards.filter((_, i) => i !== index);
    setCarouselData({ ...carouselData, cards });
    if (activeCardIndex >= cards.length) setActiveCardIndex(cards.length - 1);
  };

  const handleFileUpload = (cardIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setCardImage(cardIndex, e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const exportAllCards = async () => {
    if (!carouselData) return;
    setExporting(true);
    try {
      for (let i = 0; i < carouselData.cards.length; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, {
          width: CARD_W, height: CARD_H, scale: 1,
          useCORS: true, allowTaint: true, backgroundColor: null,
        });
        const link = document.createElement('a');
        link.download = `carousel-card-${i + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(r => setTimeout(r, 300));
      }
      toast({ title: 'Download completo!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  // ==================== RENDER HELPERS ====================

  const renderAccentText = (text: string, color: string, baseColor: string, fontSize: number, s: number) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} style={{ color }}>{part.slice(2, -2)}</span>;
          }
          return <span key={i} style={{ color: baseColor }}>{part}</span>;
        })}
      </span>
    );
  };

  const renderCardPreview = (card: CarouselCard, index: number, isExport = false) => {
    const w = isExport ? CARD_W : PREVIEW_W;
    const h = isExport ? CARD_H : PREVIEW_H;
    const s = isExport ? 1 : PREVIEW_W / CARD_W;

    const layout = card.layout || 'dark';
    const isDark = layout === 'dark';
    const isLight = layout === 'light';
    const isAccent = layout === 'accent';

    const bg = isAccent ? accentColor : isLight ? '#F8F4EF' : bgColor;
    const mainTxt = isLight ? '#1A1A1A' : textColor;
    const secondaryTxt = isAccent ? 'rgba(255,255,255,0.75)' : isLight ? '#666' : 'rgba(255,255,255,0.75)';
    const accentTxt = isAccent ? '#FFD4A0' : isLight ? accentColor : accentColor;
    const headerTxt = isLight ? '#999' : 'rgba(255,255,255,0.5)';

    const renderHeader = () => (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${28 * s}px ${48 * s}px`,
        fontFamily: sans, fontSize: `${20 * s}px`, fontWeight: 500,
        color: headerTxt, letterSpacing: `${0.5 * s}px`,
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      }}>
        <span>{brandName}</span>
        <span>{userName ? `@${userName}` : ''}</span>
        <span>{dateLabel}</span>
      </div>
    );

    // ===== COVER =====
    if (card.type === 'cover') {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}>
          {card.imageUrl && (
            <img src={card.imageUrl} alt="" crossOrigin="anonymous"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: card.imageUrl
              ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.25) 100%)'
              : `linear-gradient(180deg, ${bgColor} 0%, ${accentColor}44 100%)`,
          }} />
          {renderHeader()}
          
          <div style={{
            position: 'absolute', left: '50%', top: `${520 * s}px`,
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: `${12 * s}px`, zIndex: 10,
          }}>
            <div style={{
              width: `${52 * s}px`, height: `${52 * s}px`, borderRadius: '50%', backgroundColor: accentColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: `${22 * s}px`, color: '#FFF', fontFamily: sans, fontWeight: 900,
            }}>✦</div>
            {userName && (
              <span style={{ fontFamily: sans, fontSize: `${24 * s}px`, fontWeight: 600, color: '#FFF' }}>
                @{userName}
              </span>
            )}
            <span style={{ fontSize: `${22 * s}px`, color: '#4A9EFF' }}>✓</span>
          </div>

          <div style={{
            position: 'absolute', bottom: `${70 * s}px`, left: `${48 * s}px`, right: `${48 * s}px`, zIndex: 10,
            textAlign: 'center',
          }}>
            <h1 style={{
              fontFamily: serif, fontSize: `${76 * s}px`, fontWeight: 900,
              lineHeight: 1.0, color: '#FFFFFF', textTransform: 'uppercase',
              letterSpacing: `-${1 * s}px`,
              textShadow: '0 4px 40px rgba(0,0,0,0.7)',
            }}>
              {renderAccentText(card.title || '', accentColor, '#FFFFFF', 76, s)}
            </h1>
            {card.subtitle && (
              <p style={{
                fontFamily: sans, fontSize: `${22 * s}px`, fontWeight: 600,
                color: '#FFFFFF', opacity: 0.85, marginTop: `${24 * s}px`,
                lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: `${3 * s}px`,
              }}>
                → {card.subtitle}
              </p>
            )}
          </div>
        </div>
      );
    }

    // ===== CTA =====
    if (card.type === 'cta') {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}>
          {card.imageUrl && (
            <>
              <img src={card.imageUrl} alt="" crossOrigin="anonymous"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)' }} />
            </>
          )}
          {renderHeader()}
          <div style={{
            position: 'absolute', inset: `${100 * s}px ${48 * s}px ${60 * s}px`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            textAlign: 'center', zIndex: 10,
          }}>
            <div style={{
              width: `${80 * s}px`, height: `${80 * s}px`, borderRadius: '50%',
              backgroundColor: isAccent ? 'rgba(255,255,255,0.15)' : accentColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: `${36 * s}px`, color: '#FFF', fontFamily: sans,
              marginBottom: `${40 * s}px`,
            }}>✦</div>
            <h2 style={{
              fontFamily: serif, fontSize: `${68 * s}px`, fontWeight: 900,
              lineHeight: 1.05, color: mainTxt, marginBottom: `${30 * s}px`,
            }}>
              {card.title}
            </h2>
            {card.body && (
              <p style={{
                fontFamily: serif, fontSize: `${34 * s}px`, fontWeight: 400,
                lineHeight: 1.5, color: mainTxt, fontStyle: 'italic', opacity: 0.8,
                maxWidth: `${900 * s}px`,
              }}>
                "{card.body}"
              </p>
            )}
            {userName && (
              <div style={{
                marginTop: `${50 * s}px`, padding: `${16 * s}px ${36 * s}px`,
                border: `${2.5 * s}px solid ${mainTxt}`,
                borderRadius: `${50 * s}px`,
              }}>
                <p style={{
                  fontFamily: sans, fontSize: `${22 * s}px`, fontWeight: 700,
                  color: mainTxt, textTransform: 'uppercase', letterSpacing: `${2 * s}px`,
                }}>
                  @{userName}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ===== CONTENT CARDS =====
    const hasImage = !!card.imageUrl;
    const topText = card.bodyTop || card.body || card.title || '';
    const bottomText = card.bodyBottom || '';

    if (!hasImage && isAccent) {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}>
          {renderHeader()}
          <div style={{
            position: 'absolute', top: `${90 * s}px`, left: `${48 * s}px`, right: `${48 * s}px`, bottom: `${60 * s}px`,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', zIndex: 5,
            paddingTop: `${30 * s}px`,
          }}>
            <p style={{
              fontFamily: serif, fontSize: `${56 * s}px`, fontWeight: 700,
              lineHeight: 1.15, color: mainTxt,
            }}>
              {renderAccentText(topText, accentTxt, mainTxt, 56, s)}
            </p>
            {bottomText && (
              <p style={{
                fontFamily: serif, fontSize: `${32 * s}px`, fontWeight: 400,
                lineHeight: 1.5, color: secondaryTxt,
                marginTop: 'auto',
                textDecoration: 'underline',
                textDecorationColor: `${secondaryTxt}55`,
                textUnderlineOffset: `${6 * s}px`,
              }}>
                {bottomText}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}>
        {renderHeader()}
        
        <div style={{
          position: 'absolute', top: `${70 * s}px`, left: `${48 * s}px`, right: `${48 * s}px`, bottom: `${40 * s}px`,
          display: 'flex', flexDirection: 'column', zIndex: 5,
        }}>
          <div style={{ paddingTop: `${20 * s}px`, flex: hasImage ? undefined : 1, display: hasImage ? undefined : 'flex', flexDirection: hasImage ? undefined : 'column', justifyContent: hasImage ? undefined : 'center' }}>
            <p style={{
              fontFamily: serif, fontSize: `${48 * s}px`, fontWeight: 700,
              lineHeight: 1.18, color: mainTxt,
            }}>
              {renderAccentText(topText, accentTxt, mainTxt, 48, s)}
            </p>
          </div>

          {hasImage && (
            <div style={{
              marginTop: `${24 * s}px`,
              flex: 1,
              minHeight: `${400 * s}px`,
              borderRadius: `${16 * s}px`,
              overflow: 'hidden',
            }}>
              <img src={card.imageUrl} alt="" crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {bottomText && (
            <div style={{ paddingTop: `${24 * s}px` }}>
              <p style={{
                fontFamily: serif, fontSize: `${36 * s}px`, fontWeight: 600,
                lineHeight: 1.3, color: hasImage ? mainTxt : secondaryTxt,
              }}>
                {renderAccentText(bottomText, accentTxt, hasImage ? mainTxt : secondaryTxt, 36, s)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== STYLE PANEL (shown after generation) ====================
  const renderStylePanel = () => (
    <Card className="border-0 shadow-md rounded-3xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" style={{ color: FLOW_COLOR }} />
            <h3 className="font-bold text-foreground">Estilo em Tempo Real</h3>
          </div>
          <button onClick={() => setShowStylePanel(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Font selector */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" /> Fonte
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FONT_OPTIONS.map((font, i) => (
              <button key={i} onClick={() => setSelectedFont(i)}
                className={`px-3 py-2.5 rounded-xl text-sm border transition-all text-left ${selectedFont === i ? 'ring-2 ring-primary border-primary bg-primary/5 font-bold' : 'border-border hover:bg-muted/50'}`}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color controls */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Cor de fundo</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-9 h-9 rounded-lg border-0 cursor-pointer" />
              <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="rounded-xl flex-1 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Cor destaque</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-9 h-9 rounded-lg border-0 cursor-pointer" />
              <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="rounded-xl flex-1 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Cor do texto</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-9 h-9 rounded-lg border-0 cursor-pointer" />
              <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="rounded-xl flex-1 text-xs font-mono" />
            </div>
          </div>
        </div>

        {/* Brand settings */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Marca</label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="rounded-xl text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">@ Instagram</label>
            <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="seuuser" className="rounded-xl text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Data</label>
            <Input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} className="rounded-xl text-xs" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ==================== UI ====================

  return (
    <div className="min-h-screen bg-background">
      <link href={googleFontsUrl} rel="stylesheet" />

      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-7xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: FLOW_COLOR }}>Gerador de Carrossel</h1>
            <p className="text-xs text-muted-foreground">Carrosséis editoriais 1080×1350 para Instagram</p>
          </div>
          {carouselData && !generatingAllImages && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowStylePanel(!showStylePanel)}
                className="gap-1.5 rounded-xl">
                <Palette className="h-4 w-4" /> Estilo
              </Button>
              <Button onClick={exportAllCards} disabled={exporting} className="gap-2 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exportar PNGs
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Input Section */}
        {!carouselData && (
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-5">
              <div className="text-center pb-2">
                <h2 className="text-xl font-bold text-foreground mb-1">Criar Carrossel Editorial</h2>
                <p className="text-sm text-muted-foreground">Conteúdo + imagens gerados automaticamente com IA</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Tópico do Carrossel</label>
                <Textarea value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: A colaboração entre Cimed e Toguro no mercado de suplementos"
                  className="rounded-2xl min-h-[80px] resize-none text-base" />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Palavras-chave (opcional)</label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  placeholder="proteína, saúde, marketing (separadas por vírgula)" className="rounded-2xl" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Nº de Cards</label>
                  <Input type="number" min={3} max={15} value={cardCount}
                    onChange={(e) => setCardCount(parseInt(e.target.value) || 7)} className="rounded-2xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">@ Instagram</label>
                  <Input value={userName} onChange={(e) => setUserName(e.target.value)}
                    placeholder="seuuser" className="rounded-2xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Marca</label>
                  <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="rounded-2xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Data</label>
                  <Input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} className="rounded-2xl" />
                </div>
              </div>

              {/* Font selection */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5" /> Fonte do Carrossel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {FONT_OPTIONS.map((font, i) => (
                    <button key={i} onClick={() => setSelectedFont(i)}
                      className={`px-3 py-2 rounded-xl text-sm border transition-all ${selectedFont === i ? 'ring-2 ring-primary border-primary bg-primary/5 font-bold' : 'border-border hover:bg-muted/50'}`}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Cor de fundo</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded-lg border-0 cursor-pointer" />
                    <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="rounded-2xl flex-1 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Cor destaque</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-8 h-8 rounded-lg border-0 cursor-pointer" />
                    <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="rounded-2xl flex-1 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Cor do texto</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded-lg border-0 cursor-pointer" />
                    <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="rounded-2xl flex-1 text-xs" />
                  </div>
                </div>
              </div>

              <Button onClick={generateContent} disabled={generating}
                className="w-full gap-2 h-14 rounded-2xl text-lg font-bold" style={{ backgroundColor: FLOW_COLOR }}>
                {generating ? <><Loader2 className="h-5 w-5 animate-spin" /> Gerando conteúdo + imagens com IA...</>
                  : <><Sparkles className="h-5 w-5" /> Gerar Carrossel Completo</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress banner */}
        {generatingAllImages && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-muted/50">
            <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" style={{ color: accentColor }} />
            <div>
              <p className="text-sm font-semibold text-foreground">{imageGenProgress || 'Gerando imagens com IA...'}</p>
              <p className="text-xs text-muted-foreground">Imagens são aplicadas automaticamente conforme ficam prontas</p>
            </div>
          </div>
        )}

        {/* Style Panel (shown when toggled after generation) */}
        {carouselData && showStylePanel && renderStylePanel()}

        {/* Preview & Edit */}
        {carouselData && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-foreground text-lg">Preview ({carouselData.cards.length} cards)</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addCard} className="gap-1 rounded-xl">
                    <Plus className="h-3 w-3" /> Card
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCarouselData(null)} className="rounded-xl">Novo</Button>
                </div>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4">
                {carouselData.cards.map((card, i) => (
                  <div key={i} className="snap-center flex-shrink-0 relative group">
                    <div className={`cursor-pointer transition-all rounded-2xl ${activeCardIndex === i ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                      onClick={() => setActiveCardIndex(i)}>
                      {renderCardPreview(card, i)}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button onClick={() => setEditingCard(i)} className="p-1.5 bg-black/70 rounded-lg text-white hover:bg-black/90">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setShowImagePicker(i); setAiImagePrompt(card.imagePrompt || card.title || ''); }} className="p-1.5 bg-black/70 rounded-lg text-white hover:bg-black/90">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </button>
                      {carouselData.cards.length > 2 && (
                        <button onClick={() => removeCard(i)} className="p-1.5 bg-red-600/80 rounded-lg text-white hover:bg-red-700">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-2 font-medium">{i + 1}/{carouselData.cards.length}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Panel */}
            {editingCard !== null && carouselData.cards[editingCard] && (() => {
              const ec = carouselData.cards[editingCard];
              return (
                <Card className="border-0 shadow-md rounded-3xl">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">Editar Card {editingCard + 1}</h3>
                      <button onClick={() => setEditingCard(null)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
                    </div>
                    {ec.type === 'cover' && (
                      <>
                        <Input value={ec.title || ''} onChange={(e) => updateCard(editingCard, { title: e.target.value })} placeholder="Título" className="rounded-xl" />
                        <Input value={ec.subtitle || ''} onChange={(e) => updateCard(editingCard, { subtitle: e.target.value })} placeholder="Subtítulo" className="rounded-xl" />
                      </>
                    )}
                    {ec.type === 'content' && (
                      <>
                        <Textarea value={ec.bodyTop || ''} onChange={(e) => updateCard(editingCard, { bodyTop: e.target.value })}
                          placeholder="Texto superior (use **destaque** para cor accent)" className="rounded-xl min-h-[80px] resize-none" />
                        <Textarea value={ec.bodyBottom || ''} onChange={(e) => updateCard(editingCard, { bodyBottom: e.target.value })}
                          placeholder="Texto inferior" className="rounded-xl min-h-[60px] resize-none" />
                      </>
                    )}
                    {ec.type === 'cta' && (
                      <>
                        <Input value={ec.title || ''} onChange={(e) => updateCard(editingCard, { title: e.target.value })} placeholder="Título CTA" className="rounded-xl" />
                        <Textarea value={ec.body || ''} onChange={(e) => updateCard(editingCard, { body: e.target.value })} placeholder="Mensagem" className="rounded-xl min-h-[60px] resize-none" />
                      </>
                    )}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Layout</label>
                      <div className="flex gap-2">
                        {(['dark', 'light', 'accent'] as const).map(l => (
                          <button key={l} onClick={() => updateCard(editingCard, { layout: l })}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${ec.layout === l ? 'ring-2 ring-primary scale-105' : ''}`}
                            style={{
                              backgroundColor: l === 'dark' ? bgColor : l === 'accent' ? accentColor : '#F8F4EF',
                              color: l === 'light' ? '#1A1A1A' : '#FFF',
                              borderColor: l === 'light' ? '#ddd' : 'transparent',
                            }}>
                            {l === 'dark' ? 'Escuro' : l === 'light' ? 'Claro' : 'Destaque'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Prompt da imagem</label>
                      <Input value={ec.imagePrompt || ''} onChange={(e) => updateCard(editingCard, { imagePrompt: e.target.value })}
                        placeholder="Descrição para gerar imagem com IA" className="rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground font-medium">
                        <Upload className="h-4 w-4" /> Upload
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(editingCard, f); }} />
                      </label>
                      <Button variant="outline" size="sm" onClick={() => { setShowImagePicker(editingCard); }} className="rounded-xl gap-1 h-10">
                        <Search className="h-4 w-4" /> Pexels
                      </Button>
                      <Button size="sm"
                        onClick={() => { setShowImagePicker(editingCard); setAiImagePrompt(ec.imagePrompt || ec.title || ''); }}
                        className="rounded-xl gap-1 h-10" style={{ backgroundColor: accentColor }}>
                        <Wand2 className="h-4 w-4" /> Gerar IA
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Image Picker */}
            {showImagePicker !== null && (
              <Card className="border-0 shadow-lg rounded-3xl">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Imagem — Card {showImagePicker + 1}</h3>
                    <button onClick={() => setShowImagePicker(null)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
                  </div>

                  {/* AI Generation */}
                  <div className="p-4 rounded-2xl border-2 border-dashed" style={{ borderColor: accentColor + '66' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Wand2 className="h-5 w-5" style={{ color: accentColor }} />
                      <p className="text-sm font-bold text-foreground">Gerar com IA</p>
                    </div>
                    <div className="flex gap-2">
                      <Input value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)}
                        placeholder="Descreva a imagem..." className="rounded-xl flex-1" />
                      <Button onClick={() => generateAiImage(showImagePicker)} disabled={generatingAiImage}
                        className="gap-2 rounded-xl px-5" style={{ backgroundColor: accentColor }}>
                        {generatingAiImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Gerar
                      </Button>
                    </div>
                    {generatingAiImage && <p className="text-xs text-muted-foreground text-center mt-2 animate-pulse">⏳ Gerando... até 60s</p>}
                  </div>

                  {/* Pexels */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Banco de imagens (Pexels)</p>
                    </div>
                    {!pexelsImages.length && !searchingImages && (
                      <Button variant="outline" onClick={() => searchImages()} className="w-full gap-2 rounded-xl">
                        <Search className="h-4 w-4" /> Buscar
                      </Button>
                    )}
                    {searchingImages && (
                      <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                      </div>
                    )}
                    {pexelsImages.length > 0 && (
                      <>
                        <div className="grid grid-cols-4 gap-2 max-h-[250px] overflow-y-auto rounded-xl">
                          {pexelsImages.map((img) => (
                            <button key={img.id} onClick={() => setCardImage(showImagePicker, img.url)}
                              className="rounded-xl overflow-hidden aspect-square hover:opacity-80 transition-opacity ring-1 ring-border">
                              <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center mt-1">Fotos por Pexels</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Hidden export */}
      {carouselData && (
        <div className="fixed -left-[9999px] top-0" aria-hidden>
          {carouselData.cards.map((card, i) => (
            <div key={`export-${i}`}>{renderCardPreview(card, i, true)}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CarouselGenerator;
