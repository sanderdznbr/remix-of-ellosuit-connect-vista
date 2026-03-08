import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Loader2, Download, Share2, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

import giftCard100Front from '@/assets/gift-card-100-front.png';
import giftCard200Front from '@/assets/gift-card-200-front.png';
import giftCard300Front from '@/assets/gift-card-300-front.png';
import giftCard100Back from '@/assets/gift-card-100-back.png';
import giftCard200Back from '@/assets/gift-card-200-back.png';
import giftCard300Back from '@/assets/gift-card-300-back.png';

const GIFT_PACKAGES = [
  { credits: 100, price: 129.90, label: '100 Créditos', front: giftCard100Front, back: giftCard100Back },
  { credits: 200, price: 209.90, label: '200 Créditos', front: giftCard200Front, back: giftCard200Back },
  { credits: 300, price: 239.90, label: '300 Créditos', front: giftCard300Front, back: giftCard300Back },
];

/** Renders the gift code directly onto the back card image via canvas — text only, large & centered */
async function renderCodeOnCard(backImageSrc: string, code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas not supported');

      ctx.drawImage(img, 0, 0);

      // Large centered code text — no pill background
      const fontSize = Math.round(canvas.width * 0.065);
      ctx.font = `bold ${fontSize}px "SF Mono", "Fira Code", "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Subtle shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = '#ffffff';
      ctx.fillText(code, canvas.width / 2, canvas.height / 2 + canvas.height * 0.08);

      ctx.shadowColor = 'transparent';

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject('Failed to load image');
    img.src = backImageSrc;
  });
}

interface GiftHistory {
  id: string;
  gift_key: string;
  credits: number;
  price_brl: number;
  purchased_at: string;
  status: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  redeemed_email?: string;
}

export default function Presentear() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [generatingKey, setGeneratingKey] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<{
    key: string;
    credits: number;
    backWithCode: string;
    frontSrc: string;
  } | null>(null);
  const [showFlip, setShowFlip] = useState(false);
  const hasGeneratedRef = useRef(false);
  const [history, setHistory] = useState<GiftHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('gift_keys' as any)
        .select('id, gift_key, credits, price_brl, purchased_at, status, redeemed_at, redeemed_by')
        .eq('purchased_by', user.id)
        .order('purchased_at', { ascending: false }) as any;
      if (error) throw error;

      // Resolve redeemed_by emails
      const items: GiftHistory[] = data || [];
      const redeemerIds = items.filter(i => i.redeemed_by).map(i => i.redeemed_by!);
      if (redeemerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', redeemerIds) as any;
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.display_name]));
        items.forEach(i => {
          if (i.redeemed_by) i.redeemed_email = profileMap.get(i.redeemed_by) || i.redeemed_by;
        });
      }
      setHistory(items);
    } catch (e) {
      console.error('Error loading gift history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    const purchased = searchParams.get('purchased');
    const credits = parseInt(searchParams.get('credits') || '0');
    const price = parseFloat(searchParams.get('price') || '0');

    if (purchased === 'true' && credits > 0 && user && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generateGiftKey(credits, price);
    }
  }, [searchParams, user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const generateGiftKey = async (credits: number, price: number) => {
    setGeneratingKey(true);
    try {
      const key = `GIFT-${Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map(b => b.toString(36).toUpperCase().padStart(2, '0'))
        .join('')
        .slice(0, 10)}`;

      const insertData = {
        gift_key: key,
        credits,
        price_brl: price,
        purchased_by: user!.id,
        status: 'available',
      };
      console.log('[Gift] Inserting key:', insertData);

      const { data: insertResult, error } = await supabase.from('gift_keys' as any).insert(insertData as any).select();

      console.log('[Gift] Insert result:', insertResult, 'Error:', error);
      if (error) throw error;

      const pkg = GIFT_PACKAGES.find(p => p.credits === credits) || GIFT_PACKAGES[0];

      // Render code directly onto the back card image
      const backWithCode = await renderCodeOnCard(pkg.back, key);

      setTimeout(() => {
        setPurchasedCard({ key, credits, backWithCode, frontSrc: pkg.front });
        setShowFlip(true);
      }, 600);

      toast.success('Chave de presente gerada!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar chave. Tente novamente.');
    } finally {
      setTimeout(() => setGeneratingKey(false), 1000);
    }
  };

  const handlePurchase = (pkg: typeof GIFT_PACKAGES[0]) => {
    if (!user) { navigate('/auth'); return; }
    navigate(`/checkout?modo=presente&credits=${pkg.credits}&price=${pkg.price}`);
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!purchasedCard) return;
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [160, 100] });

      // Front page
      const frontImg = new Image();
      frontImg.crossOrigin = 'anonymous';
      await new Promise<void>((res, rej) => { frontImg.onload = () => res(); frontImg.onerror = rej; frontImg.src = purchasedCard.frontSrc; });
      const frontCanvas = document.createElement('canvas');
      frontCanvas.width = frontImg.naturalWidth;
      frontCanvas.height = frontImg.naturalHeight;
      frontCanvas.getContext('2d')!.drawImage(frontImg, 0, 0);
      pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 160, 100);

      // Back page with code burned in
      pdf.addPage([160, 100], 'landscape');
      pdf.addImage(purchasedCard.backWithCode, 'PNG', 0, 0, 160, 100);

      pdf.save(`gift-card-${purchasedCard.credits}-creditos.pdf`);
      toast.success('PDF baixado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF.');
    }
  }, [purchasedCard]);

  const handleShare = useCallback(async () => {
    if (!purchasedCard) return;
    const text = `🎁 Presente elloContent!\n\nVocê recebeu ${purchasedCard.credits} créditos!\nResgate com a chave: ${purchasedCard.key}\n\nAcesse: https://ellocontent.com`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Presente elloContent', text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Mensagem copiada!');
    }
  }, [purchasedCard]);

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      <nav className="flex items-center gap-4 px-6 md:px-10 py-5">
        <button onClick={() => navigate('/precos')} className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={ellocontentLogo} alt="elloContent" className="h-5 cursor-pointer" onClick={() => navigate('/')} />
      </nav>

      <div className="max-w-3xl mx-auto px-6 md:px-10 pt-12 pb-24">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Presentear com créditos</h1>
          <p className="text-white/35 text-sm max-w-sm mx-auto leading-relaxed">
            Escolha um pacote, pague e receba uma chave exclusiva para presentear alguém.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Generating */}
          {generatingKey && !purchasedCard && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-24">
              <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: '#7B50DC' }} />
              <p className="text-white/50 text-sm">Gerando sua chave de presente...</p>
            </motion.div>
          )}

          {/* Result */}
          {purchasedCard && (
            <motion.div key="purchased" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm mx-auto">
              {/* Card flip */}
              <div className="w-full aspect-[16/10] mb-10 [perspective:800px]">
                <motion.div
                  className="relative w-full h-full [transform-style:preserve-3d]"
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: showFlip ? 180 : 0 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                >
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    <img src={purchasedCard.frontSrc} alt="" className="w-full h-full object-cover rounded-2xl" />
                  </div>
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <img src={purchasedCard.backWithCode} alt="" className="w-full h-full object-cover rounded-2xl" />
                  </div>
                </motion.div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-4" style={{ backgroundColor: 'rgba(74, 222, 128, 0.12)' }}>
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-white font-semibold mb-1">{purchasedCard.credits} créditos prontos para presentear</p>
                <p className="text-white/30 text-xs mb-8">Compartilhe a chave ou baixe o cartão. O destinatário pode resgatar em "Resgatar cupom".</p>

                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                  <button
                    onClick={() => { navigator.clipboard.writeText(purchasedCard.key); toast.success('Chave copiada!'); }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
                    style={{ backgroundColor: '#7B50DC', color: '#fff' }}
                  >
                    <Copy className="w-4 h-4" /> Copiar chave
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90 text-white"
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <Download className="w-4 h-4" /> Baixar PDF
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90 text-white"
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <Share2 className="w-4 h-4" /> Compartilhar
                  </button>
                  <button
                    onClick={() => { setPurchasedCard(null); setShowFlip(false); hasGeneratedRef.current = false; navigate('/presentear', { replace: true }); }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all text-white/50 hover:text-white/80"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <ShoppingBag className="w-4 h-4" /> Comprar outro
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Cards grid */}
          {!purchasedCard && !generatingKey && (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {GIFT_PACKAGES.map((pkg, i) => (
                  <motion.div
                    key={pkg.credits}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i, duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <div className="group w-full aspect-[16/10] mb-6 [perspective:800px] cursor-pointer">
                      <div className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                        <div className="absolute inset-0 [backface-visibility:hidden]">
                          <img src={pkg.front} alt={pkg.label} className="w-full h-full object-cover rounded-2xl" />
                        </div>
                        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <img src={pkg.back} alt="Verso" className="w-full h-full object-cover rounded-2xl" />
                        </div>
                      </div>
                    </div>

                    <p className="text-white font-semibold mb-0.5">{pkg.label}</p>
                    <p className="text-white text-xl font-bold mb-5">
                      R${pkg.price.toFixed(2).replace('.', ',')}
                    </p>
                    <button
                      onClick={() => handlePurchase(pkg)}
                      className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
                      style={{ backgroundColor: '#7B50DC', color: '#fff' }}
                    >
                      Comprar presente
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
