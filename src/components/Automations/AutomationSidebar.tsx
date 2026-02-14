
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Blocks } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AUTOMATION_BLOCKS, AutomationBlockDefinition } from './types';
import * as Icons from 'lucide-react';

const CATEGORIES = [
  { key: 'trigger', label: 'Gatilhos', icon: 'Zap' },
  { key: 'action', label: 'Ações', icon: 'Play' },
  { key: 'condition', label: 'Condições', icon: 'GitBranch' },
  { key: 'transform', label: 'Transformação', icon: 'RefreshCw' },
];

interface Props {
  onDragStart: (block: AutomationBlockDefinition) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function AutomationSidebar({ onDragStart, isExpanded = false, onToggle }: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hovering, setHovering] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = AUTOMATION_BLOCKS.filter(b =>
    b.label.toLowerCase().includes(search.toLowerCase()) ||
    b.description.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCategory = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getIcon = (iconName: string) => {
    const IconComp = (Icons as any)[iconName];
    return IconComp ? <IconComp className="h-3.5 w-3.5" /> : null;
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComp = (Icons as any)[iconName];
    return IconComp ? <IconComp className="h-3.5 w-3.5" /> : null;
  };

  const handleMouseEnter = () => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    if (!isExpanded) {
      hoverTimeout.current = setTimeout(() => {
        setHovering(true);
        onToggle?.();
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (hovering) {
      leaveTimeout.current = setTimeout(() => {
        setHovering(false);
        onToggle?.();
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    };
  }, []);

  // Collapsed state - floating button
  if (!isExpanded) {
    return (
      <div
        className="absolute left-3 top-3 z-20"
        onMouseEnter={handleMouseEnter}
      >
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-border shadow-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:shadow-md transition-all"
        >
          <Blocks className="h-4 w-4" />
          <span>Ver blocos</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-60 border-r border-border bg-card flex flex-col flex-shrink-0 overflow-hidden shadow-sm"
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Blocos</span>
          <button
            onClick={() => { setHovering(false); onToggle?.(); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar blocos..."
            className="h-8 pl-8 text-xs rounded-lg bg-muted/50 border-transparent focus:border-border"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {CATEGORIES.map(cat => {
          const blocks = filtered.filter(b => b.category === cat.key);
          if (blocks.length === 0) return null;
          const isCollapsed = collapsed[cat.key];

          return (
            <div key={cat.key}>
              <button
                onClick={() => toggleCategory(cat.key)}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {getCategoryIcon(cat.icon)}
                <span className="flex-1 text-left">{cat.label}</span>
                <span className="text-[10px] font-normal text-muted-foreground/60">{blocks.length}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!isCollapsed && (
                <div className="space-y-px mt-0.5 mb-1">
                  {blocks.map(block => (
                    <div
                      key={block.type}
                      draggable
                      onDragStart={() => onDragStart(block)}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-grab active:cursor-grabbing border border-transparent transition-all group hover:bg-muted/60 hover:border-border/50"
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: block.color }}
                      >
                        {getIcon(block.icon)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium truncate text-foreground/80 group-hover:text-foreground">{block.label}</div>
                        <div className="text-[10px] truncate text-muted-foreground/60">{block.description}</div>
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
