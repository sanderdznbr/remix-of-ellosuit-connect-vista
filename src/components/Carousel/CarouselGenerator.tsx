import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Sparkles, Download, Plus, Trash2, Image as ImageIcon, 
  Search, ChevronLeft, ChevronRight, Edit3, Loader2, X, Upload
} from 'lucide-react';
import html2canvas from 'html2canvas';

const FLOW_COLOR = '#007DE3';

interface CarouselCard {
  type: 'cover' | 'content' | 'cta';
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
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
  const [cardCount, setCardCount] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [carouselData, setCarouselData] = useState<CarouselData | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Image search
  const [searchingImages, setSearchingImages] = useState(false);
  const [pexelsImages, setPexelsImages] = useState<PexelsImage[]>([]);
  const [showImagePicker, setShowImagePicker] = useState<number | null>(null);

  // Editing
  const [editingCard, setEditingCard] = useState<number | null>(null);

  // Brand colors
  const [brandColor, setBrandColor] = useState('#007DE3');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [userName, setUserName] = useState('');

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

      setCarouselData(data.data);
      setActiveCardIndex(0);
      toast({ title: 'Carrossel gerado!', description: `${data.data.cards.length} cards criados` });

      // Auto search images
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
        body: {
          action: 'search-images',
          topic: topic.trim(),
          keywords: searchKeywords,
        },
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

  const updateCard = (index: number, updates: Partial<CarouselCard>) => {
    if (!carouselData) return;
    const newCards = [...carouselData.cards];
    newCards[index] = { ...newCards[index], ...updates };
    setCarouselData({ ...carouselData, cards: newCards });
  };

