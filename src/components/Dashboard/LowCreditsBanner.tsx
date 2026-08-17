import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isNativeIOS } from '@/lib/platform';

interface Props {
  balance: number | null;
}

const DISMISS_KEY_PREFIX = 'low_credits_dismissed_';

const LowCreditsBanner: React.FC<Props> = ({ balance }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal whenever the balance bucket changes (e.g. user topped up)
  useEffect(() => {
    if (balance === null) return;
    const bucket = balance <= 0 ? 'zero' : balance < 5 ? 'low' : 'ok';
    try {
      const stored = sessionStorage.getItem(DISMISS_KEY_PREFIX + bucket);
      setDismissed(stored === '1');
    } catch {
      setDismissed(false);
    }
  }, [balance]);

  if (balance === null) return null;
  if (balance >= 5) return null;
  if (dismissed) return null;

  const isZero = balance <= 0;
  const nativeIOS = isNativeIOS();
  const color = isZero ? '#F87171' : '#FBBF24';
  const bg = isZero ? 'rgba(248,113,113,0.10)' : 'rgba(251,191,36,0.10)';
  const border = isZero ? 'rgba(248,113,113,0.30)' : 'rgba(251,191,36,0.30)';

  const handleDismiss = () => {
    const bucket = balance <= 0 ? 'zero' : 'low';
    try { sessionStorage.setItem(DISMISS_KEY_PREFIX + bucket, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="relative z-20 w-full max-w-2xl mx-auto shrink-0 px-3 pt-2 sm:px-4 sm:pt-3"
        role="status"
        aria-live="polite"
      >
        <div
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-2 rounded-xl px-3 py-2.5 backdrop-blur-md sm:flex sm:items-center sm:gap-3 sm:px-3.5"
          style={{ backgroundColor: bg, border: `1px solid ${border}` }}
        >
          <Zap className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" style={{ color }} />
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-white/80">
            {isZero ? (
              <>Seus <span style={{ color }} className="font-semibold">créditos acabaram</span>. {nativeIOS ? 'Aguarde a renovação do plano para continuar criando.' : 'Recarregue para continuar criando.'}</>
            ) : (
              <>Restam apenas <span style={{ color }} className="font-semibold">{Math.floor(balance)} créditos</span>. {nativeIOS ? 'Use-os antes da renovação.' : 'Que tal recarregar?'}</>
            )}
          </p>
          <button
            onClick={handleDismiss}
            className="p-1 -mt-0.5 -mr-0.5 text-white/40 hover:text-white/70 transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {!nativeIOS && (
            <button
              onClick={() => navigate('/precos')}
              className="col-start-2 inline-flex w-fit items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-90 cursor-pointer shrink-0 sm:col-start-auto"
              style={{ backgroundColor: color, color: '#0a0a0f' }}
            >
              Recarregar <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LowCreditsBanner;
