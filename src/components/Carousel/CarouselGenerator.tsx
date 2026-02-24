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
  Search, Edit3, Loader2, X, Upload, Wand2
} from 'lucide-react';
import html2canvas from 'html2canvas';

const FLOW_COLOR = '#007DE3';
const CARD_W = 1080;
const CARD_H = 1350;
const PREVIEW_W = 280;
const PREVIEW_H = PREVIEW_W * (CARD_H / CARD_W); // 350

interface CarouselCard {
  type: 'cover' | 'content' | 'cta';
  title: string;
  subtitle?: string;
  body?: string;
  bodySecondary?: string;
  imageUrl?: string;
  layout?: 'dark' | 'light' | 'accent' | 'image-full';
}

interface CarouselData {
  title: string;
  cards: CarouselCard[];
  suggestedImageKeywords?: string[];
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
  const [cardCount, setCardCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [carouselData, setCarouselData] = useState<CarouselData | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Image search
  const [searchingImages, setSearchingImages] = useState(false);
  const [pexelsImages, setPexelsImages] = useState<PexelsImage[]>([]);
  const [showImagePicker, setShowImagePicker] = useState<number | null>(null);
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');

  // Editing
  const [editingCard, setEditingCard] = useState<number | null>(null);

  // Brand / Design
  const [brandName, setBrandName] = useState('Powered by ellosuit');
  const [userName, setUserName] = useState('');
  const [dateLabel, setDateLabel] = useState(() => {
    const d = new Date();
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${months[d.getMonth()]} ${d.getFullYear()} ®`;
  });
  const [bgColor, setBgColor] = useState('#1C1C2E');
  const [accentColor, setAccentColor] = useState('#E84D1A');
  const [textColor, setTextColor] = useState('#FFFFFF');

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

      // Assign alternating layouts to content cards
      const cards: CarouselCard[] = data.data.cards.map((c: any, i: number) => {
        if (c.type === 'cover') return { ...c, layout: 'image-full' };
        if (c.type === 'cta') return { ...c, layout: 'light' };
        const layouts: CarouselCard['layout'][] = ['dark', 'light', 'accent', 'dark'];
        return { ...c, layout: layouts[(i - 1) % layouts.length] };
      });

      setCarouselData({ ...data.data, cards });
      setActiveCardIndex(0);
      toast({ title: 'Carrossel gerado!', description: `${cards.length} cards criados` });

      if (data.data.suggestedImageKeywords?.length) {
        searchImages(data.data.suggestedImageKeywords);
      }
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
    } catch (err: any) {
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
    const promptText = aiImagePrompt.trim() || carouselData?.cards[cardIndex]?.title || topic;
    if (!promptText) {
      toast({ title: 'Insira um prompt para a imagem', variant: 'destructive' });
      return;
    }
    setGeneratingAiImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-ai-image',
          prompt: `High quality Instagram carousel card image: ${promptText}. Modern, clean, professional style.`,
          imageSize: '3:4',
          topic: promptText,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar imagem');
      setCardImage(cardIndex, data.imageUrl);
      setAiImagePrompt('');
      toast({ title: 'Imagem gerada!' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro', description: err.message || 'Falha ao gerar imagem', variant: 'destructive' });
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
    const newCard: CarouselCard = { type: 'content', title: 'Novo Card', body: 'Adicione seu conteúdo aqui...', layout: 'dark' };
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
          width: CARD_W,
          height: CARD_H,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        });
        const link = document.createElement('a');
        link.download = `carousel-card-${i + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(r => setTimeout(r, 300));
      }
      toast({ title: 'Download completo!', description: `${carouselData.cards.length} imagens exportadas` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  // ==================== CARD RENDER ====================

  const getCardBg = (card: CarouselCard) => {
    if (card.layout === 'accent') return accentColor;
    if (card.layout === 'light') return '#FFFFFF';
    if (card.layout === 'image-full') return bgColor;
    return bgColor; // dark
  };

  const getCardTextColor = (card: CarouselCard) => {
    if (card.layout === 'light') return '#1A1A1A';
    if (card.layout === 'accent') return '#FFFFFF';
    return textColor;
  };

  const getAccentTextColor = (card: CarouselCard) => {
    if (card.layout === 'light') return accentColor;
    if (card.layout === 'accent') return '#FFD4A0';
    return accentColor;
  };

  const renderCardPreview = (card: CarouselCard, index: number, isExport = false) => {
    const w = isExport ? CARD_W : PREVIEW_W;
    const h = isExport ? CARD_H : PREVIEW_H;
    const s = isExport ? 1 : PREVIEW_W / CARD_W; // scale factor
    const bg = getCardBg(card);
    const txt = getCardTextColor(card);
    const accent = getAccentTextColor(card);
    const fontFamily = "'Playfair Display', 'Georgia', serif";
    const sansFamily = "'Inter', 'Helvetica Neue', sans-serif";

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${28 * s}px ${48 * s}px`,
      fontFamily: sansFamily,
      fontSize: `${18 * s}px`,
      fontWeight: 500,
      color: txt,
      opacity: 0.8,
      letterSpacing: `${0.5 * s}px`,
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    };

    const renderHeader = () => (
      <div style={headerStyle}>
        <span style={{ maxWidth: '40%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brandName}</span>
        <span>{userName ? `@${userName}` : ''}</span>
        <span>{dateLabel}</span>
      </div>
    );

    // COVER CARD
    if (card.type === 'cover') {
      return (
        <div
          ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}
        >
          {/* Full background image */}
          {card.imageUrl && (
            <img src={card.imageUrl} alt="" crossOrigin="anonymous"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {/* Gradient overlay from bottom */}
          <div style={{
            position: 'absolute', inset: 0,
            background: card.imageUrl
              ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.2) 100%)'
              : 'none',
          }} />

          {renderHeader()}

          {/* Logo + handle centered */}
          <div style={{
            position: 'absolute',
            left: '50%', top: `${540 * s}px`,
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: `${10 * s}px`,
            zIndex: 10,
          }}>
            <div style={{
              width: `${48 * s}px`, height: `${48 * s}px`,
              borderRadius: '50%', backgroundColor: accentColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: `${20 * s}px`, fontWeight: 800, color: '#FFF',
              fontFamily: sansFamily,
            }}>✦</div>
            <span style={{
              fontFamily: sansFamily, fontSize: `${22 * s}px`,
              fontWeight: 600, color: '#FFFFFF',
            }}>
              {userName ? `@${userName}` : ''}
            </span>
            <span style={{ fontSize: `${20 * s}px`, color: '#4A9EFF' }}>✓</span>
          </div>

          {/* Title at bottom */}
          <div style={{
            position: 'absolute', bottom: `${80 * s}px`, left: `${48 * s}px`, right: `${48 * s}px`,
            zIndex: 10,
          }}>
            <h1 style={{
              fontFamily: fontFamily, fontSize: `${68 * s}px`, fontWeight: 900,
              lineHeight: 1.05, color: '#FFFFFF',
              textTransform: 'uppercase', letterSpacing: `-${1 * s}px`,
              textShadow: '0 2px 20px rgba(0,0,0,0.5)',
            }}>
              {card.title}
            </h1>
            {card.subtitle && (
              <p style={{
                fontFamily: sansFamily, fontSize: `${20 * s}px`,
                fontWeight: 500, color: '#FFFFFF', opacity: 0.9,
                marginTop: `${20 * s}px`, lineHeight: 1.4,
                textTransform: 'uppercase', letterSpacing: `${1.5 * s}px`,
              }}>
                → {card.subtitle}
              </p>
            )}
          </div>

          {/* Dots indicator */}
          {!isExport && carouselData && (
            <div style={{ position: 'absolute', bottom: `${12 * s}px`, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: `${4 * s}px`, zIndex: 20 }}>
              {carouselData.cards.map((_, i) => (
                <div key={i} style={{ width: `${6 * s}px`, height: `${6 * s}px`, borderRadius: '50%', backgroundColor: i === index ? '#FFF' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          )}
        </div>
      );
    }

    // CTA CARD  
    if (card.type === 'cta') {
      const ctaBg = card.layout === 'light' ? '#FFFFFF' : bgColor;
      const ctaTxt = card.layout === 'light' ? '#1A1A1A' : '#FFFFFF';
      return (
        <div
          ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: ctaBg }}
        >
          {card.imageUrl && (
            <>
              <img src={card.imageUrl} alt="" crossOrigin="anonymous"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
            </>
          )}
          {renderHeader()}

          <div style={{
            position: 'absolute', top: `${100 * s}px`, left: `${48 * s}px`, right: `${48 * s}px`,
            zIndex: 10,
          }}>
            {/* Logo centered */}
            <div style={{ display: 'flex', alignItems: 'center', gap: `${10 * s}px`, marginBottom: `${30 * s}px` }}>
              <div style={{
                width: `${48 * s}px`, height: `${48 * s}px`,
                borderRadius: '50%', backgroundColor: accentColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: `${20 * s}px`, fontWeight: 800, color: '#FFF',
              }}>✦</div>
              <span style={{ fontFamily: sansFamily, fontSize: `${20 * s}px`, fontWeight: 600, color: ctaTxt }}>
                {userName ? `@${userName}` : ''} ✓
              </span>
            </div>

            <h2 style={{
              fontFamily: fontFamily, fontSize: `${56 * s}px`, fontWeight: 800,
              lineHeight: 1.15, color: ctaTxt, marginBottom: `${24 * s}px`,
            }}>
              {card.title}
            </h2>

            {card.body && (
              <p style={{
                fontFamily: fontFamily, fontSize: `${32 * s}px`, fontWeight: 400,
                lineHeight: 1.5, color: ctaTxt, fontStyle: 'italic',
              }}>
                <span style={{ color: accent }}>"{card.body}"</span>
              </p>
            )}

            {card.subtitle && (
              <div style={{
                marginTop: `${40 * s}px`, padding: `${16 * s}px ${24 * s}px`,
                border: `${2 * s}px solid ${ctaTxt}`, borderRadius: `${40 * s}px`,
                display: 'inline-block',
              }}>
                <p style={{
                  fontFamily: sansFamily, fontSize: `${20 * s}px`,
                  fontWeight: 500, color: ctaTxt,
                }}>
                  {card.subtitle}
                </p>
              </div>
            )}
          </div>

          {/* Image at bottom */}
          {card.imageUrl && (
            <div style={{
              position: 'absolute', bottom: `${60 * s}px`,
              left: `${48 * s}px`, right: `${48 * s}px`,
              height: `${400 * s}px`, borderRadius: `${16 * s}px`,
              overflow: 'hidden', zIndex: 5,
            }}>
              <img src={card.imageUrl} alt="" crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      );
    }

    // CONTENT CARDS - Editorial layouts
    const layout = card.layout || 'dark';
    const hasImage = !!card.imageUrl;

    // Determine image position based on index
    const imageOnTop = index % 3 === 0;
    const textOnly = layout === 'accent' && !hasImage;

    return (
      <div
        ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}
      >
        {renderHeader()}

        {/* TEXT ONLY (accent color bg) */}
        {textOnly && (
          <div style={{
            position: 'absolute', top: `${80 * s}px`, left: `${48 * s}px`, right: `${48 * s}px`, bottom: `${48 * s}px`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 5,
          }}>
            <h2 style={{
              fontFamily: fontFamily, fontSize: `${58 * s}px`, fontWeight: 800,
              lineHeight: 1.12, color: txt, marginBottom: `${40 * s}px`,
            }}>
              {card.title}
            </h2>
            {card.body && (
              <p style={{
                fontFamily: fontFamily, fontSize: `${28 * s}px`, fontWeight: 400,
                lineHeight: 1.5, color: txt, opacity: 0.85,
                borderTop: `${1 * s}px solid ${txt}33`,
                paddingTop: `${24 * s}px`,
              }}>
                {card.body}
              </p>
            )}
          </div>
        )}

        {/* WITH IMAGE — text top, image bottom */}
        {!textOnly && !imageOnTop && (
          <>
            <div style={{
              position: 'absolute', top: `${80 * s}px`, left: `${48 * s}px`, right: `${48 * s}px`,
              zIndex: 5,
            }}>
              <h2 style={{
                fontFamily: fontFamily, fontSize: `${50 * s}px`, fontWeight: 800,
                lineHeight: 1.12, color: txt, marginBottom: `${20 * s}px`,
              }}>
                {card.title}
              </h2>
              {card.body && (
                <p style={{
                  fontFamily: fontFamily, fontSize: `${26 * s}px`, fontWeight: 600,
                  lineHeight: 1.45, color: accent,
                }}>
                  {card.body}
                </p>
              )}
            </div>
            {hasImage && (
              <div style={{
                position: 'absolute', bottom: `${48 * s}px`,
                left: `${48 * s}px`, right: `${48 * s}px`,
                height: `${520 * s}px`, borderRadius: `${12 * s}px`,
                overflow: 'hidden', zIndex: 5,
              }}>
                <img src={card.imageUrl} alt="" crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </>
        )}

        {/* WITH IMAGE — image on top half, text bottom */}
        {!textOnly && imageOnTop && (
          <>
            {hasImage && (
              <div style={{
                position: 'absolute', top: `${80 * s}px`,
                left: `${48 * s}px`, right: `${48 * s}px`,
                height: `${520 * s}px`, borderRadius: `${12 * s}px`,
                overflow: 'hidden', zIndex: 5,
              }}>
                <img src={card.imageUrl} alt="" crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: `${48 * s}px`, left: `${48 * s}px`, right: `${48 * s}px`,
              zIndex: 5,
              top: hasImage ? undefined : `${80 * s}px`,
              display: hasImage ? undefined : 'flex',
              flexDirection: hasImage ? undefined : 'column',
              justifyContent: hasImage ? undefined : 'center',
            }}>
              <h2 style={{
                fontFamily: fontFamily, fontSize: `${48 * s}px`, fontWeight: 800,
                lineHeight: 1.12, color: txt, marginBottom: `${16 * s}px`,
              }}>
                {card.title}
              </h2>
              {card.body && (
                <p style={{
                  fontFamily: fontFamily, fontSize: `${26 * s}px`, fontWeight: 600,
                  lineHeight: 1.45, color: accent,
                }}>
                  {card.body}
                </p>
              )}
            </div>
          </>
        )}

        {/* Dots */}
        {!isExport && carouselData && (
          <div style={{ position: 'absolute', bottom: `${8 * s}px`, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: `${4 * s}px`, zIndex: 20 }}>
            {carouselData.cards.map((_, i) => (
              <div key={i} style={{ width: `${6 * s}px`, height: `${6 * s}px`, borderRadius: '50%', backgroundColor: i === index ? '#FFF' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==================== UI ====================

  return (
    <div className="min-h-screen bg-background">
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-6xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: FLOW_COLOR }}>Gerador de Carrossel</h1>
            <p className="text-xs text-muted-foreground">Carrosséis editoriais 1080×1350 para Instagram</p>
          </div>
          {carouselData && (
            <Button onClick={exportAllCards} disabled={exporting} className="gap-2" style={{ backgroundColor: FLOW_COLOR }}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar PNGs
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Input Section */}
        {!carouselData && (
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tópico do Carrossel</label>
                <Textarea value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: O boom da proteína: por que até o Doritos quer parecer fit?"
                  className="rounded-2xl min-h-[80px] resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Palavras-chave (opcional)</label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  placeholder="proteína, saúde, marketing (separadas por vírgula)" className="rounded-2xl" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Nº de Cards</label>
                  <Input type="number" min={3} max={15} value={cardCount}
                    onChange={(e) => setCardCount(parseInt(e.target.value) || 10)} className="rounded-2xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">@ Instagram</label>
                  <Input value={userName} onChange={(e) => setUserName(e.target.value)}
                    placeholder="seuuser" className="rounded-2xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Marca / Header</label>
                  <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="rounded-2xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Data</label>
                  <Input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} className="rounded-2xl" />
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
                className="w-full gap-2 h-12 rounded-2xl text-base" style={{ backgroundColor: FLOW_COLOR }}>
                {generating ? <><Loader2 className="h-5 w-5 animate-spin" /> Gerando com IA...</>
                  : <><Sparkles className="h-5 w-5" /> Gerar Carrossel</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Preview & Edit */}
        {carouselData && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-foreground">Preview dos Cards ({carouselData.cards.length})</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addCard} className="gap-1 rounded-xl">
                    <Plus className="h-3 w-3" /> Card
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCarouselData(null)} className="rounded-xl">Novo</Button>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory -mx-4 px-4">
                {carouselData.cards.map((card, i) => (
                  <div key={i} className="snap-center flex-shrink-0 relative group">
                    <div className={`cursor-pointer transition-all rounded-2xl ${activeCardIndex === i ? 'ring-2 ring-primary ring-offset-2' : 'opacity-80'}`}
                      onClick={() => setActiveCardIndex(i)}>
                      {renderCardPreview(card, i)}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button onClick={() => setEditingCard(i)} className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80">
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button onClick={() => setShowImagePicker(i)} className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80">
                        <ImageIcon className="h-3 w-3" />
                      </button>
                      {carouselData.cards.length > 2 && (
                        <button onClick={() => removeCard(i)} className="p-1.5 bg-red-600/80 rounded-lg text-white hover:bg-red-700">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-1.5">{i + 1}/{carouselData.cards.length}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Panel */}
            {editingCard !== null && carouselData.cards[editingCard] && (
              <Card className="border-0 shadow-md rounded-3xl">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Editar Card {editingCard + 1}</h3>
                    <button onClick={() => setEditingCard(null)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
                  </div>
                  <Input value={carouselData.cards[editingCard].title}
                    onChange={(e) => updateCard(editingCard, { title: e.target.value })} placeholder="Título" className="rounded-xl" />
                  {carouselData.cards[editingCard].type === 'cover' && (
                    <Input value={carouselData.cards[editingCard].subtitle || ''}
                      onChange={(e) => updateCard(editingCard, { subtitle: e.target.value })} placeholder="Subtítulo" className="rounded-xl" />
                  )}
                  {(carouselData.cards[editingCard].type === 'content' || carouselData.cards[editingCard].type === 'cta') && (
                    <Textarea value={carouselData.cards[editingCard].body || ''}
                      onChange={(e) => updateCard(editingCard, { body: e.target.value })} placeholder="Conteúdo" className="rounded-xl min-h-[60px] resize-none" />
                  )}
                  {/* Layout picker */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Layout do Card</label>
                    <div className="flex gap-2">
                      {(['dark', 'light', 'accent'] as const).map(l => (
                        <button key={l} onClick={() => updateCard(editingCard, { layout: l })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${carouselData.cards[editingCard].layout === l ? 'ring-2 ring-primary' : ''}`}
                          style={{
                            backgroundColor: l === 'dark' ? bgColor : l === 'accent' ? accentColor : '#FFF',
                            color: l === 'light' ? '#1A1A1A' : '#FFF',
                            borderColor: l === 'light' ? '#ddd' : 'transparent',
                          }}>
                          {l === 'dark' ? 'Escuro' : l === 'light' ? 'Claro' : 'Destaque'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border cursor-pointer hover:bg-muted/50 text-xs text-muted-foreground">
                      <Upload className="h-3 w-3" /> Upload
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(editingCard, f); }} />
                    </label>
                    <Button variant="outline" size="sm" onClick={() => setShowImagePicker(editingCard)} className="rounded-xl gap-1">
                      <Search className="h-3 w-3" /> Pexels
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => { setShowImagePicker(editingCard); setAiImagePrompt(carouselData.cards[editingCard]?.title || ''); }}
                      className="rounded-xl gap-1">
                      <Wand2 className="h-3 w-3" /> IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Image Picker */}
            {showImagePicker !== null && (
              <Card className="border-0 shadow-lg rounded-3xl">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Imagem - Card {showImagePicker + 1}</h3>
                    <button onClick={() => setShowImagePicker(null)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
                  </div>
                  {!pexelsImages.length && !searchingImages && (
                    <div className="space-y-3">
                      <Button onClick={() => searchImages()} className="w-full gap-2 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                        <Search className="h-4 w-4" /> Buscar imagens (Pexels)
                      </Button>
                      <div className="relative"><div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                        <p className="relative text-center text-xs text-muted-foreground bg-card px-3 w-fit mx-auto">ou gere com IA</p></div>
                      <div className="flex gap-2">
                        <Input value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)}
                          placeholder="Descreva a imagem..." className="rounded-xl flex-1" />
                        <Button onClick={() => generateAiImage(showImagePicker)} disabled={generatingAiImage}
                          className="gap-1 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                          {generatingAiImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Gerar
                        </Button>
                      </div>
                      {generatingAiImage && <p className="text-xs text-muted-foreground text-center animate-pulse">Gerando imagem com IA... pode levar até 60s</p>}
                    </div>
                  )}
                  {searchingImages && (
                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                    </div>
                  )}
                  {pexelsImages.length > 0 && (
                    <>
                      <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                        {pexelsImages.map((img) => (
                          <button key={img.id} onClick={() => setCardImage(showImagePicker, img.url)}
                            className="relative rounded-xl overflow-hidden aspect-square hover:opacity-80 transition-opacity">
                            <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">Fotos por Pexels</p>
                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-medium text-foreground mb-2">Ou gere com IA:</p>
                        <div className="flex gap-2">
                          <Input value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)}
                            placeholder="Descreva a imagem..." className="rounded-xl flex-1 text-xs" />
                          <Button onClick={() => generateAiImage(showImagePicker)} disabled={generatingAiImage}
                            size="sm" className="gap-1 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                            {generatingAiImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                          </Button>
                        </div>
                        {generatingAiImage && <p className="text-[10px] text-muted-foreground text-center mt-1 animate-pulse">Gerando...</p>}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Hidden export canvases */}
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
