
import { useState } from 'react';
import { Search, ChevronDown, ChevronLeft, PanelLeftOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AUTOMATION_BLOCKS, AutomationBlockDefinition } from './types';
import * as Icons from 'lucide-react';

const CATEGORIES = [
  { key: 'trigger', label: 'Gatilhos', emoji: '⚡' },
  { key: 'action', label: 'Ações', emoji: '▶️' },
  { key: 'condition', label: 'Condições', emoji: '🔀' },
  { key: 'transform', label: 'Transformação', emoji: '🔄' },
];

interface Props {
  onDragStart: (block: AutomationBlockDefinition) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function AutomationSidebar({ onDragStart, isExpanded = false, onToggle }: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

  // Collapsed state - thin bar with category icons + expand button
  if (!isExpanded) {
    return (
      <div className="w-12 border-r bg-white flex flex-col items-center py-3 gap-1.5">
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mb-2"
          title="Expandir blocos"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <div className="w-6 h-px bg-gray-200 mb-1" />
        {CATEGORIES.map(cat => (
          <div
            key={cat.key}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-gray-400 hover:bg-gray-100 transition-colors cursor-default"
            title={cat.label}
          >
            {cat.emoji}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-white flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Blocos</span>
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Recolher"
          >
            <ChevronLeft className="h-4 w-4" />
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

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {CATEGORIES.map(cat => {
          const blocks = filtered.filter(b => b.category === cat.key);
          if (blocks.length === 0) return null;
          const isCollapsed = collapsed[cat.key];

          return (
            <div key={cat.key}>
              <button
                onClick={() => toggleCategory(cat.key)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-lg text-gray-500 hover:bg-gray-50"
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
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing border border-transparent transition-all group hover:bg-gray-50 hover:border-gray-200"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: block.color }}
                      >
                        {getIcon(block.icon)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate text-gray-800">{block.label}</div>
                        <div className="text-[10px] truncate text-gray-400">{block.description}</div>
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
