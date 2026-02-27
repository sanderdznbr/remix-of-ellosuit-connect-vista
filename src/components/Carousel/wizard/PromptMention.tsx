import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { MessageSquareText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  avatar_url: string | null;
}

interface MentionedPrompt {
  id: string;
  title: string;
  avatar_url: string | null;
  content: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  mentionedPrompts: MentionedPrompt[];
  onMentionAdd: (prompt: MentionedPrompt) => void;
  onMentionRemove: (id: string) => void;
  placeholder?: string;
  className?: string;
}

const PromptMentionInput: React.FC<Props> = ({
  value, onChange, mentionedPrompts, onMentionAdd, onMentionRemove,
  placeholder, className,
}) => {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [filter, setFilter] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch prompts once
  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (!cu) return;
      const { data } = await supabase
        .from('saved_prompts')
        .select('id, title, content, avatar_url')
        .eq('company_id', cu.company_id)
        .order('title');
      setPrompts((data as any[]) || []);
    };
    fetch();
  }, [user]);

  const filtered = prompts.filter(p =>
    !mentionedPrompts.some(m => m.id === p.id) &&
    (!filter || p.title.toLowerCase().includes(filter.toLowerCase()))
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      // Detect @ trigger
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && showDropdown && filtered.length > 0) {
      e.preventDefault();
      selectPrompt(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const selectPrompt = (p: SavedPrompt) => {
    onMentionAdd({ id: p.id, title: p.title, avatar_url: p.avatar_url, content: p.content });
    // Remove the @query from the text
    const text = value;
    const atIdx = text.lastIndexOf('@');
    if (atIdx >= 0) {
      onChange(text.substring(0, atIdx).trimEnd() + (atIdx > 0 ? ' ' : ''));
    }
    setShowDropdown(false);
    setFilter('');
    textareaRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    // Check for @ trigger
    const cursorPos = e.target.selectionStart || 0;
    const textBefore = newVal.substring(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');
    
    if (atIdx >= 0) {
      const charBefore = atIdx > 0 ? textBefore[atIdx - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || atIdx === 0) {
        const query = textBefore.substring(atIdx + 1);
        if (!query.includes(' ') || query.length < 20) {
          setFilter(query);
          setShowDropdown(true);
          setHighlightIdx(0);
          return;
        }
      }
    }
    setShowDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative">
      {/* Mentioned prompt chips */}
      {mentionedPrompts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {mentionedPrompts.map(m => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-xs font-medium border border-white/[0.1]"
              style={{ backgroundColor: 'rgba(139,92,246,0.12)' }}
            >
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <MessageSquareText className="w-2.5 h-2.5 text-purple-400" />
                </span>
              )}
              <span className="text-white/80">{m.title}</span>
              <button
                onClick={() => onMentionRemove(m.id)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-white/10 text-white/30 hover:text-white/60 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {/* Hint */}
      {prompts.length > 0 && !showDropdown && (
        <p className="absolute bottom-2 right-3 text-[10px] text-white/15 select-none pointer-events-none">
          @ para mencionar prompts
        </p>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 bottom-full mb-1 max-h-[220px] overflow-y-auto rounded-xl border border-white/[0.08] shadow-2xl z-50"
            style={{ backgroundColor: '#18181f' }}
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-xs text-white/25 text-center">
                {filter ? 'Nenhum prompt encontrado' : 'Nenhum prompt salvo'}
              </div>
            ) : (
              filtered.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => selectPrompt(p)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    i === highlightIdx ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#1a1a24' }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <MessageSquareText className="w-3.5 h-3.5 text-white/20" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/80 truncate">{p.title}</p>
                    <p className="text-[11px] text-white/25 truncate">{p.content.substring(0, 60)}...</p>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromptMentionInput;
