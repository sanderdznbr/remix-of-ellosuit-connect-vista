
import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { vibrate } from '@/utils/mobile-helpers';

interface KeyboardToolbarProps {
  isVisible: boolean;
  onDateTimeClick: () => void;
  onLocationClick: () => void;
  onDetailsClick: () => void;
  onDone: () => void;
  hasDate?: boolean;
  hasTime?: boolean;
  hasLocation?: boolean;
}

const KeyboardToolbar: React.FC<KeyboardToolbarProps> = ({
  isVisible,
  onDateTimeClick,
  onLocationClick,
  onDetailsClick,
  onDone,
  hasDate = false,
  hasTime = false,
  hasLocation = false
}) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      // Detect keyboard height on mobile
      const viewport = window.visualViewport;
      if (viewport) {
        const keyboardHeight = window.innerHeight - viewport.height;
        setKeyboardHeight(keyboardHeight);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);

  const handleButtonClick = (action: () => void) => {
    vibrate(30);
    action();
  };

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50 transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
      style={{ 
        bottom: keyboardHeight > 0 ? keyboardHeight : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => handleButtonClick(onDateTimeClick)}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
              (hasDate || hasTime) 
                ? "bg-blue-100 text-blue-600" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">Data</span>
          </button>
          
          <button
            onClick={() => handleButtonClick(onLocationClick)}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
              hasLocation 
                ? "bg-blue-100 text-blue-600" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <MapPin className="h-5 w-5" />
            <span className="text-sm font-medium">Local</span>
          </button>
          
          <button
            onClick={() => handleButtonClick(onDetailsClick)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Info className="h-5 w-5" />
            <span className="text-sm font-medium">Detalhes</span>
          </button>
        </div>
        
        <button
          onClick={() => handleButtonClick(onDone)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default KeyboardToolbar;
