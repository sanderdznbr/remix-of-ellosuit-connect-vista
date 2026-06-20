import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, BarChart3, TrendingUp, Image as ImageIcon, Sparkles, Calendar } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  total: number;
  thisMonth: number;
  last7Days: number;
  byDay: { day: string; count: number }[];
  topStyle: string | null;
}

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, thisMonth: 0, last7Days: 0, byDay: [], topStyle: null });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('generated_carousels')
          .select('id, created_at, style_config, title')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500);

        const rows = data || [];
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const total = rows.length;
        const thisMonth = rows.filter((r: any) => new Date(r.created_at) >= monthStart).length;
        const last7Days = rows.filter((r: any) => new Date(r.created_at) >= sevenAgo).length;

        const dayMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const key = d.toLocaleDateString('pt-BR', { weekday: 'short' });
          dayMap[key] = 0;
        }
        rows.forEach((r: any) => {
          const d = new Date(r.created_at);
          if (d >= sevenAgo) {
            const key = d.toLocaleDateString('pt-BR', { weekday: 'short' });
            if (key in dayMap) dayMap[key]++;
          }
        });

        const styleCounts: Record<string, number> = {};
        rows.forEach((r: any) => {
          const name = r?.style_config?.name || r?.style_config?.style_name;
          if (name) styleCounts[name] = (styleCounts[name] || 0) + 1;
        });
        const topStyle = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        setStats({
          total,
          thisMonth,
          last7Days,
          byDay: Object.entries(dayMap).map(([day, count]) => ({ day, count })),
          topStyle,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const maxDay = Math.max(1, ...stats.byDay.map((d) => d.count));

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0a0a0f' }}>
      <header className="sticky top-0 z-10 border-b border-white/[0.06] backdrop-blur" style={{ backgroundColor: 'rgba(10,10,15,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white"><Home className="w-4 h-4" /></button>
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-semibold">Insights</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!user ? (
          <p className="text-sm text-white/50">Faça login para ver seus insights.</p>
        ) : loading ? (
          <p className="text-sm text-white/50">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Card icon={<ImageIcon className="w-4 h-4" />} label="Total criado" value={stats.total} color="#8B5CF6" />
              <Card icon={<Calendar className="w-4 h-4" />} label="Este mês" value={stats.thisMonth} color="#38BDF8" />
              <Card icon={<TrendingUp className="w-4 h-4" />} label="Últimos 7 dias" value={stats.last7Days} color="#10B981" />
              <Card icon={<Sparkles className="w-4 h-4" />} label="Estilo favorito" value={stats.topStyle || '—'} color="#F59E0B" small />
            </div>

            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ backgroundColor: '#0f0f15' }}>
              <h2 className="text-sm font-medium text-white/80 mb-4">Atividade dos últimos 7 dias</h2>
              <div className="flex items-end gap-2 h-40">
                {stats.byDay.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{
                          height: `${(d.count / maxDay) * 100}%`,
                          minHeight: d.count > 0 ? 4 : 2,
                          background: 'linear-gradient(180deg, #A78BFA, #7C3AED)',
                          opacity: d.count > 0 ? 1 : 0.15,
                        }}
                        title={`${d.count} post${d.count !== 1 ? 's' : ''}`}
                      />
                    </div>
                    <span className="text-[10px] text-white/40 capitalize">{d.day.replace('.', '')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.04]">
              <p className="text-xs text-white/60">
                💡 Quanto mais consistente seu volume semanal, melhor o alcance. Use o{' '}
                <button onClick={() => navigate('/calendario')} className="text-purple-300 hover:underline">calendário editorial</button>{' '}
                pra planejar antes.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const Card: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string; small?: boolean }> = ({ icon, label, value, color, small }) => (
  <div className="rounded-2xl border border-white/[0.06] p-4" style={{ backgroundColor: '#0f0f15' }}>
    <div className="flex items-center gap-2 mb-2 text-white/50">
      <span style={{ color }}>{icon}</span>
      <span className="text-[11px] uppercase tracking-wider">{label}</span>
    </div>
    <div className={`font-semibold text-white ${small ? 'text-base truncate' : 'text-2xl'}`}>{value}</div>
  </div>
);

export default Analytics;
