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
const PREVIEW_W = 300;
const PREVIEW_H = PREVIEW_W * (CARD_H / CARD_W);

interface CarouselCard {
  type: 'cover' | 'content' | 'cta';
  title: string;
  subtitle?: string;
  body?: string;
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

  const [searchingImages, setSearchingImages] = useState(false);
  const [pexelsImages, setPexelsImages] = useState<PexelsImage[]>([]);
  const [showImagePicker, setShowImagePicker] = useState<number | null>(null);
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState('');

  const [editingCard, setEditingCard] = useState<number | null>(null);

  const [brandName, setBrandName] = useState('ellosuit');
  const [userName, setUserName] = useState('');
  const [dateLabel, setDateLabel] = useState(() => {
    const d = new Date();
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${months[d.getMonth()]} ${d.getFullYear()} ®`;
  });
  const [bgColor, setBgColor] = useState('#0F0F1A');
  const [accentColor, setAccentColor] = useState('#E84D1A');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [generateImagesWithContent, setGenerateImagesWithContent] = useState(true);

  const generateAiImageForCard = async (cardIndex: number, cards: CarouselCard[], promptOverride?: string): Promise<string | null> => {
    const card = cards[cardIndex];
    const promptText = promptOverride || card?.title || topic;
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-ai-image',
          prompt: `Professional editorial Instagram carousel image, high quality, cinematic lighting: ${promptText}. Style: modern, bold, magazine quality.`,
          imageSize: '3:4',
          topic: promptText,
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
        if (c.type === 'cover') return { ...c, layout: 'image-full' };
        if (c.type === 'cta') return { ...c, layout: 'accent' };
        const layouts: CarouselCard['layout'][] = ['dark', 'accent', 'light', 'dark'];
        return { ...c, layout: layouts[(i - 1) % layouts.length] };
      });

      setCarouselData({ ...data.data, cards });
      setActiveCardIndex(0);
      toast({ title: 'Conteúdo gerado!', description: `${cards.length} cards criados` });

      // Auto-generate images for cover + every 2nd content card
      if (generateImagesWithContent) {
        setGeneratingAllImages(true);
        const imageIndices = cards.map((c, i) => (c.type === 'cover' || i % 2 === 0) ? i : -1).filter(i => i >= 0);
        const updatedCards = [...cards];
        
        for (let idx = 0; idx < imageIndices.length; idx++) {
          const ci = imageIndices[idx];
          setImageGenProgress(`Gerando imagem ${idx + 1}/${imageIndices.length}...`);
          const url = await generateAiImageForCard(ci, updatedCards);
          if (url) {
            updatedCards[ci] = { ...updatedCards[ci], imageUrl: url };
            setCarouselData(prev => prev ? { ...prev, cards: [...updatedCards] } : null);
          }
        }
        setGeneratingAllImages(false);
        setImageGenProgress('');
        toast({ title: 'Imagens geradas!', description: `${imageIndices.length} imagens criadas com IA` });
      }

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
          prompt: `Professional editorial Instagram image, cinematic: ${promptText}`,
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
          width: CARD_W, height: CARD_H, scale: 1,
          useCORS: true, allowTaint: true, backgroundColor: null,
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
    if (card.layout === 'light') return '#F5F0EB';
    if (card.layout === 'image-full') return bgColor;
    return bgColor;
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
    const s = isExport ? 1 : PREVIEW_W / CARD_W;
    const bg = getCardBg(card);
    const txt = getCardTextColor(card);
    const accent = getAccentTextColor(card);
    const serif = "'Playfair Display', 'Georgia', serif";
    const sans = "'Inter', 'Helvetica Neue', sans-serif";

    const renderHeader = () => (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${32 * s}px ${52 * s}px`,
        fontFamily: sans, fontSize: `${22 * s}px`, fontWeight: 600,
        color: txt, opacity: 0.7, letterSpacing: `${1 * s}px`,
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        textTransform: 'uppercase' as const,
      }}>
        <span>{brandName}</span>
        <span>{dateLabel}</span>
      </div>
    );

    const renderPageNum = () => (
      <div style={{
        position: 'absolute', bottom: `${40 * s}px`, right: `${52 * s}px`,
        fontFamily: sans, fontSize: `${28 * s}px`, fontWeight: 700,
        color: txt, opacity: 0.3, zIndex: 10,
      }}>
        {String(index + 1).padStart(2, '0')}/{String(carouselData?.cards.length || 0).padStart(2, '0')}
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
              ? 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.1) 65%, rgba(0,0,0,0.3) 100%)'
              : `linear-gradient(135deg, ${bgColor} 0%, ${accentColor}33 100%)`,
          }} />
          {renderHeader()}
          
          {/* Brand badge */}
          <div style={{
            position: 'absolute', left: `${52 * s}px`, top: `${100 * s}px`,
            display: 'flex', alignItems: 'center', gap: `${12 * s}px`, zIndex: 10,
          }}>
            <div style={{
              width: `${56 * s}px`, height: `${56 * s}px`, borderRadius: '50%', backgroundColor: accentColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: `${24 * s}px`, fontWeight: 900, color: '#FFF', fontFamily: sans,
            }}>✦</div>
            {userName && (
              <span style={{ fontFamily: sans, fontSize: `${26 * s}px`, fontWeight: 700, color: '#FFF' }}>
                @{userName}
              </span>
            )}
          </div>

          {/* Title */}
          <div style={{
            position: 'absolute', bottom: `${80 * s}px`, left: `${52 * s}px`, right: `${52 * s}px`, zIndex: 10,
          }}>
            <h1 style={{
              fontFamily: serif, fontSize: `${82 * s}px`, fontWeight: 900,
              lineHeight: 1.0, color: '#FFFFFF', textTransform: 'uppercase',
              letterSpacing: `-${2 * s}px`,
              textShadow: '0 4px 30px rgba(0,0,0,0.6)',
            }}>
              {card.title}
            </h1>
            {card.subtitle && (
              <p style={{
                fontFamily: sans, fontSize: `${26 * s}px`, fontWeight: 500,
                color: '#FFFFFF', opacity: 0.9, marginTop: `${24 * s}px`,
                lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: `${2 * s}px`,
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
      const ctaBg = card.layout === 'light' ? '#F5F0EB' : accentColor;
      const ctaTxt = card.layout === 'light' ? '#1A1A1A' : '#FFFFFF';
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: ctaBg }}>
          {card.imageUrl && (
            <>
              <img src={card.imageUrl} alt="" crossOrigin="anonymous"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} />
            </>
          )}
          {renderHeader()}

          <div style={{
            position: 'absolute', inset: `${100 * s}px ${52 * s}px ${80 * s}px`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            textAlign: 'center', zIndex: 10,
          }}>
            <div style={{
              width: `${80 * s}px`, height: `${80 * s}px`, borderRadius: '50%', backgroundColor: card.imageUrl ? '#FFF' : bgColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: `${36 * s}px`, fontWeight: 900, color: accentColor, fontFamily: sans,
              marginBottom: `${40 * s}px`,
            }}>✦</div>

            <h2 style={{
              fontFamily: serif, fontSize: `${72 * s}px`, fontWeight: 900,
              lineHeight: 1.05, color: card.imageUrl ? '#FFF' : ctaTxt, marginBottom: `${30 * s}px`,
            }}>
              {card.title}
            </h2>

            {card.body && (
              <p style={{
                fontFamily: serif, fontSize: `${36 * s}px`, fontWeight: 400,
                lineHeight: 1.5, color: card.imageUrl ? '#FFF' : ctaTxt, fontStyle: 'italic',
                opacity: 0.85, maxWidth: `${900 * s}px`,
              }}>
                "{card.body}"
              </p>
            )}

            {userName && (
              <div style={{
                marginTop: `${50 * s}px`, padding: `${18 * s}px ${40 * s}px`,
                border: `${3 * s}px solid ${card.imageUrl ? '#FFF' : ctaTxt}`,
                borderRadius: `${50 * s}px`,
              }}>
                <p style={{
                  fontFamily: sans, fontSize: `${24 * s}px`, fontWeight: 700,
                  color: card.imageUrl ? '#FFF' : ctaTxt, textTransform: 'uppercase',
                  letterSpacing: `${2 * s}px`,
                }}>
                  @{userName}
                </p>
              </div>
            )}
          </div>
          {renderPageNum()}
        </div>
      );
    }

    // ===== CONTENT CARDS =====
    const layout = card.layout || 'dark';
    const hasImage = !!card.imageUrl;
    const imageOnTop = index % 2 === 0;

    return (
      <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}>
        {renderHeader()}

        {/* FULL IMAGE BACKGROUND VARIANT */}
        {hasImage && layout === 'dark' && (
          <>
            <img src={card.imageUrl} alt="" crossOrigin="anonymous"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.05) 70%)',
            }} />
            <div style={{
              position: 'absolute', bottom: `${70 * s}px`, left: `${52 * s}px`, right: `${52 * s}px`, zIndex: 10,
            }}>
              <h2 style={{
                fontFamily: serif, fontSize: `${64 * s}px`, fontWeight: 800,
                lineHeight: 1.08, color: '#FFF', marginBottom: `${20 * s}px`,
              }}>
                {card.title}
              </h2>
              {card.body && (
                <p style={{
                  fontFamily: sans, fontSize: `${30 * s}px`, fontWeight: 400,
                  lineHeight: 1.6, color: '#FFF', opacity: 0.85,
                }}>
                  {card.body}
                </p>
              )}
            </div>
          </>
        )}

        {/* TEXT + IMAGE SPLIT */}
        {hasImage && layout !== 'dark' && imageOnTop && (
          <>
            <div style={{
              position: 'absolute', top: `${80 * s}px`, left: `${52 * s}px`, right: `${52 * s}px`,
              height: `${580 * s}px`, borderRadius: `${20 * s}px`, overflow: 'hidden', zIndex: 5,
            }}>
              <img src={card.imageUrl} alt="" crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{
              position: 'absolute', bottom: `${70 * s}px`, left: `${52 * s}px`, right: `${52 * s}px`, zIndex: 5,
            }}>
              <h2 style={{
                fontFamily: serif, fontSize: `${58 * s}px`, fontWeight: 800,
                lineHeight: 1.1, color: txt, marginBottom: `${18 * s}px`,
              }}>
                {card.title}
              </h2>
              {card.body && (
                <p style={{
                  fontFamily: sans, fontSize: `${30 * s}px`, fontWeight: 400,
                  lineHeight: 1.55, color: accent,
                }}>
                  {card.body}
                </p>
              )}
            </div>
          </>
        )}

        {/* TEXT TOP + IMAGE BOTTOM */}
        {hasImage && layout !== 'dark' && !imageOnTop && (
          <>
            <div style={{
              position: 'absolute', top: `${90 * s}px`, left: `${52 * s}px`, right: `${52 * s}px`, zIndex: 5,
            }}>
              <h2 style={{
                fontFamily: serif, fontSize: `${58 * s}px`, fontWeight: 800,
                lineHeight: 1.1, color: txt, marginBottom: `${18 * s}px`,
              }}>
                {card.title}
              </h2>
              {card.body && (
                <p style={{
                  fontFamily: sans, fontSize: `${30 * s}px`, fontWeight: 400,
                  lineHeight: 1.55, color: accent,
                }}>
                  {card.body}
                </p>
              )}
            </div>
            <div style={{
              position: 'absolute', bottom: `${60 * s}px`, left: `${52 * s}px`, right: `${52 * s}px`,
              height: `${560 * s}px`, borderRadius: `${20 * s}px`, overflow: 'hidden', zIndex: 5,
            }}>
              <img src={card.imageUrl} alt="" crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </>
        )}

        {/* TEXT ONLY (no image) */}
        {!hasImage && (
          <div style={{
            position: 'absolute', top: `${90 * s}px`, left: `${52 * s}px`, right: `${52 * s}px`, bottom: `${70 * s}px`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 5,
          }}>
            {/* Decorative line */}
            <div style={{
              width: `${80 * s}px`, height: `${6 * s}px`, backgroundColor: accent,
              marginBottom: `${40 * s}px`, borderRadius: `${3 * s}px`,
            }} />
            <h2 style={{
              fontFamily: serif, fontSize: `${68 * s}px`, fontWeight: 900,
              lineHeight: 1.05, color: txt, marginBottom: `${36 * s}px`,
            }}>
              {card.title}
            </h2>
            {card.body && (
              <p style={{
                fontFamily: sans, fontSize: `${34 * s}px`, fontWeight: 400,
                lineHeight: 1.6, color: txt, opacity: 0.8,
                borderLeft: `${4 * s}px solid ${accent}`,
                paddingLeft: `${24 * s}px`,
              }}>
                {card.body}
              </p>
            )}
          </div>
        )}

        {renderPageNum()}
      </div>
    );
  };

  // ==================== UI ====================

  return (
    <div className="min-h-screen bg-background">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

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
          <div className="flex gap-2">
            {carouselData && !generatingAllImages && (
              <Button onClick={exportAllCards} disabled={exporting} className="gap-2" style={{ backgroundColor: FLOW_COLOR }}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exportar PNGs
              </Button>
            )}
          </div>
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
                  placeholder="Ex: O boom da proteína: por que até o Doritos quer parecer fit?"
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
                    onChange={(e) => setCardCount(parseInt(e.target.value) || 10)} className="rounded-2xl" />
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

              {/* AI Image toggle */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 border border-border">
                <Wand2 className="h-5 w-5 flex-shrink-0" style={{ color: accentColor }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Gerar imagens com IA automaticamente</p>
                  <p className="text-xs text-muted-foreground">Imagens serão criadas para capa e cards alternados</p>
                </div>
                <button
                  onClick={() => setGenerateImagesWithContent(!generateImagesWithContent)}
                  className={`w-12 h-7 rounded-full transition-colors relative ${generateImagesWithContent ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${generateImagesWithContent ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <Button onClick={generateContent} disabled={generating}
                className="w-full gap-2 h-14 rounded-2xl text-lg font-bold" style={{ backgroundColor: FLOW_COLOR }}>
                {generating ? <><Loader2 className="h-5 w-5 animate-spin" /> Gerando conteúdo com IA...</>
                  : <><Sparkles className="h-5 w-5" /> Gerar Carrossel Completo</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress banner */}
        {generatingAllImages && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-muted/50 animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: accentColor }} />
            <div>
              <p className="text-sm font-semibold text-foreground">{imageGenProgress || 'Gerando imagens...'}</p>
              <p className="text-xs text-muted-foreground">As imagens serão aplicadas automaticamente aos cards</p>
            </div>
          </div>
        )}

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
                    <div className={`cursor-pointer transition-all rounded-2xl ${activeCardIndex === i ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-75 hover:opacity-100'}`}
                      onClick={() => setActiveCardIndex(i)}>
                      {renderCardPreview(card, i)}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button onClick={() => setEditingCard(i)} className="p-1.5 bg-black/70 rounded-lg text-white hover:bg-black/90">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setShowImagePicker(i)} className="p-1.5 bg-black/70 rounded-lg text-white hover:bg-black/90">
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
            {editingCard !== null && carouselData.cards[editingCard] && (
              <Card className="border-0 shadow-md rounded-3xl">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Editar Card {editingCard + 1}</h3>
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
                      onChange={(e) => updateCard(editingCard, { body: e.target.value })} placeholder="Conteúdo" className="rounded-xl min-h-[80px] resize-none" />
                  )}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Layout</label>
                    <div className="flex gap-2">
                      {(['dark', 'light', 'accent'] as const).map(l => (
                        <button key={l} onClick={() => updateCard(editingCard, { layout: l })}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${carouselData.cards[editingCard].layout === l ? 'ring-2 ring-primary scale-105' : ''}`}
                          style={{
                            backgroundColor: l === 'dark' ? bgColor : l === 'accent' ? accentColor : '#F5F0EB',
                            color: l === 'light' ? '#1A1A1A' : '#FFF',
                            borderColor: l === 'light' ? '#ddd' : 'transparent',
                          }}>
                          {l === 'dark' ? 'Escuro' : l === 'light' ? 'Claro' : 'Destaque'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground font-medium">
                      <Upload className="h-4 w-4" /> Upload
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(editingCard, f); }} />
                    </label>
                    <Button variant="outline" size="sm" onClick={() => setShowImagePicker(editingCard)} className="rounded-xl gap-1 h-10">
                      <Search className="h-4 w-4" /> Pexels
                    </Button>
                    <Button size="sm"
                      onClick={() => { setShowImagePicker(editingCard); setAiImagePrompt(carouselData.cards[editingCard]?.title || ''); }}
                      className="rounded-xl gap-1 h-10" style={{ backgroundColor: accentColor }}>
                      <Wand2 className="h-4 w-4" /> Gerar com IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Image Picker */}
            {showImagePicker !== null && (
              <Card className="border-0 shadow-lg rounded-3xl">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Imagem — Card {showImagePicker + 1}</h3>
                    <button onClick={() => setShowImagePicker(null)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
                  </div>

                  {/* AI Generation - PRIMARY */}
                  <div className="p-4 rounded-2xl border-2 border-dashed" style={{ borderColor: accentColor + '66' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Wand2 className="h-5 w-5" style={{ color: accentColor }} />
                      <p className="text-sm font-bold text-foreground">Gerar com IA (Nano Banana)</p>
                    </div>
                    <div className="flex gap-2">
                      <Input value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)}
                        placeholder="Descreva a imagem que deseja..." className="rounded-xl flex-1" />
                      <Button onClick={() => generateAiImage(showImagePicker)} disabled={generatingAiImage}
                        className="gap-2 rounded-xl px-5" style={{ backgroundColor: accentColor }}>
                        {generatingAiImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Gerar
                      </Button>
                    </div>
                    {generatingAiImage && <p className="text-xs text-muted-foreground text-center mt-2 animate-pulse">⏳ Gerando imagem... pode levar até 60s</p>}
                  </div>

                  {/* Pexels search */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Banco de imagens (Pexels)</p>
                    </div>
                    {!pexelsImages.length && !searchingImages && (
                      <Button variant="outline" onClick={() => searchImages()} className="w-full gap-2 rounded-xl">
                        <Search className="h-4 w-4" /> Buscar imagens
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
                              className="relative rounded-xl overflow-hidden aspect-square hover:opacity-80 transition-opacity ring-1 ring-border">
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
