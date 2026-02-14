
import { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AUTOMATION_BLOCKS, AutomationBlockDefinition } from './types';
import * as Icons from 'lucide-react';

const BRAND_COLOR = '#3000E3';

const CATEGORIES = [
  { key: 'trigger', label: 'Gatilhos', emoji: '⚡' },
  { key: 'action', label: 'Ações', emoji: '▶️' },
  { key: 'condition', label: 'Condições', emoji: '🔀' },
  { key: 'transform', label: 'Transformação', emoji: '🔄' },
];

interface Props {
  onDragStart: (block: AutomationBlockDefinition) => void;
}

export default function AutomationSidebar({ onDragStart }: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isOpen, setIsOpen] = useState(true);

  const filtered = AUTOMATION_BLOCKS.filter(b =>
    b.label.toLowerCase().includes(search.toLowerCase()) ||
    b.description.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCategory = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getIcon = (iconName: string) => {
    const IconComp = (Icons as any)[iconName];
    return IconComp ? <IconComp className="h-4 w-4" /> : null;
  };

  if (!isOpen) {
    return (
      <div className="w-12 bg-white border-r flex flex-col items-center py-4">
        <button onClick={() => setIsOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r flex flex-col flex-shrink-0 overflow-hidden">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Blocos</span>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-gray-100">
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 rotate-90" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar blocos..."
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {CATEGORIES.map(cat => {
          const blocks = filtered.filter(b => b.category === cat.key);
          if (blocks.length === 0) return null;
          const isCollapsed = collapsed[cat.key];

          return (
            <div key={cat.key}>
              <button
                onClick={() => toggleCategory(cat.key)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg"
              >
                <span>{cat.emoji}</span>
                <span className="flex-1 text-left">{cat.label}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5 mt-0.5">
                  {blocks.map(block => (
                    <div
                      key={block.type}
                      draggable
                      onDragStart={() => onDragStart(block)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: block.color }}
                      >
                        {getIcon(block.icon)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{block.label}</div>
                        <div className="text-[10px] text-gray-400 truncate">{block.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
