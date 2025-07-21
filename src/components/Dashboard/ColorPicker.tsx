
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label = "Cor do evento" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const predefinedColors = [
    { name: 'Azul', value: '#3600FF' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Amarelo', value: '#F59E0B' },
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Laranja', value: '#F97316' },
    { name: 'Cinza', value: '#6B7280' },
    { name: 'Índigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Lime', value: '#84CC16' },
    { name: 'Ciano', value: '#06B6D4' },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start h-10"
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: value }}
              />
              <span className="text-sm">
                {predefinedColors.find(c => c.value === value)?.name || 'Cor personalizada'}
              </span>
              <Palette className="h-4 w-4 ml-auto" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Cores pré-definidas</h4>
              <div className="grid grid-cols-4 gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color.value}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 relative transition-all hover:scale-110",
                      value === color.value ? "border-gray-900" : "border-gray-200"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => {
                      onChange(color.value);
                      setIsOpen(false);
                    }}
                    title={color.name}
                  >
                    {value === color.value && (
                      <Check className="h-4 w-4 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Cor personalizada</h4>
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-8 rounded border border-gray-200 cursor-pointer"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ColorPicker;
