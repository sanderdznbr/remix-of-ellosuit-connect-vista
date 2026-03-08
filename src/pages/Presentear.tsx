import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Loader2 } from 'lucide-react';
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
  const [giftLoading, setGiftLoading] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<{ key: string; credits: number; back: string } | null>(null);

  const handlePurchase = async (pkg: typeof GIFT_PACKAGES[0]) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setGiftLoading(true);
    try {
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (!cu) throw new Error('Sem empresa');

      const key = `GIFT-${Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => b.toString(36).toUpperCase().padStart(2, '0')).join('').slice(0, 10)}`;

      const { error } = await supabase.from('gift_keys' as any).insert({
        gift_key: key,
        credits: pkg.credits,
        price_brl: pkg.price,
        purchased_by: user.id,
        status: 'available',
      } as any);

      if (error) throw error;

      setPurchasedCard({ key, credits: pkg.credits, back: pkg.back });
      toast.success('Chave de presente gerada!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar chave. Tente novamente.');
    } finally {
      setGiftLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <nav className="flex items-center justify-between px-5 md:px-8 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/precos')} className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={ellocontentLogo} alt="elloContent" className="h-5 md:h-6 cursor-pointer" onClick={() => navigate('/')} />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">🎁 Presentear com créditos</h1>
          <p className="text-white/40 text-sm md:text-base max-w-md mx-auto">
            Escolha um pacote, pague e receba uma chave exclusiva para presentear alguém.
          </p>
        </motion.div>

        {/* Purchased card result */}
        {purchasedCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-sm mx-auto mb-12"
          >
            <div className="relative w-full aspect-[16/10] mb-6">
              <img src={purchasedCard.back} alt="Código de resgate" className="w-full h-full object-cover rounded-2xl" />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-[14%] px-8">
                <code className="text-lg md:text-xl font-bold font-mono text-foreground tracking-wider select-all bg-white/90 rounded-full px-6 py-2">
                  {purchasedCard.key}
                </code>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 mb-3">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-white font-semibold mb-1">{purchasedCard.credits} créditos prontos!</p>
              <p className="text-white/30 text-xs mb-4">Compartilhe a chave. Quem receber pode resgatar em "Resgatar cupom".</p>
              <button
                onClick={() => { navigator.clipboard.writeText(purchasedCard.key); toast.success('Chave copiada!'); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                style={{ backgroundColor: '#7B50DC', color: '#fff' }}
              >
                <Copy className="w-4 h-4" /> Copiar chave
              </button>
            </div>
          </motion.div>
        )}

        {/* Gift cards grid */}
        {!purchasedCard && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {GIFT_PACKAGES.map((pkg, i) => (
              <motion.div
                key={pkg.credits}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="flex flex-col items-center"
              >
                {/* Flip card */}
                <div className="group w-full aspect-[16/10] mb-4 [perspective:800px]">
                  <div className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                    {/* Front */}
                    <div className="absolute inset-0 [backface-visibility:hidden]">
                      <img src={pkg.front} alt={pkg.label} className="w-full h-full object-cover rounded-2xl shadow-lg" />
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <img src={pkg.back} alt="Código de resgate" className="w-full h-full object-cover rounded-2xl shadow-lg" />
                    </div>
                  </div>
                </div>

                <p className="text-white font-semibold text-lg mb-1">{pkg.label}</p>
                <p className="text-white text-2xl font-bold mb-3">
                  R${pkg.price.toFixed(2).replace('.', ',')}
                </p>
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={giftLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-40"
                  style={{ backgroundColor: '#7B50DC', color: '#fff' }}
                >
                  {giftLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Comprar presente'}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
