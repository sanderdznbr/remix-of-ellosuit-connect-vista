import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface HubKPIChartProps {
  color: string;
  seed: number;
  totalValue: number;
  label?: string;
}

function generateChartData(seed: number, totalValue: number) {
  const days = 14;
  const data = [];
  let val = Math.max(1, Math.floor(totalValue / 3));
  for (let i = 0; i < days; i++) {
    const hash = Math.sin(seed * 9301 + i * 4973) * 10000;
    const noise = (hash - Math.floor(hash)) * 0.6 + 0.7;
    val = Math.max(0, Math.round(val * noise + (totalValue > 0 ? 1 : 0)));
    data.push({ day: `${i + 1}`, value: val });
  }
  return data;
}

export default function HubKPIChart({ color, seed, totalValue, label = 'Atividade recente' }: HubKPIChartProps) {
  const data = useMemo(() => generateChartData(seed, totalValue), [seed, totalValue]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>
          Últimos 14 dias
        </span>
      </div>
      <div className="h-[100px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${seed}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
                padding: '6px 10px',
              }}
              labelFormatter={(v) => `Dia ${v}`}
              formatter={(v: number) => [v, 'Atividade']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${seed})`}
              dot={false}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
