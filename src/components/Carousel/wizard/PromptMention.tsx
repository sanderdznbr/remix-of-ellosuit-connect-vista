import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { MessageSquareText } from 'lucide-react';
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

export interface PromptMentionRef {
  triggerMention: () => void;
}

const PromptMentionInput = forwardRef<PromptMentionRef, Props>(({
  value, onChange, mentionedPrompts, onMentionAdd, onMentionRemove,
  placeholder, className,
}, ref) => {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [filter, setFilter] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [atStartPos, setAtStartPos] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Expose triggerMention to parent via ref
  useImperativeHandle(ref, () => ({
    triggerMention: () => {
      const textarea = textareaRef.current;
      const pos = textarea?.selectionStart ?? value.length;
      const before = value.substring(0, pos);
      const after = value.substring(pos);
      const needsSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
      const atPos = before.length + (needsSpace ? 1 : 0);
      const newVal = before + (needsSpace ? ' @' : '@') + after;
      onChange(newVal);
      setAtStartPos(atPos);
      setFilter('');
      setShowDropdown(true);
      setHighlightIdx(0);
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          const cursorPos = atPos + 1;
          textarea.setSelectionRange(cursorPos, cursorPos);
        }
      }, 50);
    }
  }));

  // Fetch prompts once
  useEffect(() => {
    const fetchPrompts = async () => {
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
    fetchPrompts();
  }, [user]);

  const filtered = prompts.filter(p =>
    !mentionedPrompts.some(m => m.id === p.id) &&
    (!filter || p.title.toLowerCase().includes(filter.toLowerCase()))
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      selectPrompt(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setAtStartPos(null);
    }
  };

  const selectPrompt = (p: SavedPrompt) => {
    onMentionAdd({ id: p.id, title: p.title, avatar_url: p.avatar_url, content: p.content });
    
    // Replace @query with (@title) inline
    if (atStartPos !== null) {
      const before = value.substring(0, atStartPos);
      const afterAt = value.substring(atStartPos + 1 + filter.length);
      const mention = `(@${p.title})`;
      const needsTrailingSpace = afterAt.length === 0 || !afterAt.startsWith(' ');
      onChange(before + mention + (needsTrailingSpace ? ' ' : '') + afterAt);
    }
    
    setShowDropdown(false);
    setFilter('');
    setAtStartPos(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    const cursorPos = e.target.selectionStart || 0;
    const textBefore = newVal.substring(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');
    
    if (atIdx >= 0) {
      const charBefore = atIdx > 0 ? textBefore[atIdx - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || atIdx === 0) {
        const query = textBefore.substring(atIdx + 1);
        if (!query.includes(' ') || query.length < 20) {
          setFilter(query);
          setAtStartPos(atIdx);
          setShowDropdown(true);
          setHighlightIdx(0);
          return;
        }
      }
    }
    setShowDropdown(false);
    setAtStartPos(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setAtStartPos(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {/* Popup overlay */}
      <AnimatePresence>
        {showDropdown && prompts.length > 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowDropdown(false); setAtStartPos(null); }}>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md max-h-[360px] overflow-y-auto rounded-2xl border border-white/[0.08] shadow-2xl"
              style={{ backgroundColor: '#18181f' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-4 pb-2">
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => { setFilter(e.target.value); setHighlightIdx(0); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, filtered.length - 1)); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
                    else if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); selectPrompt(filtered[highlightIdx]); }
                    else if (e.key === 'Escape') { setShowDropdown(false); setAtStartPos(null); }
                  }}
                  placeholder="Buscar prompt..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-white/15"
                  autoFocus
                />
              </div>
              {filtered.length === 0 ? (
                <div className="px-4 py-4 text-xs text-white/25 text-center">
                  {filter ? 'Nenhum prompt encontrado' : 'Nenhum prompt salvo'}
                </div>
              ) : (
                <div className="py-1">
                  {filtered.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => selectPrompt(p)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
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
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

PromptMentionInput.displayName = 'PromptMentionInput';

export default PromptMentionInput;
