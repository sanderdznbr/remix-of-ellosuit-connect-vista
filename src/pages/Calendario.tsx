import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2, Home, Calendar as CalendarIcon } from 'lucide-react';



interface PlanItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'post' | 'reels' | 'story' | 'carrossel';
  notes?: string;
}

const STORAGE_KEY = 'editorial_calendar_v1';
const TYPE_COLORS: Record<PlanItem['type'], string> = {
  post: '#8B5CF6',
  reels: '#38BDF8',
  story: '#F59E0B',
  carrossel: '#EC4899',
};

const Calendario: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; type: PlanItem['type']; notes: string }>({ title: '', type: 'post', notes: '' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (next: PlanItem[]) => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const monthLabel = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date: ds, day: d });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [cursor]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, PlanItem[]> = {};
    items.forEach((i) => {
      map[i.date] = map[i.date] || [];
      map[i.date].push(i);
    });
    return map;
  }, [items]);

  const addItem = () => {
    if (!modalDate || !draft.title.trim()) return;
    const next: PlanItem[] = [
      ...items,
      { id: crypto.randomUUID(), date: modalDate, title: draft.title.trim(), type: draft.type, notes: draft.notes.trim() || undefined },
    ];
    save(next);
    setDraft({ title: '', type: 'post', notes: '' });
  };

  const removeItem = (id: string) => save(items.filter((i) => i.id !== id));

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex h-screen w-full text-white" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="flex-1 overflow-y-auto">

      <header className="sticky top-0 z-10 border-b border-white/[0.06] backdrop-blur" style={{ backgroundColor: 'rgba(10,10,15,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
            <Home className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Início</span>
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <CalendarIcon className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-semibold">Calendário editorial</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/60"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-base font-medium capitalize min-w-[180px] text-center">{monthLabel}</span>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/60"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={() => setCursor(new Date())} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.04]">Hoje</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[11px] text-white/40 mb-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="px-2 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((c, i) => {
            const isToday = c.date === todayStr;
            const dayItems = c.date ? itemsByDate[c.date] || [] : [];
            return (
              <button
                key={i}
                disabled={!c.date}
                onClick={() => c.date && setModalDate(c.date)}
                className={`min-h-[90px] rounded-lg border p-2 text-left transition-colors ${
                  c.date ? 'border-white/[0.06] hover:bg-white/[0.04]' : 'border-transparent opacity-30'
                } ${isToday ? 'ring-1 ring-purple-500/60' : ''}`}
                style={{ backgroundColor: c.date ? '#0f0f15' : 'transparent' }}
              >
                {c.day && <div className="text-xs text-white/60 mb-1">{c.day}</div>}
                <div className="space-y-1">
                  {dayItems.slice(0, 3).map((it) => (
                    <div key={it.id} className="text-[10px] truncate px-1.5 py-0.5 rounded" style={{ backgroundColor: `${TYPE_COLORS[it.type]}25`, color: TYPE_COLORS[it.type] }}>
                      {it.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && <div className="text-[10px] text-white/40">+{dayItems.length - 3}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {modalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setModalDate(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] p-5" style={{ backgroundColor: '#0f0f15' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white/90">{new Date(modalDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</h2>
              <button onClick={() => setModalDate(null)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {(itemsByDate[modalDate] || []).map((it) => (
                <div key={it.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: TYPE_COLORS[it.type] }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/90 truncate">{it.title}</div>
                    {it.notes && <div className="text-[11px] text-white/40 truncate">{it.notes}</div>}
                  </div>
                  <button onClick={() => removeItem(it.id)} className="p-1.5 text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {(itemsByDate[modalDate] || []).length === 0 && <p className="text-xs text-white/40 text-center py-3">Nenhum post planejado</p>}
            </div>

            <div className="space-y-2 border-t border-white/[0.06] pt-4">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Título do post"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/40"
              />
              <div className="flex gap-2">
                {(['post', 'reels', 'story', 'carrossel'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDraft({ ...draft, type: t })}
                    className="flex-1 text-[11px] py-1.5 rounded-lg border transition-colors capitalize"
                    style={{
                      borderColor: draft.type === t ? TYPE_COLORS[t] : 'rgba(255,255,255,0.06)',
                      color: draft.type === t ? TYPE_COLORS[t] : 'rgba(255,255,255,0.5)',
                      backgroundColor: draft.type === t ? `${TYPE_COLORS[t]}15` : 'transparent',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Anotações (opcional)"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/40 resize-none"
              />
              <button
                onClick={addItem}
                disabled={!draft.title.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Calendario;
