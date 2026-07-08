import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, Sparkles, Star, Image as ImageIcon } from 'lucide-react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { holidaysByDate, HOLIDAY_TYPE_COLOR, HOLIDAYS_2026 } from '@/utils/holidays2026';

interface PlanItem {
  id: string;
  date: string;
  title: string;
  type: 'post' | 'reels' | 'story' | 'carrossel';
  notes?: string;
}

interface ScheduledPost {
  id: string;
  date: string;
  carouselId: string;
  title: string;
  cover?: string;
}

const STORAGE_KEY = 'editorial_calendar_v1';
const POSTS_KEY = 'editorial_calendar_posts_v1';
const TYPE_COLORS: Record<PlanItem['type'], string> = {
  post: '#8B5CF6',
  reels: '#38BDF8',
  story: '#F59E0B',
  carrossel: '#EC4899',
};

const Calendario: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; type: PlanItem['type']; notes: string }>({ title: '', type: 'post', notes: '' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      const rawPosts = localStorage.getItem(POSTS_KEY);
      if (rawPosts) setPosts(JSON.parse(rawPosts));
    } catch {}
  }, []);

  const save = (next: PlanItem[]) => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const savePosts = (next: ScheduledPost[]) => {
    setPosts(next);
    localStorage.setItem(POSTS_KEY, JSON.stringify(next));
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
    items.forEach((i) => { (map[i.date] = map[i.date] || []).push(i); });
    return map;
  }, [items]);

  const postsByDate = useMemo(() => {
    const map: Record<string, ScheduledPost[]> = {};
    posts.forEach((p) => { (map[p.date] = map[p.date] || []).push(p); });
    return map;
  }, [posts]);

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
  const removePost = (id: string) => savePosts(posts.filter((p) => p.id !== id));

  const createPostForDate = (date: string) => {
    navigate(`/?scheduleDate=${date}`);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // Upcoming holidays (next 3)
  const upcomingHolidays = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return HOLIDAYS_2026.filter((h) => h.date >= today).slice(0, 3);
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-14 text-white">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-5" style={{ backgroundColor: 'rgba(124,58,237,0.12)', color: '#A78BFA' }}>
            <CalendarIcon className="w-3.5 h-3.5" />
            Planejamento
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">Calendário editorial</h1>
          <p className="text-white/40 text-base max-w-xl">
            Organize publicações, crie posts direto na data e acompanhe datas comemorativas de 2026.
          </p>
        </div>


        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/60 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium capitalize min-w-[180px] text-center text-white/80">{monthLabel}</span>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/60 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={() => setCursor(new Date())} className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors">Hoje</button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="px-2 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {grid.map((c, i) => {
            const isToday = c.date === todayStr;
            const dayItems = c.date ? itemsByDate[c.date] || [] : [];
            const dayPosts = c.date ? postsByDate[c.date] || [] : [];
            const holiday = c.date ? holidaysByDate[c.date] : undefined;
            return (
              <button
                key={i}
                disabled={!c.date}
                onClick={() => c.date && setModalDate(c.date)}
                className={`min-h-[96px] rounded-xl border p-2 text-left transition-colors ${
                  c.date ? 'border-white/[0.06] hover:bg-white/[0.04]' : 'border-transparent opacity-30'
                } ${isToday ? 'ring-1 ring-purple-500/60' : ''}`}
                style={{
                  backgroundColor: c.date ? (holiday ? `${HOLIDAY_TYPE_COLOR[holiday.type]}0F` : 'rgba(255,255,255,0.02)') : 'transparent',
                  borderColor: holiday ? `${HOLIDAY_TYPE_COLOR[holiday.type]}40` : undefined,
                }}
              >
                {c.day && (
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-white/70">{c.day}</span>
                    {holiday && <Star className="w-2.5 h-2.5" style={{ color: HOLIDAY_TYPE_COLOR[holiday.type] }} fill={HOLIDAY_TYPE_COLOR[holiday.type]} />}
                  </div>
                )}
                {holiday && (
                  <div className="text-[9px] truncate mb-1 font-medium" style={{ color: HOLIDAY_TYPE_COLOR[holiday.type] }} title={holiday.name}>
                    {holiday.name}
                  </div>
                )}
                <div className="space-y-1">
                  {dayPosts.slice(0, 2).map((p) => (
                    <div key={p.id} className="text-[10px] truncate px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ backgroundColor: 'rgba(139,92,246,0.20)', color: '#C4B5FD' }}>
                      <ImageIcon className="w-2 h-2 shrink-0" />
                      <span className="truncate">{p.title}</span>
                    </div>
                  ))}
                  {dayItems.slice(0, 2).map((it) => (
                    <div key={it.id} className="text-[10px] truncate px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${TYPE_COLORS[it.type]}25`, color: TYPE_COLORS[it.type] }}>
                      {it.title}
                    </div>
                  ))}
                  {(dayItems.length + dayPosts.length) > 4 && <div className="text-[10px] text-white/40">+{dayItems.length + dayPosts.length - 4}</div>}
                </div>
              </button>
            );
          })}
        </div>

        {modalDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setModalDate(null)}>
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] p-5 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: '#0f0f15' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-white/90 capitalize">{new Date(modalDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h2>
                <button onClick={() => setModalDate(null)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
              </div>

              {holidaysByDate[modalDate] && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${HOLIDAY_TYPE_COLOR[holidaysByDate[modalDate].type]}15`, border: `1px solid ${HOLIDAY_TYPE_COLOR[modalDate ? holidaysByDate[modalDate].type : 'nacional']}30` }}>
                  <Star className="w-3.5 h-3.5" style={{ color: HOLIDAY_TYPE_COLOR[holidaysByDate[modalDate].type] }} fill={HOLIDAY_TYPE_COLOR[holidaysByDate[modalDate].type]} />
                  <span className="text-xs text-white/80">{holidaysByDate[modalDate].name}</span>
                </div>
              )}

              <button
                onClick={() => createPostForDate(modalDate)}
                className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#fff' }}
              >
                <Sparkles className="w-4 h-4" /> Criar post para esta data
              </button>

              {/* Scheduled posts */}
              {(postsByDate[modalDate] || []).length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Posts vinculados</div>
                  {(postsByDate[modalDate] || []).map((p) => (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                      {p.cover ? (
                        <img src={p.cover} alt="" className="w-10 h-10 rounded-md object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-white/[0.06] flex items-center justify-center"><ImageIcon className="w-4 h-4 text-white/40" /></div>
                      )}
                      <button onClick={() => navigate(`/carousel/${p.carouselId}`)} className="flex-1 min-w-0 text-left">
                        <div className="text-sm text-white/90 truncate">{p.title}</div>
                        <div className="text-[10px] text-purple-300">Abrir no estúdio</div>
                      </button>
                      <button onClick={() => removePost(p.id)} className="p-1.5 text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 mb-4">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Planejados</div>
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
                {(itemsByDate[modalDate] || []).length === 0 && <p className="text-xs text-white/40 text-center py-2">Nenhuma anotação</p>}
              </div>

              <div className="space-y-2 border-t border-white/[0.06] pt-4">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Adicionar anotação</div>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Título"
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
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-sm text-white/80"
                >
                  <Plus className="w-4 h-4" /> Adicionar anotação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Calendario;