  const addCard = () => {
    if (!carouselData) return;
    const newCard: CarouselCard = { type: 'content', title: 'Novo Card', body: 'Adicione seu conteúdo aqui...' };
    const cards = [...carouselData.cards];
    cards.splice(cards.length - 1, 0, newCard); // Before CTA
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
      if (e.target?.result) {
        setCardImage(cardIndex, e.target.result as string);
      }
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
          width: 1080,
          height: 1080,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        });

        const link = document.createElement('a');
        link.download = `carousel-card-${i + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Small delay between downloads
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

  const renderCardPreview = (card: CarouselCard, index: number, isExport = false) => {
    const size = isExport ? 1080 : 320;
    const scale = isExport ? 1 : 320 / 1080;
    
    return (
      <div
        ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        className="relative overflow-hidden flex-shrink-0"
        style={{
          width: isExport ? 1080 : 320,
          height: isExport ? 1080 : 320,
          borderRadius: isExport ? 0 : 16,
        }}
      >
        {/* Background */}
        {card.imageUrl ? (
          <div className="absolute inset-0">
            <img src={card.imageUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ 
            background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd, ${brandColor}99)` 
          }} />
        )}

        {/* Content */}
        <div className="relative h-full flex flex-col justify-center items-center text-center p-6 z-10"
          style={{ padding: isExport ? 80 : 24 }}
        >
          {card.type === 'cover' && (
            <>
              <h1 
                className="font-black leading-tight mb-3"
                style={{ 
                  color: textColor, 
                  fontSize: isExport ? 72 : 22, 
                  lineHeight: 1.1,
                  textShadow: card.imageUrl ? '0 2px 8px rgba(0,0,0,0.5)' : 'none'
                }}
              >
                {card.title}
              </h1>
              {card.subtitle && (
                <p style={{ 
                  color: textColor, 
                  fontSize: isExport ? 36 : 11, 
                  opacity: 0.9,
                  textShadow: card.imageUrl ? '0 1px 4px rgba(0,0,0,0.5)' : 'none'
                }}>
                  {card.subtitle}
                </p>
              )}
            </>
          )}

          {card.type === 'content' && (
            <>
              <div 
                className="rounded-full mb-4 flex items-center justify-center"
                style={{ 
                  width: isExport ? 80 : 24, 
                  height: isExport ? 80 : 24,
                  backgroundColor: `${textColor}22`,
                  fontSize: isExport ? 36 : 11,
                  color: textColor,
                  fontWeight: 700,
                }}
              >
                {index}
              </div>
              <h2 
                className="font-bold mb-3"
                style={{ 
                  color: textColor, 
                  fontSize: isExport ? 48 : 15,
                  lineHeight: 1.2,
                  textShadow: card.imageUrl ? '0 2px 6px rgba(0,0,0,0.5)' : 'none'
                }}
              >
                {card.title}
              </h2>
              {card.body && (
                <p style={{ 
                  color: textColor, 
                  fontSize: isExport ? 32 : 10, 
                  opacity: 0.9, 
                  lineHeight: 1.5,
                  textShadow: card.imageUrl ? '0 1px 4px rgba(0,0,0,0.5)' : 'none'
                }}>
                  {card.body}
                </p>
              )}
            </>
          )}

          {card.type === 'cta' && (
            <>
              <h2 
                className="font-black mb-3"
                style={{ 
                  color: textColor, 
                  fontSize: isExport ? 56 : 17, 
                  lineHeight: 1.1,
                  textShadow: card.imageUrl ? '0 2px 8px rgba(0,0,0,0.5)' : 'none'
                }}
              >
                {card.title}
              </h2>
              {card.body && (
                <p style={{ 
                  color: textColor, 
                  fontSize: isExport ? 30 : 10, 
                  opacity: 0.85,
                  lineHeight: 1.5,
                  textShadow: card.imageUrl ? '0 1px 4px rgba(0,0,0,0.5)' : 'none'
                }}>
                  {card.body}
                </p>
              )}
              {userName && (
                <div 
                  className="mt-4 font-bold"
                  style={{ 
                    color: textColor, 
                    fontSize: isExport ? 28 : 9, 
                    opacity: 0.7 
                  }}
                >
                  @{userName}
                </div>
              )}
            </>
          )}
        </div>

        {/* Swipe indicator dots */}
        {!isExport && carouselData && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20">
            {carouselData.cards.map((_, i) => (
              <div 
                key={i} 
                className="rounded-full" 
                style={{ 
                  width: 5, height: 5,
                  backgroundColor: i === index ? textColor : `${textColor}44`
                }} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: FLOW_COLOR }}>Gerador de Carrossel</h1>
            <p className="text-xs text-muted-foreground">Crie carrosséis prontos para Instagram</p>
          </div>
          {carouselData && (
            <Button 
              onClick={exportAllCards} 
              disabled={exporting}
              className="gap-2"
              style={{ backgroundColor: FLOW_COLOR }}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Input Section */}
        {!carouselData && (
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tópico do Carrossel</label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: 5 dicas para melhorar sua produtividade no trabalho remoto..."
                  className="rounded-2xl min-h-[80px] resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Palavras-chave (opcional)</label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="produtividade, home office, foco (separadas por vírgula)"
                  className="rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nº de Cards</label>
                  <Input
                    type="number"
                    min={3}
                    max={15}
                    value={cardCount}
                    onChange={(e) => setCardCount(parseInt(e.target.value) || 7)}
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">@ Instagram</label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="seuuser"
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Cor de fundo</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-10 h-10 rounded-xl border-0 cursor-pointer" />
                    <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="rounded-2xl flex-1" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Cor do texto</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-10 h-10 rounded-xl border-0 cursor-pointer" />
                    <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="rounded-2xl flex-1" />
                  </div>
                </div>
              </div>

              <Button 
                onClick={generateContent} 
                disabled={generating} 
                className="w-full gap-2 h-12 rounded-2xl text-base"
                style={{ backgroundColor: FLOW_COLOR }}
              >
                {generating ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Gerando com IA...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> Gerar Carrossel</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Preview & Edit Section */}
        {carouselData && (
          <>
            {/* Card Preview Carousel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-foreground">Preview dos Cards</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addCard} className="gap-1 rounded-xl">
                    <Plus className="h-3 w-3" /> Card
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCarouselData(null)} className="rounded-xl">
                    Novo
                  </Button>
                </div>
              </div>

              {/* Card slider */}
              <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory -mx-4 px-4">
                {carouselData.cards.map((card, i) => (
                  <div key={i} className="snap-center flex-shrink-0 relative group">
                    <div 
                      className={`cursor-pointer transition-all rounded-2xl ${activeCardIndex === i ? 'ring-2 ring-primary ring-offset-2' : 'opacity-80'}`}
                      onClick={() => setActiveCardIndex(i)}
                    >
                      {renderCardPreview(card, i)}
                    </div>

                    {/* Card actions overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button 
                        onClick={() => setEditingCard(i)}
                        className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => setShowImagePicker(i)}
                        className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80"
                      >
                        <ImageIcon className="h-3 w-3" />
                      </button>
                      {carouselData.cards.length > 2 && (
                        <button 
                          onClick={() => removeCard(i)}
                          className="p-1.5 bg-red-600/80 rounded-lg text-white hover:bg-red-700"
                        >
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
                    <button onClick={() => setEditingCard(null)} className="p-1 rounded-lg hover:bg-muted">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    value={carouselData.cards[editingCard].title}
                    onChange={(e) => updateCard(editingCard, { title: e.target.value })}
                    placeholder="Título"
                    className="rounded-xl"
                  />
                  {carouselData.cards[editingCard].type === 'cover' && (
                    <Input
                      value={carouselData.cards[editingCard].subtitle || ''}
                      onChange={(e) => updateCard(editingCard, { subtitle: e.target.value })}
                      placeholder="Subtítulo"
                      className="rounded-xl"
                    />
                  )}
                  {(carouselData.cards[editingCard].type === 'content' || carouselData.cards[editingCard].type === 'cta') && (
                    <Textarea
                      value={carouselData.cards[editingCard].body || ''}
                      onChange={(e) => updateCard(editingCard, { body: e.target.value })}
                      placeholder="Conteúdo"
                      className="rounded-xl min-h-[60px] resize-none"
                    />
                  )}
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border cursor-pointer hover:bg-muted/50 text-xs text-muted-foreground">
                      <Upload className="h-3 w-3" /> Upload Imagem
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(editingCard, file);
                        }} 
                      />
                    </label>
                    <Button variant="outline" size="sm" onClick={() => setShowImagePicker(editingCard)} className="rounded-xl gap-1">
                      <Search className="h-3 w-3" /> Pexels
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Image Picker Modal */}
            {showImagePicker !== null && (
              <Card className="border-0 shadow-lg rounded-3xl">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Buscar Imagem - Card {showImagePicker + 1}</h3>
                    <button onClick={() => setShowImagePicker(null)} className="p-1 rounded-lg hover:bg-muted">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {!pexelsImages.length && !searchingImages && (
                    <Button onClick={() => searchImages()} className="w-full gap-2 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                      <Search className="h-4 w-4" /> Buscar imagens relacionadas
                    </Button>
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
                          <button
                            key={img.id}
                            onClick={() => setCardImage(showImagePicker, img.url)}
                            className="relative rounded-xl overflow-hidden aspect-square hover:opacity-80 transition-opacity"
                          >
                            <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">Fotos fornecidas por Pexels</p>
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
            <div key={`export-${i}`}>
              {renderCardPreview(card, i, true)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CarouselGenerator;
