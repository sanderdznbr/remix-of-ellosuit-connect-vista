import React from 'react';
import { Zap } from 'lucide-react';
import { calculateCreditCost, getCreditPerCard, type WizardMode } from '@/utils/creditCost';

interface WizardCreditIndicatorProps {
  wizardMode: WizardMode;
  cardCount: number;
  hasFaceRef: boolean;
  contentMode: 'carousel' | 'single-post';
  themeColor: string;
}

const WizardCreditIndicator: React.FC<WizardCreditIndicatorProps> = ({
  wizardMode,
  cardCount,
  hasFaceRef,
  contentMode,
  themeColor,
}) => {
  const effectiveCount = contentMode === 'single-post' ? 1 : cardCount;
  const perCard = getCreditPerCard(wizardMode, hasFaceRef);
  const total = calculateCreditCost({
    cardCount: effectiveCount,
    wizardMode,
    hasFaceRef,
    includeWebSearch: true,
  });

  return (
    <div className="flex items-center justify-center gap-1.5 select-none">
      <Zap className="w-3 h-3" style={{ color: themeColor, opacity: 0.5 }} />
      <span className="text-[11px] tracking-wide" style={{ color: 'rgba(255,255,255,0.25)' }}>
        ~{total} créditos
        <span className="hidden sm:inline">
          {' '}({effectiveCount}×{perCard} + 1)
        </span>
      </span>
    </div>
  );
};

export default WizardCreditIndicator;
