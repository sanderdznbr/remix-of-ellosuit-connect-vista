
import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import MobileButton from './mobile-button';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  size = 'md'
}) => {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) {
      setCurrentY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 150) {
      onClose();
    }
    setCurrentY(0);
    setIsDragging(false);
  };

  const sizeClasses = {
    sm: 'max-h-[50vh]',
    md: 'max-h-[75vh]',
    lg: 'max-h-[90vh]',
    full: 'h-full rounded-t-none'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-end md:items-center md:justify-center">
      <div 
        ref={modalRef}
        className={cn(
          'mobile-modal-content w-full flex flex-col',
          sizeClasses[size],
          'md:max-w-md md:mx-auto md:rounded-2xl md:max-h-[80vh]'
        )}
        style={{ 
          transform: `translateY(${currentY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3 md:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              {title || ''}
            </h2>
            {showCloseButton && (
              <MobileButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 p-0"
              >
                <X className="h-5 w-5" />
              </MobileButton>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileModal;
