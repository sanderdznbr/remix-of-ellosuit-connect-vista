
import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { vibrate } from '@/utils/mobile-helpers';

interface InlineReminderEditorProps {
  onSave: (title: string) => void;
  onCancel: () => void;
  initialValue?: string;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const InlineReminderEditor: React.FC<InlineReminderEditorProps> = ({
  onSave,
  onCancel,
  initialValue = '',
  placeholder = 'Novo lembrete',
  onFocus,
  onBlur
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
      vibrate(30);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
    onBlur?.();
  };

  const handleFocus = () => {
    onFocus?.();
  };

  return (
    <div className="flex items-center space-x-3 py-4 px-4 bg-white">
      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
      
      <div className="flex-1 flex items-center space-x-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="flex-1 text-base bg-transparent border-none outline-none placeholder:text-gray-400"
        />
        
        <div className="flex items-center space-x-1">
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className={cn(
              "p-1 rounded-full transition-colors",
              value.trim() 
                ? "text-blue-500 hover:bg-blue-50" 
                : "text-gray-300 cursor-not-allowed"
            )}
          >
            <Check className="h-4 w-4" />
          </button>
          
          <button
            onClick={onCancel}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InlineReminderEditor;
