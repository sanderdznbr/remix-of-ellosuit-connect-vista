import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, Send, ArrowDownLeft, Bot, TrendingUp, 
  TrendingDown, DollarSign, Users, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { format, subDays } from 'date-fns';

interface WhatsAppStats {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  aiResponses: number;
  activeConversations: number;
  conversions: number;
  conversionRate: number;
  hasWhatsApp: boolean;
}

interface DailyMessageData {
  date: string;
  enviadas: number;
  recebidas: number;
  ia: number;
}

// Keywords that indicate a conversion (sale closed)
const CONVERSION_KEYWORDS = [
  'paguei', 'comprei', 'fechado', 'fechar', 'aprovado', 'pago',
  'pagamento confirmado', 'transferi', 'pix enviado', 'pix feito',
  'compra realizada', 'pedido feito', 'vou comprar', 'quero comprar',
  'finalizar compra', 'finalizar pedido', 'confirmo', 'confirmado',
  'deal', 'aceito', 'vamos fechar', 'pode fechar', 'fecha pra mim',
  'manda o link', 'link de pagamento', 'boleto', 'cartão'
];

interface Props {
  companyId: string;
  startDate: Date;
  endDate: Date;
}

const WhatsAppDashboardWidget: React.FC<Props> = ({ companyId, startDate, endDate }) => {
  const [stats, setStats] = useState<WhatsAppStats>({
    totalMessages: 0,
    sentMessages: 0,
    receivedMessages: 0,
    aiResponses: 0,
    activeConversations: 0,
    conversions: 0,
    conversionRate: 0,
    hasWhatsApp: false
  });
  const [dailyData, setDailyData] = useState<DailyMessageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWhatsAppData();
  }, [companyId, startDate, endDate]);

  const loadWhatsAppData = async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      // Check if company has WhatsApp sessions
      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('id, status')
        .eq('company_id', companyId)
        .limit(1);

      if (!sessions || sessions.length === 0) {
        setStats(prev => ({ ...prev, hasWhatsApp: false }));
        setLoading(false);
        return;
      }

      // Fetch messages in the period
      const { data: messages, count: totalCount } = await supabase
        .from('whatsapp_messages')
        .select('id, from_me, is_ai_response, timestamp, content, message_type', { count: 'exact' })
        .eq('company_id', companyId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .neq('message_type', 'system')
        .order('timestamp', { ascending: true });

      // Active conversations count
      const { count: activeConvos } = await supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('last_message_at', subDays(new Date(), 1).toISOString());

      const allMessages = messages || [];
      const sent = allMessages.filter(m => m.from_me);
      const received = allMessages.filter(m => !m.from_me);
      const aiMessages = allMessages.filter(m => m.is_ai_response);

      // Detect conversions via keywords in received messages
      const conversationConversions = new Set<string>();
      for (const msg of received) {
        if (msg.content) {
          const contentLower = msg.content.toLowerCase();
          if (CONVERSION_KEYWORDS.some(kw => contentLower.includes(kw))) {
            // Use timestamp date as a rough conversation identifier
            conversationConversions.add(format(new Date(msg.timestamp), 'yyyy-MM-dd') + msg.id.substring(0, 8));
          }
        }
      }

      const totalConversations = activeConvos || 1;
      const conversions = conversationConversions.size;
      const conversionRate = totalConversations > 0 
        ? (conversions / totalConversations) * 100 
        : 0;

      setStats({
        totalMessages: totalCount || 0,
        sentMessages: sent.length,
        receivedMessages: received.length,
        aiResponses: aiMessages.length,
        activeConversations: activeConvos || 0,
        conversions,
        conversionRate: Math.min(conversionRate, 100),
        hasWhatsApp: true
      });

      // Build daily chart data
      const dailyMap: Record<string, { enviadas: number; recebidas: number; ia: number }> = {};
      
      // Initialize all days
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'dd/MM');
        dailyMap[date] = { enviadas: 0, recebidas: 0, ia: 0 };
      }

      // Fill with real data
      for (const msg of allMessages) {
        const date = format(new Date(msg.timestamp), 'dd/MM');
        if (dailyMap[date]) {
          if (msg.from_me) {
            dailyMap[date].enviadas++;
            if (msg.is_ai_response) {
              dailyMap[date].ia++;
            }
          } else {
            dailyMap[date].recebidas++;
          }
        }
      }

      setDailyData(Object.entries(dailyMap).map(([date, data]) => ({
        date,
        ...data
      })));

    } catch (error) {
      console.error('Error loading WhatsApp dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100 text-sm">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-semibold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-48 bg-gray-100 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!stats.hasWhatsApp) {
    return null; // Don't show widget if no WhatsApp connected
  }

  const hasData = stats.totalMessages > 0;

  return (
    <div className="space-y-6">
      {/* WhatsApp KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Messages */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-[#25D366]/10">
                <MessageSquare className="h-5 w-5 text-[#25D366]" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mensagens</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalMessages)}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Send className="h-3 w-3 text-[#25D366]" />
                {formatNumber(stats.sentMessages)}
              </span>
              <span className="flex items-center gap-1">
                <ArrowDownLeft className="h-3 w-3 text-blue-500" />
                {formatNumber(stats.receivedMessages)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* AI Responses */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <Bot className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Respostas IA</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.aiResponses)}</p>
            <p className="text-xs text-gray-400 mt-2">
              {stats.sentMessages > 0 
                ? `${((stats.aiResponses / stats.sentMessages) * 100).toFixed(0)}% automatizadas`
                : 'Nenhuma resposta'}
            </p>
          </CardContent>
        </Card>

        {/* Active Conversations */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversas Ativas</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.activeConversations)}</p>
            <p className="text-xs text-gray-400 mt-2">Últimas 24h</p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="relative overflow-hidden border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-white/20">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-white/80 uppercase tracking-wide">Conversões</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.conversions}</p>
            <div className="flex items-center gap-1 mt-2">
              <Zap className="h-3 w-3 text-white/80" />
              <span className="text-xs text-white/80">
                {stats.conversionRate.toFixed(1)}% taxa de conversão
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Flow Chart */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#25D366]/10">
                <MessageSquare className="h-5 w-5 text-[#25D366]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Fluxo de Mensagens WhatsApp</h3>
                <p className="text-xs text-gray-400">Últimos 30 dias</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#25D366]" />
                <span className="text-xs text-gray-500">Enviadas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#0EA5E9]" />
                <span className="text-xs text-gray-500">Recebidas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                <span className="text-xs text-gray-500">IA</span>
              </div>
            </div>
          </div>

          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma mensagem no período</p>
              <p className="text-sm text-gray-400 mt-1">As mensagens enviadas e recebidas aparecerão aqui</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorEnviadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRecebidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorIA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="enviadas"
                  name="Enviadas"
                  stroke="#25D366"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEnviadas)"
                />
                <Area
                  type="monotone"
                  dataKey="recebidas"
                  name="Recebidas"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRecebidas)"
                />
                <Area
                  type="monotone"
                  dataKey="ia"
                  name="IA"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIA)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppDashboardWidget;
