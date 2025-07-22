
import React from 'react';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  pressable?: boolean;
}

const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className,
  onClick,
  pressable = false
}) => {
  return (
    <div
      className={cn(
        'mobile-card',
        pressable && 'mobile-touch-feedback cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default MobileCard;
