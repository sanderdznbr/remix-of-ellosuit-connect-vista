import React from 'react';
import { Sparkles } from 'lucide-react';
import { type WizardMode } from '@/utils/creditCost';

interface WizardCreditIndicatorProps {
  wizardMode: WizardMode;
  cardCount: number;
  hasFaceRef: boolean;
  contentMode: 'carousel' | 'single-post';
  themeColor: string;
}

const WizardCreditIndicator: React.FC<WizardCreditIndicatorProps> = ({
  themeColor,
}) => {
  return (
    <div className="flex items-center justify-center gap-1.5 select-none">
      <Sparkles className="w-3 h-3" style={{ color: themeColor, opacity: 0.5 }} />
      <span className="text-[11px] tracking-wide" style={{ color: 'rgba(255,255,255,0.25)' }}>
        1 criativo
      </span>
    </div>
  );
};

export default WizardCreditIndicator;
