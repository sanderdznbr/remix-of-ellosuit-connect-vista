import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Loader2, Gift } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import ellocontentLogo from '@/assets/ellocontent_logo.png';
import { toast } from 'sonner';

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

export default function Presentear() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [generatingKey, setGeneratingKey] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<{ key: string; credits: number; back: string } | null>(null);
  const [showFlip, setShowFlip] = useState(false);

  // After returning from checkout, generate the gift key
  useEffect(() => {
    const purchased = searchParams.get('purchased');
    const credits = parseInt(searchParams.get('credits') || '0');
    const price = parseFloat(searchParams.get('price') || '0');

    if (purchased === 'true' && credits > 0 && user) {
      generateGiftKey(credits, price);
    }
  }, [searchParams, user]);

  const generateGiftKey = async (credits: number, price: number) => {
    setGeneratingKey(true);
    try {
      const key = `GIFT-${Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => b.toString(36).toUpperCase().padStart(2, '0')).join('').slice(0, 10)}`;

      const { error } = await supabase.from('gift_keys' as any).insert({
        gift_key: key,
        credits,
        price_brl: price,
        purchased_by: user!.id,
        status: 'available',
      } as any);

      if (error) throw error;

      const pkg = GIFT_PACKAGES.find(p => p.credits === credits) || GIFT_PACKAGES[0];

      // Trigger flip animation
      setTimeout(() => {
        setPurchasedCard({ key, credits, back: pkg.back });
        setShowFlip(true);
      }, 800);

      toast.success('Chave de presente gerada!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar chave.');
    } finally {
      setTimeout(() => setGeneratingKey(false), 1200);
    }
  };

  const handlePurchase = (pkg: typeof GIFT_PACKAGES[0]) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/checkout?modo=presente&credits=${pkg.credits}&price=${pkg.price}`);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <nav className="flex items-center gap-4 px-6 md:px-10 py-5">
        <button onClick={() => navigate('/precos')} className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={ellocontentLogo} alt="elloContent" className="h-5 cursor-pointer" onClick={() => navigate('/')} />
      </nav>

      <div className="max-w-3xl mx-auto px-6 md:px-10 pt-8 pb-20">
        {/* Header text */}
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Presentear com créditos</h1>
          <p className="text-white/35 text-sm max-w-sm mx-auto leading-relaxed">
            Escolha um pacote, pague e receba uma chave exclusiva para presentear alguém.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Generating state */}
          {generatingKey && !purchasedCard && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-20"
            >
              <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: '#7B50DC' }} />
              <p className="text-white/50 text-sm">Gerando sua chave de presente...</p>
            </motion.div>
          )}

          {/* Purchased card result with flip animation */}
          {purchasedCard && (
            <motion.div
              key="purchased"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xs mx-auto"
            >
              {/* Card with flip */}
              <div className="w-full aspect-[16/10] mb-8 [perspective:800px]">
                <motion.div
                  className="relative w-full h-full [transform-style:preserve-3d]"
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: showFlip ? 180 : 0 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                >
                  {/* Front */}
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    {(() => {
                      const pkg = GIFT_PACKAGES.find(p => p.credits === purchasedCard.credits);
                      return <img src={pkg?.front} alt="" className="w-full h-full object-cover rounded-2xl" />;
                    })()}
                  </div>
                  {/* Back with code */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <img src={purchasedCard.back} alt="" className="w-full h-full object-cover rounded-2xl" />
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-[12%] px-6">
                      <code className="text-sm md:text-base font-bold font-mono tracking-wider select-all bg-white rounded-full px-5 py-2 text-foreground shadow-lg">
                        {purchasedCard.key}
                      </code>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-3" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}>
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-white font-semibold text-sm mb-1">{purchasedCard.credits} créditos prontos para presentear</p>
                <p className="text-white/30 text-xs mb-5">Compartilhe a chave acima. O destinatário pode resgatar em "Resgatar cupom".</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { navigator.clipboard.writeText(purchasedCard.key); toast.success('Chave copiada!'); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                    style={{ backgroundColor: '#7B50DC', color: '#fff' }}
                  >
                    <Copy className="w-4 h-4" /> Copiar chave
                  </button>
                  <button
                    onClick={() => { setPurchasedCard(null); setShowFlip(false); navigate('/presentear', { replace: true }); }}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors text-white/50 hover:text-white/80"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Comprar outro
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Gift cards grid */}
          {!purchasedCard && !generatingKey && (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {GIFT_PACKAGES.map((pkg, i) => (
                  <motion.div
                    key={pkg.credits}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i, duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    {/* Flip card on hover */}
                    <div className="group w-full aspect-[16/10] mb-5 [perspective:800px] cursor-pointer">
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
                    <p className="text-white text-xl font-bold mb-4">
                      R${pkg.price.toFixed(2).replace('.', ',')}
                    </p>
                    <button
                      onClick={() => handlePurchase(pkg)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
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
